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
