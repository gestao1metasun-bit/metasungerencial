
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, public.app_permission) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, public.app_permission) TO authenticated, service_role;
