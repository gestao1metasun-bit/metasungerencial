
-- D7.8 — Views de Reconciliação Dashboards × Base Oficial
-- Padrão de saída: (modulo, indicador, valor_dashboard, valor_base, diferenca, perc_divergencia, status, origem_provavel, sugestao)

-- Helper inline: usado dentro de cada view via CASE
-- status OK: diff=0; DIVERGENTE: |diff|<=1%; CRITICO: |diff|>1%
-- Para divergências em contagens pequenas (<10), qualquer diff != 0 é CRITICO

----------------------------------------------------------------------
-- 1) FINANCEIRA
----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_reconciliacao_financeira AS
WITH dash AS (
  SELECT
    -- "dashboard" lê titulos_financeiros com filtro por status (mesma query usada nos cards)
    COUNT(*) FILTER (WHERE status='PENDENTE' AND deleted_at IS NULL)::numeric AS qtd_pendentes,
    COUNT(*) FILTER (WHERE status='RECEBIDO' AND deleted_at IS NULL)::numeric AS qtd_recebidos,
    COUNT(*) FILTER (WHERE status='ATRASADO' AND deleted_at IS NULL)::numeric AS qtd_atrasados,
    COALESCE(SUM(saldo) FILTER (WHERE status IN ('PENDENTE','PARCIAL','ATRASADO') AND deleted_at IS NULL),0) AS valor_aberto,
    COALESCE(SUM(valor_liquido - saldo) FILTER (WHERE deleted_at IS NULL AND status <> 'CANCELADO'),0) AS valor_recebido,
    COALESCE(SUM(saldo) FILTER (WHERE deleted_at IS NULL AND status IN ('PENDENTE','PARCIAL') AND vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30),0) AS fluxo_30d
  FROM public.titulos_financeiros
),
base AS (
  -- "base" recalcula a partir de parcelas + movimentações (fonte primária)
  SELECT
    (SELECT COUNT(*) FROM public.titulos_financeiros t
       WHERE t.deleted_at IS NULL AND t.status NOT IN ('CANCELADO','RENEGOCIADO','RECEBIDO')
         AND t.saldo > 0.001 AND COALESCE(t.vencimento, CURRENT_DATE) >= CURRENT_DATE)::numeric AS qtd_pendentes,
    (SELECT COUNT(*) FROM public.titulos_financeiros t
       WHERE t.deleted_at IS NULL AND t.saldo <= 0.001 AND t.status <> 'CANCELADO')::numeric AS qtd_recebidos,
    (SELECT COUNT(*) FROM public.titulos_financeiros t
       WHERE t.deleted_at IS NULL AND t.status NOT IN ('CANCELADO','RENEGOCIADO')
         AND t.saldo > 0.001 AND t.vencimento < CURRENT_DATE)::numeric AS qtd_atrasados,
    (SELECT COALESCE(SUM(p.saldo),0) FROM public.parcelas_financeiras p
       JOIN public.titulos_financeiros t ON t.id=p.titulo_id
       WHERE t.deleted_at IS NULL AND t.status <> 'CANCELADO' AND p.status NOT IN ('CANCELADA','RENEGOCIADA')) AS valor_aberto,
    (SELECT COALESCE(SUM(CASE WHEN m.tipo IN ('recebimento','baixa') THEN m.valor
                              WHEN m.tipo='estorno' THEN -m.valor ELSE 0 END),0)
       FROM public.movimentacoes_financeiras m
       JOIN public.titulos_financeiros t ON t.id=m.titulo_id
       WHERE t.deleted_at IS NULL) AS valor_recebido,
    (SELECT COALESCE(SUM(p.saldo),0) FROM public.parcelas_financeiras p
       JOIN public.titulos_financeiros t ON t.id=p.titulo_id
       WHERE t.deleted_at IS NULL AND t.status <> 'CANCELADO'
         AND p.status NOT IN ('CANCELADA','RENEGOCIADA','RECEBIDO')
         AND p.vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS fluxo_30d
),
rows AS (
  SELECT 'titulos_pendentes' k, dash.qtd_pendentes d, base.qtd_pendentes b FROM dash, base
  UNION ALL SELECT 'titulos_recebidos', dash.qtd_recebidos, base.qtd_recebidos FROM dash, base
  UNION ALL SELECT 'titulos_atrasados', dash.qtd_atrasados, base.qtd_atrasados FROM dash, base
  UNION ALL SELECT 'valor_aberto', dash.valor_aberto, base.valor_aberto FROM dash, base
  UNION ALL SELECT 'valor_recebido', dash.valor_recebido, base.valor_recebido FROM dash, base
  UNION ALL SELECT 'fluxo_previsto_30d', dash.fluxo_30d, base.fluxo_30d FROM dash, base
)
SELECT
  'financeiro'::text AS modulo,
  k AS indicador,
  d AS valor_dashboard,
  b AS valor_base,
  (d - b) AS diferenca,
  CASE WHEN b = 0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)
       ELSE ROUND(((d-b)/NULLIF(b,0))*100, 2) END AS perc_divergencia,
  CASE
    WHEN ABS(d-b) < 0.01 THEN 'OK'
    WHEN b=0 OR ABS((d-b)/NULLIF(b,0)) > 0.01 THEN 'CRITICO'
    ELSE 'DIVERGENTE'
  END AS status,
  CASE k
    WHEN 'titulos_pendentes' THEN 'titulos_financeiros.status / cálculo por saldo+vencimento'
    WHEN 'titulos_recebidos' THEN 'titulos_financeiros.status vs saldo<=0'
    WHEN 'titulos_atrasados' THEN 'recalcular_status_vencidos não executado'
    WHEN 'valor_aberto'     THEN 'titulos.saldo vs SUM(parcelas.saldo)'
    WHEN 'valor_recebido'   THEN 'titulos.valor_liquido - saldo vs movimentações'
    WHEN 'fluxo_previsto_30d' THEN 'parcelas com vencimento próximos 30 dias'
  END AS origem_provavel,
  CASE k
    WHEN 'titulos_atrasados' THEN 'Executar SELECT recalcular_status_vencidos();'
    ELSE 'Auditar título(s) divergente(s) via v_origem_financeira_completa'
  END AS sugestao
FROM rows;

GRANT SELECT ON public.v_reconciliacao_financeira TO authenticated;

----------------------------------------------------------------------
-- 2) ESTOQUE
----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_reconciliacao_estoque AS
WITH dash AS (
  SELECT
    COALESCE(SUM(saldo_fisico),0)::numeric AS saldo_fisico,
    COALESCE(SUM(saldo_reservado),0)::numeric AS saldo_reservado,
    COALESCE(SUM(saldo_fisico - saldo_reservado),0)::numeric AS disponivel
  FROM public.v_estoque_saldos
),
base AS (
  SELECT
    (SELECT COALESCE(SUM(CASE
      WHEN tipo IN ('entrada','ajuste_pos','devolucao') THEN quantidade
      WHEN tipo IN ('saida','baixa_entrega','ajuste_neg','entrega') THEN -quantidade
      ELSE 0 END),0) FROM public.estoque_movimentos) AS saldo_fisico,
    (SELECT COALESCE(SUM(quantidade_reservada - quantidade_entregue),0) FROM public.estoque_reservas WHERE status='ATIVA') AS saldo_reservado,
    NULL::numeric AS disponivel
),
entregas AS (
  SELECT COUNT(*)::numeric AS qtd FROM public.estoque_entregas WHERE status='PENDENTE'
),
baixos AS (
  SELECT COUNT(*)::numeric AS qtd FROM public.v_estoque_saldos s
    JOIN public.produtos p ON p.id=s.produto_id
   WHERE p.estoque_minimo > 0 AND s.saldo_fisico < p.estoque_minimo
),
rows AS (
  SELECT 'saldo_fisico_total' k, dash.saldo_fisico d, base.saldo_fisico b FROM dash, base
  UNION ALL SELECT 'reservado_total', dash.saldo_reservado, base.saldo_reservado FROM dash, base
  UNION ALL SELECT 'disponivel_total', dash.disponivel, (base.saldo_fisico - base.saldo_reservado) FROM dash, base
  UNION ALL SELECT 'entregas_pendentes', entregas.qtd, entregas.qtd FROM entregas
  UNION ALL SELECT 'produtos_estoque_baixo', baixos.qtd, baixos.qtd FROM baixos
)
SELECT
  'estoque'::text AS modulo,
  k AS indicador,
  d AS valor_dashboard,
  b AS valor_base,
  (d - b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)
       ELSE ROUND(((d-b)/NULLIF(b,0))*100,2) END AS perc_divergencia,
  CASE
    WHEN ABS(d-b) < 0.001 THEN 'OK'
    WHEN b=0 OR ABS((d-b)/NULLIF(b,0)) > 0.01 THEN 'CRITICO'
    ELSE 'DIVERGENTE'
  END AS status,
  'estoque_movimentos (append-only) / estoque_reservas' AS origem_provavel,
  'Auditar movimentos via v_origem_estoque_completa por produto' AS sugestao
FROM rows;

GRANT SELECT ON public.v_reconciliacao_estoque TO authenticated;

----------------------------------------------------------------------
-- 3) PV
----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_reconciliacao_pv AS
WITH dash AS (
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::numeric AS total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='APROVADO')::numeric AS aprovados,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='EM_EXECUCAO')::numeric AS em_execucao,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='CANCELADO')::numeric AS cancelados,
    COALESCE(SUM(valor_total) FILTER (WHERE deleted_at IS NULL AND status<>'CANCELADO'),0) AS valor_total
  FROM public.pedidos_venda
),
base AS (
  -- base: filtra via histórico (último status declarado) — deve bater com a coluna status
  SELECT
    (SELECT COUNT(*) FROM public.pedidos_venda WHERE deleted_at IS NULL)::numeric AS total,
    (SELECT COUNT(DISTINCT pv.id) FROM public.pedidos_venda pv
       WHERE pv.deleted_at IS NULL
         AND (SELECT h.status_novo FROM public.pedidos_venda_status_historico h
              WHERE h.pedido_id=pv.id ORDER BY h.created_at DESC LIMIT 1)='APROVADO')::numeric AS aprovados,
    (SELECT COUNT(DISTINCT pv.id) FROM public.pedidos_venda pv
       WHERE pv.deleted_at IS NULL
         AND (SELECT h.status_novo FROM public.pedidos_venda_status_historico h
              WHERE h.pedido_id=pv.id ORDER BY h.created_at DESC LIMIT 1)='EM_EXECUCAO')::numeric AS em_execucao,
    (SELECT COUNT(*) FROM public.pedidos_venda WHERE deleted_at IS NULL AND cancelado_em IS NOT NULL)::numeric AS cancelados,
    (SELECT COALESCE(SUM(valor_total),0) FROM public.pedidos_venda WHERE deleted_at IS NULL AND cancelado_em IS NULL) AS valor_total
),
rows AS (
  SELECT 'total_pv' k, dash.total d, base.total b FROM dash, base
  UNION ALL SELECT 'aprovados', dash.aprovados, base.aprovados FROM dash, base
  UNION ALL SELECT 'em_execucao', dash.em_execucao, base.em_execucao FROM dash, base
  UNION ALL SELECT 'cancelados', dash.cancelados, base.cancelados FROM dash, base
  UNION ALL SELECT 'valor_total', dash.valor_total, base.valor_total FROM dash, base
)
SELECT
  'pv'::text AS modulo, k AS indicador, d AS valor_dashboard, b AS valor_base,
  (d-b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)
       ELSE ROUND(((d-b)/NULLIF(b,0))*100,2) END AS perc_divergencia,
  CASE
    WHEN ABS(d-b) < 0.01 THEN 'OK'
    WHEN b=0 OR ABS((d-b)/NULLIF(b,0)) > 0.01 THEN 'CRITICO'
    ELSE 'DIVERGENTE'
  END AS status,
  'pedidos_venda.status vs pedidos_venda_status_historico (último)' AS origem_provavel,
  'Verificar transição que não passou pelas RPCs oficiais' AS sugestao
FROM rows;

GRANT SELECT ON public.v_reconciliacao_pv TO authenticated;

----------------------------------------------------------------------
-- 4) APROVAÇÕES (workflow)
----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_reconciliacao_aprovacoes AS
WITH dash AS (
  SELECT
    COUNT(*) FILTER (WHERE status='PENDENTE')::numeric AS pendentes,
    COUNT(*) FILTER (WHERE status='PENDENTE' AND created_at < now() - interval '48 hours')::numeric AS vencidas,
    COUNT(*) FILTER (WHERE status='APROVADA' AND decidido_em::date = CURRENT_DATE)::numeric AS aprovadas_hoje,
    COUNT(*) FILTER (WHERE status='NEGADA'   AND decidido_em::date = CURRENT_DATE)::numeric AS negadas_hoje
  FROM public.workflow_aprovacoes
),
base AS (
  -- recontagem direta da mesma tabela com filtros normalizados
  SELECT
    (SELECT COUNT(*) FROM public.workflow_aprovacoes WHERE status='PENDENTE' AND decidido_em IS NULL AND cancelado_em IS NULL)::numeric AS pendentes,
    (SELECT COUNT(*) FROM public.workflow_aprovacoes WHERE status='PENDENTE' AND created_at < now() - interval '48 hours')::numeric AS vencidas,
    (SELECT COUNT(*) FROM public.workflow_aprovacoes WHERE status='APROVADA' AND decidido_em >= CURRENT_DATE)::numeric AS aprovadas_hoje,
    (SELECT COUNT(*) FROM public.workflow_aprovacoes WHERE status='NEGADA'   AND decidido_em >= CURRENT_DATE)::numeric AS negadas_hoje
),
rows AS (
  SELECT 'pendentes' k, dash.pendentes d, base.pendentes b FROM dash, base
  UNION ALL SELECT 'vencidas_sla_48h', dash.vencidas, base.vencidas FROM dash, base
  UNION ALL SELECT 'aprovadas_hoje', dash.aprovadas_hoje, base.aprovadas_hoje FROM dash, base
  UNION ALL SELECT 'negadas_hoje', dash.negadas_hoje, base.negadas_hoje FROM dash, base
)
SELECT
  'aprovacoes'::text AS modulo, k AS indicador, d AS valor_dashboard, b AS valor_base,
  (d-b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)
       ELSE ROUND(((d-b)/NULLIF(b,0))*100,2) END AS perc_divergencia,
  CASE
    WHEN ABS(d-b) < 0.01 THEN 'OK'
    WHEN b=0 OR ABS((d-b)/NULLIF(b,0)) > 0.01 THEN 'CRITICO'
    ELSE 'DIVERGENTE'
  END AS status,
  'workflow_aprovacoes (status + decidido_em/cancelado_em)' AS origem_provavel,
  'Conferir flag PENDENTE com decidido_em preenchido (transição sem RPC)' AS sugestao
FROM rows;

GRANT SELECT ON public.v_reconciliacao_aprovacoes TO authenticated;

----------------------------------------------------------------------
-- 5) ENGENHARIA
----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_reconciliacao_engenharia AS
WITH dash AS (
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status NOT IN ('Finalizada','Cancelada'))::numeric AS obras_ativas,
    COALESCE(SUM(custo_previsto) FILTER (WHERE deleted_at IS NULL),0) AS custo_previsto_total
  FROM public.obras
),
base AS (
  SELECT
    (SELECT COUNT(*) FROM public.obras WHERE deleted_at IS NULL AND status NOT IN ('Finalizada','Cancelada'))::numeric AS obras_ativas,
    (SELECT COALESCE(SUM(custo_previsto),0) FROM public.v_custo_obra_previsto) AS custo_previsto_total,
    (SELECT COALESCE(SUM(custo_realizado),0) FROM public.v_custo_obra_realizado) AS custo_realizado_total,
    (SELECT COUNT(*) FROM public.materiais_pendentes_por_obra)::numeric AS materiais_pendentes
),
rows AS (
  SELECT 'obras_ativas' k, dash.obras_ativas d, base.obras_ativas b FROM dash, base
  UNION ALL SELECT 'custo_previsto_total', dash.custo_previsto_total, base.custo_previsto_total FROM dash, base
  UNION ALL SELECT 'custo_realizado_total', base.custo_realizado_total, base.custo_realizado_total FROM base
  UNION ALL SELECT 'materiais_pendentes', base.materiais_pendentes, base.materiais_pendentes FROM base
)
SELECT
  'engenharia'::text AS modulo, k AS indicador, d AS valor_dashboard, b AS valor_base,
  (d-b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)
       ELSE ROUND(((d-b)/NULLIF(b,0))*100,2) END AS perc_divergencia,
  CASE
    WHEN ABS(d-b) < 0.01 THEN 'OK'
    WHEN b=0 OR ABS((d-b)/NULLIF(b,0)) > 0.01 THEN 'CRITICO'
    ELSE 'DIVERGENTE'
  END AS status,
  'obras.custo_previsto vs v_custo_obra_previsto/realizado' AS origem_provavel,
  'Auditar obra via v_origem_obra_completa' AS sugestao
FROM rows;

GRANT SELECT ON public.v_reconciliacao_engenharia TO authenticated;

----------------------------------------------------------------------
-- 6) COMERCIAL (compara com MV mv_kpi_comercial)
----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_reconciliacao_comercial AS
WITH dash AS (
  SELECT
    COALESCE(SUM(total_contratos),0)::numeric AS total,
    COALESCE(SUM(assinados),0)::numeric AS assinados,
    COALESCE(SUM(rascunhos),0)::numeric AS rascunhos,
    COALESCE(SUM(cancelados),0)::numeric AS cancelados,
    COALESCE(SUM(receita_assinada),0) AS receita_assinada,
    COALESCE(AVG(NULLIF(ticket_medio,0)),0) AS ticket_medio,
    COALESCE(SUM(kwp_vendido),0) AS kwp_vendido
  FROM public.mv_kpi_comercial
),
base AS (
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL)::numeric AS total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='Assinado')::numeric AS assinados,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='Rascunho')::numeric AS rascunhos,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='Cancelado')::numeric AS cancelados,
    COALESCE(SUM(valor_total) FILTER (WHERE deleted_at IS NULL AND status='Assinado'),0) AS receita_assinada,
    COALESCE(AVG(valor_total) FILTER (WHERE deleted_at IS NULL AND status='Assinado'),0) AS ticket_medio,
    COALESCE(SUM(potencia_kwp) FILTER (WHERE deleted_at IS NULL AND status='Assinado'),0) AS kwp_vendido
  FROM public.contratos
),
rows AS (
  SELECT 'total_contratos' k, dash.total d, base.total b FROM dash, base
  UNION ALL SELECT 'assinados', dash.assinados, base.assinados FROM dash, base
  UNION ALL SELECT 'rascunhos', dash.rascunhos, base.rascunhos FROM dash, base
  UNION ALL SELECT 'cancelados', dash.cancelados, base.cancelados FROM dash, base
  UNION ALL SELECT 'receita_assinada', dash.receita_assinada, base.receita_assinada FROM dash, base
  UNION ALL SELECT 'ticket_medio', dash.ticket_medio, base.ticket_medio FROM dash, base
  UNION ALL SELECT 'kwp_vendido', dash.kwp_vendido, base.kwp_vendido FROM dash, base
)
SELECT
  'comercial'::text AS modulo, k AS indicador, d AS valor_dashboard, b AS valor_base,
  (d-b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)
       ELSE ROUND(((d-b)/NULLIF(b,0))*100,2) END AS perc_divergencia,
  CASE
    WHEN ABS(d-b) < 0.01 THEN 'OK'
    WHEN b=0 OR ABS((d-b)/NULLIF(b,0)) > 0.01 THEN 'CRITICO'
    ELSE 'DIVERGENTE'
  END AS status,
  'mv_kpi_comercial vs contratos (base)' AS origem_provavel,
  'Executar SELECT refresh_mv_kpis(); se divergente' AS sugestao
FROM rows;

GRANT SELECT ON public.v_reconciliacao_comercial TO authenticated;

----------------------------------------------------------------------
-- RESUMO consolidado
----------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_reconciliacao_resumo AS
SELECT * FROM public.v_reconciliacao_financeira
UNION ALL SELECT * FROM public.v_reconciliacao_estoque
UNION ALL SELECT * FROM public.v_reconciliacao_pv
UNION ALL SELECT * FROM public.v_reconciliacao_aprovacoes
UNION ALL SELECT * FROM public.v_reconciliacao_engenharia
UNION ALL SELECT * FROM public.v_reconciliacao_comercial;

GRANT SELECT ON public.v_reconciliacao_resumo TO authenticated;
