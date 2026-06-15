-- C-ENT.2 — Permissões de Leads (visualizar/cancelar/converter) + grants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='comercial.lead.visualizar' AND enumtypid='public.app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.lead.visualizar';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='comercial.lead.cancelar' AND enumtypid='public.app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.lead.cancelar';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='comercial.lead.converter' AND enumtypid='public.app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.lead.converter';
  END IF;
END $$;