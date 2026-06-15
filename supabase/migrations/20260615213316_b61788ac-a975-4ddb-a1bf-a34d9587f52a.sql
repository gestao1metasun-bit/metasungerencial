INSERT INTO public.role_permissions (role, permission)
SELECT r::app_role, 'comercial.cliente.visualizar'::app_permission
FROM (VALUES ('admin_master'),('admin_geral'),('usuario')) AS t(r)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = t.r::app_role
    AND rp.permission = 'comercial.cliente.visualizar'::app_permission
);
