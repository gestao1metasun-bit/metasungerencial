
-- Onda 1.5.A: estender public.contratos para acomodar ContratoFull do contratos-store

-- 1. Tornar `codigo` único (será a chave estável "088/2026" vinda do store)
--    Apenas para registros não-deletados e não-nulos.
CREATE UNIQUE INDEX IF NOT EXISTS contratos_codigo_uniq
  ON public.contratos (codigo)
  WHERE deleted_at IS NULL AND codigo IS NOT NULL;

-- 2. Colunas tipadas (campos usados em filtros/joins frequentes)
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS vendedor text,
  ADD COLUMN IF NOT EXISTS comissao_pct numeric,
  ADD COLUMN IF NOT EXISTS comissao_valor numeric,

  -- Financiamento bancário
  ADD COLUMN IF NOT EXISTS possui_financiamento boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financiamento_banco text,
  ADD COLUMN IF NOT EXISTS financiamento_valor numeric,
  ADD COLUMN IF NOT EXISTS financiamento_status text,
  ADD COLUMN IF NOT EXISTS financiamento_liberado_eng boolean NOT NULL DEFAULT false,

  -- Cadeia comercial
  ADD COLUMN IF NOT EXISTS proposta_id uuid,
  ADD COLUMN IF NOT EXISTS lead_id uuid,

  -- Aprovação do contrato assinado (gate Comercial → Engenharia/Financeiro)
  ADD COLUMN IF NOT EXISTS assinado_aprovado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assinado_aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS assinado_aprovado_por uuid,

  -- Liberação Admin/Diretoria para geração de contrato (gate antes do redigido)
  ADD COLUMN IF NOT EXISTS liberado_para_contrato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liberado_em timestamptz,
  ADD COLUMN IF NOT EXISTS liberado_por uuid,
  ADD COLUMN IF NOT EXISTS liberacao_obs text,

  -- Estado operacional
  ADD COLUMN IF NOT EXISTS contrato_redigido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text;

-- 3. Índices para filtros e joins comuns
CREATE INDEX IF NOT EXISTS contratos_consultor_status_idx
  ON public.contratos (consultor_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS contratos_proposta_id_idx
  ON public.contratos (proposta_id)
  WHERE proposta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contratos_lead_id_idx
  ON public.contratos (lead_id)
  WHERE lead_id IS NOT NULL;

-- 4. Garantir triggers de timestamp, auditoria e snapshot ligados em public.contratos
DROP TRIGGER IF EXISTS tg_contratos_updated_at ON public.contratos;
CREATE TRIGGER tg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

DROP TRIGGER IF EXISTS tg_contratos_audit ON public.contratos;
CREATE TRIGGER tg_contratos_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'contratos');

DROP TRIGGER IF EXISTS tg_contratos_snapshot ON public.contratos;
CREATE TRIGGER tg_contratos_snapshot
  AFTER UPDATE ON public.contratos
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.tg_snapshot_version();
