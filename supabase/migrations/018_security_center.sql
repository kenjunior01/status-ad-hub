-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 018 — CENTRAL DE SEGURANÇA (v3.17.0)
--   · wifi_registry  — registo sincronizado de TODAS as redes Wi-Fi já
--     capturadas pelo Radar (BSSID único por utilizador, contadores de
--     observação, GPS aproximado). Sobrevive à perda do telemóvel.
--   · security_events — diário de eventos de segurança (ameaças de rede,
--     rastreadores BLE, SOS, PIN duress, sistema) para investigação e
--     auditoria no Painel Admin.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Registo Wi-Fi sincronizado ────────────────────────────────────────────
create table if not exists public.wifi_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bssid text not null,
  ssid text not null,
  sec text,
  freq integer,
  best_rssi integer,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  seen_count integer not null default 1,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  unique (user_id, bssid)
);

create index if not exists idx_wifi_registry_user_last
  on public.wifi_registry (user_id, last_seen desc);
create index if not exists idx_wifi_registry_ssid
  on public.wifi_registry (ssid);

alter table public.wifi_registry enable row level security;

drop policy if exists "wifi_registry_select_own" on public.wifi_registry;
create policy "wifi_registry_select_own"
  on public.wifi_registry for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "wifi_registry_insert_own" on public.wifi_registry;
create policy "wifi_registry_insert_own"
  on public.wifi_registry for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "wifi_registry_update_own" on public.wifi_registry;
create policy "wifi_registry_update_own"
  on public.wifi_registry for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wifi_registry_delete_own" on public.wifi_registry;
create policy "wifi_registry_delete_own"
  on public.wifi_registry for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "wifi_registry_admin_read" on public.wifi_registry;
create policy "wifi_registry_admin_read"
  on public.wifi_registry for select to authenticated
  using (public.is_admin());

comment on table public.wifi_registry IS
  'Registo sincronizado do Radar Wi-Fi (v3.17.0): todas as redes já capturadas por utilizador (BSSID único), com contadores e GPS aproximado. Investigação: onde/quando a vítima esteve, mesmo sem SOS.';

-- ── Diário de eventos de segurança ────────────────────────────────────────
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  ts timestamptz not null default now(),
  kind text not null check (kind in ('threat','tracker','sos','checkin','duress','scan','system')),
  severity text not null default 'info' check (severity in ('high','medium','low','info')),
  title text not null,
  detail text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_events_user_ts
  on public.security_events (user_id, ts desc);
create index if not exists idx_security_events_kind
  on public.security_events (kind, severity);

alter table public.security_events enable row level security;

drop policy if exists "security_events_select_own" on public.security_events;
create policy "security_events_select_own"
  on public.security_events for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "security_events_insert_own" on public.security_events;
create policy "security_events_insert_own"
  on public.security_events for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "security_events_delete_own" on public.security_events;
create policy "security_events_delete_own"
  on public.security_events for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "security_events_admin_read" on public.security_events;
create policy "security_events_admin_read"
  on public.security_events for select to authenticated
  using (public.is_admin());

comment on table public.security_events IS
  'Diário de segurança (v3.17.0): ameaças de rede (evil twins, honeypots, redes abertas), rastreadores BLE detectados, SOS, PIN duress e alterações de sistema. Auditoria e investigação no Painel Admin.';

-- FIM DA MIGRATION 018
