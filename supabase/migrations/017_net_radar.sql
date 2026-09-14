-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION 017 — RADAR WI-FI/REDES (v3.16.0)
-- Tabela net_trails: rastro de redes Wi-Fi próximas + torres celulares
-- capturadas SEM SE LIGAR a elas (WifiRadar). Sai com o SOS e alimenta
-- a investigação ("Quem/Onde/Quando" — BSSID, SSID, sinal, segurança).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.net_trails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sos_alert_id uuid references public.emergency_alerts(id) on delete set null,
  points jsonb not null default '[]'::jsonb,
  network_count integer not null default 0,
  unique_networks integer not null default 0,
  threats integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_net_trails_user_created
  on public.net_trails (user_id, created_at desc);
create index if not exists idx_net_trails_alert
  on public.net_trails (sos_alert_id) where sos_alert_id is not null;

alter table public.net_trails enable row level security;

-- Utilizador: ver/guardar os PRÓPRIOS rastros
drop policy if exists "net_trails_select_own" on public.net_trails;
create policy "net_trails_select_own"
  on public.net_trails for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "net_trails_insert_own" on public.net_trails;
create policy "net_trails_insert_own"
  on public.net_trails for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "net_trails_delete_own" on public.net_trails;
create policy "net_trails_delete_own"
  on public.net_trails for delete to authenticated
  using (auth.uid() = user_id);

-- Admin: ver todos os rastros (investigação)
drop policy if exists "net_trails_admin_read" on public.net_trails;
create policy "net_trails_admin_read"
  on public.net_trails for select to authenticated
  using (public.is_admin());

comment on table public.net_trails IS
  'Rastro Wifi Radar (v3.16.0): pontos GPS + redes Wi-Fi próximas capturadas sem se ligar (BSSID, SSID, RSSI, segurança, canal) + torres celulares. Enviado automaticamente no SOS e sobrevive à destruição do telemóvel.';

-- FIM DA MIGRATION 017
