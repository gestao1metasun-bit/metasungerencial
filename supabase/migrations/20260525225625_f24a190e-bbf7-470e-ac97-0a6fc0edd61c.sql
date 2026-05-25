
-- ============================================================================
-- Prioridade 2 — Persistência do funil comercial (Leads + Propostas)
-- ============================================================================

-- ---------- LEADS ----------
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text,
  nome text NOT NULL,
  telefone text,
  doc text,
  consumo_kwh numeric NOT NULL DEFAULT 0,
  consultor_id uuid,
  origem text,
  observacao text,
  status text NOT NULL DEFAULT 'LEAD_CADASTRADO',
  cliente_id uuid,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_leads_consultor_status ON public.leads(consultor_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_cliente ON public.leads(cliente_id);
CREATE INDEX IF NOT EXISTS idx_leads_doc ON public.leads(doc);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_select_own_or_admin ON public.leads;
CREATE POLICY leads_select_own_or_admin ON public.leads
  FOR SELECT TO authenticated
  USING (consultor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS leads_insert_auth ON public.leads;
CREATE POLICY leads_insert_auth ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (consultor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS leads_update_own_or_admin ON public.leads;
CREATE POLICY leads_update_own_or_admin ON public.leads
  FOR UPDATE TO authenticated
  USING (consultor_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (consultor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS leads_delete_admin ON public.leads;
CREATE POLICY leads_delete_admin ON public.leads
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ---------- PROPOSTAS ----------
CREATE TABLE IF NOT EXISTS public.propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text,
  status text NOT NULL DEFAULT 'RASCUNHO',
  consultor_id uuid,
  cliente_id uuid,
  lead_id uuid,
  contrato_id uuid,
  cliente_nome text,
  cliente_doc text,
  valor_final numeric,
  potencia_kwp numeric,
  modulos_qtd integer,
  validade date,
  data_aprovacao timestamptz,
  data_envio timestamptz,
  versao text,
  motivo_status text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_propostas_consultor_status ON public.propostas(consultor_id, status);
CREATE INDEX IF NOT EXISTS idx_propostas_lead ON public.propostas(lead_id);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON public.propostas(cliente_id);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS propostas_select_own_or_admin ON public.propostas;
CREATE POLICY propostas_select_own_or_admin ON public.propostas
  FOR SELECT TO authenticated
  USING (consultor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS propostas_insert_auth ON public.propostas;
CREATE POLICY propostas_insert_auth ON public.propostas
  FOR INSERT TO authenticated
  WITH CHECK (consultor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS propostas_update_own_or_admin ON public.propostas;
CREATE POLICY propostas_update_own_or_admin ON public.propostas
  FOR UPDATE TO authenticated
  USING (consultor_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (consultor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS propostas_delete_admin ON public.propostas;
CREATE POLICY propostas_delete_admin ON public.propostas
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_propostas_updated_at ON public.propostas;
CREATE TRIGGER trg_propostas_updated_at
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
