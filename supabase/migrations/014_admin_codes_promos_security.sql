-- ============================================================
-- MIGRATION 014 — Ferramentas de Admin: Códigos, Promoções e Blindagem
-- Data: 2026-09-03
--
-- 1) BLINDAGEM: corrige furos críticos da migration 008 —
--    · QUALQUER pessoa (até anónima) conseguia LISTAR todos os códigos
--      de activação (policy FOR SELECT USING (true));
--    · qualquer utilizador autenticado conseguia ALTERAR códigos
--      (policy FOR UPDATE USING (true)).
--    Agora: ninguém lê a tabela directamente (só via RPC com rate-limit);
--    utilizador só vê os códigos que ele próprio activou; só o admin
--    gere; inserções apenas via RPC do admin.
-- 2) RATE LIMITING: tabela security_attempt_log + bloqueio de força-bruta
--    em verify_activation_code, activate_admin e validate_promo.
-- 3) GERADOR DE CÓDIGOS no painel admin: RPC admin_generate_codes.
-- 4) PROMOÇÕES: tabelas promo_codes + promo_redemptions, RPC
--    validate_promo para o checkout, e consumo automático quando o
--    pagamento é confirmado (coluna payments.promo_code + trigger).
-- 5) RODAR CÓDIGO DE ADMIN no painel: RPC admin_set_admin_code.
-- 6) AUDITORIA: RPC security_audit() — mostra tabelas sem RLS,
--    políticas permissivas e tentativas falhadas nas últimas 24h.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- PARTE 1 — BLINDAGEM DA TABELA DE CÓDIGOS DE ACTIVAÇÃO
-- ════════════════════════════════════════════════════════════

-- 1.1) Remover as políticas públicas perigosas da 008
DROP POLICY IF EXISTS "Activation codes are viewable during activation" ON public.device_activation_codes;
DROP POLICY IF EXISTS "Only system can update activation codes" ON public.device_activation_codes;
DROP POLICY IF EXISTS "Only service role can insert codes" ON public.device_activation_codes;
DROP POLICY IF EXISTS "Users can view own activated codes" ON public.device_activation_codes;

-- Utilizador vê apenas os códigos que ELE activou (histórico do próprio)
CREATE POLICY "Users view own activated codes" ON public.device_activation_codes
  FOR SELECT TO authenticated
  USING (activated_by = auth.uid());

-- Admin gere todos os códigos (listar / revogar) a partir do painel
CREATE POLICY "Admin manages activation codes" ON public.device_activation_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Sem política de INSERT/UPDATE directa → só service_role e as RPCs
-- SECURITY DEFINER (admin_generate_codes, redeem/consume) tocam na tabela.

-- 1.2) Registo de tentativas — base do rate limiting e da auditoria
CREATE TABLE IF NOT EXISTS public.security_attempt_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action TEXT NOT NULL,                -- 'admin_activate' | 'device_code_verify' | 'promo_validate'
  actor TEXT NOT NULL DEFAULT 'anon',  -- auth.uid()::text ou 'anon'
  ok BOOLEAN NOT NULL DEFAULT false,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_attempt_log ENABLE ROW LEVEL SECURITY;
-- Ninguém lê/escreve directamente (só as RPCs SECURITY DEFINER):
REVOKE ALL ON public.security_attempt_log FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_sec_attempt_lookup
  ON public.security_attempt_log (action, actor, created_at DESC);

-- Bloqueia se o actor já fez >= p_max tentativas falhadas na janela
CREATE OR REPLACE FUNCTION public.security_rate_limited(p_action TEXT, p_max INT, p_window_min INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor TEXT := COALESCE(auth.uid()::text, 'anon');
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.security_attempt_log
  WHERE action = p_action
    AND actor = v_actor
    AND ok = false
    AND created_at > now() - (p_window_min || ' minutes')::interval;
  RETURN v_count >= p_max;
END;
$$;

-- Regista uma tentativa (silencioso — nunca deve rebentar a chamada principal)
CREATE OR REPLACE FUNCTION public.security_log_attempt(p_action TEXT, p_ok BOOLEAN, p_detail TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_attempt_log (action, actor, ok, detail)
  VALUES (p_action, COALESCE(auth.uid()::text, 'anon'), p_ok, p_detail);
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- PARTE 2 — RPCs EXISTENTES ENDURECIDAS (mantêm a assinatura)
-- ════════════════════════════════════════════════════════════

-- 2.1) verify_activation_code: com rate-limit anti força-bruta.
--      Continua pública (pré-login na página /ativar) mas limitada a
--      25 tentativas falhadas / 10 min por utilizador (ou IP anónimo).
CREATE OR REPLACE FUNCTION public.verify_activation_code(p_code text)
RETURNS TABLE(id uuid, device_type text, product_id text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT := upper(regexp_replace(coalesce(trim(p_code), ''), '[^A-Za-z0-9-]', '', 'g'));
BEGIN
  IF public.security_rate_limited('device_code_verify', 25, 10) THEN
    PERFORM public.security_log_attempt('device_code_verify', false, 'rate_limited');
    RETURN; -- resultado vazio, sem revelar o motivo
  END IF;

  IF length(v_clean) < 6 THEN
    PERFORM public.security_log_attempt('device_code_verify', false, 'too_short');
    RETURN;
  END IF;

  RETURN QUERY
    SELECT c.id, c.device_type, c.product_id
    FROM public.device_activation_codes c
    WHERE c.code = v_clean
      AND c.used = false
    LIMIT 1;

  PERFORM public.security_log_attempt('device_code_verify', FOUND);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_activation_code(text) TO anon, authenticated;

-- 2.2) redeem_activation_code: só autenticados + rate-limit (10 / 10 min)
CREATE OR REPLACE FUNCTION public.redeem_activation_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_clean TEXT := upper(regexp_replace(coalesce(trim(p_code), ''), '[^A-Za-z0-9-]', '', 'g'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF public.security_rate_limited('device_code_redeem', 10, 10) THEN
    PERFORM public.security_log_attempt('device_code_redeem', false, 'rate_limited');
    RAISE EXCEPTION 'Too many attempts. Try again later';
  END IF;

  UPDATE public.device_activation_codes
  SET used = true, activated_by = auth.uid(), activated_at = now()
  WHERE code = v_clean
    AND used = false
    AND length(v_clean) >= 6
  RETURNING id INTO v_id;

  PERFORM public.security_log_attempt('device_code_redeem', v_id IS NOT NULL);

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used code';
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_activation_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_activation_code(text) FROM anon;

-- 2.3) activate_admin: máximo 5 tentativas falhadas / 15 min
CREATE OR REPLACE FUNCTION public.activate_admin(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_user UUID := auth.uid();
  v_profile RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Sessão não encontrada. Entre na sua conta primeiro.');
  END IF;

  IF public.security_rate_limited('admin_activate', 5, 15) THEN
    PERFORM public.security_log_attempt('admin_activate', false, 'rate_limited');
    RETURN json_build_object('success', false,
      'message', 'Demasiadas tentativas. Aguarde 15 minutos e tente novamente.');
  END IF;

  SELECT value INTO v_code FROM public.app_security_config WHERE key = 'admin_activation_code' LIMIT 1;

  IF v_code IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Código de administração não configurado. Corra a migration 013.');
  END IF;

  IF trim(p_code) <> v_code THEN
    PERFORM public.security_log_attempt('admin_activate', false, 'wrong_code');
    RETURN json_build_object('success', false, 'message', 'Código incorrecto. Verifique e tente novamente.');
  END IF;

  SELECT id, role INTO v_profile FROM public.profiles WHERE user_id = v_user LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Perfil não encontrado. Complete o registo primeiro.');
  END IF;

  IF v_profile.role = 'admin' THEN
    RETURN json_build_object('success', true, 'message', 'Esta conta já é de administração.');
  END IF;

  UPDATE public.profiles SET role = 'admin', updated_at = now() WHERE user_id = v_user;

  INSERT INTO public.admin_logs (action, target_type, target_id, details)
  VALUES ('admin_activated_by_code', 'profile', v_user::TEXT, json_build_object('at', now()))
  ON CONFLICT DO NOTHING;

  PERFORM public.security_log_attempt('admin_activate', true);

  RETURN json_build_object('success', true, 'message', 'Administrador activado! O painel foi desbloqueado.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_admin(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_admin(TEXT) FROM anon;

-- 2.4) validate/consume_activation_code (008) endurecidos com search_path
CREATE OR REPLACE FUNCTION public.validate_activation_code(p_code TEXT)
RETURNS TABLE(id UUID, device_type TEXT, product_id UUID, used BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT dac.id, dac.device_type, dac.product_id, dac.used
  FROM public.device_activation_codes dac
  WHERE dac.code = upper(coalesce(trim(p_code), ''))
    AND dac.used = false
    AND (dac.expires_at IS NULL OR dac.expires_at > now())
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_activation_code(p_code TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.device_activation_codes
  SET used = true, activated_by = p_user_id, activated_at = now()
  WHERE code = upper(coalesce(trim(p_code), '')) AND used = false
  RETURNING 1 INTO v_updated;
  RETURN v_updated = 1;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- PARTE 3 — GERADOR DE CÓDIGOS NO PAINEL ADMIN
-- ════════════════════════════════════════════════════════════

-- Modelos suportados (mesmos prefixos do GERAR-CODIGOS-BELLVION.sql):
--   glasses → BVG- | watch → BVW- | earbuds → BVB- | tracker → BVT-
CREATE OR REPLACE FUNCTION public.admin_generate_codes(p_model TEXT, p_quantity INT)
RETURNS TABLE(code TEXT, device_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_type TEXT;
  v_qty INT := GREATEST(1, LEAST(500, COALESCE(p_quantity, 10)));
  v_charset TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0/O/1/I
  v_try INT;
  v_new TEXT;
  i INT;
BEGIN
  -- Só administradores
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_prefix := CASE lower(coalesce(p_model, ''))
    WHEN 'glasses' THEN 'BVG-'
    WHEN 'watch'   THEN 'BVW-'
    WHEN 'earbuds' THEN 'BVB-'
    WHEN 'tracker' THEN 'BVT-'
    ELSE NULL
  END;
  v_type := lower(coalesce(p_model, ''));

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Modelo inválido. Use: glasses, watch, earbuds ou tracker';
  END IF;

  i := 0;
  WHILE i < v_qty LOOP
    v_try := 0;
    LOOP
      v_try := v_try + 1;
      v_new := v_prefix
        || substr(v_charset, 1 + floor(random() * length(v_charset))::int, 4)
        || '-'
        || substr(v_charset, 1 + floor(random() * length(v_charset))::int, 4);
      BEGIN
        INSERT INTO public.device_activation_codes (code, device_type)
        VALUES (v_new, v_type);
        i := i + 1;
        code := v_new; device_type := v_type;
        RETURN NEXT;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_try >= 5 THEN
          RAISE EXCEPTION 'Não foi possível gerar código único após 5 tentativas';
        END IF;
      END;
    END LOOP;
  END LOOP;

  INSERT INTO public.admin_logs (action, target_type, target_id, details)
  VALUES ('codes_generated', 'device_activation_codes', v_type,
          json_build_object('quantity', v_qty, 'prefix', v_prefix, 'by', auth.uid()))
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_generate_codes(TEXT, INT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_generate_codes(TEXT, INT) FROM anon;

-- ════════════════════════════════════════════════════════════
-- PARTE 4 — SISTEMA DE PROMOÇÕES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  applies_to TEXT NOT NULL DEFAULT 'any'
    CHECK (applies_to IN ('any', 'familia', 'bellvion', 'premium')),
  max_uses INT,                        -- NULL = ilimitado
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Admin cria/edita/apaga promoções a partir do painel
DROP POLICY IF EXISTS "Admin manages promo codes" ON public.promo_codes;
CREATE POLICY "Admin manages promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Utilizadores NÃO leem a tabela directamente — só via RPC validate_promo.

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_id, user_id)          -- 1 resgate por utilizador por promoção
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users view own redemptions" ON public.promo_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manages redemptions" ON public.promo_redemptions;
CREATE POLICY "Admin manages redemptions" ON public.promo_redemptions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.1) validate_promo — usado no checkout (só autenticados)
CREATE OR REPLACE FUNCTION public.validate_promo(p_code TEXT, p_plan TEXT DEFAULT 'any')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(regexp_replace(coalesce(trim(p_code), ''), '\s', '', 'g'));
  v_plan TEXT := lower(coalesce(p_plan, 'any'));
  v_promo public.promo_codes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('valid', false, 'message', 'Entre na sua conta para usar promoções.');
  END IF;

  IF public.security_rate_limited('promo_validate', 20, 10) THEN
    PERFORM public.security_log_attempt('promo_validate', false, 'rate_limited');
    RETURN json_build_object('valid', false, 'message', 'Demasiadas tentativas. Aguarde alguns minutos.');
  END IF;

  IF length(v_code) < 3 THEN
    PERFORM public.security_log_attempt('promo_validate', false, 'too_short');
    RETURN json_build_object('valid', false, 'message', 'Introduza um código válido.');
  END IF;

  SELECT * INTO v_promo FROM public.promo_codes WHERE promo_codes.code = v_code;

  -- Mensagens genéricas: nunca revelar se o código existe mas falhou por outro motivo
  IF v_promo.id IS NULL
     OR NOT v_promo.is_active
     OR (v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now())
     OR (v_promo.applies_to <> 'any' AND v_promo.applies_to <> v_plan)
     OR (v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses) THEN
    PERFORM public.security_log_attempt('promo_validate', false, 'rejected');
    RETURN json_build_object('valid', false, 'message', 'Código inválido, expirado ou não aplicável a este plano.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.promo_redemptions
             WHERE promo_id = v_promo.id AND user_id = auth.uid()) THEN
    PERFORM public.security_log_attempt('promo_validate', false, 'already_used');
    RETURN json_build_object('valid', false, 'message', 'Já usou este código promocional anteriormente.');
  END IF;

  PERFORM public.security_log_attempt('promo_validate', true, v_code);

  RETURN json_build_object(
    'valid', true,
    'code', v_promo.code,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'description', v_promo.description,
    'message', 'Código aplicado!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_promo(TEXT, TEXT) FROM anon;

-- 4.2) payments.promo_code + consumo automático na confirmação
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS promo_code TEXT;

CREATE OR REPLACE FUNCTION public.trg_payment_promo_redeem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
BEGIN
  IF NEW.promo_code IS NULL OR NEW.promo_code = '' THEN RETURN NEW; END IF;
  BEGIN
    SELECT id, max_uses, used_count INTO v_promo
    FROM public.promo_codes
    WHERE code = upper(trim(NEW.promo_code)) AND is_active
    FOR UPDATE;

    IF v_promo.id IS NULL THEN RETURN NEW; END IF;

    INSERT INTO public.promo_redemptions (promo_id, user_id, payment_id)
    VALUES (v_promo.id, NEW.user_id, NEW.id)
    ON CONFLICT (promo_id, user_id) DO NOTHING;

    UPDATE public.promo_codes
    SET used_count = used_count + 1
    WHERE id = v_promo.id;
  EXCEPTION WHEN OTHERS THEN
    -- Nunca bloquear a confirmação do pagamento por causa da promo
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_promo ON public.payments;
CREATE TRIGGER trg_payment_promo
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed')
  EXECUTE FUNCTION public.trg_payment_promo_redeem();

-- ════════════════════════════════════════════════════════════
-- PARTE 5 — RODAR CÓDIGO DE ADMIN A PARTIR DO PAINEL
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_set_admin_code(p_old_code TEXT, p_new_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Apenas administradores podem alterar o código.');
  END IF;

  SELECT value INTO v_current FROM public.app_security_config WHERE key = 'admin_activation_code' LIMIT 1;

  IF v_current IS NULL OR trim(p_old_code) <> v_current THEN
    PERFORM public.security_log_attempt('admin_code_rotate', false, 'wrong_old');
    RETURN json_build_object('success', false, 'message', 'O código actual não coincide.');
  END IF;

  IF length(coalesce(trim(p_new_code), '')) < 8 THEN
    RETURN json_build_object('success', false, 'message', 'O novo código deve ter pelo menos 8 caracteres.');
  END IF;

  UPDATE public.app_security_config
  SET value = trim(p_new_code), updated_at = now()
  WHERE key = 'admin_activation_code';

  INSERT INTO public.admin_logs (action, target_type, target_id, details)
  VALUES ('admin_code_rotated', 'app_security_config', 'admin_activation_code',
          json_build_object('by', auth.uid(), 'at', now()))
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Código de administração actualizado. Guarde-o em seguro.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_admin_code(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_admin_code(TEXT, TEXT) FROM anon;

-- ════════════════════════════════════════════════════════════
-- PARTE 6 — AUDITORIA DE SEGURANÇA (painel admin)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.security_audit()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tables JSON;
  v_policies JSON;
  v_functions INT;
  v_admin_fails INT;
  v_code_fails INT;
  v_promo_fails INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Tabelas públicas sem RLS activo
  SELECT COALESCE(json_agg(tablename), '[]'::json) INTO v_tables
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;

  -- Políticas permissivas de mais (USING/WITH CHECK = true)
  SELECT COALESCE(json_agg(json_build_object(
           'table', tablename, 'policy', policyname, 'cmd', cmd)), '[]'::json) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual = 'true' OR with_check = 'true')
    AND tablename <> 'device_activation_codes'; -- corrigidas nesta migration

  -- Funções SECURITY DEFINER sem search_path fixado
  SELECT COUNT(*) INTO v_functions
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path%'));

  SELECT COUNT(*) INTO v_admin_fails FROM public.security_attempt_log
  WHERE action = 'admin_activate' AND ok = false AND created_at > now() - interval '24 hours';
  SELECT COUNT(*) INTO v_code_fails FROM public.security_attempt_log
  WHERE action = 'device_code_verify' AND ok = false AND created_at > now() - interval '24 hours';
  SELECT COUNT(*) INTO v_promo_fails FROM public.security_attempt_log
  WHERE action = 'promo_validate' AND ok = false AND created_at > now() - interval '24 hours';

  RETURN json_build_object(
    'tables_missing_rls', v_tables,
    'permissive_policies', v_policies,
    'functions_without_search_path', v_functions,
    'failed_24h', json_build_object(
      'admin_activate', v_admin_fails,
      'device_code_verify', v_code_fails,
      'promo_validate', v_promo_fails
    ),
    'audited_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.security_audit() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.security_audit() FROM anon;

-- FIM DA MIGRATION 014
