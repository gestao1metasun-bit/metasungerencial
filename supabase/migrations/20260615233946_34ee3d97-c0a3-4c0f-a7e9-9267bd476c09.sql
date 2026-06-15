
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('admin_master','comercial.contrato.visualizar'),
  ('admin_master','comercial.contrato.criar'),
  ('admin_master','comercial.contrato.cancelar'),
  ('admin_master','comercial.contrato.editar_cadastro'),
  ('admin_geral','comercial.contrato.visualizar'),
  ('admin_geral','comercial.contrato.criar'),
  ('admin_geral','comercial.contrato.cancelar'),
  ('admin_geral','comercial.contrato.editar_cadastro'),
  ('usuario','comercial.contrato.visualizar'),
  ('usuario','comercial.contrato.criar')
ON CONFLICT (role, permission) DO NOTHING;
