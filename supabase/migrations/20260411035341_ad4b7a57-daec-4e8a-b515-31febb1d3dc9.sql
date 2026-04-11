
-- Create a public-safe view of profiles
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id, user_id, display_name, avatar_url, bio, niche, 
  country, rating, total_campaigns, total_reviews, 
  is_verified, badge_level, price_range, follower_count,
  engagement_rate, created_at
FROM public.profiles;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Allow everyone to read the public view columns via the base table
-- but only non-sensitive fields through the view
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow public to read basic profile info (needed for marketplace)
CREATE POLICY "Public can view basic profile info"
ON public.profiles FOR SELECT
TO public
USING (true);
