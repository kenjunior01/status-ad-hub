-- =========== PROFILES (extend existing) ===========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS safe_mode_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS emergency_zone_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS emergency_zone_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS emergency_zone_radius INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS auto_activate_emergency BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========== DEVICES ===========
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  mac_address TEXT,
  color TEXT NOT NULL DEFAULT '#25D366',
  status TEXT NOT NULL DEFAULT 'offline',
  battery INTEGER NOT NULL DEFAULT 100,
  last_seen TIMESTAMPTZ,
  last_location JSONB,
  is_monitored BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own devices" ON public.devices;
CREATE POLICY "Users manage own devices" ON public.devices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS devices_touch ON public.devices;
CREATE TRIGGER devices_touch BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_devices_user ON public.devices(user_id);

-- =========== EMERGENCY CONTACTS ===========
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'outro',
  "group" TEXT NOT NULL DEFAULT 'geral',
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  alert_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own contacts" ON public.emergency_contacts;
CREATE POLICY "Users manage own contacts" ON public.emergency_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS contacts_touch ON public.emergency_contacts;
CREATE TRIGGER contacts_touch BEFORE UPDATE ON public.emergency_contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.emergency_contacts(user_id);

-- =========== LOCATION EVENTS ===========
CREATE TABLE IF NOT EXISTS public.location_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'location',
  description TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.location_events TO authenticated;
GRANT ALL ON public.location_events TO service_role;
ALTER TABLE public.location_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own events" ON public.location_events;
CREATE POLICY "Users manage own events" ON public.location_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON public.location_events(user_id, created_at DESC);

-- =========== EMERGENCY ALERTS ===========
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  contacts_notified TEXT[] NOT NULL DEFAULT '{}',
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  resolved_at TIMESTAMPTZ,
  resolve_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.emergency_alerts TO authenticated;
GRANT ALL ON public.emergency_alerts TO service_role;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own alerts" ON public.emergency_alerts;
CREATE POLICY "Users manage own alerts" ON public.emergency_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON public.emergency_alerts(user_id, status);

-- =========== CHECK-INS ===========
CREATE TABLE IF NOT EXISTS public.checkin_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT,
  end_time TEXT,
  message_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_configs TO authenticated;
GRANT ALL ON public.checkin_configs TO service_role;
ALTER TABLE public.checkin_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own checkin config" ON public.checkin_configs;
CREATE POLICY "Users manage own checkin config" ON public.checkin_configs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS checkin_configs_touch ON public.checkin_configs;
CREATE TRIGGER checkin_configs_touch BEFORE UPDATE ON public.checkin_configs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'checked_in',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  message TEXT,
  checked_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own checkins" ON public.checkins;
CREATE POLICY "Users manage own checkins" ON public.checkins FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_time ON public.checkins(user_id, created_at DESC);

-- =========== SMART GLASSES ===========
CREATE TABLE IF NOT EXISTS public.smart_glasses_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  sos_tap_pattern TEXT NOT NULL DEFAULT 'triple',
  sos_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_record_audio BOOLEAN NOT NULL DEFAULT true,
  max_record_duration INTEGER NOT NULL DEFAULT 60,
  removal_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  removal_grace_seconds INTEGER NOT NULL DEFAULT 30,
  share_audio_evidence BOOLEAN NOT NULL DEFAULT true,
  hid_key_code INTEGER NOT NULL DEFAULT 0,
  stealth_mode BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_glasses_configs TO authenticated;
GRANT ALL ON public.smart_glasses_configs TO service_role;
ALTER TABLE public.smart_glasses_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own glasses config" ON public.smart_glasses_configs;
CREATE POLICY "Users manage own glasses config" ON public.smart_glasses_configs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.glasses_tap_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  action_triggered TEXT NOT NULL DEFAULT 'none',
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.glasses_tap_events TO authenticated;
GRANT ALL ON public.glasses_tap_events TO service_role;
ALTER TABLE public.glasses_tap_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tap events" ON public.glasses_tap_events;
CREATE POLICY "Users manage own tap events" ON public.glasses_tap_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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
GRANT SELECT, INSERT, DELETE ON public.audio_evidence TO authenticated;
GRANT ALL ON public.audio_evidence TO service_role;
ALTER TABLE public.audio_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own audio evidence" ON public.audio_evidence;
CREATE POLICY "Users manage own audio evidence" ON public.audio_evidence FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== COMMUNITY ALERTS ===========
CREATE TABLE IF NOT EXISTS public.community_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  type TEXT NOT NULL DEFAULT 'suspicious_activity',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 300,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  report_count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_alerts TO authenticated;
GRANT ALL ON public.community_alerts TO service_role;
ALTER TABLE public.community_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view alerts" ON public.community_alerts;
CREATE POLICY "Anyone authenticated can view alerts" ON public.community_alerts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own alerts" ON public.community_alerts;
CREATE POLICY "Users create own alerts" ON public.community_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own alerts" ON public.community_alerts;
CREATE POLICY "Users update own alerts" ON public.community_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own alerts" ON public.community_alerts;
CREATE POLICY "Users delete own alerts" ON public.community_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========== DEVICE ACTIVATION CODES ===========
CREATE TABLE IF NOT EXISTS public.device_activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'other',
  product_id TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.device_activation_codes TO anon, authenticated;
GRANT ALL ON public.device_activation_codes TO service_role;
ALTER TABLE public.device_activation_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can verify unused codes" ON public.device_activation_codes;
CREATE POLICY "Anyone can verify unused codes" ON public.device_activation_codes FOR SELECT TO anon, authenticated USING (used = false);
DROP POLICY IF EXISTS "Anyone can redeem unused codes" ON public.device_activation_codes;
CREATE POLICY "Anyone can redeem unused codes" ON public.device_activation_codes FOR UPDATE TO anon, authenticated USING (used = false) WITH CHECK (used = true);

-- =========== PUSH SUBSCRIPTIONS ===========
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subs" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);