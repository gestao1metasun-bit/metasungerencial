-- C-ENT.7 — Permissões de Projetos do Contrato + evento timeline na criação
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='public.app_permission'::regtype AND enumlabel='comercial.projeto.visualizar') THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.projeto.visualizar';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='public.app_permission'::regtype AND enumlabel='comercial.projeto.editar_cadastro') THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.projeto.editar_cadastro';
  END IF;
END $$;