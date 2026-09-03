-- ═══════════════════════════════════════════════════════════════════════════
-- STATUSADS CONNECT — APLICAR TUDO NO SUPABASE (ficheiro único)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- COMO USAR (3 passos):
--   1. Abre o SQL Editor do teu projecto Supabase
--      (dashboard.supabase.com → SQL Editor → New query)
--   2. Cola TODO este ficheiro e clica em RUN
--   3. No fim, troca o email no bloco final para o TEU email de admin
--      e corre só esse bloco (ver PUBLICAR.md passo 3)
--
-- Este ficheiro consolida as migrations 003 a 011:
--   003 auto notify on emergency | 004 settings | 005 check-in
--   006 smart glasses | 007 anti-coercion | 008 device activation
--   009 pagamentos + assinaturas + admin | 010 ficha médica
--   011 pagamento manual offline (zero API)
--   012 plano Bellvion (99 MT/mês, exclusivo dispositivos da marca)
--
-- Se já aplicaste alguma destas migrations antes, procura o bloco
-- correspondente abaixo e remove-o antes de correr (ou ignora os erros
-- "already exists" — os objectos existentes não são recriados).
-- ═══════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════
-- >>> 003_auto_notify_on_emergency.sql
-- ═════════════════════════════════════════════════════════════════════

-- ============================================
-- StatusAds Connect — Migration: Auto-notify on Emergency
-- ============================================
-- This migration adds:
--   1. pg_net extension for async HTTP calls from PostgreSQL
--   2. A trigger that fires notify-contacts edge function
--      whenever a new emergency_alerts row is inserted
--
-- Prerequisites:
--   - pg_net extension must be enabled in Supabase
--   - notify-contacts edge function must be deployed
--   - TWILIO_* secrets must be set in Edge Function secrets
-- ============================================

-- Enable pg_net for async HTTP requests from the database
-- (Supabase supports this natively)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to the anon and authenticated roles
GRANT USAGE ON SCHEMA net TO authenticated, anon;

-- ============================================
-- Trigger function: auto-notify emergency contacts
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_notify_on_emergency()
RETURNS TRIGGER AS $$
DECLARE
  v_base_url TEXT;
  v_payload JSONB;
BEGIN
  -- Only notify for new active emergencies (not false_alarms, not resolved)
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Build the base URL for edge function invocation
  -- Uses the project's own URL (set this in Supabase env or use a default)
  v_base_url := COALESCE(
    current_setting('app.supabase_url', true),
    ''
  );

  -- If base URL is empty, skip (edge function will be called from frontend instead)
  IF v_base_url = '' THEN
    RAISE LOG '[AUTO-NOTIFY] app.supabase_url not set, skipping DB trigger. Frontend will handle notification.';
    RETURN NEW;
  END IF;

  -- Build the payload
  v_payload := jsonb_build_object(
    'userId', NEW.user_id,
    'alertId', NEW.id,
    'latitude', NEW.latitude,
    'longitude', NEW.longitude
  );

  -- Fire the notify-contacts edge function asynchronously via pg_net
  -- This runs in the background, not blocking the INSERT
  PERFORM net.http_post(
    url := v_base_url || '/functions/v1/notify-contacts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := v_payload::text
  );

  RAISE LOG '[AUTO-NOTIFY] Triggered notification for alert % (user %)', NEW.id, NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to emergency_alerts
DROP TRIGGER IF EXISTS on_emergency_created ON public.emergency_alerts;
CREATE TRIGGER on_emergency_created
  AFTER INSERT ON public.emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION public.auto_notify_on_emergency();

-- ============================================
-- Helper: manual trigger function
-- ============================================
-- If you prefer to call this manually instead of via trigger,
-- or if pg_net is not available, use this function:
CREATE OR REPLACE FUNCTION public.notify_emergency_contacts(
  p_user_id UUID,
  p_alert_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS VOID AS $$
DECLARE
  v_base_url TEXT;
BEGIN
  v_base_url := COALESCE(
    current_setting('app.supabase_url', true),
    ''
  );

  IF v_base_url = '' THEN
    RAISE NOTICE 'app.supabase_url not set. Cannot notify contacts from DB.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_base_url || '/functions/v1/notify-contacts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'userId', p_user_id,
      'alertId', p_alert_id,
      'latitude', p_latitude,
      'longitude', p_longitude
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Update trigger_emergency to also fire notification
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_emergency(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS TABLE (alert_id UUID, notified_phones TEXT[]) AS $$
DECLARE
  v_alert_id UUID;
  v_phones TEXT[];
BEGIN
  -- Create the alert
  INSERT INTO public.emergency_alerts (user_id, latitude, longitude)
  VALUES (p_user_id, p_latitude, p_longitude)
  RETURNING id INTO v_alert_id;

  -- Log the event
  INSERT INTO public.location_events (user_id, type, description, latitude, longitude, metadata)
  VALUES (
    p_user_id,
    'emergency',
    'Emergencia activada - GPS: ' || p_latitude::TEXT || ', ' || p_longitude::TEXT,
    p_latitude,
    p_longitude,
    jsonb_build_object('alert_id', v_alert_id)
  );

  -- Collect contacts to notify
  SELECT ARRAY_AGG(phone) INTO v_phones
  FROM public.emergency_contacts
  WHERE user_id = p_user_id AND alert_enabled = true;

  -- Update alert with notified contacts
  UPDATE public.emergency_alerts
  SET contacts_notified = COALESCE(v_phones, '{}')
  WHERE id = v_alert_id;

  -- Attempt to fire notification from DB (if pg_net is configured)
  -- This is a best-effort call; the frontend also calls notify-contacts
  BEGIN
    PERFORM public.notify_emergency_contacts(p_user_id, v_alert_id, p_latitude, p_longitude);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'DB notification trigger failed (frontend will handle): %', SQLERRM;
  END;

  -- Return result
  RETURN QUERY SELECT v_alert_id, COALESCE(v_phones, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═════════════════════════════════════════════════════════════════════
-- >>> 004_settings_enhancements.sql
-- ═════════════════════════════════════════════════════════════════════

-- ============================================
-- StatusAds Connect — Migration 004
-- Settings enhancements: notification_prefs, account deletion
-- ============================================

-- 1. Add notification_prefs JSONB column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{
    "alerts": true,
    "location": true,
    "battery": true,
    "tips": false,
    "sound": true,
    "vibration": true
  }'::jsonb;

-- 2. Delete user account RPC
-- This function deletes all user data and the auth user.
-- NOTE: Requires the caller to be the user themselves (auth.uid() check).
-- For service_role deletion, remove the auth.uid() check.
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify the caller is deleting their own account
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own account';
  END IF;

  -- Delete all related data (CASCADE should handle most, but be explicit)
  DELETE FROM public.location_events WHERE user_id = p_user_id;
  DELETE FROM public.emergency_contacts WHERE user_id = p_user_id;
  DELETE FROM public.devices WHERE user_id = p_user_id;
  DELETE FROM public.emergency_alerts WHERE user_id = p_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;

  -- Delete the auth user (requires service_role or specific permission)
  -- This may fail with RLS — the edge function or admin API should handle auth deletion
  -- DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Edge function: send-sms dry-run support
-- Modify the send-sms function to accept a dryRun flag
-- (This is handled in the Edge Function code, not SQL)

-- 4. Make notification_prefs updatable via RLS
-- (Already covered by the existing "Users can update own profile" policy)


-- ═════════════════════════════════════════════════════════════════════
-- >>> 005_checkin_system.sql
-- ═════════════════════════════════════════════════════════════════════

-- Check-in Safety System
-- Allows users to set periodic check-ins; missed check-ins trigger alerts.

-- Check-in configuration (one per user)
CREATE TABLE IF NOT EXISTS public.checkin_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (interval_minutes >= 5),
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT CHECK (start_time ~ '^[0-9]{2}:[0-9]{2}$' OR start_time IS NULL),
  end_time TEXT CHECK (end_time ~ '^[0-9]{2}:[0-9]{2}$' OR end_time IS NULL),
  message_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Check-in records
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'missed', 'expired')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  message TEXT,
  checked_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.checkin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own checkin config" ON public.checkin_configs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own checkin config" ON public.checkin_configs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own checkin config" ON public.checkin_configs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own checkin config" ON public.checkin_configs FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can read own checkins" ON public.checkins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own checkins" ON public.checkins FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own checkins" ON public.checkins FOR UPDATE USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON public.checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON public.checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_configs_user_id ON public.checkin_configs(user_id);

-- Realtime
alter publication supabase_realtime add table public.checkins;

-- Function to check for missed check-ins (called by cron or pg_net)
CREATE OR REPLACE FUNCTION public.check_missed_checkins()
RETURNS void AS $$
BEGIN
  UPDATE public.checkins
  SET status = 'missed'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get check-in stats
CREATE OR REPLACE FUNCTION public.get_checkin_stats(p_user_id UUID)
RETURNS TABLE(total_checkins BIGINT, missed_checkins BIGINT, current_streak BIGINT) AS $$
SELECT
  COUNT(*) FILTER (WHERE status = 'checked_in')::BIGINT,
  COUNT(*) FILTER (WHERE status = 'missed')::BIGINT,
  (
    SELECT COUNT(*)::BIGINT
    FROM (
      SELECT checked_at, status,
             LAG(checked_at) OVER (ORDER BY checked_at DESC) as prev_checked
      FROM public.checkins
      WHERE user_id = p_user_id AND status = 'checked_in' AND checked_at IS NOT NULL
      ORDER BY checked_at DESC
      LIMIT 100
    ) sub
    WHERE prev_checked IS NULL OR (checked_at - prev_checked) < interval '24 hours'
  )
FROM public.checkins
WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Auto-notify on missed check-in
CREATE OR REPLACE FUNCTION public.on_missed_checkin_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_user_record RECORD;
  v_contacts TEXT[];
  v_base_url TEXT;
BEGIN
  IF NEW.status = 'missed' THEN
    -- Get user's emergency contacts
    SELECT array_agg(phone) INTO v_contacts
    FROM public.emergency_contacts
    WHERE user_id = NEW.user_id AND alert_enabled = true;
    
    IF array_length(v_contacts, 1) > 0 THEN
      -- Get base URL from pg_net config
      SELECT COALESCE(NULLIF(current_setting('app.service_role_key', true), ''), '') INTO v_base_url;
      
      -- Trigger notification via edge function
      PERFORM net.http_post(
        url := (current_setting('app.supabase_url', true) || '/functions/v1/notify-missed-checkin'),
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'checkin_id', NEW.id,
          'contacts', v_contacts,
          'missed_at', NEW.expires_at
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_missed_checkin_notify ON public.checkins;
CREATE TRIGGER trigger_missed_checkin_notify
  AFTER UPDATE ON public.checkins
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'missed')
  EXECUTE FUNCTION public.on_missed_checkin_notify();


-- ═════════════════════════════════════════════════════════════════════
-- >>> 006_smart_glasses.sql
-- ═════════════════════════════════════════════════════════════════════

-- Smart Glasses Integration
-- Tables for glasses config, tap events, and audio evidence

CREATE TABLE IF NOT EXISTS public.smart_glasses_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  sos_tap_pattern TEXT NOT NULL DEFAULT 'double' CHECK (sos_tap_pattern IN ('double', 'triple', 'long_press')),
  sos_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_record_audio BOOLEAN NOT NULL DEFAULT true,
  max_record_duration INTEGER NOT NULL DEFAULT 120 CHECK (max_record_duration BETWEEN 10 AND 600),
  removal_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  removal_grace_seconds INTEGER NOT NULL DEFAULT 30 CHECK (removal_grace_seconds BETWEEN 5 AND 300),
  share_audio_evidence BOOLEAN NOT NULL DEFAULT false,
  hid_key_code INTEGER NOT NULL DEFAULT 0,
  stealth_mode BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.glasses_tap_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  pattern TEXT NOT NULL CHECK (pattern IN ('double', 'triple', 'long_press')),
  action_triggered TEXT NOT NULL DEFAULT 'none' CHECK (action_triggered IN ('sos', 'checkin', 'none')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audio_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_alert_id UUID REFERENCES public.emergency_alerts(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  audio_url TEXT,
  audio_data_b64 TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.smart_glasses_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glasses_tap_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own glasses config" ON public.smart_glasses_configs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own glasses config" ON public.smart_glasses_configs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own glasses config" ON public.smart_glasses_configs FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users read own tap events" ON public.glasses_tap_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own tap events" ON public.glasses_tap_events FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own audio evidence" ON public.audio_evidence FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own audio evidence" ON public.audio_evidence FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own audio evidence" ON public.audio_evidence FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own audio evidence" ON public.audio_evidence FOR DELETE USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_glasses_tap_events_user ON public.glasses_tap_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_glasses_tap_events_device ON public.glasses_tap_events(device_id);
CREATE INDEX IF NOT EXISTS idx_audio_evidence_user ON public.audio_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_evidence_emergency ON public.audio_evidence(emergency_alert_id);

-- Realtime
alter publication supabase_realtime add table public.glasses_tap_events;
alter publication supabase_realtime add table public.audio_evidence;

-- Auto-cleanup old audio evidence (older than 90 days) via function
CREATE OR REPLACE FUNCTION public.cleanup_old_audio_evidence()
RETURNS void AS $$
BEGIN
  DELETE FROM public.audio_evidence
  WHERE created_at < now() - interval '90 days'
    AND audio_data_b64 IS NOT NULL; -- Only delete local-stored audio
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═════════════════════════════════════════════════════════════════════
-- >>> 007_anti_coercion.sql
-- ═════════════════════════════════════════════════════════════════════

-- ============================================
-- 007: Anti-Coercion Password System
-- ============================================
-- 
-- NOTE: The panic password hash is stored CLIENT-SIDE only (localStorage).
-- This table exists to log coercion events for post-incident analysis.
-- The actual panic password NEVER leaves the device.
-- 
-- This migration adds:
-- 1. A log table for coercion mode activations
-- 2. RPC function to log coercion events
-- ============================================

CREATE TABLE IF NOT EXISTS public.coercion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('activated', 'deactivated', 'sos_dispatched', 'sos_failed')),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can only read their own coercion logs
ALTER TABLE public.coercion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coercion logs" ON public.coercion_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert coercion logs" ON public.coercion_logs
  FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_coercion_logs_user_created ON public.coercion_logs(user_id, created_at DESC);

-- ============================================
-- RPC: Log coercion event
-- ============================================
CREATE OR REPLACE FUNCTION public.log_coercion_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.coercion_logs (user_id, event_type, ip_address, user_agent, metadata)
  VALUES (
    p_user_id,
    p_event_type,
    current_setting('request.header.x-forwarded-for', true),
    current_setting('request.header.user-agent', true),
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═════════════════════════════════════════════════════════════════════
-- >>> 008_device_activation.sql
-- ═════════════════════════════════════════════════════════════════════

-- Device Activation Codes Table
-- Users must purchase a device and use its activation code to create an account

CREATE TABLE IF NOT EXISTS public.device_activation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'tracker',
  product_id UUID REFERENCES public.products(id),
  used BOOLEAN NOT NULL DEFAULT false,
  activated_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE public.device_activation_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code is valid (needed during activation before auth)
CREATE POLICY "Activation codes are viewable during activation" ON public.device_activation_codes
  FOR SELECT USING (true);

-- Only authenticated users or service role can update (mark as used)
CREATE POLICY "Only system can update activation codes" ON public.device_activation_codes
  FOR UPDATE USING (true);

-- Only service role can insert
CREATE POLICY "Only service role can insert codes" ON public.device_activation_codes
  FOR INSERT WITH CHECK (true);

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.device_activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_unused ON public.device_activation_codes(used) WHERE NOT used;

-- RPC function to validate and consume activation code
CREATE OR REPLACE FUNCTION public.validate_activation_code(p_code TEXT)
RETURNS TABLE(id UUID, device_type TEXT, product_id UUID, used BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT dac.id, dac.device_type, dac.product_id, dac.used
  FROM public.device_activation_codes dac
  WHERE dac.code = upper(p_code)
    AND dac.used = false
    AND (dac.expires_at IS NULL OR dac.expires_at > now())
  LIMIT 1;
END;
$$;

-- RPC function to consume activation code after account creation
CREATE OR REPLACE FUNCTION public.consume_activation_code(p_code TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.device_activation_codes
  SET used = true, activated_by = p_user_id, activated_at = now()
  WHERE code = upper(p_code) AND used = false
  RETURNING 1 INTO v_updated;
  RETURN v_updated = 1;
END;
$$;


-- ═════════════════════════════════════════════════════════════════════
-- >>> 009_payments_subscriptions.sql
-- ═════════════════════════════════════════════════════════════════════

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


-- ═════════════════════════════════════════════════════════════════════
-- >>> 010_medical_profile.sql
-- ═════════════════════════════════════════════════════════════════════

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


-- ═════════════════════════════════════════════════════════════════════
-- >>> 011_app_settings_manual_payments.sql
-- ═════════════════════════════════════════════════════════════════════

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

-- >>> 012_bellvion_plan.sql
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
