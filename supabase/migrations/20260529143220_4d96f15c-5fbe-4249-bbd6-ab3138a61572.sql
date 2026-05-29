
-- ============================================================
-- D18.4 — Compras / Estoque / Movimentações Contábil-Ready
-- Sem alteração de RLS operacional, workflow, auditoria ou regras
-- ============================================================

-- 1) SOLICITAÇÕES DE MATERIAL — campos contábeis + integrabilidade
ALTER TABLE public.solicitacoes_material
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id),
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.naturezas_financeiras(id),
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid REFERENCES public.centros_resultado(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN IF NOT EXISTS conta_financeira_id uuid REFERENCES public.contas_financeiras(id),
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS categoria_contabil text,
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS hash_integracao text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sm_categoria_contabil_chk') THEN
    ALTER TABLE public.solicitacoes_material
      ADD CONSTRAINT sm_categoria_contabil_chk
      CHECK (categoria_contabil IS NULL OR categoria_contabil = ANY (ARRAY['REVENDA','MATERIAL_INSTALACAO','CONSUMO','FERRAMENTA','IMOBILIZADO','SERVICO']));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sm_status_integracao_chk') THEN
    ALTER TABLE public.solicitacoes_material
      ADD CONSTRAINT sm_status_integracao_chk
      CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sm_fornecedor ON public.solicitacoes_material(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_sm_natureza ON public.solicitacoes_material(natureza_financeira_id);
CREATE INDEX IF NOT EXISTS idx_sm_cr ON public.solicitacoes_material(centro_resultado_id);
CREATE INDEX IF NOT EXISTS idx_sm_cc ON public.solicitacoes_material(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_sm_competencia ON public.solicitacoes_material(competencia);

-- 2) ORDENS DE COMPRA — mesma armadura contábil
ALTER TABLE public.ordens_compra
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id),
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.naturezas_financeiras(id),
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid REFERENCES public.centros_resultado(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN IF NOT EXISTS conta_financeira_id uuid REFERENCES public.contas_financeiras(id),
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS categoria_contabil text,
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS hash_integracao text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='oc_categoria_contabil_chk') THEN
    ALTER TABLE public.ordens_compra
      ADD CONSTRAINT oc_categoria_contabil_chk
      CHECK (categoria_contabil IS NULL OR categoria_contabil = ANY (ARRAY['REVENDA','MATERIAL_INSTALACAO','CONSUMO','FERRAMENTA','IMOBILIZADO','SERVICO']));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='oc_status_integracao_chk') THEN
    ALTER TABLE public.ordens_compra
      ADD CONSTRAINT oc_status_integracao_chk
      CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_oc_fornecedor ON public.ordens_compra(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_oc_natureza ON public.ordens_compra(natureza_financeira_id);
CREATE INDEX IF NOT EXISTS idx_oc_cr ON public.ordens_compra(centro_resultado_id);
CREATE INDEX IF NOT EXISTS idx_oc_cc ON public.ordens_compra(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_oc_competencia ON public.ordens_compra(competencia);

-- 3) ESTOQUE_MOVIMENTOS — origem_id + hash_integracao
ALTER TABLE public.estoque_movimentos
  ADD COLUMN IF NOT EXISTS origem_id uuid,
  ADD COLUMN IF NOT EXISTS hash_integracao text,
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='em_status_integracao_chk') THEN
    ALTER TABLE public.estoque_movimentos
      ADD CONSTRAINT em_status_integracao_chk
      CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_em_origem ON public.estoque_movimentos(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_em_status_integracao ON public.estoque_movimentos(status_integracao);

-- 4) ESTOQUE_EVENTOS_CATALOGO — eventos contábeis preparatórios
CREATE TABLE IF NOT EXISTS public.estoque_eventos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento text NOT NULL UNIQUE,
  descricao text NOT NULL,
  evento_canonico text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eec_evento_canonico_chk CHECK (evento_canonico = ANY (ARRAY[
    'COMPRA','ENTRADA_ESTOQUE','SAIDA_ESTOQUE','CONSUMO_OBRA','AJUSTE_ESTOQUE','INVENTARIO','TRANSFERENCIA','DEVOLUCAO'
  ]))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_eventos_catalogo TO authenticated;
GRANT ALL ON public.estoque_eventos_catalogo TO service_role;

ALTER TABLE public.estoque_eventos_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eec_select_auth ON public.estoque_eventos_catalogo;
CREATE POLICY eec_select_auth ON public.estoque_eventos_catalogo
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS eec_admin_write ON public.estoque_eventos_catalogo;
CREATE POLICY eec_admin_write ON public.estoque_eventos_catalogo
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_eec_updated_at ON public.estoque_eventos_catalogo;
CREATE TRIGGER trg_eec_updated_at BEFORE UPDATE ON public.estoque_eventos_catalogo
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at_generic();

-- Seeds idempotentes
INSERT INTO public.estoque_eventos_catalogo (evento, descricao, evento_canonico) VALUES
  ('COMPRA_RECEBIDA', 'Compra recebida no estoque', 'COMPRA'),
  ('ENTRADA_ESTOQUE', 'Entrada genérica de estoque', 'ENTRADA_ESTOQUE'),
  ('SAIDA_ESTOQUE', 'Saída genérica de estoque', 'SAIDA_ESTOQUE'),
  ('CONSUMO_OBRA', 'Consumo de material em obra', 'CONSUMO_OBRA'),
  ('AJUSTE_ESTOQUE', 'Ajuste manual de saldo', 'AJUSTE_ESTOQUE'),
  ('INVENTARIO', 'Diferença apurada em inventário', 'INVENTARIO')
ON CONFLICT (evento) DO NOTHING;

-- 5) VIEW v_cmv_preparado — fluxo Compra → Entrada → Saída → CMV (preparatório)
DROP VIEW IF EXISTS public.v_cmv_preparado;
CREATE VIEW public.v_cmv_preparado
WITH (security_invoker = on) AS
SELECT
  em.id AS movimento_id,
  em.produto_id,
  p.codigo AS produto_codigo,
  p.nome AS produto_nome,
  p.categoria_contabil,
  p.tipo_item,
  em.tipo AS movimento_tipo,
  em.quantidade,
  em.custo_unitario,
  em.custo_total,
  em.obra_id,
  em.pv_id,
  em.projeto_id,
  em.origem_tipo,
  em.origem_id,
  em.centro_resultado_id,
  em.centro_custo_id,
  em.user_id,
  em.created_at,
  CASE
    WHEN em.tipo = 'entrada' THEN 'ENTRADA_ESTOQUE'
    WHEN em.tipo IN ('saida','baixa_entrega','entrega') AND em.obra_id IS NOT NULL THEN 'CONSUMO_OBRA'
    WHEN em.tipo IN ('saida','baixa_entrega','entrega') THEN 'SAIDA_ESTOQUE'
    WHEN em.tipo IN ('ajuste_pos','ajuste_neg') THEN 'AJUSTE_ESTOQUE'
    ELSE 'OUTRO'
  END AS evento_canonico,
  CASE
    WHEN em.tipo IN ('saida','baixa_entrega','entrega') THEN em.custo_total
    ELSE 0
  END AS valor_cmv_preparado,
  em.status_integracao,
  em.hash_integracao
FROM public.estoque_movimentos em
LEFT JOIN public.produtos p ON p.id = em.produto_id;

GRANT SELECT ON public.v_cmv_preparado TO authenticated;
