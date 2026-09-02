-- get_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  total_devices integer,
  online_devices integer,
  low_battery_devices integer,
  alerts_today integer,
  locations_today integer,
  active_emergencies integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::int FROM public.devices d WHERE d.user_id = p_user_id),
    (SELECT count(*)::int FROM public.devices d WHERE d.user_id = p_user_id AND d.status = 'online'),
    (SELECT count(*)::int FROM public.devices d WHERE d.user_id = p_user_id AND d.battery < 20),
    (SELECT count(*)::int FROM public.location_events e WHERE e.user_id = p_user_id AND e.type = 'alert' AND e.created_at >= date_trunc('day', now())),
    (SELECT count(*)::int FROM public.location_events e WHERE e.user_id = p_user_id AND e.created_at >= date_trunc('day', now())),
    (SELECT count(*)::int FROM public.emergency_alerts a WHERE a.user_id = p_user_id AND a.status = 'active');
END;
$$;

-- trigger_emergency
CREATE OR REPLACE FUNCTION public.trigger_emergency(p_user_id uuid, p_latitude double precision, p_longitude double precision)
RETURNS TABLE (alert_id uuid, notified_phones text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
  v_phones text[];
  v_token text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Reuse an existing active alert if one exists (avoid duplicates)
  SELECT a.id, a.contacts_notified INTO v_alert_id, v_phones
  FROM public.emergency_alerts a
  WHERE a.user_id = p_user_id AND a.status = 'active'
  ORDER BY a.created_at DESC
  LIMIT 1;

  IF v_alert_id IS NOT NULL THEN
    UPDATE public.emergency_alerts
    SET latitude = p_latitude, longitude = p_longitude
    WHERE id = v_alert_id;
    RETURN QUERY SELECT v_alert_id, COALESCE(v_phones, '{}'::text[]);
    RETURN;
  END IF;

  SELECT COALESCE(array_agg(c.phone), '{}'::text[]) INTO v_phones
  FROM public.emergency_contacts c
  WHERE c.user_id = p_user_id AND c.alert_enabled = true;

  v_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.emergency_alerts (user_id, status, latitude, longitude, contacts_notified, share_token)
  VALUES (p_user_id, 'active', p_latitude, p_longitude, v_phones, v_token)
  RETURNING id INTO v_alert_id;

  INSERT INTO public.location_events (user_id, type, description, latitude, longitude, metadata)
  VALUES (p_user_id, 'alert', 'Emergencia activada', p_latitude, p_longitude,
          jsonb_build_object('alert_id', v_alert_id, 'contacts', v_phones));

  RETURN QUERY SELECT v_alert_id, v_phones;
END;
$$;

-- get_active_emergency
CREATE OR REPLACE FUNCTION public.get_active_emergency(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  status text,
  latitude double precision,
  longitude double precision,
  contacts_notified text[],
  share_token text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT a.id, a.status, a.latitude, a.longitude, a.contacts_notified, a.share_token, a.created_at
  FROM public.emergency_alerts a
  WHERE a.user_id = p_user_id AND a.status = 'active'
  ORDER BY a.created_at DESC
  LIMIT 1;
END;
$$;

-- resolve_emergency
CREATE OR REPLACE FUNCTION public.resolve_emergency(p_alert_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.emergency_alerts WHERE id = p_alert_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Alert not found'; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.emergency_alerts
  SET status = 'resolved', resolved_at = now(), resolve_reason = p_reason
  WHERE id = p_alert_id;

  INSERT INTO public.location_events (user_id, type, description, metadata)
  VALUES (v_user_id, 'alert', 'Emergencia resolvida', jsonb_build_object('alert_id', p_alert_id, 'reason', p_reason));
END;
$$;

-- mark_false_alarm
CREATE OR REPLACE FUNCTION public.mark_false_alarm(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.emergency_alerts WHERE id = p_alert_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Alert not found'; END IF;
  IF auth.uid() IS NULL OR auth.uid() <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.emergency_alerts
  SET status = 'false_alarm', resolved_at = now(), resolve_reason = 'Falso alarme'
  WHERE id = p_alert_id;
END;
$$;

-- get_emergency_history
CREATE OR REPLACE FUNCTION public.get_emergency_history(p_user_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  status text,
  latitude double precision,
  longitude double precision,
  contacts_notified text[],
  created_at timestamptz,
  resolved_at timestamptz,
  resolve_reason text,
  share_token text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT a.id, a.status, a.latitude, a.longitude, a.contacts_notified, a.created_at, a.resolved_at, a.resolve_reason, a.share_token
  FROM public.emergency_alerts a
  WHERE a.user_id = p_user_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
END;
$$;

-- get_emergency_by_token (public share link)
CREATE OR REPLACE FUNCTION public.get_emergency_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  latitude double precision,
  longitude double precision,
  contacts_notified text[],
  created_at timestamptz,
  resolved_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.latitude, a.longitude, a.contacts_notified, a.created_at, a.resolved_at, a.status
  FROM public.emergency_alerts a
  WHERE a.share_token = p_token
    AND length(p_token) >= 16
    AND a.created_at > now() - interval '7 days'
  LIMIT 1;
$$;

-- delete_user_account
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.audio_evidence WHERE user_id = p_user_id;
  DELETE FROM public.glasses_tap_events WHERE user_id = p_user_id;
  DELETE FROM public.smart_glasses_configs WHERE user_id = p_user_id;
  DELETE FROM public.location_events WHERE user_id = p_user_id;
  DELETE FROM public.checkins WHERE user_id = p_user_id;
  DELETE FROM public.checkin_configs WHERE user_id = p_user_id;
  DELETE FROM public.community_alerts WHERE user_id = p_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.emergency_alerts WHERE user_id = p_user_id;
  DELETE FROM public.emergency_contacts WHERE user_id = p_user_id;
  DELETE FROM public.devices WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.trigger_emergency(uuid, double precision, double precision) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_active_emergency(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.resolve_emergency(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.mark_false_alarm(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_emergency_history(uuid, integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_emergency_by_token(text) FROM public;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_emergency(uuid, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_emergency(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_emergency(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_false_alarm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_emergency_history(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_emergency_by_token(text) TO anon, authenticated;