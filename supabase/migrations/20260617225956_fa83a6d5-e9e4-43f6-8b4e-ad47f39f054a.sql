-- 1) Novas permissões
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.contrato.aprovar_minuta';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.contrato.editar_minuta';