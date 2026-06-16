-- C-ENT.8 — Aditivos Supabase (Projeto/Contrato)
-- Estende public.aditivos sem duplicar tabela. Adiciona RPC oficial de aplicação atômica.

-- 1) Colunas novas (todas idempotentes)
ALTER TABLE public.aditivos
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_escopo text NOT NULL DEFAULT 'PROJETO',
  ADD COLUMN IF NOT EXISTS motivo text,
  ADD COLUMN IF NOT EXISTS valor_anterior numeric,
  ADD COLUMN IF NOT EXISTS valor_novo numeric,
  ADD COLUMN IF NOT EXISTS diferenca_valor numeric,
  ADD COLUMN IF NOT EXISTS potencia_anterior numeric,
  ADD COLUMN IF NOT EXISTS potencia_nova numeric,
  ADD COLUMN IF NOT EXISTS diferenca_potencia numeric,
  ADD COLUMN IF NOT EXISTS modulos_anterior integer,
  ADD COLUMN IF NOT EXISTS modulos_novo integer,
  ADD COLUMN IF NOT EXISTS diferenca_modulos integer,
  ADD COLUMN IF NOT EXISTS inversor_anterior text,
  ADD COLUMN IF NOT EXISTS inversor_novo text,
  ADD COLUMN IF NOT EXISTS payload_alteracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS criado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aplicado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS aplicado_em timestamptz;

-- 2) CHECKs (drop & recreate idempotente)
ALTER TABLE public.aditivos DROP CONSTRAINT IF EXISTS aditivos_tipo_escopo_check;
ALTER TABLE public.aditivos
  ADD CONSTRAINT aditivos_tipo_escopo_check
  CHECK (tipo_escopo IN ('PROJETO','CONTRATO'));

ALTER TABLE public.aditivos DROP CONSTRAINT IF EXISTS aditivos_status_check;
ALTER TABLE public.aditivos
  ADD CONSTRAINT aditivos_status_check
  CHECK (status IN ('RASCUNHO','EM_APROVACAO','APLICADO','CANCELADO'));

ALTER TABLE public.aditivos DROP CONSTRAINT IF EXISTS aditivos_projeto_requerido_check;
ALTER TABLE public.aditivos
  ADD CONSTRAINT aditivos_projeto_requerido_check
  CHECK ((tipo_escopo = 'PROJETO' AND projeto_id IS NOT NULL) OR tipo_escopo = 'CONTRATO');

-- 3) Índices
CREATE INDEX IF NOT EXISTS idx_aditivos_contrato_id ON public.aditivos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_aditivos_projeto_id ON public.aditivos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_aditivos_status ON public.aditivos(status);

-- 4) Permissões novas no enum app_permission
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
                 WHERE t.typname='app_permission' AND e.enumlabel='comercial.aditivo.visualizar') THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.aditivo.visualizar';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
                 WHERE t.typname='app_permission' AND e.enumlabel='comercial.aditivo.criar') THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.aditivo.criar';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid
                 WHERE t.typname='app_permission' AND e.enumlabel='comercial.aditivo.cancelar') THEN
    ALTER TYPE public.app_permission ADD VALUE 'comercial.aditivo.cancelar';
  END IF;
END$$;