
-- Fix: campaign-proofs storage SELECT policy is too broad
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Advertisers can view campaign proofs" ON storage.objects;

-- Replace with auth-scoped policy: only the creator who uploaded or the advertiser of the campaign
CREATE POLICY "Authenticated users can view own campaign proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-proofs'
  AND (
    -- Creator who uploaded (folder = their user id)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Advertiser of the campaign
    EXISTS (
      SELECT 1 FROM public.campaign_proofs cp
      JOIN public.campaigns c ON c.id = cp.campaign_id
      WHERE c.advertiser_id = auth.uid()
        AND cp.file_url LIKE '%' || storage.filename(name)
    )
  )
);
