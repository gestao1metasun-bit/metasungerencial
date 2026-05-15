-- Trigger: ao criar novo auth.users, atribuir papel
CREATE OR REPLACE FUNCTION public.tg_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users int;
BEGIN
  SELECT count(*) INTO total_users FROM public.user_roles;
  IF total_users = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin_master');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_handle_new_user();