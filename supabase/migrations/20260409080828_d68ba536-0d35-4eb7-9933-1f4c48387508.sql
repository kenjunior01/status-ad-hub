
-- Add country and WhatsApp views range to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_views_min INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_views_max INTEGER DEFAULT 0;

-- Function to auto-assign admin to the first user
CREATE OR REPLACE FUNCTION public.auto_assign_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users INTEGER;
BEGIN
  SELECT count(*) INTO total_users FROM public.user_roles;
  -- If this is the first user (only 1 row exists = the one just inserted)
  IF total_users = 1 THEN
    UPDATE public.user_roles SET role = 'admin' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger after insert on user_roles
CREATE TRIGGER trg_auto_assign_first_admin
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_first_admin();
