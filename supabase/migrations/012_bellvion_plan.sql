-- ============================================================
-- 012: PLANO BELLVION (99 MT/mês — exclusivo dispositivos BELLVION)
-- StatusAds Connect
-- ============================================================
-- Executar no Supabase SQL Editor (Dashboard → SQL → New query).
-- Idempotente: pode ser executado mais do que uma vez.
-- Requer: 009 (tabela plans) + 008 (device_activation_codes)
-- ============================================================

-- Inserir o plano Bellvion (preço especial para quem tem hardware da marca)
INSERT INTO public.plans (slug, name, description, price_mzn, price_usd, max_contacts, max_devices, features, is_active)
VALUES (
  'bellvion',
  'Bellvion',
  'Preço exclusivo para quem tem um dispositivo BELLVION',
  99,
  1.59,
  6,
  5,
  '["Tudo do plano Família","Preço reduzido — 60% de desconto para sempre","SOS pelo botão do dispositivo BELLVION","Detecção de queda do BELLVION Watch","Gravação de evidências pelos BELLVION Glasses","6 contactos de emergência","5 dispositivos BLE (da marca ou outros)","Suporte prioritário da marca"]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE
SET price_mzn = EXCLUDED.price_mzn,
    price_usd = EXCLUDED.price_usd,
    max_contacts = EXCLUDED.max_contacts,
    max_devices = EXCLUDED.max_devices,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description;

-- Nota: profiles.plan é TEXT sem CHECK constraint (migration 20260901110439),
-- por isso o slug 'bellvion' funciona sem alterações de schema.
-- O trigger activate_or_extend_subscription (009) lê o plano por ID
-- do pagamento, portanto activa também o plano bellvion sem mudanças.

-- ------------------------------------------------------------
-- CORREÇÃO: expire_subscriptions (009) só rebaixava familia/premium.
-- Sem isto, perfis 'bellvion' expirados ficavam com desconto para sempre.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at < now();

  -- Rebaixa perfis cuja última assinatura activa expirou
  -- (qualquer plano pago: familia, bellvion, premium)
  UPDATE public.profiles p
  SET plan = 'free', updated_at = now()
  WHERE p.plan IN ('familia', 'bellvion', 'premium')
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p.user_id
        AND s.status = 'active'
        AND s.expires_at > now()
    );
END;
$$;

-- Elegibilidade (informativo para a app — a verificação é feita por RLS
-- na tabela device_activation_codes: activated_by = auth.uid()):
-- A app chama verify_activation_code/redeem_activation_code (20260903082415).
