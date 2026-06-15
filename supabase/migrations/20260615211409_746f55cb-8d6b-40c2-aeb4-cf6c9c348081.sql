
-- =========================================================================
-- Onda C-ENT.1 — Oportunidade + vínculos + permissões
-- =========================================================================

-- 1) PERMISSÕES NOVAS (enum app_permission)
DO $$
BEGIN
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.oportunidade.visualizar'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.oportunidade.criar';      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.oportunidade.editar';     EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.oportunidade.cancelar';   EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;
