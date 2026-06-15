-- C-ENT.3: novas permissões de Propostas (commit do enum antes do uso)
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.visualizar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.gerar_nova';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.gerar_contrato';