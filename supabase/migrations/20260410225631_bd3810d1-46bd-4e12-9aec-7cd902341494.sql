
-- Ad listings posted by advertisers
CREATE TABLE public.ad_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  category text,
  duration_days integer DEFAULT 7,
  requirements text,
  max_applications integer DEFAULT 10,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE public.ad_listings ENABLE ROW LEVEL SECURITY;

-- Everyone can see open listings
CREATE POLICY "Anyone can view open listings"
ON public.ad_listings FOR SELECT
USING (status = 'open' OR advertiser_id = auth.uid());

-- Advertisers create their own
CREATE POLICY "Advertisers can create listings"
ON public.ad_listings FOR INSERT
TO authenticated
WITH CHECK (advertiser_id = auth.uid());

-- Advertisers update their own
CREATE POLICY "Advertisers can update own listings"
ON public.ad_listings FOR UPDATE
TO authenticated
USING (advertiser_id = auth.uid());

-- Advertisers delete their own
CREATE POLICY "Advertisers can delete own listings"
ON public.ad_listings FOR DELETE
TO authenticated
USING (advertiser_id = auth.uid());

-- Admin full access
CREATE POLICY "Admins full access ad_listings"
ON public.ad_listings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Applications from creators
CREATE TABLE public.listing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.ad_listings(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  message text,
  proposed_price numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, creator_id)
);

ALTER TABLE public.listing_applications ENABLE ROW LEVEL SECURITY;

-- Creators can view own applications
CREATE POLICY "Creators view own applications"
ON public.listing_applications FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- Advertisers can view applications for their listings
CREATE POLICY "Advertisers view listing applications"
ON public.listing_applications FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ad_listings al
  WHERE al.id = listing_applications.listing_id
  AND al.advertiser_id = auth.uid()
));

-- Creators can apply
CREATE POLICY "Creators can apply"
ON public.listing_applications FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Advertisers can update application status
CREATE POLICY "Advertisers manage applications"
ON public.listing_applications FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ad_listings al
  WHERE al.id = listing_applications.listing_id
  AND al.advertiser_id = auth.uid()
));

-- Admin full access
CREATE POLICY "Admins full access listing_applications"
ON public.listing_applications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_applications;
