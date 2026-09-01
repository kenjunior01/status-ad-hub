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
