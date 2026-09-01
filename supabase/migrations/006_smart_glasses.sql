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
