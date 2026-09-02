-- ============================================================
-- 010: FICHA MÉDICA DE EMERGÊNCIA
-- Campos médicos no perfil + exposição segura na página
-- pública de tracking (/track/:token) para socorristas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colunas médicas em profiles
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists blood_type text
    check (blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'desconhecido') or blood_type is null),
  add column if not exists allergies text,
  add column if not exists medications text,
  add column if not exists medical_notes text;

-- ------------------------------------------------------------
-- 2. RPC de partilha estendido: devolve ficha médica
--    (substitui a versão do schema base; campos extra são
--    opcionais para clientes antigos)
-- ------------------------------------------------------------
create or replace function public.get_emergency_by_token(p_token text)
returns table (
  id uuid,
  latitude double precision,
  longitude double precision,
  contacts_notified text[],
  created_at timestamptz,
  resolved_at timestamptz,
  status text,
  full_name text,
  blood_type text,
  allergies text,
  medications text,
  medical_notes text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return query
  select
    ea.id,
    ea.latitude,
    ea.longitude,
    ea.contacts_notified,
    ea.created_at,
    ea.resolved_at,
    ea.status,
    p.full_name,
    p.blood_type,
    p.allergies,
    p.medications,
    p.medical_notes
  from public.emergency_alerts ea
  left join public.profiles p on p.user_id = ea.user_id
  where ea.share_token = p_token;
end;
$$;
