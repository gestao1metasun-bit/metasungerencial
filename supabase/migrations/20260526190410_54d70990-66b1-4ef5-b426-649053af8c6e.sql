
-- D4.2: Bridge Financeiro ↔ Engenharia

-- 1) Coluna custo_previsto em obras
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS custo_previsto numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.obras.custo_previsto IS
  'Custo orçado/previsto da obra. Editável; alterações geram auditoria via tg_obras_versao.';

-- 2) View: custo realizado por obra
-- Origem: movimentacoes_financeiras (tipo SAIDA/PAGAMENTO) cujos títulos PAGAR
-- estão ligados à obra via pedido_venda.obra_id OU contrato_id → obras.contrato_id.
CREATE OR REPLACE VIEW public.v_custo_obra_realizado
WITH (security_invoker=on) AS
WITH titulos_obra AS (
  -- Via PV → obra
  SELECT t.id AS titulo_id, pv.obra_id
  FROM public.titulos_financeiros t
  JOIN public.pedidos_venda pv
    ON pv.id = t.origem_id
   AND t.origem_tipo = 'pedido_venda'
  WHERE pv.obra_id IS NOT NULL
    AND t.tipo = 'PAGAR'
    AND t.deleted_at IS NULL
  UNION
  -- Via contrato → obra
  SELECT t.id AS titulo_id, o.id AS obra_id
  FROM public.titulos_financeiros t
  JOIN public.obras o ON o.contrato_id = t.contrato_id
  WHERE t.contrato_id IS NOT NULL
    AND t.tipo = 'PAGAR'
    AND t.deleted_at IS NULL
    AND o.deleted_at IS NULL
)
SELECT
  o.id AS obra_id,
  COALESCE(SUM(mf.valor), 0)::numeric AS custo_realizado,
  COUNT(DISTINCT mf.id) AS qtd_movimentos
FROM public.obras o
LEFT JOIN titulos_obra tob ON tob.obra_id = o.id
LEFT JOIN public.movimentacoes_financeiras mf
  ON mf.titulo_id = tob.titulo_id
GROUP BY o.id;

-- 3) View: custo previsto por obra
CREATE OR REPLACE VIEW public.v_custo_obra_previsto
WITH (security_invoker=on) AS
SELECT
  o.id AS obra_id,
  COALESCE(o.custo_previsto, 0)::numeric AS custo_previsto
FROM public.obras o;

-- 4) View: saldo operacional por obra
CREATE OR REPLACE VIEW public.v_saldo_operacional_obra
WITH (security_invoker=on) AS
SELECT
  o.id AS obra_id,
  o.codigo,
  COALESCE(p.custo_previsto, 0)::numeric AS custo_previsto,
  COALESCE(r.custo_realizado, 0)::numeric AS custo_realizado,
  (COALESCE(p.custo_previsto, 0) - COALESCE(r.custo_realizado, 0))::numeric AS saldo_operacional,
  CASE
    WHEN COALESCE(p.custo_previsto, 0) = 0 THEN NULL
    ELSE ROUND((COALESCE(r.custo_realizado, 0) / p.custo_previsto * 100)::numeric, 2)
  END AS pct_consumido
FROM public.obras o
LEFT JOIN public.v_custo_obra_previsto  p ON p.obra_id = o.id
LEFT JOIN public.v_custo_obra_realizado r ON r.obra_id = o.id;

-- 5) GRANTs (views herdam RLS das tabelas base via security_invoker)
GRANT SELECT ON public.v_custo_obra_realizado   TO authenticated;
GRANT SELECT ON public.v_custo_obra_previsto    TO authenticated;
GRANT SELECT ON public.v_saldo_operacional_obra TO authenticated;
