-- ============================================
-- StatusAds Connect — Supabase Schema (v2)
-- ============================================
-- Execute this in the Supabase SQL Editor
-- 
-- Tables: profiles, devices, emergency_contacts, location_events, emergency_alerts, push_subscriptions
-- Features: RLS, PostGIS, triggers, realtime, emergency resolution, share tokens, web push
-- ============================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT 'Utilizador',
  phone         TEXT DEFAULT '',
  avatar_url    TEXT,
  safe_mode_enabled      BOOLEAN NOT NULL DEFAULT true,
  emergency_zone_lat     DOUBLE PRECISION,
  emergency_zone_lng     DOUBLE PRECISION,
  emergency_zone_radius  INTEGER NOT NULL DEFAULT 500,
  auto_activate_emergency BOOLEAN NOT NULL DEFAULT true,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'familia', 'premium')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilizador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 2. DEVICES (BLE paired devices)
-- ============================================
CREATE TABLE IF NOT EXISTS public.devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'phone' CHECK (type IN ('phone', 'airpods', 'smartwatch', 'other')),
  mac_address   TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#25D366',
  status        TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'connected', 'offline', 'low_battery')),
  battery       INTEGER NOT NULL DEFAULT 100 CHECK (battery >= 0 AND battery <= 100),
  last_location GEOMETRY(Point, 4326),
  is_monitored  BOOLEAN NOT NULL DEFAULT true,
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mac_address)
);

CREATE INDEX idx_devices_user_id ON public.devices(user_id);
CREATE INDEX idx_devices_status ON public.devices(user_id, status);
CREATE INDEX idx_devices_last_location ON public.devices USING GIST(last_location);

CREATE TRIGGER devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 3. EMERGENCY CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  relation      TEXT NOT NULL DEFAULT 'parente' CHECK (relation IN ('parente', 'conjuge', 'amigo', 'colega', 'outro')),
  phone         TEXT NOT NULL,
  email         TEXT DEFAULT '',
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  alert_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_user_id ON public.emergency_contacts(user_id);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 4. LOCATION EVENTS (activity log)
-- ============================================
CREATE TABLE IF NOT EXISTS public.location_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  type          TEXT NOT NULL DEFAULT 'location' CHECK (type IN ('location', 'alert', 'shield', 'bluetooth', 'emergency', 'geofence')),
  description   TEXT NOT NULL DEFAULT '',
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  location      GEOMETRY(Point, 4326),
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_id ON public.location_events(user_id);
CREATE INDEX idx_events_user_created ON public.location_events(user_id, created_at DESC);
CREATE INDEX idx_events_type ON public.location_events(user_id, type);
CREATE INDEX idx_events_location ON public.location_events USING GIST(location);

-- Auto-populate PostGIS point from lat/lng
CREATE OR REPLACE FUNCTION public.set_event_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_set_location
  BEFORE INSERT OR UPDATE ON public.location_events
  FOR EACH ROW EXECUTE FUNCTION public.set_event_location();

-- ============================================
-- 5. EMERGENCY ALERTS (active emergencies)
-- ============================================
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  location          GEOMETRY(Point, 4326),
  contacts_notified TEXT[] DEFAULT '{}',
  share_token       TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  -- Radar BT/WiFi (v3.10.0): testemunhas congeladas no momento do SOS
  witness_count     INTEGER,
  witness_snapshot  JSONB,
  resolved_at       TIMESTAMPTZ,
  resolve_reason    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_user ON public.emergency_alerts(user_id);
CREATE INDEX idx_alerts_active ON public.emergency_alerts(user_id, status) WHERE status = 'active';
CREATE INDEX idx_alerts_location ON public.emergency_alerts USING GIST(location);
CREATE INDEX idx_alerts_share_token ON public.emergency_alerts(share_token) WHERE share_token IS NOT NULL;

-- Auto-populate PostGIS point on emergency_alerts
CREATE OR REPLACE FUNCTION public.set_alert_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alerts_set_location ON public.emergency_alerts;
CREATE TRIGGER alerts_set_location
  BEFORE INSERT OR UPDATE ON public.emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_alert_location();

-- ============================================
-- 6. PUSH SUBSCRIPTIONS (Web Push)
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  keys_p256dh   TEXT NOT NULL,
  keys_auth     TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own devices" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own devices" ON public.devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own devices" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- Emergency Contacts
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contacts" ON public.emergency_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.emergency_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.emergency_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.emergency_contacts FOR DELETE USING (auth.uid() = user_id);

-- Location Events
ALTER TABLE public.location_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.location_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.location_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Emergency Alerts
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts" ON public.emergency_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON public.emergency_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.emergency_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Allow public read on alerts with share_token (for police/family tracking page)
CREATE POLICY "Public read via share token" ON public.emergency_alerts
  FOR SELECT USING (share_token IS NOT NULL);

-- Push Subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own push subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Edge function can read/write push subscriptions
-- (for sending push to users from server-side triggers)
CREATE POLICY "Service role full access push" ON public.push_subscriptions
  FOR ALL USING (true);

-- ============================================
-- 8. REALTIME SUBSCRIPTIONS
-- ====================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_events;

-- ============================================
-- 9. MIGRAÇÃO v3.10.0 — RADAR BLUETOOTH/WIFI
-- Testemunhas (BLE + WiFi, endereços em hash) congeladas no SOS.
-- Idempotente: segura correr em BDs que já tenham o CREATE TABLE acima.
-- ============================================
ALTER TABLE public.emergency_alerts ADD COLUMN IF NOT EXISTS witness_count INTEGER;
ALTER TABLE public.emergency_alerts ADD COLUMN IF NOT EXISTS witness_snapshot JSONB;

-- ============================================
-- 10. HELPER FUNCTIONS
-- ============================================

-- Get dashboard stats for a user
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  total_devices INT,
  online_devices INT,
  low_battery_devices INT,
  alerts_today INT,
  locations_today INT,
  active_emergencies INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM public.devices WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INT FROM public.devices WHERE user_id = p_user_id AND status IN ('online', 'connected')),
    (SELECT COUNT(*)::INT FROM public.devices WHERE user_id = p_user_id AND status = 'low_battery'),
    (SELECT COUNT(*)::INT FROM public.location_events WHERE user_id = p_user_id AND type IN ('alert', 'emergency') AND created_at >= date_trunc('day', now())),
    (SELECT COUNT(*)::INT FROM public.location_events WHERE user_id = p_user_id AND type = 'location' AND created_at >= date_trunc('day', now())),
    (SELECT COUNT(*)::INT FROM public.emergency_alerts WHERE user_id = p_user_id AND status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create emergency alert, log event, return contacts notified
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

  -- Return result
  RETURN QUERY SELECT v_alert_id, COALESCE(v_phones, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve an emergency alert
CREATE OR REPLACE FUNCTION public.resolve_emergency(
  p_alert_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.emergency_alerts
  SET 
    status = 'resolved',
    resolved_at = now(),
    resolve_reason = COALESCE(p_reason, 'Resolvida manualmente pelo utilizador')
  WHERE id = p_alert_id AND status = 'active';

  -- Log resolution event
  INSERT INTO public.location_events (user_id, type, description, metadata)
  SELECT 
    user_id, 
    'emergency', 
    'Emergencia resolvida: ' || COALESCE(p_reason, 'Resolvida manualmente'),
    jsonb_build_object('alert_id', p_alert_id, 'action', 'resolved')
  FROM public.emergency_alerts 
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark emergency as false alarm
CREATE OR REPLACE FUNCTION public.mark_false_alarm(
  p_alert_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.emergency_alerts
  SET 
    status = 'false_alarm',
    resolved_at = now(),
    resolve_reason = 'Marcada como falso alarme pelo utilizador'
  WHERE id = p_alert_id AND status = 'active';

  INSERT INTO public.location_events (user_id, type, description, metadata)
  SELECT 
    user_id, 
    'emergency', 
    'Falso alarme - emergencia cancelada',
    jsonb_build_object('alert_id', p_alert_id, 'action', 'false_alarm')
  FROM public.emergency_alerts 
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active emergency for a user (if any)
CREATE OR REPLACE FUNCTION public.get_active_emergency(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contacts_notified TEXT[],
  share_token TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id, ea.status, ea.latitude, ea.longitude, 
    ea.contacts_notified, ea.share_token, ea.created_at
  FROM public.emergency_alerts ea
  WHERE ea.user_id = p_user_id AND ea.status = 'active'
  ORDER BY ea.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get emergency alert by share token (public, for tracking page)
CREATE OR REPLACE FUNCTION public.get_emergency_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contacts_notified TEXT[],
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id, ea.latitude, ea.longitude, 
    ea.contacts_notified, ea.created_at, ea.resolved_at, ea.status
  FROM public.emergency_alerts ea
  WHERE ea.share_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get recent emergency history for a user
CREATE OR REPLACE FUNCTION public.get_emergency_history(p_user_id UUID, p_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  status TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contacts_notified TEXT[],
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolve_reason TEXT,
  share_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id, ea.status, ea.latitude, ea.longitude,
    ea.contacts_notified, ea.created_at, ea.resolved_at,
    ea.resolve_reason, ea.share_token
  FROM public.emergency_alerts ea
  WHERE ea.user_id = p_user_id
  ORDER BY ea.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Cleanup old location events (run daily via cron or pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_events(p_days INT DEFAULT 90)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.location_events
  WHERE created_at < now() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
