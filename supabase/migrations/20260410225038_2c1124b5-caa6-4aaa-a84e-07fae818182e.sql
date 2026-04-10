
-- Add account_status to profiles
ALTER TABLE public.profiles
ADD COLUMN account_status text NOT NULL DEFAULT 'active';

-- Set existing advertiser profiles to active (they're already approved)
-- New advertisers will be set to pending_review from the app code
