-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 019 — INTELIGÊNCIA DE AMBIENTE (v3.18.0)
--
-- Tabela place_fingerprints: os "locais conhecidos" de cada utilizador,
-- identificados pela impressão digital dos BSSIDs dominantes (hash estável
-- FNV-1a dos 8 sinais mais fortes). Permite investigação forense:
--
--   · ONDE a vítima costuma estar (casa, trabalho, escola…) sem revelar
--     o endereço — só o padrão de redes
--   · QUANDO apareceu um local NOVO (deslocamento abrupto = possível
--     rapto/coação) — o SOS e o diário referem o local por etiqueta
--   · Reconstrução de rota combinada com net_trails/ble_trails
--
-- A etiqueta ("Local 1", "Local 2"…) é auto-atribuída no aparelho; o
-- utilizador pode renomear na app (futuro: update). RLS estrita: cada
-- utilizador só vê/insere/apaga os SEUS locais; admin só leitura.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.place_fingerprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hash text not null,
  label text not null default 'Local',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  seen_count integer not null default 1,
  lat double precision,
  lng double precision,
  sample jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, hash)
);

create index if not exists idx_place_fingerprints_user_last
  on public.place_fingerprints (user_id, last_seen desc);

alter table public.place_fingerprints enable row level security;

drop policy if exists "place_fingerprints_select_own" on public.place_fingerprints;
create policy "place_fingerprints_select_own"
  on public.place_fingerprints for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "place_fingerprints_insert_own" on public.place_fingerprints;
create policy "place_fingerprints_insert_own"
  on public.place_fingerprints for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "place_fingerprints_update_own" on public.place_fingerprints;
create policy "place_fingerprints_update_own"
  on public.place_fingerprints for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "place_fingerprints_delete_own" on public.place_fingerprints;
create policy "place_fingerprints_delete_own"
  on public.place_fingerprints for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "place_fingerprints_admin_read" on public.place_fingerprints;
create policy "place_fingerprints_admin_read"
  on public.place_fingerprints for select to authenticated
  using (public.is_admin());

comment on table public.place_fingerprints IS
  'Locais conhecidos por impressão digital Wi-Fi (v3.18.0): hash estável dos BSSIDs dominantes de cada sítio onde o utilizador esteve. Deslocamento abrupto para um local novo é sinal de rapto/coação e fica marcado no diário de segurança (security_events) e no relatório do SOS.';

-- FIM DA MIGRATION 019
