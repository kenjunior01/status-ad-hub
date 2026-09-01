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
