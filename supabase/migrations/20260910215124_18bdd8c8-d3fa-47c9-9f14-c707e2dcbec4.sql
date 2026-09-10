-- FIN.MIG.1 — Fundação Financiamentos (migração do Google Apps Script)
-- 1) Novas permissões
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='financiamento.criar' AND enumtypid='public.app_permission'::regtype) THEN
    ALTER TYPE public.app_permission ADD VALUE 'financiamento.criar';
  END IF;
END $$;
COMMIT;
