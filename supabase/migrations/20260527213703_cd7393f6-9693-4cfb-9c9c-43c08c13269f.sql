
-- ============================================================
-- D14.3 — Governance Matrix (matriz oficial de governança)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.governance_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,
  entidade text NOT NULL,
  acao text NOT NULL,
  perfil text NOT NULL DEFAULT 'admin',
  permissao text,
  requer_workflow boolean NOT NULL DEFAULT false,
  requer_motivo boolean NOT NULL DEFAULT false,
  audita boolean NOT NULL DEFAULT true,
  suporta_lote boolean NOT NULL DEFAULT false,
  suporta_estorno boolean NOT NULL DEFAULT false,
  sla_horas integer,
  criticidade text NOT NULL DEFAULT 'media' CHECK (criticidade IN ('baixa','media','alta','critica')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modulo, entidade, acao, perfil)
);

GRANT SELECT ON public.governance_matrix TO authenticated;
GRANT ALL ON public.governance_matrix TO service_role;

ALTER TABLE public.governance_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY gm_select_auth ON public.governance_matrix
  FOR SELECT TO authenticated USING (true);

CREATE POLICY gm_admin_write ON public.governance_matrix
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ---------- Views oficiais ----------
CREATE OR REPLACE VIEW public.v_governance_matrix_full
WITH (security_invoker = on) AS
SELECT
  g.modulo, g.entidade, g.acao, g.perfil, g.permissao,
  g.requer_workflow, g.requer_motivo, g.audita,
  g.suporta_lote, g.suporta_estorno, g.sla_horas,
  g.criticidade, g.observacao,
  CASE WHEN g.criticidade IN ('alta','critica') AND NOT g.requer_workflow
       THEN true ELSE false END AS gap_workflow,
  CASE WHEN g.criticidade IN ('alta','critica') AND NOT g.requer_motivo
       THEN true ELSE false END AS gap_motivo,
  CASE WHEN NOT g.audita THEN true ELSE false END AS gap_auditoria,
  CASE WHEN g.criticidade IN ('alta','critica') AND g.sla_horas IS NULL
       THEN true ELSE false END AS gap_sla
FROM public.governance_matrix g;

GRANT SELECT ON public.v_governance_matrix_full TO authenticated;

CREATE OR REPLACE VIEW public.v_governance_gaps
WITH (security_invoker = on) AS
SELECT modulo, entidade, acao, perfil, criticidade,
       gap_workflow, gap_motivo, gap_auditoria, gap_sla,
       (gap_workflow::int + gap_motivo::int + gap_auditoria::int + gap_sla::int) AS total_gaps
FROM public.v_governance_matrix_full
WHERE gap_workflow OR gap_motivo OR gap_auditoria OR gap_sla
ORDER BY total_gaps DESC, modulo, entidade, acao;

GRANT SELECT ON public.v_governance_gaps TO authenticated;

CREATE OR REPLACE VIEW public.v_governance_resumo
WITH (security_invoker = on) AS
SELECT
  modulo,
  count(*) AS total_acoes,
  count(*) FILTER (WHERE criticidade = 'critica') AS criticas,
  count(*) FILTER (WHERE criticidade = 'alta')    AS altas,
  count(*) FILTER (WHERE requer_workflow)         AS com_workflow,
  count(*) FILTER (WHERE requer_motivo)           AS com_motivo,
  count(*) FILTER (WHERE audita)                  AS com_auditoria,
  count(*) FILTER (WHERE suporta_lote)            AS com_lote,
  count(*) FILTER (WHERE suporta_estorno)         AS com_estorno,
  count(*) FILTER (WHERE sla_horas IS NOT NULL)   AS com_sla
FROM public.governance_matrix
GROUP BY modulo
ORDER BY modulo;

GRANT SELECT ON public.v_governance_resumo TO authenticated;

-- ---------- Seed: matriz oficial enterprise ----------
INSERT INTO public.governance_matrix
  (modulo, entidade, acao, perfil, permissao, requer_workflow, requer_motivo, audita, suporta_lote, suporta_estorno, sla_horas, criticidade, observacao)
VALUES
-- Financeiro (titulos / parcelas / movimentações)
('financeiro','titulo','baixar','financeiro','financeiro.baixar',          false, false, true,  true,  true,  24,  'critica','Sempre via RPC rpc_registrar_movimentacao; flag app.via_movimentacao bloqueia UPDATE direto'),
('financeiro','titulo','renegociar','financeiro','financeiro.renegociar',  true,  true,  true,  false, false, 72,  'critica','Workflow obrigatório acima de alçada'),
('financeiro','titulo','consolidar','financeiro','financeiro.consolidar',  false, false, true,  true,  true,  48,  'alta','Consolidação multi-título → novo título'),
('financeiro','movimentacao','estornar','financeiro','financeiro.estornar',true,  true,  true,  false, false, 24,  'critica','Append-only via tg_em_append_only; estorno gera contra-movimento'),
('financeiro','titulo','cancelar','financeiro','financeiro.cancelar',      true,  true,  true,  false, true,  48,  'critica','Cancela título e libera vínculos'),
('financeiro','parcela','alterar_vencimento','financeiro','financeiro.editar', false, true, true, true, false, 24, 'alta','Auditado em audit_log'),
('financeiro','parcela','alterar_valor','financeiro','financeiro.editar',  true,  true,  true,  false, false, 24,  'critica','Workflow se delta > alçada'),
('financeiro','titulo','alterar_natureza','financeiro','financeiro.editar',false, true,  true,  true,  false, 48,  'alta',NULL),
('financeiro','titulo','alterar_cr','financeiro','financeiro.editar',      false, true,  true,  true,  false, 48,  'alta','Centro de resultado'),
('financeiro','titulo','alterar_portador','financeiro','financeiro.editar',false, true,  true,  true,  false, 48,  'media',NULL),
('financeiro','titulo','excluir','admin','admin.excluir',                  true,  true,  true,  false, false, 8,   'critica','Soft delete apenas; exclusão física bloqueada'),

-- Comercial
('comercial','proposta','aprovar_desconto','gerente','comercial.aprovar_desconto', true, true, true, false, false, 24, 'alta','Workflow seeds 5k/20k/>20k'),
('comercial','proposta','cancelar','comercial','comercial.cancelar',       false, true,  true,  false, false, 48,  'alta',NULL),
('comercial','contrato','converter','comercial','comercial.converter',     false, false, true,  false, false, 24,  'alta','Proposta → Contrato'),
('comercial','pv','gerar','comercial','pv.gerar',                          false, false, true,  false, false, 24,  'alta','Contrato → PV via rpc_gerar_pedido_venda'),
('comercial','pv','cancelar','comercial','pv.cancelar',                    true,  true,  true,  false, true,  48,  'critica','State machine 42501; bloqueia financeiro vinculado'),
('comercial','pv','enviar_engenharia','comercial','pv.enviar_engenharia',  false, false, true,  false, false, 24,  'alta','RPC rpc_pv_enviar_engenharia'),
('comercial','projeto','gerar','engenharia','engenharia.projeto.gerar',    false, false, true,  false, false, 24,  'alta','PV aprovado → Projeto'),

-- Estoque
('estoque','produto','ajustar','estoque','estoque.ajustar',                true,  true,  true,  false, true,  24,  'critica','Ajuste inventário via RPC'),
('estoque','reserva','criar','estoque','estoque.reservar',                 false, false, true,  true,  true,  24,  'alta','Vinculada a obra/PV'),
('estoque','reserva','cancelar','estoque','estoque.reservar',              false, true,  true,  false, false, 24,  'alta',NULL),
('estoque','entrega','registrar','estoque','estoque.entregar',             false, false, true,  true,  true,  24,  'alta','Baixa estoque via mov SAIDA'),
('estoque','entrega','devolver','estoque','estoque.entregar',              false, true,  true,  false, true,  48,  'alta','Devolução gera ENTRADA'),
('estoque','inventario','executar','estoque','estoque.inventario',         true,  true,  true,  true,  false, 168, 'critica','Auditoria oficial; congela movimentações'),
('estoque','transferencia','executar','estoque','estoque.transferir',      false, true,  true,  false, true,  24,  'alta','Origem/destino'),
('estoque','compra','emergencial','compras','estoque.comprar',             true,  true,  true,  false, false, 8,   'critica','Bypass alçada normal exige workflow'),

-- Engenharia
('engenharia','obra','alterar_status','engenharia','engenharia.editar',    false, true,  true,  false, false, 24,  'critica','Status crítico nunca editável livre'),
('engenharia','obra','alterar_equipe','engenharia','engenharia.editar',    false, false, true,  true,  false, 48,  'media',NULL),
('engenharia','obra','recalcular_cronograma','engenharia','engenharia.editar', false, false, true, false, false, 48, 'alta','Recálculo motor de previsão'),
('engenharia','obra','finalizar','engenharia','engenharia.finalizar',      true,  true,  true,  false, true,  72,  'critica','Bloqueia pendências abertas'),
('engenharia','obra','abrir_pendencia','engenharia','engenharia.editar',   false, true,  true,  true,  false, 24,  'alta',NULL),

-- Compras
('compras','solicitacao','aprovar','financeiro','workflow.aprovar.financeiro', true, false, true, true, false, 24, 'critica','Seeds alcadas 5k/20k/>20k'),
('compras','cotacao','escolher','compras','estoque.comprar',               false, true,  true,  false, false, 24,  'alta',NULL),
('compras','oc','aprovar','financeiro','workflow.aprovar.financeiro',      true,  false, true,  true,  false, 24,  'critica',NULL),
('compras','oc','cancelar','compras','estoque.comprar',                    false, true,  true,  false, true,  24,  'alta',NULL),
('compras','oc','receber','estoque','estoque.receber',                     false, false, true,  true,  true,  24,  'alta','Gera entrada estoque + título a pagar'),

-- Aprovações (workflow engine)
('aprovacoes','workflow','aprovar','aprovador','workflow.aprovar',         false, false, true,  true,  false, 24,  'alta','Flag app.via_workflow_rpc obrigatória'),
('aprovacoes','workflow','negar','aprovador','workflow.aprovar',           false, true,  true,  true,  false, 24,  'alta',NULL),
('aprovacoes','workflow','delegar','aprovador','workflow.aprovar',         false, true,  true,  false, false, 24,  'media',NULL),
('aprovacoes','workflow','reabrir','admin','workflow.admin',               true,  true,  true,  false, false, 48,  'critica','Reabertura exige aprovação superior'),
('aprovacoes','workflow','escalonar','admin','workflow.admin',             false, false, true,  false, false, 48,  'alta','Automático ao expirar SLA');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_gm_updated_at ON public.governance_matrix;
CREATE TRIGGER trg_gm_updated_at
BEFORE UPDATE ON public.governance_matrix
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
