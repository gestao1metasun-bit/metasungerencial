
-- =====================================================================
-- D15.1.a.1.i — Fundação DB para TitulosTab server-side
-- =====================================================================

-- 1) Índices de apoio (idempotentes) ----------------------------------
CREATE INDEX IF NOT EXISTS idx_tf_tipo_vencimento
  ON public.titulos_financeiros (tipo, vencimento)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tf_origem_tipo_tipo
  ON public.titulos_financeiros (origem_tipo, tipo)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tf_codigo_lower
  ON public.titulos_financeiros (lower(codigo))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mf_titulo_data
  ON public.movimentacoes_financeiras (titulo_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_anexos_entidade
  ON public.anexos (entidade_tipo, entidade_id)
  WHERE deleted_at IS NULL;

-- 2) View enriquecida -------------------------------------------------
-- Usa security_invoker=on para herdar RLS de titulos_financeiros.
-- Nenhuma coluna sensível adicional além do que o usuário já enxerga.
DROP VIEW IF EXISTS public.v_titulos_enriquecido CASCADE;

CREATE VIEW public.v_titulos_enriquecido
WITH (security_invoker = on) AS
SELECT
  tf.id,
  tf.codigo,
  tf.tipo,
  tf.status,
  tf.origem_tipo,
  tf.origem_id,
  tf.cliente_id,
  tf.consultor_id,
  tf.contrato_id,
  tf.centro_id,
  tf.conta_id,
  tf.valor_bruto,
  tf.desconto,
  tf.juros,
  tf.multa,
  tf.valor_liquido,
  tf.saldo,
  tf.competencia,
  tf.vencimento,
  tf.forma_pagamento,
  tf.observacoes,
  tf.dados,
  tf.created_at,
  tf.updated_at,
  tf.deleted_at,
  tf.titulo_substituto_id,
  tf.renegociado_em,
  tf.motivo_renegociacao,
  -- Cliente / contraparte
  c.nome  AS cliente_nome,
  c.doc   AS cliente_doc,
  -- Contrato / obra
  ct.codigo AS contrato_codigo,
  ob.id     AS obra_id,
  ob.codigo AS obra_codigo,
  -- Agregados derivados (usados pelos filtros e ordenações da grade)
  COALESCE(ax.qtd, 0)::int           AS anexos_count,
  COALESCE(ax.qtd, 0) > 0            AS tem_anexo,
  COALESCE(mv.qtd, 0)::int           AS movimentos_count,
  COALESCE(mv.qtd, 0) > 0            AS tem_movimento,
  COALESCE(mv.conciliado, false)     AS conciliado,
  mv.ultimo_movimento_data,
  -- Sinalizações
  (tf.status = 'RENEGOCIADO' OR tf.renegociado_em IS NOT NULL) AS renegociado,
  (tf.status IN ('PENDENTE','PARCIAL'))                        AS em_aberto,
  CASE
    WHEN tf.status IN ('PENDENTE','PARCIAL') AND tf.vencimento < CURRENT_DATE
      THEN (CURRENT_DATE - tf.vencimento)::int
    ELSE 0
  END AS dias_atraso,
  CASE
    WHEN tf.status IN ('PENDENTE','PARCIAL') AND tf.vencimento < CURRENT_DATE
      THEN true ELSE false
  END AS vencido
FROM public.titulos_financeiros tf
LEFT JOIN public.clientes  c  ON c.id  = tf.cliente_id
LEFT JOIN public.contratos ct ON ct.id = tf.contrato_id
LEFT JOIN public.obras     ob ON ob.contrato_id = tf.contrato_id AND ob.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT count(*) AS qtd
  FROM public.anexos a
  WHERE a.entidade_tipo = 'titulos_financeiros'
    AND a.entidade_id = tf.id
    AND a.deleted_at IS NULL
) ax ON true
LEFT JOIN LATERAL (
  SELECT
    count(*)                       AS qtd,
    bool_or(m.conta_id IS NOT NULL) AS conciliado,
    max(m.data)                    AS ultimo_movimento_data
  FROM public.movimentacoes_financeiras m
  WHERE m.titulo_id = tf.id
) mv ON true
WHERE tf.deleted_at IS NULL;

GRANT SELECT ON public.v_titulos_enriquecido TO authenticated;

COMMENT ON VIEW public.v_titulos_enriquecido IS
  'D15.1.a.1.i — Verdade oficial para grade TitulosTab server-side. Herda RLS de titulos_financeiros (security_invoker=on). Não usar em código novo sem antes consultar este card no memory.';

-- 3) RPC de totalizadores --------------------------------------------
-- Aplica os mesmos filtros do grid e devolve agregados oficiais.
-- security_invoker via has_role: roda como o usuário, RLS aplica.
CREATE OR REPLACE FUNCTION public.rpc_titulos_totais(
  _tipo            text DEFAULT NULL,
  _status          text DEFAULT NULL,
  _search          text DEFAULT NULL,
  _vencimento_de   date DEFAULT NULL,
  _vencimento_ate  date DEFAULT NULL,
  _competencia     text DEFAULT NULL,        -- 'YYYY-MM'
  _origem_tipo     text DEFAULT NULL,
  _contrato_id     uuid DEFAULT NULL,
  _cliente_id      uuid DEFAULT NULL,
  _consultor_id    uuid DEFAULT NULL,
  _so_vencidos     boolean DEFAULT NULL,
  _com_anexo       boolean DEFAULT NULL,
  _conciliado      boolean DEFAULT NULL,
  _renegociado     boolean DEFAULT NULL
)
RETURNS TABLE (
  qtd_total         bigint,
  qtd_aberto        bigint,
  qtd_baixado       bigint,
  qtd_cancelado     bigint,
  valor_bruto_total numeric,
  saldo_aberto      numeric,
  valor_pago        numeric,
  juros_total       numeric,
  multa_total       numeric,
  desconto_total    numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT *
    FROM public.v_titulos_enriquecido v
    WHERE (_tipo           IS NULL OR v.tipo = _tipo)
      AND (_status         IS NULL OR _status = 'todos' OR v.status = _status)
      AND (_origem_tipo    IS NULL OR v.origem_tipo = _origem_tipo)
      AND (_contrato_id    IS NULL OR v.contrato_id = _contrato_id)
      AND (_cliente_id     IS NULL OR v.cliente_id  = _cliente_id)
      AND (_consultor_id   IS NULL OR v.consultor_id = _consultor_id)
      AND (_vencimento_de  IS NULL OR v.vencimento >= _vencimento_de)
      AND (_vencimento_ate IS NULL OR v.vencimento <= _vencimento_ate)
      AND (_competencia    IS NULL OR to_char(v.competencia, 'YYYY-MM') = _competencia)
      AND (_so_vencidos    IS NULL OR _so_vencidos = false OR v.vencido = true)
      AND (_com_anexo      IS NULL OR v.tem_anexo  = _com_anexo)
      AND (_conciliado     IS NULL OR v.conciliado = _conciliado)
      AND (_renegociado    IS NULL OR v.renegociado = _renegociado)
      AND (
        _search IS NULL OR length(trim(_search)) = 0
        OR v.codigo        ILIKE '%' || _search || '%'
        OR v.cliente_nome  ILIKE '%' || _search || '%'
        OR v.observacoes   ILIKE '%' || _search || '%'
        OR v.contrato_codigo ILIKE '%' || _search || '%'
      )
  )
  SELECT
    count(*)::bigint                                                            AS qtd_total,
    count(*) FILTER (WHERE status IN ('PENDENTE','PARCIAL'))::bigint            AS qtd_aberto,
    count(*) FILTER (WHERE status IN ('RECEBIDO','PAGO'))::bigint               AS qtd_baixado,
    count(*) FILTER (WHERE status IN ('CANCELADO','RENEGOCIADO'))::bigint       AS qtd_cancelado,
    COALESCE(sum(valor_bruto), 0)::numeric                                      AS valor_bruto_total,
    COALESCE(sum(saldo) FILTER (WHERE status IN ('PENDENTE','PARCIAL')), 0)::numeric AS saldo_aberto,
    COALESCE(sum(valor_liquido - saldo) FILTER (WHERE status IN ('RECEBIDO','PAGO','PARCIAL')), 0)::numeric AS valor_pago,
    COALESCE(sum(juros), 0)::numeric                                            AS juros_total,
    COALESCE(sum(multa), 0)::numeric                                            AS multa_total,
    COALESCE(sum(desconto), 0)::numeric                                         AS desconto_total
  FROM base;
$$;

REVOKE ALL ON FUNCTION public.rpc_titulos_totais(
  text, text, text, date, date, text, text, uuid, uuid, uuid, boolean, boolean, boolean, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_titulos_totais(
  text, text, text, date, date, text, text, uuid, uuid, uuid, boolean, boolean, boolean, boolean
) TO authenticated;

COMMENT ON FUNCTION public.rpc_titulos_totais IS
  'D15.1.a.1.i — Totais agregados oficiais para TitulosTab. Mesma RLS de titulos_financeiros. Único caminho permitido para rodapé de totais server-side.';
