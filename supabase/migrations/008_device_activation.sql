-- Device Activation Codes Table
-- Users must purchase a device and use its activation code to create an account

CREATE TABLE IF NOT EXISTS public.device_activation_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'tracker',
  product_id UUID REFERENCES public.products(id),
  used BOOLEAN NOT NULL DEFAULT false,
  activated_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE public.device_activation_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code is valid (needed during activation before auth)
CREATE POLICY "Activation codes are viewable during activation" ON public.device_activation_codes
  FOR SELECT USING (true);

-- Only authenticated users or service role can update (mark as used)
CREATE POLICY "Only system can update activation codes" ON public.device_activation_codes
  FOR UPDATE USING (true);

-- Only service role can insert
CREATE POLICY "Only service role can insert codes" ON public.device_activation_codes
  FOR INSERT WITH CHECK (true);

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.device_activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_unused ON public.device_activation_codes(used) WHERE NOT used;

-- RPC function to validate and consume activation code
CREATE OR REPLACE FUNCTION public.validate_activation_code(p_code TEXT)
RETURNS TABLE(id UUID, device_type TEXT, product_id UUID, used BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT dac.id, dac.device_type, dac.product_id, dac.used
  FROM public.device_activation_codes dac
  WHERE dac.code = upper(p_code)
    AND dac.used = false
    AND (dac.expires_at IS NULL OR dac.expires_at > now())
  LIMIT 1;
END;
$$;

-- RPC function to consume activation code after account creation
CREATE OR REPLACE FUNCTION public.consume_activation_code(p_code TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.device_activation_codes
  SET used = true, activated_by = p_user_id, activated_at = now()
  WHERE code = upper(p_code) AND used = false
  RETURNING 1 INTO v_updated;
  RETURN v_updated = 1;
END;
$$;
