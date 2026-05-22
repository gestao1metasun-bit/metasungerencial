-- ============================================================
-- 1. ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contratos_consultor_status
  ON public.contratos(consultor_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_data_assinatura
  ON public.contratos(data_assinatura) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_cliente
  ON public.contratos(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_status
  ON public.contratos(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_obras_status_finalizacao
  ON public.obras(status, data_finalizacao) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obras_consultor
  ON public.obras(consultor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obras_contrato
  ON public.obras(contrato_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obras_cliente
  ON public.obras(cliente_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projetos_cliente
  ON public.projetos(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projetos_consultor
  ON public.projetos(consultor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projetos_contrato
  ON public.projetos(contrato_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_consultor
  ON public.clientes(consultor_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_assigned_status
  ON public.tarefas(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_due_date
  ON public.tarefas(due_date) WHERE status <> 'concluida';
CREATE INDEX IF NOT EXISTS idx_tarefas_related
  ON public.tarefas(related_entity, related_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entidade
  ON public.audit_log(entidade, entidade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ev_entidade
  ON public.entidade_versoes(entidade, entidade_id, versao DESC);

-- ============================================================
-- 2. VIEW MATERIALIZADA — KPI COMERCIAL (mensal)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_kpi_comercial CASCADE;
CREATE MATERIALIZED VIEW public.mv_kpi_comercial AS
SELECT
  date_trunc('month', COALESCE(data_assinatura, created_at))::date AS mes,
  count(*)::int                                                     AS total_contratos,
  count(*) FILTER (WHERE status = 'Assinado')::int                  AS assinados,
  count(*) FILTER (WHERE status = 'Rascunho')::int                  AS rascunhos,
  count(*) FILTER (WHERE status = 'Cancelado')::int                 AS cancelados,
  COALESCE(sum(valor_total) FILTER (WHERE status = 'Assinado'), 0)  AS receita_assinada,
  COALESCE(sum(valor_total), 0)                                     AS pipeline_total,
  COALESCE(avg(valor_total) FILTER (WHERE status = 'Assinado'), 0)  AS ticket_medio,
  COALESCE(sum(potencia_kwp) FILTER (WHERE status = 'Assinado'), 0) AS kwp_vendido
FROM public.contratos
WHERE deleted_at IS NULL
GROUP BY 1;

CREATE UNIQUE INDEX idx_mv_kpi_comercial_mes ON public.mv_kpi_comercial(mes);

-- ============================================================
-- 3. VIEW MATERIALIZADA — KPI ENGENHARIA (mensal)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_kpi_engenharia CASCADE;
CREATE MATERIALIZED VIEW public.mv_kpi_engenharia AS
SELECT
  date_trunc('month', COALESCE(data_inicio, created_at))::date           AS mes,
  count(*)::int                                                          AS total_obras,
  count(*) FILTER (WHERE status = 'Em andamento')::int                   AS em_andamento,
  count(*) FILTER (WHERE status = 'Finalizada')::int                     AS finalizadas,
  count(*) FILTER (WHERE status = 'Planejada')::int                      AS planejadas,
  count(*) FILTER (WHERE data_finalizacao < current_date
                   AND status NOT IN ('Finalizada','Cancelada'))::int    AS atrasadas,
  COALESCE(sum(potencia_kwp), 0)                                         AS kwp_total,
  COALESCE(sum(modulos_qtde), 0)                                         AS modulos_total
FROM public.obras
WHERE deleted_at IS NULL
GROUP BY 1;

CREATE UNIQUE INDEX idx_mv_kpi_engenharia_mes ON public.mv_kpi_engenharia(mes);

-- ============================================================
-- 4. VIEW MATERIALIZADA — KPI POR CONSULTOR
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_kpi_consultor CASCADE;
CREATE MATERIALIZED VIEW public.mv_kpi_consultor AS
SELECT
  c.consultor_id,
  p.nome                                                              AS consultor_nome,
  count(*)::int                                                       AS total_contratos,
  count(*) FILTER (WHERE c.status = 'Assinado')::int                  AS assinados,
  count(*) FILTER (WHERE c.status = 'Cancelado')::int                 AS cancelados,
  COALESCE(sum(c.valor_total) FILTER (WHERE c.status = 'Assinado'), 0) AS receita,
  COALESCE(avg(c.valor_total) FILTER (WHERE c.status = 'Assinado'), 0) AS ticket_medio,
  COALESCE(sum(c.potencia_kwp) FILTER (WHERE c.status = 'Assinado'), 0) AS kwp_vendido,
  CASE WHEN count(*) > 0
       THEN round(100.0 * count(*) FILTER (WHERE c.status = 'Assinado') / count(*), 2)
       ELSE 0 END                                                     AS conversao_pct
FROM public.contratos c
LEFT JOIN public.profiles p ON p.user_id = c.consultor_id
WHERE c.deleted_at IS NULL AND c.consultor_id IS NOT NULL
GROUP BY c.consultor_id, p.nome;

CREATE UNIQUE INDEX idx_mv_kpi_consultor_id ON public.mv_kpi_consultor(consultor_id);

-- ============================================================
-- 5. PERMISSÕES DE ACESSO ÀS VIEWS
-- ============================================================
GRANT SELECT ON public.mv_kpi_comercial  TO authenticated;
GRANT SELECT ON public.mv_kpi_engenharia TO authenticated;
GRANT SELECT ON public.mv_kpi_consultor  TO authenticated;

-- ============================================================
-- 6. FUNÇÃO DE REFRESH (chamada por job ou manualmente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_mv_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := clock_timestamp();
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_kpi_comercial;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_kpi_engenharia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_kpi_consultor;
  RETURN jsonb_build_object(
    'ok', true,
    'duration_ms', extract(milliseconds from clock_timestamp() - v_start)::int,
    'refreshed_at', now()
  );
END $$;

GRANT EXECUTE ON FUNCTION public.refresh_mv_kpis() TO authenticated;