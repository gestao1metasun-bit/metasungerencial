
-- C-ENT.4 — Contratos Supabase: permissões, tabela vínculo proposta×contrato e RPC oficial.

-- 1) Permissões novas (algumas já existem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='app_permission'::regtype AND enumlabel='comercial.contrato.visualizar') THEN
    ALTER TYPE app_permission ADD VALUE 'comercial.contrato.visualizar';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='app_permission'::regtype AND enumlabel='comercial.contrato.criar') THEN
    ALTER TYPE app_permission ADD VALUE 'comercial.contrato.criar';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='app_permission'::regtype AND enumlabel='comercial.contrato.cancelar') THEN
    ALTER TYPE app_permission ADD VALUE 'comercial.contrato.cancelar';
  END IF;
END$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='app_permission'::regtype AND enumlabel='comercial.contrato.editar_cadastro') THEN
    ALTER TYPE app_permission ADD VALUE 'comercial.contrato.editar_cadastro';
  END IF;
END$$;
