-- ============================================
-- StatusAds Connect — Supabase Schema
-- ============================================
-- Execute this in the Supabase SQL Editor
-- 
-- Tables: profiles, devices, emergency_contacts, location_events
-- Features: RLS, PostGIS, triggers, realtime
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
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  location      GEOMETRY(Point, 4326),
  contacts_notified TEXT[] DEFAULT '{}',
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_user ON public.emergency_alerts(user_id);
CREATE INDEX idx_alerts_location ON public.emergency_alerts USING GIST(location);

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- Profiles: users can only read/write their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Devices: users can only manage their own
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own devices"
  ON public.devices FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own devices"
  ON public.devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own devices"
  ON public.devices FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own devices"
  ON public.devices FOR DELETE
  USING (auth.uid() = user_id);

-- Emergency Contacts: users can only manage their own
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contacts"
  ON public.emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts"
  ON public.emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts"
  ON public.emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Location Events: users can only manage their own
ALTER TABLE public.location_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events"
  ON public.location_events FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events"
  ON public.location_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Emergency Alerts: users can only manage their own
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts"
  ON public.emergency_alerts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts"
  ON public.emergency_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts"
  ON public.emergency_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_events;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Get dashboard stats for a user
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  total_devices INT,
  online_devices INT,
  low_battery_devices INT,
  alerts_today INT,
  locations_today INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM public.devices WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INT FROM public.devices WHERE user_id = p_user_id AND status IN ('online', 'connected')),
    (SELECT COUNT(*)::INT FROM public.devices WHERE user_id = p_user_id AND status = 'low_battery'),
    (SELECT COUNT(*)::INT FROM public.location_events WHERE user_id = p_user_id AND type = 'alert' AND created_at >= date_trunc('day', now())),
    (SELECT COUNT(*)::INT FROM public.location_events WHERE user_id = p_user_id AND type = 'location' AND created_at >= date_trunc('day', now()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create emergency alert and log event
CREATE OR REPLACE FUNCTION public.trigger_emergency(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_contact_phone TEXT;
BEGIN
  -- Create the alert
  INSERT INTO public.emergency_alerts (user_id, latitude, longitude)
  VALUES (p_user_id, p_latitude, p_longitude)
  RETURNING id INTO v_alert_id;

  -- Log the event
  INSERT INTO public.location_events (user_id, type, description, latitude, longitude)
  VALUES (
    p_user_id,
    'emergency',
    'Emergencia activada - GPS: ' || p_latitude::TEXT || ', ' || p_longitude::TEXT,
    p_latitude,
    p_longitude
  );

  -- Mark contacts as notified
  UPDATE public.emergency_alerts
  SET contacts_notified = ARRAY(
    SELECT phone FROM public.emergency_contacts
    WHERE user_id = p_user_id AND alert_enabled = true
  )
  WHERE id = v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
