
-- ============================================================================
-- Onda C6 — Comissão Enterprise
-- ============================================================================

-- 1. Enum de status
DO $$ BEGIN
  CREATE TYPE public.comercial_comissao_status AS ENUM
    ('PREVISTA','LIBERADA','PAGA','CANCELADA','ESTORNADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Novas permissões
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.ver';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.liberar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.marcar_paga';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.cancelar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.estornar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.alterar_percentual';
