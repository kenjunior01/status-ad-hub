
-- Recreate trigger on auth.users for new user handling
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate trigger for auto-assigning first admin
CREATE OR REPLACE TRIGGER on_user_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_admin();

-- Recreate trigger for auto-creating wallet when profile is created
CREATE OR REPLACE TRIGGER on_profile_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_wallet();

-- Recreate trigger to sync creator listing when profile changes
CREATE OR REPLACE TRIGGER on_profile_changed_sync_listing
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_creator_listing();

-- Recreate trigger to update CPV on profile change
CREATE OR REPLACE TRIGGER on_profile_changed_cpv
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_cpv_on_profile_change();

-- Recreate trigger to update conversation last message
CREATE OR REPLACE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();
