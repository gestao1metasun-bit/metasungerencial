
-- D11.5 — Métricas Operacionais de Obras (camada analítica de engenharia)
-- Views read-only baseadas em obras + estoque_movimentos. Sem alteração transacional.

-- 1) Custo realizado por obra (saídas de estoque atribuídas à obra)
CREATE OR REPLACE VIEW public.v_obra_custo_realizado AS
SELECT
  o.id AS obra_id,
  o.codigo,
  o.equipe,
  o.consultor_id,
  o.status,
  o.modulos_qtde,
  o.potencia_kwp,
  o.data_inicio,
  o.data_finalizacao,
  COALESCE(o.custo_previsto, 0) AS custo_previsto,
  COALESCE(SUM(CASE WHEN em.tipo IN ('SAIDA','CONSUMO','ENTREGA') THEN em.custo_total ELSE 0 END), 0) AS custo_realizado,
  COALESCE(o.custo_previsto, 0)
    - COALESCE(SUM(CASE WHEN em.tipo IN ('SAIDA','CONSUMO','ENTREGA') THEN em.custo_total ELSE 0 END), 0) AS desvio_custo
FROM public.obras o
LEFT JOIN public.estoque_movimentos em ON em.obra_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY o.id;

GRANT SELECT ON public.v_obra_custo_realizado TO authenticated;

-- 2) Tempo de obra (em dias)
CREATE OR REPLACE VIEW public.v_obra_tempo AS
SELECT
  o.id AS obra_id,
  o.codigo,
  o.equipe,
  o.status,
  o.modulos_qtde,
  o.data_inicio,
  o.data_finalizacao,
  CASE
    WHEN o.data_inicio IS NULL THEN NULL
    WHEN o.data_finalizacao IS NOT NULL THEN (o.data_finalizacao - o.data_inicio)
    ELSE (CURRENT_DATE - o.data_inicio)
  END AS dias_obra,
  CASE
    WHEN o.data_inicio IS NULL OR o.data_finalizacao IS NULL OR COALESCE(o.modulos_qtde,0) = 0 THEN NULL
    WHEN (o.data_finalizacao - o.data_inicio) <= 0 THEN o.modulos_qtde::numeric
    ELSE ROUND(o.modulos_qtde::numeric / NULLIF((o.data_finalizacao - o.data_inicio), 0), 2)
  END AS modulos_por_dia
FROM public.obras o
WHERE o.deleted_at IS NULL;

GRANT SELECT ON public.v_obra_tempo TO authenticated;

-- 3) Obras atrasadas (ativas sem finalização há > 30 dias)
CREATE OR REPLACE VIEW public.v_eng_obras_atrasadas AS
SELECT
  o.id AS obra_id,
  o.codigo,
  o.equipe,
  o.consultor_id,
  o.status,
  o.modulos_qtde,
  o.data_inicio,
  (CURRENT_DATE - o.data_inicio) AS dias_em_aberto,
  CASE
    WHEN (CURRENT_DATE - o.data_inicio) > 60 THEN 'CRITICA'
    WHEN (CURRENT_DATE - o.data_inicio) > 30 THEN 'ALTA'
    ELSE 'MEDIA'
  END AS severidade
FROM public.obras o
WHERE o.deleted_at IS NULL
  AND o.data_finalizacao IS NULL
  AND o.data_inicio IS NOT NULL
  AND o.status NOT IN ('Finalizada','Cancelada','Concluida','Concluída')
  AND (CURRENT_DATE - o.data_inicio) > 15
ORDER BY (CURRENT_DATE - o.data_inicio) DESC;

GRANT SELECT ON public.v_eng_obras_atrasadas TO authenticated;

-- 4) Produtividade por equipe
CREATE OR REPLACE VIEW public.v_eng_produtividade_equipe AS
SELECT
  COALESCE(NULLIF(TRIM(o.equipe), ''), '(sem equipe)') AS equipe,
  COUNT(*) FILTER (WHERE o.deleted_at IS NULL) AS total_obras,
  COUNT(*) FILTER (WHERE o.data_finalizacao IS NOT NULL) AS obras_finalizadas,
  COUNT(*) FILTER (WHERE o.data_finalizacao IS NULL AND o.status NOT IN ('Cancelada')) AS obras_em_andamento,
  COALESCE(SUM(o.modulos_qtde) FILTER (WHERE o.data_finalizacao IS NOT NULL), 0) AS modulos_instalados,
  COALESCE(SUM(o.potencia_kwp) FILTER (WHERE o.data_finalizacao IS NOT NULL), 0) AS kwp_instalado,
  ROUND(AVG(o.data_finalizacao - o.data_inicio) FILTER (
    WHERE o.data_finalizacao IS NOT NULL AND o.data_inicio IS NOT NULL
  ), 1) AS tempo_medio_obra_dias,
  ROUND(AVG(
    CASE WHEN o.data_finalizacao IS NOT NULL AND o.data_inicio IS NOT NULL
         AND (o.data_finalizacao - o.data_inicio) > 0
         AND COALESCE(o.modulos_qtde,0) > 0
      THEN o.modulos_qtde::numeric / (o.data_finalizacao - o.data_inicio)
      ELSE NULL END
  ), 2) AS modulos_por_dia_medio,
  COUNT(*) FILTER (
    WHERE o.data_finalizacao IS NULL
      AND o.data_inicio IS NOT NULL
      AND (CURRENT_DATE - o.data_inicio) > 30
      AND o.status NOT IN ('Finalizada','Cancelada','Concluida','Concluída')
  ) AS obras_atrasadas
FROM public.obras o
WHERE o.deleted_at IS NULL
GROUP BY 1
ORDER BY kwp_instalado DESC;

GRANT SELECT ON public.v_eng_produtividade_equipe TO authenticated;

-- 5) Desvio de custo (top obras com maior estouro)
CREATE OR REPLACE VIEW public.v_eng_desvio_custo AS
SELECT
  vcr.obra_id,
  vcr.codigo,
  vcr.equipe,
  vcr.status,
  vcr.modulos_qtde,
  vcr.custo_previsto,
  vcr.custo_realizado,
  vcr.desvio_custo,
  CASE
    WHEN COALESCE(vcr.custo_previsto, 0) <= 0 THEN NULL
    ELSE ROUND((vcr.custo_realizado - vcr.custo_previsto) / vcr.custo_previsto * 100, 2)
  END AS desvio_pct,
  CASE
    WHEN COALESCE(vcr.custo_previsto, 0) <= 0 THEN 'SEM_ORCAMENTO'
    WHEN vcr.custo_realizado > vcr.custo_previsto * 1.20 THEN 'ESTOURO_CRITICO'
    WHEN vcr.custo_realizado > vcr.custo_previsto * 1.05 THEN 'ESTOURO'
    WHEN vcr.custo_realizado > vcr.custo_previsto * 0.90 THEN 'NO_ALVO'
    ELSE 'ABAIXO'
  END AS faixa
FROM public.v_obra_custo_realizado vcr
WHERE COALESCE(vcr.custo_previsto, 0) > 0
   OR COALESCE(vcr.custo_realizado, 0) > 0
ORDER BY ABS(COALESCE(vcr.desvio_custo, 0)) DESC;

GRANT SELECT ON public.v_eng_desvio_custo TO authenticated;

-- 6) Backlog por equipe (obras planejadas/em andamento)
CREATE OR REPLACE VIEW public.v_eng_backlog_equipe AS
SELECT
  COALESCE(NULLIF(TRIM(o.equipe), ''), '(sem equipe)') AS equipe,
  COUNT(*) FILTER (WHERE o.status = 'Planejada') AS planejadas,
  COUNT(*) FILTER (WHERE o.status NOT IN ('Planejada','Finalizada','Cancelada','Concluida','Concluída')
                   AND o.data_finalizacao IS NULL) AS em_andamento,
  COALESCE(SUM(o.modulos_qtde) FILTER (
    WHERE o.data_finalizacao IS NULL AND o.status NOT IN ('Cancelada')
  ), 0) AS modulos_pendentes,
  COALESCE(SUM(o.potencia_kwp) FILTER (
    WHERE o.data_finalizacao IS NULL AND o.status NOT IN ('Cancelada')
  ), 0) AS kwp_pendente
FROM public.obras o
WHERE o.deleted_at IS NULL
GROUP BY 1
HAVING COUNT(*) FILTER (WHERE o.data_finalizacao IS NULL AND o.status NOT IN ('Cancelada')) > 0
ORDER BY kwp_pendente DESC;

GRANT SELECT ON public.v_eng_backlog_equipe TO authenticated;

-- 7) Tempo médio por faixa de módulos (para futuro motor de previsão D11.8)
CREATE OR REPLACE VIEW public.v_eng_tempo_por_faixa AS
SELECT
  CASE
    WHEN o.modulos_qtde IS NULL THEN '(sem info)'
    WHEN o.modulos_qtde <= 12 THEN '01-12'
    WHEN o.modulos_qtde <= 24 THEN '13-24'
    WHEN o.modulos_qtde <= 48 THEN '25-48'
    WHEN o.modulos_qtde <= 96 THEN '49-96'
    ELSE '97+'
  END AS faixa_modulos,
  COUNT(*) AS obras,
  ROUND(AVG(o.data_finalizacao - o.data_inicio), 1) AS tempo_medio_dias,
  ROUND(MIN(o.data_finalizacao - o.data_inicio), 1) AS tempo_min_dias,
  ROUND(MAX(o.data_finalizacao - o.data_inicio), 1) AS tempo_max_dias,
  ROUND(AVG(o.modulos_qtde::numeric / NULLIF((o.data_finalizacao - o.data_inicio), 0)), 2) AS modulos_dia_medio
FROM public.obras o
WHERE o.deleted_at IS NULL
  AND o.data_finalizacao IS NOT NULL
  AND o.data_inicio IS NOT NULL
  AND (o.data_finalizacao - o.data_inicio) > 0
GROUP BY 1
ORDER BY 1;

GRANT SELECT ON public.v_eng_tempo_por_faixa TO authenticated;

-- 8) Resumo agregado para cards do dashboard
CREATE OR REPLACE VIEW public.v_eng_metricas_resumo AS
SELECT
  (SELECT COUNT(*) FROM public.obras WHERE deleted_at IS NULL) AS total_obras,
  (SELECT COUNT(*) FROM public.obras WHERE deleted_at IS NULL AND data_finalizacao IS NULL
    AND status NOT IN ('Cancelada','Finalizada','Concluida','Concluída')) AS obras_ativas,
  (SELECT COUNT(*) FROM public.obras WHERE deleted_at IS NULL AND data_finalizacao IS NOT NULL) AS obras_finalizadas,
  (SELECT COUNT(*) FROM public.v_eng_obras_atrasadas) AS obras_atrasadas,
  (SELECT COUNT(*) FROM public.v_eng_desvio_custo WHERE faixa = 'ESTOURO_CRITICO') AS obras_estouro_critico,
  (SELECT COALESCE(SUM(modulos_instalados),0) FROM public.v_eng_produtividade_equipe) AS modulos_instalados_total,
  (SELECT COALESCE(SUM(kwp_instalado),0) FROM public.v_eng_produtividade_equipe) AS kwp_instalado_total,
  (SELECT COALESCE(SUM(kwp_pendente),0) FROM public.v_eng_backlog_equipe) AS kwp_backlog,
  (SELECT ROUND(AVG(tempo_medio_obra_dias),1) FROM public.v_eng_produtividade_equipe
    WHERE tempo_medio_obra_dias IS NOT NULL) AS tempo_medio_obra_geral;

GRANT SELECT ON public.v_eng_metricas_resumo TO authenticated;
