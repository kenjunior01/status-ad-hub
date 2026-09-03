-- ============================================================
-- MIGRATION 013 — Activacao de Admin por Código + Gravações na Nuvem
-- Data: 2026-09-03
--
-- 1) app_security_config: configurações sensíveis da plataforma
--    (código de activação de admin — TROQUE o valor por defeito!)
-- 2) RPC activate_admin(p_code): promove o utilizador autenticado
--    a admin quando o código digitado coincide. Substitui a necessidade
--    de correr SQL manual para se tornar admin.
-- 3) Storage bucket "evidence-audio": gravações do Cofre de Evidências
--    guardadas como ficheiros (mais leve que base64 na tabela).
-- 4) audio_evidence.storage_path: caminho do ficheiro no bucket.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Configuração de segurança
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_security_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_security_config ENABLE ROW LEVEL SECURITY;

-- Nenhum utilizador lê esta tabela directamente (o código fica secreto).
-- Só a função SECURITY DEFINER acede.
REVOKE ALL ON public.app_security_config FROM anon, authenticated;

INSERT INTO public.app_security_config (key, value)
VALUES ('admin_activation_code', 'STATUSADS-ADMIN-2026')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 2) RPC activate_admin — activação por código digitado
--    Acesso: /dashboard/admin → ecrã "Acesso restrito" → inserir código
-- ------------------------------------------------------------
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

  SELECT value INTO v_code FROM public.app_security_config WHERE key = 'admin_activation_code' LIMIT 1;

  IF v_code IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Código de administração não configurado. Corra a migration 013.');
  END IF;

  IF trim(p_code) <> v_code THEN
    -- Regista tentativa falhada (sem valores sensíveis)
    INSERT INTO public.admin_logs (action, target_type, target_id, details)
    VALUES ('admin_activation_failed', 'profile', v_user::TEXT,
            json_build_object('at', now()))
    ON CONFLICT DO NOTHING;
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
  VALUES ('admin_activated_by_code', 'profile', v_user::TEXT,
          json_build_object('at', now()))
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Administrador activado! O painel foi desbloqueado.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_admin(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_admin(TEXT) FROM anon;

-- Nota: admin_logs pode não existir em instalações antigas; cria se preciso
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3) Storage: bucket privado para gravações de evidência
--    Estrutura de pastas: {user_id}/{timestamp}-{random}.webm
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence-audio', 'evidence-audio', false, 26214400,
        ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas: cada utilizador só acede à SUA pasta (primeiro segmento = user_id)
DROP POLICY IF EXISTS "Evidence upload own folder" ON storage.objects;
CREATE POLICY "Evidence upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Evidence read own folder" ON storage.objects;
CREATE POLICY "Evidence read own folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidence-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Evidence delete own folder" ON storage.objects;
CREATE POLICY "Evidence delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'evidence-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 4) audio_evidence.storage_path (ficheiro no bucket)
-- ------------------------------------------------------------
ALTER TABLE public.audio_evidence
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- RPC para assinar URLs de leitura (bucket privado → URL temporário 2h)
CREATE OR REPLACE FUNCTION public.evidence_signed_url(p_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_url TEXT;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;
  -- Só assina se o ficheiro estiver na pasta do próprio utilizador
  IF (split_part(p_path, '/', 1)) <> v_user::text THEN RETURN NULL; END IF;
  SELECT signed_url INTO v_url
  FROM storage.create_signed_url('evidence-audio', p_path, 7200);
  RETURN v_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evidence_signed_url(TEXT) TO authenticated;
