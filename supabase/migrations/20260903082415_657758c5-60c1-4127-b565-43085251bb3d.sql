DROP POLICY IF EXISTS "Anyone can verify unused codes" ON public.device_activation_codes;
DROP POLICY IF EXISTS "Anyone can redeem unused codes" ON public.device_activation_codes;

CREATE POLICY "Users can view own activated codes"
ON public.device_activation_codes
FOR SELECT
TO authenticated
USING (activated_by = auth.uid());

GRANT SELECT ON public.device_activation_codes TO authenticated;
GRANT ALL ON public.device_activation_codes TO service_role;

CREATE OR REPLACE FUNCTION public.verify_activation_code(p_code text)
RETURNS TABLE(id uuid, device_type text, product_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.device_type, c.product_id
  FROM public.device_activation_codes c
  WHERE upper(trim(p_code)) = c.code
    AND length(trim(p_code)) >= 6
    AND c.used = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.redeem_activation_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.device_activation_codes
  SET used = true, activated_by = auth.uid(), activated_at = now()
  WHERE code = upper(trim(p_code))
    AND used = false
    AND length(trim(p_code)) >= 6
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used code';
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_activation_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_activation_code(text) TO authenticated;