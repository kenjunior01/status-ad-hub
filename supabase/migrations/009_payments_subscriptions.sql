-- ============================================================
-- 009: PAGAMENTOS, ASSINATURAS E ADMIN
-- StatusAds Connect — M-Pesa / e-Mola / mKesh / PayPal
-- ============================================================
-- Executar no Supabase SQL Editor (Dashboard → SQL → New query).
-- Idempotente: pode ser executado mais do que uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ROLE DE ADMIN EM PROFILES
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- Helper: is_admin() — SECURITY DEFINER evita recursão de RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  )
$$;

-- Políticas admin em profiles (ler e editar todos os utilizadores)
drop policy if exists "Admin can read all profiles" on public.profiles;
create policy "Admin can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

drop policy if exists "Admin can update all profiles" on public.profiles;
create policy "Admin can update all profiles"
  on public.profiles for update to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------
-- 2. PLANOS
-- ------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_mzn numeric(10,2) not null default 0,
  price_usd numeric(10,2) not null default 0,
  interval_months int not null default 1,
  max_contacts int not null default 2,
  max_devices int not null default 1,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

drop policy if exists "Plans are readable by everyone" on public.plans;
create policy "Plans are readable by everyone"
  on public.plans for select using (true);

drop policy if exists "Admin manages plans" on public.plans;
create policy "Admin manages plans"
  on public.plans for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. ASSINATURAS
-- ------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'active'
    check (status in ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  provider text,
  provider_ref text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  auto_renew boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users cancel own subscription" on public.subscriptions;
create policy "Users cancel own subscription"
  on public.subscriptions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admin full access subscriptions" on public.subscriptions;
create policy "Admin full access subscriptions"
  on public.subscriptions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_subscriptions_user
  on public.subscriptions (user_id, created_at desc);

-- ------------------------------------------------------------
-- 4. PAGAMENTOS
-- ------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  plan_slug text,
  amount numeric(10,2) not null,
  currency text not null default 'MZN',
  method text not null check (method in ('mpesa', 'emola', 'mkesh', 'paypal', 'manual')),
  phone text,
  reference text unique not null,
  provider_ref text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'confirmed', 'failed', 'cancelled', 'refunded')),
  provider_payload jsonb,
  note text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.payments enable row level security;

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments"
  on public.payments for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admin full access payments" on public.payments;
create policy "Admin full access payments"
  on public.payments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_payments_user
  on public.payments (user_id, created_at desc);
create index if not exists idx_payments_status
  on public.payments (status, created_at desc);

-- ------------------------------------------------------------
-- 5. LOGS DE ADMIN (auditoria)
-- ------------------------------------------------------------
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_logs enable row level security;

drop policy if exists "Admin reads logs" on public.admin_logs;
create policy "Admin reads logs"
  on public.admin_logs for select to authenticated
  using (public.is_admin());

drop policy if exists "Admin inserts logs" on public.admin_logs;
create policy "Admin inserts logs"
  on public.admin_logs for insert to authenticated
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 6. ACESSO ADMIN A TABELAS EXISTENTES (monitorização)
-- ------------------------------------------------------------
drop policy if exists "Admin full access emergency_alerts" on public.emergency_alerts;
create policy "Admin full access emergency_alerts"
  on public.emergency_alerts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 7. ACTIVAÇÃO / EXTENSÃO DE ASSINATURA (trigger de pagamento)
-- ------------------------------------------------------------
create or replace function public.activate_or_extend_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_days int default 31,
  p_provider text default null,
  p_ref text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing record;
begin
  select * into existing
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'trial')
  order by coalesce(expires_at, 'infinity') desc
  limit 1;

  if found and existing.plan_id = p_plan_id then
    update public.subscriptions
    set expires_at = greatest(now(), existing.expires_at) + make_interval(days => p_days),
        status = 'active',
        provider = coalesce(p_provider, provider),
        provider_ref = coalesce(p_ref, provider_ref),
        auto_renew = true,
        updated_at = now()
    where id = existing.id;
  else
    -- cancela assinaturas activas anteriores antes de criar a nova
    update public.subscriptions
    set status = 'cancelled', updated_at = now()
    where user_id = p_user_id and status in ('active', 'trial');

    insert into public.subscriptions
      (user_id, plan_id, status, provider, provider_ref, starts_at, expires_at, auto_renew)
    values
      (p_user_id, p_plan_id, 'active', p_provider, p_ref, now(), now() + make_interval(days => p_days), true);
  end if;

  -- sincroniza o plano no perfil (gating de features)
  update public.profiles
  set plan = coalesce((select slug from public.plans where id = p_plan_id), 'free'),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

create or replace function public.handle_payment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed'
     and coalesce(old.status, '') is distinct from 'confirmed'
     and new.plan_id is not null then
    perform public.activate_or_extend_subscription(
      new.user_id, new.plan_id, 31, new.method, new.reference
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_confirmed on public.payments;
create trigger trg_payment_confirmed
  after update of status on public.payments
  for each row
  execute function public.handle_payment_confirmed();

-- ------------------------------------------------------------
-- 8. EXPIRAÇÃO AUTOMÁTICA DE ASSINATURAS
-- ------------------------------------------------------------
create or replace function public.expire_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at < now();

  -- rebaixa perfis cuja última assinatura activa expirou
  update public.profiles p
  set plan = 'free', updated_at = now()
  where p.plan in ('familia', 'premium')
    and not exists (
      select 1 from public.subscriptions s
      where s.user_id = p.user_id
        and s.status = 'active'
        and s.expires_at > now()
    );
end;
$$;

-- Agenda via pg_cron se disponível (a cada hora)
do $$
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule('expire-statusads-subscriptions')
    where exists (select 1 from cron.job where jobname = 'expire-statusads-subscriptions');
    perform cron.schedule(
      'expire-statusads-subscriptions',
      '0 * * * *',
      $$select public.expire_subscriptions()$$
    );
  end if;
end $$;

-- ------------------------------------------------------------
-- 9. UPDATED_AT triggers
-- ------------------------------------------------------------
drop trigger if exists trg_plans_updated_at on public.plans;
create or replace trigger trg_plans_updated_at
  before update on public.plans
  for each row execute function public.update_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create or replace trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- 10. SEED: PLANOS (preços de Moçambique)
-- ------------------------------------------------------------
insert into public.plans (slug, name, description, price_mzn, price_usd, max_contacts, max_devices, features, sort_order)
values
  ('free', 'Grátis',
   'O essencial para a sua segurança diária',
   0, 0, 2, 1,
   '["Botão SOS instantâneo","2 contactos de emergência","Check-in programado","Histórico de 7 dias","1 dispositivo BLE","Notificações push"]'::jsonb,
   0),
  ('familia', 'Família',
   'Protecção completa para toda a família',
   249, 3.99, 6, 3,
   '["Tudo do plano Grátis","6 contactos de emergência","Rastreamento de viagens","Modo discreto (3 disfarces)","Alertas por SMS aos contactos","Rota segura com GPS","3 dispositivos BLE","Suporte prioritário"]'::jsonb,
   1),
  ('premium', 'Premium',
   'Segurança máxima, sem limites',
   499, 7.99, 99, 10,
   '["Tudo do plano Família","Contactos ilimitados","11 disfarces de camuflagem","Gravação automática de evidências","Óculos e anéis inteligentes","Radar comunitário","Anti-coerção com PIN falso","10 dispositivos BLE","Resposta 24/7"]'::jsonb,
   2)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      price_mzn = excluded.price_mzn,
      price_usd = excluded.price_usd,
      max_contacts = excluded.max_contacts,
      max_devices = excluded.max_devices,
      features = excluded.features,
      sort_order = excluded.sort_order,
      updated_at = now();

-- ============================================================
-- FIM. Para se tornar admin:
--   update public.profiles set role = 'admin'
--   where user_id = (select id from auth.users where email = 'o-teu-email@exemplo.com');
-- ============================================================
