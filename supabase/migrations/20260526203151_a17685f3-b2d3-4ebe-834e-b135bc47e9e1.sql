
-- 1) Enum de status
DO $$ BEGIN
  CREATE TYPE public.workflow_status AS ENUM (
    'PENDENTE','APROVADA','NEGADA','CANCELADA','EXPIRADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) workflow_alcadas
CREATE TABLE IF NOT EXISTS public.workflow_alcadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_operacao text NOT NULL,
  setor text,
  centro_custo_id uuid,
  valor_min numeric NOT NULL DEFAULT 0,
  valor_max numeric,
  aprovador_role public.app_role,
  aprovador_usuario_id uuid,
  permissao_requerida public.app_permission,
  cotacoes_minimas int NOT NULL DEFAULT 0,
  permite_excecao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 100,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valor_max IS NULL OR valor_max >= valor_min),
  CHECK (
    aprovador_role IS NOT NULL
    OR aprovador_usuario_id IS NOT NULL
    OR permissao_requerida IS NOT NULL
  )
);
CREATE INDEX IF NOT EXISTS idx_wfa_lookup
  ON public.workflow_alcadas(tipo_operacao, ativo, valor_min, valor_max);

GRANT SELECT ON public.workflow_alcadas TO authenticated;
GRANT ALL ON public.workflow_alcadas TO service_role;

ALTER TABLE public.workflow_alcadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY wfa_select_auth ON public.workflow_alcadas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY wfa_admin_write ON public.workflow_alcadas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflow.administrar'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflow.administrar'));

CREATE TRIGGER tg_wfa_updated_at BEFORE UPDATE ON public.workflow_alcadas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- 3) workflow_aprovacoes
CREATE TABLE IF NOT EXISTS public.workflow_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  tipo_operacao text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  setor text,
  centro_custo_id uuid,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  origem_tipo text,
  origem_id uuid,
  solicitante_id uuid NOT NULL,
  solicitante_email text,
  alcada_id uuid REFERENCES public.workflow_alcadas(id),
  aprovador_id uuid,
  aprovador_email text,
  status public.workflow_status NOT NULL DEFAULT 'PENDENTE',
  motivo_solicitacao text,
  motivo_decisao text,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  decidido_em timestamptz,
  cancelado_em timestamptz,
  expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_status ON public.workflow_aprovacoes(status, tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_wf_solicitante ON public.workflow_aprovacoes(solicitante_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_origem ON public.workflow_aprovacoes(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_wf_alcada ON public.workflow_aprovacoes(alcada_id);

GRANT SELECT, INSERT, UPDATE ON public.workflow_aprovacoes TO authenticated;
GRANT ALL ON public.workflow_aprovacoes TO service_role;

ALTER TABLE public.workflow_aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY wf_select ON public.workflow_aprovacoes
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR solicitante_id = auth.uid()
    OR aprovador_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workflow_alcadas a
      WHERE a.id = workflow_aprovacoes.alcada_id
        AND (
          (a.permissao_requerida IS NOT NULL AND public.has_permission(auth.uid(), a.permissao_requerida))
          OR (a.aprovador_role IS NOT NULL AND public.has_role(auth.uid(), a.aprovador_role))
          OR (a.aprovador_usuario_id = auth.uid())
        )
    )
  );

CREATE POLICY wf_insert ON public.workflow_aprovacoes
  FOR INSERT TO authenticated WITH CHECK (
    solicitante_id = auth.uid() OR public.is_admin(auth.uid())
  );

CREATE POLICY wf_update_authenticated ON public.workflow_aprovacoes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR solicitante_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workflow_alcadas a
      WHERE a.id = workflow_aprovacoes.alcada_id
        AND (
          (a.permissao_requerida IS NOT NULL AND public.has_permission(auth.uid(), a.permissao_requerida))
          OR (a.aprovador_role IS NOT NULL AND public.has_role(auth.uid(), a.aprovador_role))
          OR (a.aprovador_usuario_id = auth.uid())
        )
    )
  );

-- 4) workflow_aprovacoes_historico
CREATE TABLE IF NOT EXISTS public.workflow_aprovacoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aprovacao_id uuid NOT NULL REFERENCES public.workflow_aprovacoes(id) ON DELETE CASCADE,
  status_anterior public.workflow_status,
  status_novo public.workflow_status NOT NULL,
  motivo text,
  user_id uuid,
  user_email text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wfh_aprovacao ON public.workflow_aprovacoes_historico(aprovacao_id, created_at);

GRANT SELECT, INSERT ON public.workflow_aprovacoes_historico TO authenticated;
GRANT ALL ON public.workflow_aprovacoes_historico TO service_role;

ALTER TABLE public.workflow_aprovacoes_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY wfh_select ON public.workflow_aprovacoes_historico
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workflow_aprovacoes w
      WHERE w.id = workflow_aprovacoes_historico.aprovacao_id
        AND (w.solicitante_id = auth.uid() OR w.aprovador_id = auth.uid())
    )
  );

CREATE POLICY wfh_insert_authenticated ON public.workflow_aprovacoes_historico
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 5) Triggers
CREATE OR REPLACE FUNCTION public.tg_wf_gera_codigo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo IS NULL OR length(trim(NEW.codigo)) = 0 THEN
    NEW.codigo := 'WF-' || to_char(now(),'YYYYMMDD') || '-' || substr(NEW.id::text,1,6);
  END IF;
  IF NEW.solicitante_email IS NULL THEN
    SELECT email INTO NEW.solicitante_email FROM auth.users WHERE id = NEW.solicitante_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_wf_codigo BEFORE INSERT ON public.workflow_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_wf_gera_codigo();

CREATE TRIGGER tg_wf_updated_at BEFORE UPDATE ON public.workflow_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

CREATE OR REPLACE FUNCTION public.tg_wf_valida_transicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_via_rpc text; v_valid boolean;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  BEGIN v_via_rpc := current_setting('app.via_workflow_rpc', true);
  EXCEPTION WHEN others THEN v_via_rpc := NULL; END;

  IF COALESCE(v_via_rpc,'') <> 'true' THEN
    RAISE EXCEPTION 'Transição de status em workflow só é permitida via RPC (solicitar/aprovar/negar/cancelar). UPDATE direto bloqueado.'
      USING ERRCODE = '42501';
  END IF;

  v_valid := CASE OLD.status
    WHEN 'PENDENTE' THEN NEW.status IN ('APROVADA','NEGADA','CANCELADA','EXPIRADA')
    ELSE false
  END;
  IF NOT v_valid THEN
    RAISE EXCEPTION 'Transição inválida de % para % no workflow.', OLD.status, NEW.status
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_wf_transicao BEFORE UPDATE OF status ON public.workflow_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_wf_valida_transicao();

CREATE OR REPLACE FUNCTION public.tg_wf_historico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.workflow_aprovacoes_historico
      (aprovacao_id, status_anterior, status_novo, motivo, user_id, user_email, snapshot)
    VALUES (NEW.id, NULL, NEW.status, NEW.motivo_solicitacao, NEW.solicitante_id,
            NEW.solicitante_email, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.workflow_aprovacoes_historico
      (aprovacao_id, status_anterior, status_novo, motivo, user_id, user_email, snapshot)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.motivo_decisao, auth.uid(), v_email,
            row_to_json(NEW)::jsonb);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_wf_hist_ins AFTER INSERT ON public.workflow_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_wf_historico();
CREATE TRIGGER tg_wf_hist_upd AFTER UPDATE ON public.workflow_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_wf_historico();

-- 6) RPCs
CREATE OR REPLACE FUNCTION public.resolver_alcada(
  _tipo text, _valor numeric, _setor text DEFAULT NULL, _centro_custo uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.workflow_alcadas
  WHERE ativo = true
    AND tipo_operacao = _tipo
    AND _valor >= valor_min
    AND (valor_max IS NULL OR _valor <= valor_max)
    AND (setor IS NULL OR setor = _setor)
    AND (centro_custo_id IS NULL OR centro_custo_id = _centro_custo)
  ORDER BY
    (setor IS NOT NULL)::int DESC,
    (centro_custo_id IS NOT NULL)::int DESC,
    ordem ASC,
    valor_min DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.solicitar_aprovacao(
  _tipo text, _titulo text, _valor numeric,
  _contexto jsonb DEFAULT '{}'::jsonb,
  _origem_tipo text DEFAULT NULL, _origem_id uuid DEFAULT NULL,
  _setor text DEFAULT NULL, _centro_custo uuid DEFAULT NULL,
  _motivo text DEFAULT NULL, _descricao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_alcada uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão requerida.' USING ERRCODE='42501'; END IF;
  IF _titulo IS NULL OR length(trim(_titulo)) < 3 THEN
    RAISE EXCEPTION 'Título obrigatório.' USING ERRCODE='22023';
  END IF;
  IF _valor IS NULL OR _valor < 0 THEN
    RAISE EXCEPTION 'Valor inválido.' USING ERRCODE='22023';
  END IF;
  v_alcada := public.resolver_alcada(_tipo, _valor, _setor, _centro_custo);
  IF v_alcada IS NULL THEN
    RAISE EXCEPTION 'Nenhuma alçada configurada para tipo=% valor=%.', _tipo, _valor USING ERRCODE='22023';
  END IF;

  INSERT INTO public.workflow_aprovacoes
    (tipo_operacao, titulo, descricao, valor, setor, centro_custo_id, contexto,
     origem_tipo, origem_id, solicitante_id, alcada_id, motivo_solicitacao, status)
  VALUES
    (_tipo, _titulo, _descricao, _valor, _setor, _centro_custo, COALESCE(_contexto,'{}'::jsonb),
     _origem_tipo, _origem_id, v_user, v_alcada, _motivo, 'PENDENTE')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.aprovar_solicitacao(_id uuid, _motivo text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_email text; w record; a record; v_pode boolean := false;
BEGIN
  SELECT * INTO w FROM public.workflow_aprovacoes WHERE id = _id FOR UPDATE;
  IF w.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE='22023'; END IF;
  IF w.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Solicitação em status % não pode ser aprovada.', w.status USING ERRCODE='22023';
  END IF;
  IF w.solicitante_id = v_user AND NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'Solicitante não pode aprovar a própria solicitação.' USING ERRCODE='42501';
  END IF;

  SELECT * INTO a FROM public.workflow_alcadas WHERE id = w.alcada_id;
  IF public.is_admin(v_user) THEN v_pode := true;
  ELSIF a.aprovador_usuario_id IS NOT NULL AND a.aprovador_usuario_id = v_user THEN v_pode := true;
  ELSIF a.permissao_requerida IS NOT NULL AND public.has_permission(v_user, a.permissao_requerida) THEN v_pode := true;
  ELSIF a.aprovador_role IS NOT NULL AND public.has_role(v_user, a.aprovador_role) THEN v_pode := true;
  END IF;
  IF NOT v_pode THEN
    RAISE EXCEPTION 'Sem permissão para aprovar esta solicitação.' USING ERRCODE='42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  PERFORM set_config('app.via_workflow_rpc', 'true', true);
  UPDATE public.workflow_aprovacoes
    SET status='APROVADA', aprovador_id=v_user, aprovador_email=v_email,
        motivo_decisao=_motivo, decidido_em=now()
    WHERE id=_id;
  PERFORM set_config('app.via_workflow_rpc', 'false', true);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.negar_solicitacao(_id uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_email text; w record; a record; v_pode boolean := false;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE='22023';
  END IF;
  SELECT * INTO w FROM public.workflow_aprovacoes WHERE id = _id FOR UPDATE;
  IF w.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE='22023'; END IF;
  IF w.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Solicitação em status % não pode ser negada.', w.status USING ERRCODE='22023';
  END IF;
  SELECT * INTO a FROM public.workflow_alcadas WHERE id = w.alcada_id;
  IF public.is_admin(v_user) THEN v_pode := true;
  ELSIF a.aprovador_usuario_id IS NOT NULL AND a.aprovador_usuario_id = v_user THEN v_pode := true;
  ELSIF a.permissao_requerida IS NOT NULL AND public.has_permission(v_user, a.permissao_requerida) THEN v_pode := true;
  ELSIF a.aprovador_role IS NOT NULL AND public.has_role(v_user, a.aprovador_role) THEN v_pode := true;
  END IF;
  IF NOT v_pode THEN
    RAISE EXCEPTION 'Sem permissão para negar esta solicitação.' USING ERRCODE='42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  PERFORM set_config('app.via_workflow_rpc', 'true', true);
  UPDATE public.workflow_aprovacoes
    SET status='NEGADA', aprovador_id=v_user, aprovador_email=v_email,
        motivo_decisao=_motivo, decidido_em=now()
    WHERE id=_id;
  PERFORM set_config('app.via_workflow_rpc', 'false', true);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.cancelar_solicitacao(_id uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); w record;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE='22023';
  END IF;
  SELECT * INTO w FROM public.workflow_aprovacoes WHERE id = _id FOR UPDATE;
  IF w.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE='22023'; END IF;
  IF w.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Solicitação em status % não pode ser cancelada.', w.status USING ERRCODE='22023';
  END IF;
  IF w.solicitante_id <> v_user AND NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'Apenas o solicitante ou admin pode cancelar.' USING ERRCODE='42501';
  END IF;
  PERFORM set_config('app.via_workflow_rpc', 'true', true);
  UPDATE public.workflow_aprovacoes
    SET status='CANCELADA', motivo_decisao=_motivo, cancelado_em=now()
    WHERE id=_id;
  PERFORM set_config('app.via_workflow_rpc', 'false', true);
  RETURN _id;
END $$;

-- 7) Permissões por role
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin_master','workflow.administrar'),
  ('admin_master','workflow.aprovar.operacional'),
  ('admin_master','workflow.aprovar.financeiro'),
  ('admin_master','workflow.aprovar.diretoria'),
  ('admin_master','workflow.solicitar'),
  ('admin_master','workflow.cancelar'),
  ('admin_geral','workflow.administrar'),
  ('admin_geral','workflow.aprovar.operacional'),
  ('admin_geral','workflow.aprovar.financeiro'),
  ('admin_geral','workflow.aprovar.diretoria'),
  ('admin_geral','workflow.solicitar'),
  ('admin_geral','workflow.cancelar'),
  ('usuario','workflow.solicitar'),
  ('usuario','workflow.cancelar')
ON CONFLICT DO NOTHING;

-- 8) Seeds de alçada
INSERT INTO public.workflow_alcadas
  (nome, tipo_operacao, valor_min, valor_max, permissao_requerida, cotacoes_minimas, ordem, descricao)
VALUES
  ('Compra até R$ 5k — Operacional', 'compra', 0, 5000, 'workflow.aprovar.operacional', 1, 10, 'Aprovação por estoque/suprimentos'),
  ('Compra R$ 5k–20k — Financeiro', 'compra', 5000.01, 20000, 'workflow.aprovar.financeiro', 2, 20, 'Aprovação financeira'),
  ('Compra acima R$ 20k — Diretoria', 'compra', 20000.01, NULL, 'workflow.aprovar.diretoria', 3, 30, 'Aprovação diretoria'),
  ('Material até R$ 5k — Operacional', 'material', 0, 5000, 'workflow.aprovar.operacional', 0, 10, NULL),
  ('Material R$ 5k–20k — Financeiro', 'material', 5000.01, 20000, 'workflow.aprovar.financeiro', 0, 20, NULL),
  ('Material acima R$ 20k — Diretoria', 'material', 20000.01, NULL, 'workflow.aprovar.diretoria', 0, 30, NULL),
  ('Desconto até R$ 5k — Operacional', 'desconto', 0, 5000, 'workflow.aprovar.operacional', 0, 10, NULL),
  ('Desconto R$ 5k–20k — Financeiro', 'desconto', 5000.01, 20000, 'workflow.aprovar.financeiro', 0, 20, NULL),
  ('Desconto acima R$ 20k — Diretoria', 'desconto', 20000.01, NULL, 'workflow.aprovar.diretoria', 0, 30, NULL);
