
-- D14.4 — Pendências de governança (lacunas documentadas)
CREATE TABLE public.governance_pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,
  entidade text NOT NULL,
  acao text NOT NULL,
  tipo_lacuna text NOT NULL CHECK (tipo_lacuna IN ('workflow','motivo','auditoria','sla','outro')),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','mitigada','aceita','resolvida')),
  criticidade text NOT NULL DEFAULT 'media' CHECK (criticidade IN ('baixa','media','alta','critica')),
  justificativa text,
  mitigacao text,
  responsavel_id uuid,
  prazo date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.governance_pendencias TO authenticated;
GRANT ALL ON public.governance_pendencias TO service_role;

ALTER TABLE public.governance_pendencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY gpend_select_auth ON public.governance_pendencias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY gpend_admin_write ON public.governance_pendencias
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_gpend_modulo ON public.governance_pendencias(modulo, status);

-- View consolidada lacunas × pendências
CREATE OR REPLACE VIEW public.v_governance_gaps_status WITH (security_invoker = on) AS
SELECT
  g.modulo, g.entidade, g.acao, g.perfil, g.criticidade,
  g.gap_workflow, g.gap_motivo, g.gap_auditoria, g.gap_sla, g.total_gaps,
  COALESCE(p.pendencias_abertas, 0) AS pendencias_abertas,
  COALESCE(p.pendencias_mitigadas, 0) AS pendencias_mitigadas,
  CASE
    WHEN g.criticidade = 'critica' AND COALESCE(p.pendencias_abertas,0) = 0 AND COALESCE(p.pendencias_mitigadas,0) = 0
      THEN 'BLOQUEAR'
    WHEN COALESCE(p.pendencias_abertas,0) > 0 THEN 'DOCUMENTADA'
    WHEN COALESCE(p.pendencias_mitigadas,0) > 0 THEN 'MITIGADA'
    ELSE 'PENDENTE'
  END AS status_governanca
FROM public.v_governance_gaps g
LEFT JOIN (
  SELECT modulo, entidade, acao,
    COUNT(*) FILTER (WHERE status = 'aberta') AS pendencias_abertas,
    COUNT(*) FILTER (WHERE status IN ('mitigada','aceita')) AS pendencias_mitigadas
  FROM public.governance_pendencias
  GROUP BY modulo, entidade, acao
) p ON p.modulo = g.modulo AND p.entidade = g.entidade AND p.acao = g.acao;
