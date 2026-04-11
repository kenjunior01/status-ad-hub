
-- Add referral fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referral_points INTEGER NOT NULL DEFAULT 0;

-- Generate referral codes for existing profiles
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTR(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
WHERE referral_code IS NULL;

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
ON public.referrals FOR SELECT
TO authenticated
USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "System can create referrals"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (referred_id = auth.uid());

-- Function to auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT || NEW.id::TEXT), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- Function to process referral and award points
CREATE OR REPLACE FUNCTION public.process_referral(p_referral_code TEXT, p_referred_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_points INTEGER := 50;
BEGIN
  -- Find the referrer
  SELECT user_id INTO v_referrer_id 
  FROM public.profiles 
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN RETURN FALSE; END IF;
  IF v_referrer_id = p_referred_user_id THEN RETURN FALSE; END IF;
  
  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, points_earned)
  VALUES (v_referrer_id, p_referred_user_id, p_referral_code, v_points);
  
  -- Award points to referrer
  UPDATE public.profiles 
  SET referral_points = referral_points + v_points 
  WHERE user_id = v_referrer_id;
  
  -- Award bonus to referred user
  UPDATE public.profiles 
  SET referral_points = referral_points + 25 
  WHERE user_id = p_referred_user_id;
  
  RETURN TRUE;
END;
$$;

-- Remove advertiser pending_review default - all accounts active immediately
-- (handled in code by changing account_status default)
