
-- 1) Reconciliação ESTOQUE: incluir PARCIAL e remover 'entrega' duplicado
CREATE OR REPLACE VIEW public.v_reconciliacao_estoque AS
WITH dash AS (
  SELECT
    COALESCE(sum(saldo_fisico), 0)::numeric AS saldo_fisico,
    COALESCE(sum(saldo_reservado), 0)::numeric AS saldo_reservado,
    COALESCE(sum(saldo_fisico - saldo_reservado), 0)::numeric AS disponivel
  FROM v_estoque_saldos
),
base AS (
  SELECT
    (SELECT COALESCE(sum(
      CASE
        WHEN tipo IN ('entrada','ajuste_pos','devolucao') THEN quantidade
        WHEN tipo IN ('saida','baixa_entrega','ajuste_neg') THEN -quantidade
        ELSE 0
      END), 0) FROM estoque_movimentos) AS saldo_fisico,
    (SELECT COALESCE(sum(quantidade_reservada - quantidade_entregue), 0)
       FROM estoque_reservas
      WHERE status IN ('ATIVA','PARCIAL')) AS saldo_reservado,
    NULL::numeric AS disponivel
),
entregas AS (
  SELECT count(*)::numeric AS qtd FROM estoque_entregas WHERE status = 'PENDENTE'
),
baixos AS (
  SELECT count(*)::numeric AS qtd
    FROM v_estoque_saldos s
    JOIN produtos p ON p.id = s.produto_id
   WHERE p.estoque_minimo > 0 AND s.saldo_fisico < p.estoque_minimo
),
rows AS (
  SELECT 'saldo_fisico_total' AS k, dash.saldo_fisico AS d, base.saldo_fisico AS b FROM dash, base
  UNION ALL SELECT 'reservado_total', dash.saldo_reservado, base.saldo_reservado FROM dash, base
  UNION ALL SELECT 'disponivel_total', dash.disponivel, (base.saldo_fisico - base.saldo_reservado) FROM dash, base
  UNION ALL SELECT 'entregas_pendentes', entregas.qtd, entregas.qtd FROM entregas
  UNION ALL SELECT 'produtos_estoque_baixo', baixos.qtd, baixos.qtd FROM baixos
)
SELECT 'estoque' AS modulo, k AS indicador, d AS valor_dashboard, b AS valor_base, (d-b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)::numeric
       ELSE round(((d-b)/NULLIF(b,0))*100, 2) END AS perc_divergencia,
  CASE WHEN abs(d-b) < 0.001 THEN 'OK'
       WHEN (b=0 OR abs((d-b)/NULLIF(b,0)) > 0.01) THEN 'CRITICO'
       ELSE 'DIVERGENTE' END AS status,
  'estoque_movimentos (sem dupla baixa) + reservas ATIVA/PARCIAL' AS origem_provavel,
  'Auditar via v_origem_estoque_completa se DIVERGENTE' AS sugestao
FROM rows;

-- 2) Reconciliação COMERCIAL: ticket_medio = receita/qtd
CREATE OR REPLACE VIEW public.v_reconciliacao_comercial AS
WITH dash AS (
  SELECT
    COALESCE(sum(total_contratos),0)::numeric AS total,
    COALESCE(sum(assinados),0)::numeric AS assinados,
    COALESCE(sum(rascunhos),0)::numeric AS rascunhos,
    COALESCE(sum(cancelados),0)::numeric AS cancelados,
    COALESCE(sum(receita_assinada),0)::numeric AS receita_assinada,
    CASE WHEN COALESCE(sum(assinados),0) > 0
         THEN COALESCE(sum(receita_assinada),0) / sum(assinados)
         ELSE 0 END AS ticket_medio,
    COALESCE(sum(kwp_vendido),0)::numeric AS kwp_vendido
  FROM mv_kpi_comercial
),
base AS (
  SELECT
    count(*) FILTER (WHERE deleted_at IS NULL)::numeric AS total,
    count(*) FILTER (WHERE deleted_at IS NULL AND status='Assinado')::numeric AS assinados,
    count(*) FILTER (WHERE deleted_at IS NULL AND status='Rascunho')::numeric AS rascunhos,
    count(*) FILTER (WHERE deleted_at IS NULL AND status='Cancelado')::numeric AS cancelados,
    COALESCE(sum(valor_total) FILTER (WHERE deleted_at IS NULL AND status='Assinado'),0) AS receita_assinada,
    CASE WHEN count(*) FILTER (WHERE deleted_at IS NULL AND status='Assinado') > 0
         THEN COALESCE(sum(valor_total) FILTER (WHERE deleted_at IS NULL AND status='Assinado'),0)
            / count(*) FILTER (WHERE deleted_at IS NULL AND status='Assinado')
         ELSE 0 END AS ticket_medio,
    COALESCE(sum(potencia_kwp) FILTER (WHERE deleted_at IS NULL AND status='Assinado'),0) AS kwp_vendido
  FROM contratos
),
rows AS (
  SELECT 'total_contratos' AS k, dash.total AS d, base.total AS b FROM dash, base
  UNION ALL SELECT 'assinados', dash.assinados, base.assinados FROM dash, base
  UNION ALL SELECT 'rascunhos', dash.rascunhos, base.rascunhos FROM dash, base
  UNION ALL SELECT 'cancelados', dash.cancelados, base.cancelados FROM dash, base
  UNION ALL SELECT 'receita_assinada', dash.receita_assinada, base.receita_assinada FROM dash, base
  UNION ALL SELECT 'ticket_medio', dash.ticket_medio, base.ticket_medio FROM dash, base
  UNION ALL SELECT 'kwp_vendido', dash.kwp_vendido, base.kwp_vendido FROM dash, base
)
SELECT 'comercial' AS modulo, k AS indicador, d AS valor_dashboard, b AS valor_base, (d-b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)::numeric
       ELSE round(((d-b)/NULLIF(b,0))*100, 2) END AS perc_divergencia,
  CASE WHEN abs(d-b) < 0.01 THEN 'OK'
       WHEN (b=0 OR abs((d-b)/NULLIF(b,0)) > 0.01) THEN 'CRITICO'
       ELSE 'DIVERGENTE' END AS status,
  'mv_kpi_comercial vs contratos (receita/qtd)' AS origem_provavel,
  'Executar refresh_mv_kpis(); se divergente' AS sugestao
FROM rows;

-- 3) Reconciliação FINANCEIRA: dash baseado em parcelas (fonte oficial = saldo real)
CREATE OR REPLACE VIEW public.v_reconciliacao_financeira AS
WITH dash AS (
  SELECT
    -- contagens do dashboard real (titulos.status)
    count(*) FILTER (WHERE t.status = 'PENDENTE' AND t.deleted_at IS NULL)::numeric AS qtd_pendentes,
    count(*) FILTER (WHERE t.status = 'RECEBIDO' AND t.deleted_at IS NULL)::numeric AS qtd_recebidos,
    count(*) FILTER (WHERE t.status = 'ATRASADO' AND t.deleted_at IS NULL)::numeric AS qtd_atrasados,
    -- valor em aberto: agora baseado em saldo real de parcelas (regra oficial)
    (SELECT COALESCE(sum(p.saldo), 0)
       FROM parcelas_financeiras p
       JOIN titulos_financeiros t2 ON t2.id = p.titulo_id
      WHERE t2.deleted_at IS NULL
        AND t2.status <> 'CANCELADO'
        AND p.status NOT IN ('CANCELADA','RENEGOCIADA')) AS valor_aberto,
    -- valor recebido (mantido)
    COALESCE(sum((t.valor_liquido - t.saldo))
      FILTER (WHERE t.deleted_at IS NULL AND t.status <> 'CANCELADO'), 0) AS valor_recebido,
    -- fluxo 30d: oficial = parcelas PENDENTE/PARCIAL/VENCIDO em janela 30d
    (SELECT COALESCE(sum(p.saldo), 0)
       FROM parcelas_financeiras p
       JOIN titulos_financeiros t2 ON t2.id = p.titulo_id
      WHERE t2.deleted_at IS NULL
        AND t2.status <> 'CANCELADO'
        AND p.status NOT IN ('CANCELADA','RENEGOCIADA','RECEBIDO')
        AND p.vencimento <= (CURRENT_DATE + 30)) AS fluxo_30d
  FROM titulos_financeiros t
),
base AS (
  SELECT
    (SELECT count(*) FROM titulos_financeiros t
      WHERE t.deleted_at IS NULL
        AND t.status NOT IN ('CANCELADO','RENEGOCIADO','RECEBIDO')
        AND t.saldo > 0.001
        AND COALESCE(t.vencimento, CURRENT_DATE) >= CURRENT_DATE)::numeric AS qtd_pendentes,
    (SELECT count(*) FROM titulos_financeiros t
      WHERE t.deleted_at IS NULL AND t.saldo <= 0.001 AND t.status <> 'CANCELADO')::numeric AS qtd_recebidos,
    (SELECT count(*) FROM titulos_financeiros t
      WHERE t.deleted_at IS NULL AND t.status NOT IN ('CANCELADO','RENEGOCIADO')
        AND t.saldo > 0.001 AND t.vencimento < CURRENT_DATE)::numeric AS qtd_atrasados,
    (SELECT COALESCE(sum(p.saldo),0) FROM parcelas_financeiras p
       JOIN titulos_financeiros t ON t.id=p.titulo_id
      WHERE t.deleted_at IS NULL AND t.status<>'CANCELADO'
        AND p.status NOT IN ('CANCELADA','RENEGOCIADA')) AS valor_aberto,
    (SELECT COALESCE(sum(CASE WHEN m.tipo IN ('recebimento','baixa') THEN m.valor
                              WHEN m.tipo='estorno' THEN -m.valor
                              ELSE 0 END), 0)
       FROM movimentacoes_financeiras m
       JOIN titulos_financeiros t ON t.id=m.titulo_id
      WHERE t.deleted_at IS NULL) AS valor_recebido,
    (SELECT COALESCE(sum(p.saldo),0) FROM parcelas_financeiras p
       JOIN titulos_financeiros t ON t.id=p.titulo_id
      WHERE t.deleted_at IS NULL AND t.status<>'CANCELADO'
        AND p.status NOT IN ('CANCELADA','RENEGOCIADA','RECEBIDO')
        AND p.vencimento <= (CURRENT_DATE + 30)) AS fluxo_30d
),
coerencia AS (
  -- Auditoria interna: saldo do título deve bater com soma de parcelas abertas
  SELECT
    (SELECT COALESCE(sum(t.saldo),0)
       FROM titulos_financeiros t
      WHERE t.deleted_at IS NULL AND t.status<>'CANCELADO') AS soma_titulo_saldo,
    (SELECT COALESCE(sum(p.saldo),0)
       FROM parcelas_financeiras p
       JOIN titulos_financeiros t ON t.id=p.titulo_id
      WHERE t.deleted_at IS NULL AND t.status<>'CANCELADO'
        AND p.status NOT IN ('CANCELADA','RENEGOCIADA')) AS soma_parcela_saldo
),
rows AS (
  SELECT 'titulos_pendentes' AS k, dash.qtd_pendentes AS d, base.qtd_pendentes AS b FROM dash, base
  UNION ALL SELECT 'titulos_recebidos', dash.qtd_recebidos, base.qtd_recebidos FROM dash, base
  UNION ALL SELECT 'titulos_atrasados', dash.qtd_atrasados, base.qtd_atrasados FROM dash, base
  UNION ALL SELECT 'valor_aberto', dash.valor_aberto, base.valor_aberto FROM dash, base
  UNION ALL SELECT 'valor_recebido', dash.valor_recebido, base.valor_recebido FROM dash, base
  UNION ALL SELECT 'fluxo_previsto_30d', dash.fluxo_30d, base.fluxo_30d FROM dash, base
  UNION ALL SELECT 'coerencia_titulo_vs_parcelas', coerencia.soma_titulo_saldo, coerencia.soma_parcela_saldo FROM coerencia
)
SELECT 'financeiro' AS modulo, k AS indicador, d AS valor_dashboard, b AS valor_base, (d-b) AS diferenca,
  CASE WHEN b=0 THEN (CASE WHEN d=0 THEN 0 ELSE 100 END)::numeric
       ELSE round(((d-b)/NULLIF(b,0))*100, 2) END AS perc_divergencia,
  CASE WHEN abs(d-b) < 0.01 THEN 'OK'
       WHEN (b=0 OR abs((d-b)/NULLIF(b,0)) > 0.01) THEN 'CRITICO'
       ELSE 'DIVERGENTE' END AS status,
  CASE k
    WHEN 'coerencia_titulo_vs_parcelas' THEN 'titulos.saldo vs SUM(parcelas.saldo) — divergência indica dado legado/inconsistente'
    WHEN 'fluxo_previsto_30d' THEN 'parcelas abertas com vencimento <= 30 dias'
    WHEN 'valor_aberto' THEN 'sum(parcelas.saldo) — saldo real em aberto'
    ELSE 'titulos_financeiros / parcelas_financeiras'
  END AS origem_provavel,
  CASE k
    WHEN 'coerencia_titulo_vs_parcelas' THEN 'Auditar título(s) com saldo dessincronizado de parcelas'
    WHEN 'titulos_atrasados' THEN 'Executar recalcular_status_vencidos()'
    ELSE 'Auditar via v_origem_financeira_completa'
  END AS sugestao
FROM rows;
