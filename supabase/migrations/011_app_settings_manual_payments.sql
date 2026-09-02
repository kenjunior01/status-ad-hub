-- ============================================================
-- 011: PAGAMENTO MANUAL (SEM API) + CONFIGURAÇÕES DA PLATAFORMA
-- StatusAds Connect
-- ============================================================
-- Permite aos utilizadores pagar por M-Pesa / e-Mola / mKesh /
-- transferência bancária / PayPal de forma 100% MANUAL:
--   1. O dono configura os números em Admin → Configurações
--      (tabela app_settings).
--   2. O utilizador vê os números no checkout, paga no seu
--      telefone/app e submete o ID da transacção.
--   3. O dono valida em Admin → Pagamentos → "Confirmar" —
--      o trigger trg_payment_confirmed (migration 009) activa
--      a assinatura automaticamente (+31 dias).
-- Nenhuma API externa é necessária. Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA APP_SETTINGS (key/value)
-- ------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Leitura para utilizadores autenticados (checkout mostra os números)
drop policy if exists "Authenticated read app_settings" on public.app_settings;
create policy "Authenticated read app_settings"
  on public.app_settings for select to authenticated
  using (true);

-- Escrita apenas para admins
drop policy if exists "Admin manages app_settings" on public.app_settings;
create policy "Admin manages app_settings"
  on public.app_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 2. SEED: números de pagamento (o DONO edita em Admin → Configurações)
-- ------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('payment_numbers', '{
    "mpesa": "84 000 0000",
    "emola": "86 000 0000",
    "mkesh": "82 000 0000",
    "bank_name": "BCI",
    "bank_holder": "StatusAds, Lda",
    "bank_nib": "0000000000000000000 000",
    "paypal_email": "pagamentos@statusmonetize.com"
  }'::jsonb),
  ('support', '{
    "whatsapp": "+258 84 000 0000",
    "email": "suporte@statusmonetize.com"
  }'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 3. INSERT de pagamentos pendentes pelo próprio utilizador
-- (necessário para o checkout manual: o utilizador submete o
--  comprovativo; o admin valida depois)
-- ------------------------------------------------------------
drop policy if exists "Users insert own pending payments" on public.payments;
create policy "Users insert own pending payments"
  on public.payments for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- ------------------------------------------------------------
-- 4. Novo método: transferência bancária
-- ------------------------------------------------------------
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('mpesa', 'emola', 'mkesh', 'paypal', 'manual', 'bank'));

-- ------------------------------------------------------------
-- 5. Nome do pagador (checkout manual, opcional)
-- ------------------------------------------------------------
alter table public.payments add column if not exists payer_name text;

-- ------------------------------------------------------------
-- 6. updated_at trigger (função update_updated_at já existe)
-- ------------------------------------------------------------
drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.update_updated_at();

-- ============================================================
-- FIM. Fluxo manual completo:
--   Utilizador: /planos → Assinar → Pagamento Manual → paga →
--               submete ID da transacção
--   Dono:       /dashboard/admin/pagamentos → Confirmar →
--               assinatura activada automaticamente (trigger)
-- ============================================================
