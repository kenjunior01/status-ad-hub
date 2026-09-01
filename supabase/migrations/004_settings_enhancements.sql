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
