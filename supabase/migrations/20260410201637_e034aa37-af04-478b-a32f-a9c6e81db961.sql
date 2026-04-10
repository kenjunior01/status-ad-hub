
-- Add can_set_own_price to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_set_own_price boolean NOT NULL DEFAULT false;

-- Update CPV calculation: base = 0.70 MZN ≈ 0.011 USD per view
CREATE OR REPLACE FUNCTION public.calculate_cpv_rate(_follower_count integer, _engagement_rate numeric, _niche text DEFAULT NULL::text)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_cpv numeric;
  niche_multiplier numeric := 1.0;
BEGIN
  -- Base CPV = 0.70 MZN ≈ 0.011 USD per view
  base_cpv := 0.011;
  
  -- Adjust slightly by engagement rate (higher engagement = slightly higher CPV)
  IF _engagement_rate > 5.0 THEN
    base_cpv := base_cpv * 1.2;
  ELSIF _engagement_rate > 10.0 THEN
    base_cpv := base_cpv * 1.5;
  END IF;
  
  -- Premium niche bonus (+50%)
  IF _niche IN ('Tecnologia', 'Negócios', 'Finanças', 'Marketing') THEN
    niche_multiplier := 1.5;
  END IF;
  
  RETURN ROUND(base_cpv * niche_multiplier, 4);
END;
$$;
