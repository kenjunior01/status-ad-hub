-- StatusAds Connect — Security Platform Schema
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ========================
-- ENUMS
-- ========================

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE device_type AS ENUM ('airpods', 'smartwatch', 'smartglasses', 'beacon', 'tracker', 'phone', 'other');
CREATE TYPE device_status AS ENUM ('online', 'offline', 'low_battery', 'error');
CREATE TYPE emergency_status AS ENUM ('active', 'resolved', 'false_alarm');
CREATE TYPE emergency_type AS ENUM ('ble_trigger', 'geofence_exit', 'manual', 'auto_detect', 'tamper_alert');
CREATE TYPE event_type AS ENUM ('location_update', 'emergency', 'geofence_enter', 'geofence_exit', 'device_connected', 'device_disconnected', 'battery_alert', 'system');
CREATE TYPE contact_relationship AS ENUM ('parent', 'sibling', 'spouse', 'friend', 'colleague', 'other');
CREATE TYPE subscription_plan AS ENUM ('free', 'family', 'business');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE proof_type AS ENUM ('audio', 'photo', 'video');
CREATE TYPE notification_type AS ENUM ('emergency', 'device', 'geofence', 'system', 'billing');
CREATE TYPE group_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- ========================
-- PROFILES
-- ========================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  country TEXT DEFAULT 'MZ',
  role user_role NOT NULL DEFAULT 'user',
  plan subscription_plan NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTIME,
  emergency_mode BOOLEAN NOT NULL DEFAULT false,
  stealth_mode BOOLEAN NOT NULL DEFAULT false,
  auto_emergency_on_geofence_exit BOOLEAN NOT NULL DEFAULT true,
  history_retention_days INT NOT NULL DEFAULT 7,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================
-- DEVICES
-- ========================

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type device_type NOT NULL DEFAULT 'other',
  ble_mac_address TEXT,
  firmware_version TEXT,
  battery_level INT CHECK (battery_level >= 0 AND battery_level <= 100),
  status device_status NOT NULL DEFAULT 'offline',
  last_latitude DECIMAL(10, 7),
  last_longitude DECIMAL(10, 7),
  last_accuracy_meters INT,
  last_seen_at TIMESTAMPTIME,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  auto_track BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own devices" ON devices FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================
-- EMERGENCY CONTACTS
-- ========================

CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship contact_relationship NOT NULL DEFAULT 'other',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  receives_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTIME NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone)
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contacts" ON emergency_contacts FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================
-- EMERGENCIES
-- ========================

CREATE TABLE emergencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  status emergency_status NOT NULL DEFAULT 'active',
  type emergency_type NOT NULL DEFAULT 'manual',
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy_meters INT,
  address TEXT,
  audio_url TEXT,
  photo_urls TEXT[],
  speed_kmh DECIMAL(5, 1),
  bearing_degrees INT,
  battery_level_at_trigger INT,
  share_token TEXT UNIQUE, -- for police sharing link
  resolved_at TIMESTAMPTIME,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own emergencies" ON emergencies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own emergencies" ON emergencies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own emergencies" ON emergencies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Police view via share token" ON emergencies FOR SELECT USING (share_token IS NOT NULL);

-- Index for fast emergency queries
CREATE INDEX idx_emergencies_user_status ON emergencies(user_id, status);
CREATE INDEX idx_emergencies_created ON emergencies(created_at DESC);
CREATE INDEX idx_emergencies_share_token ON emergencies(share_token) WHERE share_token IS NOT NULL;

-- ========================
-- LOCATION HISTORY
-- ========================

CREATE TABLE location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy_meters INT,
  speed_kmh DECIMAL(5, 1),
  bearing_degrees INT,
  altitude_meters DECIMAL(8, 2),
  recorded_at TIMESTAMPTIME NOT NULL DEFAULT now()
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions (example for current month)
CREATE TABLE location_history_2026_08 PARTITION OF location_history
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE location_history_2026_09 PARTITION OF location_history
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE location_history_default PARTITION OF location_history DEFAULT;

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own locations" ON location_history FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_location_user_time ON location_history(user_id, recorded_at DESC);
CREATE INDEX idx_location_device_time ON location_history(device_id, recorded_at DESC);

-- ========================
-- GEOFENCES
-- ========================

CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius_meters INT NOT NULL DEFAULT 200,
  enter_alert BOOLEAN NOT NULL DEFAULT false,
  exit_alert BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule_start TIME,
  schedule_end TIME,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own geofences" ON geofences FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER geofences_updated_at
  BEFORE UPDATE ON geofences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================
-- FAMILY GROUPS
-- ========================

CREATE TABLE family_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role group_role NOT NULL DEFAULT 'member',
  can_view_location BOOLEAN NOT NULL DEFAULT true,
  can_receive_alerts BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTIME NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ========================
-- EVENTS LOG
-- ========================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type event_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own events" ON events FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_events_user_type ON events(user_id, type, created_at DESC);

-- ========================
-- EMERGENCY EVIDENCE
-- ========================

CREATE TABLE emergency_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  type proof_type NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INT,
  duration_seconds INT,
  recorded_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE emergency_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own evidence" ON emergency_evidence FOR ALL
  USING (emergency_id IN (SELECT id FROM emergencies WHERE user_id = auth.uid()));

-- ========================
-- NOTIFICATIONS
-- ========================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ========================
-- SUBSCRIPTIONS / PAYMENTS
-- ========================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT DEFAULT 'stripe',
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTIME,
  current_period_end TIMESTAMPTIME,
  created_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- ========================
-- PLATFORM SETTINGS (admin)
-- ========================

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTIME NOT NULL DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON platform_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================
-- HELPER FUNCTIONS
-- ========================

-- Get user's active device count
CREATE OR REPLACE FUNCTION get_active_device_count(p_user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*) FROM devices
  WHERE user_id = p_user_id AND status = 'online';
$$ LANGUAGE sql STABLE;

-- Get user's emergency contact count
CREATE OR REPLACE FUNCTION get_emergency_contact_count(p_user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*) FROM emergency_contacts
  WHERE user_id = p_user_id AND receives_alerts = true;
$$ LANGUAGE sql STABLE;

-- Check if user has active emergency
CREATE OR REPLACE FUNCTION has_active_emergency(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM emergencies
    WHERE user_id = p_user_id AND status = 'active'
  );
$$ LANGUAGE sql STABLE;

-- Clean old location history (run daily via cron)
CREATE OR REPLACE FUNCTION clean_old_location_history()
RETURNS void AS $$
  DELETE FROM location_history
  WHERE recorded_at < now() - interval '90 days';
$$ LANGUAGE sql;

-- Generate emergency share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
  SELECT encode(gen_random_bytes(16), 'hex');
$$ LANGUAGE sql;

-- ========================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for emergency-critical tables
-- ========================

ALTER PUBLICATION supabase_realtime ADD TABLE emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE location_history;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
