
CREATE TABLE IF NOT EXISTS public.oportunidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  descricao text,
  consultor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pipeline_etapa_id uuid REFERENCES public.comercial_pipeline_etapas(id) ON DELETE SET NULL,
  valor_estimado numeric,
  status text NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','GANHA','PERDIDA','CANCELADA','ARQUIVADA')),
  motivo_status text,
  ultimo_contato timestamptz,
  proxima_acao text,
  proxima_acao_em timestamptz,
  tags text[],
  observacoes text,
  centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  natureza_id uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  competencia date,
  codigo_externo text,
  sistema_destino text,
  status_integracao text DEFAULT 'PENDENTE' CHECK (status_integracao IN ('PENDENTE','ENVIADO','INTEGRADO','ERRO','NAO_APLICAVEL')),
  hash_remessa text,
  lote_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_reason text,
  row_version integer NOT NULL DEFAULT 1
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades TO authenticated;
GRANT ALL ON public.oportunidades TO service_role;

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oportunidades_select" ON public.oportunidades FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'comercial.oportunidade.visualizar'::public.app_permission));
CREATE POLICY "oportunidades_insert" ON public.oportunidades FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'comercial.oportunidade.criar'::public.app_permission));
CREATE POLICY "oportunidades_update" ON public.oportunidades FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'comercial.oportunidade.editar'::public.app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'comercial.oportunidade.editar'::public.app_permission));
CREATE POLICY "oportunidades_delete_admin" ON public.oportunidades FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_oportunidades_cliente   ON public.oportunidades (cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oportunidades_consultor ON public.oportunidades (consultor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oportunidades_status    ON public.oportunidades (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa     ON public.oportunidades (pipeline_etapa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oportunidades_codigo    ON public.oportunidades (lower(codigo)) WHERE deleted_at IS NULL;

CREATE TRIGGER tg_oportunidades_updated_at  BEFORE UPDATE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
CREATE TRIGGER tg_oportunidades_row_version BEFORE UPDATE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();
CREATE TRIGGER tg_oportunidades_audit       AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial','oportunidades');

ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_propostas_oportunidade ON public.propostas (oportunidade_id) WHERE deleted_at IS NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS oportunidade_id uuid REFERENCES public.oportunidades(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_oportunidade ON public.leads (oportunidade_id);

DO $$
DECLARE
  v_count integer := 0;
  r record;
  v_op_id uuid;
  v_cliente_id uuid;
BEGIN
  -- bypass autorizado de triggers de bloqueio para apenas vincular oportunidade
  PERFORM set_config('app.via_revisao_proposta', 'true', true);

  FOR r IN
    SELECT p.id, p.cliente_id, p.lead_id, p.consultor_id, p.valor_final, p.numero, p.created_at
    FROM public.propostas p
    WHERE p.oportunidade_id IS NULL AND p.deleted_at IS NULL
  LOOP
    v_cliente_id := r.cliente_id;
    IF v_cliente_id IS NULL AND r.lead_id IS NOT NULL THEN
      SELECT cliente_id INTO v_cliente_id FROM public.leads WHERE id = r.lead_id;
    END IF;
    IF v_cliente_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.oportunidades (cliente_id, nome, consultor_id, valor_estimado, status, observacoes, created_at)
    VALUES (
      v_cliente_id,
      COALESCE('Oportunidade ' || r.numero, 'Oportunidade legada ' || r.id::text),
      r.consultor_id, r.valor_final, 'ABERTA',
      'Backfill C-ENT.1 — proposta ' || COALESCE(r.numero, r.id::text),
      r.created_at
    )
    RETURNING id INTO v_op_id;

    UPDATE public.propostas SET oportunidade_id = v_op_id WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'C-ENT.1 backfill: % oportunidades criadas', v_count;
END$$;
