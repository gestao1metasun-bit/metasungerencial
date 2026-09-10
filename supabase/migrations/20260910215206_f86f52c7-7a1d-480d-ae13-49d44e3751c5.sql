DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='financiamento.finalizar' AND enumtypid='public.app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'financiamento.finalizar';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='financiamento.cancelar' AND enumtypid='public.app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'financiamento.cancelar';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='financiamento.gerenciar_cadastros' AND enumtypid='public.app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'financiamento.gerenciar_cadastros';
  END IF;
END $$;