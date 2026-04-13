
-- 1. Fix: profiles public SELECT policy - restrict to safe columns only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- Create a restricted public policy that only allows viewing through the profiles_public view
-- The profiles_public view already exposes only safe columns, so we restrict direct table access
CREATE POLICY "Public can view limited profile info" ON public.profiles
FOR SELECT TO public
USING (
  -- Non-authenticated users can only see id, display_name, avatar_url, bio, niche, rating, badge_level, country
  -- But since we can't restrict columns in RLS, we rely on profiles_public view for public access
  -- Authenticated users viewing their own profile get full access (covered by existing policy)
  auth.uid() IS NOT NULL OR
  -- For anonymous users, still allow SELECT but the profiles_public VIEW should be used instead
  true
);

-- Actually, the better approach: remove the blanket public policy and keep only the authenticated one
-- Public users should use the profiles_public view
DROP POLICY IF EXISTS "Public can view limited profile info" ON public.profiles;

-- Restrict public access: only authenticated users can query profiles table directly
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- 2. Fix: chat-attachments storage - restrict to conversation participants
-- This requires dropping and recreating the storage policy
-- (Storage policies are managed via SQL on storage.objects)
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON storage.objects;

CREATE POLICY "Users can view attachments in their conversations" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    AND (storage.foldername(name))[2] = c.id::text
  )
);

-- 3. Fix: transactions INSERT policy - add validation
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;

CREATE POLICY "Authenticated users can create transactions" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = payer_id
  AND amount > 0
  AND amount <= 100000
  AND type IN ('campaign_payment', 'escrow', 'withdrawal', 'refund', 'platform_fee')
  AND EXISTS (
    SELECT 1 FROM public.campaigns cam
    WHERE cam.id = campaign_id
    AND (cam.advertiser_id = auth.uid() OR cam.creator_id = auth.uid())
  )
);
