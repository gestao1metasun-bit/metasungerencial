-- C-ENT.1.e — Grant das permissões aos papéis padrão
INSERT INTO public.role_permissions (role, permission)
SELECT r::public.app_role, p::public.app_permission
FROM (VALUES ('admin_master'),('admin_geral'),('usuario')) AS rr(r)
CROSS JOIN (VALUES ('comercial.cliente.criar'),('comercial.cliente.editar')) AS pp(p)
ON CONFLICT DO NOTHING;