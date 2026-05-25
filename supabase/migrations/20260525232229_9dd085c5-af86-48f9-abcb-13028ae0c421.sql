-- =====================================================================
-- ONDA 1 — Projetos do Contrato
-- =====================================================================

-- 1) Permissões novas
DO $$ BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'projeto.criar';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'projeto.aprovar';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'projeto.cancelar';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabela projetos_contrato
CREATE TABLE IF NOT EXISTS public.projetos_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL,
  cliente_id uuid,
  consultor_id uuid,
  ordem integer NOT NULL DEFAULT 1,
  descricao text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  endereco jsonb NOT NULL DEFAULT '{}'::jsonb,
  potencia_kwp numeric,
  modulos_qtd integer,
  inv1 text,
  inv2 text,
  inv3 text,
  telhado_tipo text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'RASCUNHO',
  obra_id uuid,
  pv_id uuid,
  aprovado_em timestamptz,
  aprovado_por uuid,
  motivo_aprovacao text,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid,
  CONSTRAINT projetos_contrato_status_chk CHECK (status IN
    ('RASCUNHO','PENDENTE_APROVACAO','APROVADO','ENVIADO_ENGENHARIA','EM_EXECUCAO','FINALIZADO','CANCELADO'))
);

CREATE INDEX IF NOT EXISTS idx_pc_contrato ON public.projetos_contrato(contrato_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pc_consultor ON public.projetos_contrato(consultor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pc_status ON public.projetos_contrato(status) WHERE deleted_at IS NULL;

ALTER TABLE public.projetos_contrato ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_select ON public.projetos_contrato;
CREATE POLICY pc_select ON public.projetos_contrato FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR consultor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.contratos c WHERE c.id = projetos_contrato.contrato_id AND c.consultor_id = auth.uid()));

DROP POLICY IF EXISTS pc_insert ON public.projetos_contrato;
CREATE POLICY pc_insert ON public.projetos_contrato FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR consultor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.contratos c WHERE c.id = projetos_contrato.contrato_id AND c.consultor_id = auth.uid()));

DROP POLICY IF EXISTS pc_update ON public.projetos_contrato;
CREATE POLICY pc_update ON public.projetos_contrato FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR consultor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.contratos c WHERE c.id = projetos_contrato.contrato_id AND c.consultor_id = auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR consultor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.contratos c WHERE c.id = projetos_contrato.contrato_id AND c.consultor_id = auth.uid()));

DROP POLICY IF EXISTS pc_delete ON public.projetos_contrato;
CREATE POLICY pc_delete ON public.projetos_contrato FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- 3) Triggers comuns
DROP TRIGGER IF EXISTS pc_set_updated_at ON public.projetos_contrato;
CREATE TRIGGER pc_set_updated_at BEFORE UPDATE ON public.projetos_contrato
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

DROP TRIGGER IF EXISTS pc_audit ON public.projetos_contrato;
CREATE TRIGGER pc_audit AFTER INSERT OR UPDATE OR DELETE ON public.projetos_contrato
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'projetos_contrato');

DROP TRIGGER IF EXISTS pc_snapshot ON public.projetos_contrato;
CREATE TRIGGER pc_snapshot AFTER UPDATE ON public.projetos_contrato
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

-- 4) Trigger de validação: soma dos projetos não pode ultrapassar valor do contrato
CREATE OR REPLACE FUNCTION public.tg_valida_soma_projetos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric;
  v_somado numeric;
  v_novo numeric;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.status = 'CANCELADO' THEN RETURN NEW; END IF;
  SELECT COALESCE(valor_total, 0) INTO v_total FROM public.contratos WHERE id = NEW.contrato_id;
  IF v_total IS NULL OR v_total <= 0 THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(valor), 0) INTO v_somado
    FROM public.projetos_contrato
    WHERE contrato_id = NEW.contrato_id
      AND deleted_at IS NULL
      AND status <> 'CANCELADO'
      AND id <> NEW.id;
  v_novo := v_somado + COALESCE(NEW.valor, 0);
  IF v_novo > v_total + 0.01 THEN
    RAISE EXCEPTION 'Soma dos projetos (R$ %) excede o valor do contrato (R$ %).', v_novo, v_total
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pc_valida_soma ON public.projetos_contrato;
CREATE TRIGGER pc_valida_soma BEFORE INSERT OR UPDATE OF valor, status ON public.projetos_contrato
  FOR EACH ROW EXECUTE FUNCTION public.tg_valida_soma_projetos();

-- 5) Trigger: projeto aprovado não pode ser editado direto (exceto admin / status transitions controladas)
CREATE OR REPLACE FUNCTION public.tg_protege_projeto_aprovado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF OLD.status IN ('APROVADO','ENVIADO_ENGENHARIA','EM_EXECUCAO','FINALIZADO') THEN
    -- permite somente transições de status, não edição de dados comerciais/técnicos
    IF (NEW.valor IS DISTINCT FROM OLD.valor)
       OR (NEW.descricao IS DISTINCT FROM OLD.descricao)
       OR (NEW.potencia_kwp IS DISTINCT FROM OLD.potencia_kwp)
       OR (NEW.modulos_qtd IS DISTINCT FROM OLD.modulos_qtd)
       OR (NEW.endereco IS DISTINCT FROM OLD.endereco) THEN
      RAISE EXCEPTION 'Projeto aprovado/em execução não pode ser editado. Solicite reabertura ao administrador.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS pc_protege_aprovado ON public.projetos_contrato;
CREATE TRIGGER pc_protege_aprovado BEFORE UPDATE ON public.projetos_contrato
  FOR EACH ROW EXECUTE FUNCTION public.tg_protege_projeto_aprovado();

-- 6) RPCs
CREATE OR REPLACE FUNCTION public.recalcular_saldo_contrato(_contrato_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric; v_somado numeric; v_aprovado numeric;
BEGIN
  SELECT COALESCE(valor_total,0) INTO v_total FROM public.contratos WHERE id = _contrato_id;
  SELECT COALESCE(SUM(valor),0) INTO v_somado FROM public.projetos_contrato
    WHERE contrato_id = _contrato_id AND deleted_at IS NULL AND status <> 'CANCELADO';
  SELECT COALESCE(SUM(valor),0) INTO v_aprovado FROM public.projetos_contrato
    WHERE contrato_id = _contrato_id AND deleted_at IS NULL
      AND status IN ('APROVADO','ENVIADO_ENGENHARIA','EM_EXECUCAO','FINALIZADO');
  RETURN jsonb_build_object('total', v_total, 'somado', v_somado, 'aprovado', v_aprovado, 'saldo', v_total - v_somado);
END $$;

CREATE OR REPLACE FUNCTION public.aprovar_projeto(_projeto_id uuid, _motivo text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_status text;
BEGIN
  SELECT status INTO v_status FROM public.projetos_contrato WHERE id = _projeto_id AND deleted_at IS NULL;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado.' USING ERRCODE='22023'; END IF;
  IF v_status NOT IN ('RASCUNHO','PENDENTE_APROVACAO') THEN
    RAISE EXCEPTION 'Projeto em status % não pode ser aprovado.', v_status USING ERRCODE='22023';
  END IF;
  UPDATE public.projetos_contrato
    SET status='APROVADO', aprovado_em=now(), aprovado_por=v_user, motivo_aprovacao=_motivo
    WHERE id=_projeto_id;
  RETURN _projeto_id;
END $$;

CREATE OR REPLACE FUNCTION public.enviar_projeto_para_engenharia(_projeto_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_obra_id uuid; v_codigo text;
BEGIN
  SELECT * INTO p FROM public.projetos_contrato WHERE id=_projeto_id AND deleted_at IS NULL;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado.' USING ERRCODE='22023'; END IF;
  IF p.status <> 'APROVADO' THEN
    RAISE EXCEPTION 'Apenas projeto APROVADO pode ir à engenharia.' USING ERRCODE='22023';
  END IF;
  IF p.obra_id IS NOT NULL THEN RETURN p.obra_id; END IF;

  v_codigo := 'OBR-' || to_char(now(),'YYYYMMDD') || '-' || substr(_projeto_id::text,1,6);
  INSERT INTO public.obras(codigo, contrato_id, cliente_id, consultor_id, status,
    potencia_kwp, modulos_qtde, inversor, inv2, inv3, telhado_tipo,
    dados)
  VALUES (v_codigo, p.contrato_id, p.cliente_id, p.consultor_id, 'Planejada',
    p.potencia_kwp, p.modulos_qtd, p.inv1, p.inv2, p.inv3, p.telhado_tipo,
    jsonb_build_object('projeto_contrato_id', p.id, 'endereco', p.endereco, 'descricao', p.descricao))
  RETURNING id INTO v_obra_id;

  UPDATE public.projetos_contrato
    SET status='ENVIADO_ENGENHARIA', obra_id=v_obra_id
    WHERE id=_projeto_id;
  RETURN v_obra_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancelar_projeto(_projeto_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE='22023';
  END IF;
  UPDATE public.projetos_contrato
    SET status='CANCELADO', cancelado_em=now(), motivo_cancelamento=_motivo
    WHERE id=_projeto_id AND deleted_at IS NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.recalcular_saldo_contrato(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprovar_projeto(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_projeto_para_engenharia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_projeto(uuid, text) TO authenticated;