
-- ============================================================
-- D7.1 — Cobertura de auditoria: fechar gaps críticos
-- ============================================================
-- Adiciona tg_audit_row em tabelas críticas que estavam sem rastro
-- before/after em audit_log. Mantém triggers existentes (histórico
-- próprio do workflow, updated_at, etc) — auditoria é COMPLEMENTAR.
-- ============================================================

-- Workflow (governança de aprovações)
DROP TRIGGER IF EXISTS tg_audit_workflow_aprovacoes ON public.workflow_aprovacoes;
CREATE TRIGGER tg_audit_workflow_aprovacoes
AFTER INSERT OR UPDATE OR DELETE ON public.workflow_aprovacoes
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('workflow', 'workflow_aprovacoes');

DROP TRIGGER IF EXISTS tg_audit_workflow_alcadas ON public.workflow_alcadas;
CREATE TRIGGER tg_audit_workflow_alcadas
AFTER INSERT OR UPDATE OR DELETE ON public.workflow_alcadas
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('workflow', 'workflow_alcadas');

-- Financeiro (cadastros estruturais)
DROP TRIGGER IF EXISTS tg_audit_contas_financeiras ON public.contas_financeiras;
CREATE TRIGGER tg_audit_contas_financeiras
AFTER INSERT OR UPDATE OR DELETE ON public.contas_financeiras
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro', 'contas_financeiras');

DROP TRIGGER IF EXISTS tg_audit_centros_resultado ON public.centros_resultado;
CREATE TRIGGER tg_audit_centros_resultado
AFTER INSERT OR UPDATE OR DELETE ON public.centros_resultado
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro', 'centros_resultado');

DROP TRIGGER IF EXISTS tg_audit_anexos_titulos ON public.anexos_titulos;
CREATE TRIGGER tg_audit_anexos_titulos
AFTER INSERT OR UPDATE OR DELETE ON public.anexos_titulos
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro', 'anexos_titulos');

-- Operação
DROP TRIGGER IF EXISTS tg_audit_tarefas ON public.tarefas;
CREATE TRIGGER tg_audit_tarefas
AFTER INSERT OR UPDATE OR DELETE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('tarefas', 'tarefas');

-- Parâmetros gerenciais (já tem histórico próprio, mas audit dá before/after consistente)
DROP TRIGGER IF EXISTS tg_audit_gerencial_parametros ON public.gerencial_parametros;
CREATE TRIGGER tg_audit_gerencial_parametros
AFTER INSERT OR UPDATE OR DELETE ON public.gerencial_parametros
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('configuracoes', 'gerencial_parametros');

-- ============================================================
-- View v_auditoria_cobertura — evidência permanente
-- ============================================================
-- Classifica tabelas em CRÍTICAS / IMPORTANTES / UTILITÁRIAS /
-- APPEND_ONLY e mostra se cada uma tem tg_audit_row e tg_snapshot_version.
-- Usada pelo card de governança em /paineis e por relatórios D7.

CREATE OR REPLACE VIEW public.v_auditoria_cobertura AS
WITH tabelas AS (
  SELECT c.relname AS tabela
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
audit AS (
  SELECT DISTINCT c.relname AS tabela
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public' AND NOT t.tgisinternal AND p.proname = 'tg_audit_row'
),
snap AS (
  SELECT DISTINCT c.relname AS tabela
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public' AND NOT t.tgisinternal AND p.proname = 'tg_snapshot_version'
),
classif AS (
  SELECT t.tabela,
    CASE
      WHEN t.tabela IN (
        'contratos','aditivos','obras','projetos','projetos_contrato','clientes',
        'pedidos_venda','titulos_financeiros','parcelas_financeiras','movimentacoes_financeiras',
        'estoque_movimentos','estoque_reservas','estoque_entregas','produtos',
        'workflow_aprovacoes','workflow_alcadas',
        'contas_financeiras','centros_resultado',
        'user_roles','role_permissions','user_permission_overrides'
      ) THEN 'CRITICA'
      WHEN t.tabela IN (
        'propostas','leads','tarefas','anexos_titulos','gerencial_parametros','profiles','period_locks'
      ) THEN 'IMPORTANTE'
      WHEN t.tabela IN (
        'pedidos_venda_status_historico','workflow_aprovacoes_historico',
        'entidade_versoes','audit_log','session_log','anexos_audit','gerencial_parametros_historico'
      ) THEN 'APPEND_ONLY'
      ELSE 'UTILITARIA'
    END AS categoria
  FROM tabelas t
)
SELECT
  c.categoria,
  c.tabela,
  (a.tabela IS NOT NULL) AS tem_audit_row,
  (s.tabela IS NOT NULL) AS tem_snapshot,
  CASE
    WHEN c.categoria = 'APPEND_ONLY' THEN 'OK'
    WHEN c.categoria IN ('CRITICA','IMPORTANTE') AND a.tabela IS NULL THEN 'GAP'
    ELSE 'OK'
  END AS status_cobertura
FROM classif c
LEFT JOIN audit a ON a.tabela = c.tabela
LEFT JOIN snap s ON s.tabela = c.tabela
ORDER BY
  CASE c.categoria WHEN 'CRITICA' THEN 1 WHEN 'IMPORTANTE' THEN 2 WHEN 'UTILITARIA' THEN 3 ELSE 4 END,
  c.tabela;

GRANT SELECT ON public.v_auditoria_cobertura TO authenticated;
GRANT SELECT ON public.v_auditoria_cobertura TO service_role;
