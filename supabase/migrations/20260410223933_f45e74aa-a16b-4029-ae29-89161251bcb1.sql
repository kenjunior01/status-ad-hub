
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_range text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS habits text,
ADD COLUMN IF NOT EXISTS preferred_payment_methods jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_selected_niches jsonb DEFAULT '[]'::jsonb;
