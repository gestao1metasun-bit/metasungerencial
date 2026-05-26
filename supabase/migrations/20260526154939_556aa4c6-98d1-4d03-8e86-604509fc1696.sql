
-- =========================================================================
-- ONDA C — FUNDAÇÃO PV
-- =========================================================================

-- 1) TABELA pedidos_venda
CREATE TABLE public.pedidos_venda (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text UNIQUE,
  contrato_id uuid NOT NULL,
  projeto_contrato_id uuid,
  obra_id uuid,
  cliente_id uuid NOT NULL,
  consultor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'RASCUNHO',
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  forma_pagamento text,
  possui_financiamento boolean NOT NULL DEFAULT false,
  financiamento_banco text,
  financiamento_valor numeric(14,2),
  gerente_id uuid,
  observacoes text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  aprovado_em timestamptz,
  aprovado_por uuid,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid
);

CREATE INDEX idx_pv_contrato       ON public.pedidos_venda(contrato_id);
CREATE INDEX idx_pv_projeto        ON public.pedidos_venda(projeto_contrato_id);
CREATE INDEX idx_pv_obra           ON public.pedidos_venda(obra_id);
CREATE INDEX idx_pv_consultor      ON public.pedidos_venda(consultor_id);
CREATE INDEX idx_pv_cliente        ON public.pedidos_venda(cliente_id);
CREATE INDEX idx_pv_status         ON public.pedidos_venda(status);
CREATE INDEX idx_pv_not_deleted    ON public.pedidos_venda(id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_venda TO authenticated;
GRANT ALL ON public.pedidos_venda TO service_role;

ALTER TABLE public.pedidos_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY pv_select_own_or_admin ON public.pedidos_venda
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR consultor_id = auth.uid());

CREATE POLICY pv_insert_own_or_admin ON public.pedidos_venda
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR consultor_id = auth.uid());

CREATE POLICY pv_update_own_or_admin ON public.pedidos_venda
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR consultor_id = auth.uid())
  WITH CHECK (is_admin(auth.uid()) OR consultor_id = auth.uid());

CREATE POLICY pv_delete_admin ON public.pedidos_venda
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- 2) TABELA pedidos_venda_status_historico
CREATE TABLE public.pedidos_venda_status_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL,
  status_anterior text,
  status_novo text NOT NULL,
  motivo text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pvsh_pedido ON public.pedidos_venda_status_historico(pedido_id);

GRANT SELECT, INSERT ON public.pedidos_venda_status_historico TO authenticated;
GRANT ALL ON public.pedidos_venda_status_historico TO service_role;

ALTER TABLE public.pedidos_venda_status_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY pvsh_select_own_or_admin ON public.pedidos_venda_status_historico
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pedidos_venda pv
      WHERE pv.id = pedidos_venda_status_historico.pedido_id
        AND (pv.consultor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY pvsh_insert_system ON public.pedidos_venda_status_historico
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3) MÁQUINA DE ESTADOS
CREATE OR REPLACE FUNCTION public.tg_pv_valida_transicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_old text := OLD.status;
  v_new text := NEW.status;
  v_valid boolean := false;
BEGIN
  IF v_old = v_new THEN RETURN NEW; END IF;

  IF public.is_admin(v_user) THEN
    RETURN NEW;
  END IF;

  v_valid := CASE v_old
    WHEN 'RASCUNHO'    THEN v_new IN ('EM_ANALISE','CANCELADO')
    WHEN 'EM_ANALISE'  THEN v_new IN ('APROVADO','RASCUNHO','CANCELADO')
    WHEN 'APROVADO'    THEN v_new IN ('EM_EXECUCAO','CANCELADO')
    WHEN 'EM_EXECUCAO' THEN v_new IN ('FATURADO','CANCELADO')
    WHEN 'FATURADO'    THEN v_new IN ('FINALIZADO')
    WHEN 'FINALIZADO'  THEN false
    WHEN 'CANCELADO'   THEN false
    ELSE false
  END;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Transição inválida de % para % no Pedido de Venda.', v_old, v_new
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $fn$;

-- 4) TRIGGER HISTÓRICO DE STATUS
CREATE OR REPLACE FUNCTION public.tg_pv_status_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_motivo text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;

    BEGIN
      v_motivo := current_setting('app.motivo', true);
    EXCEPTION WHEN others THEN v_motivo := NULL;
    END;

    INSERT INTO public.pedidos_venda_status_historico
      (pedido_id, status_anterior, status_novo, motivo, user_id, user_email)
    VALUES
      (NEW.id, OLD.status, NEW.status, v_motivo, v_user, v_email);
  END IF;
  RETURN NEW;
END $fn$;

-- 5) GERAÇÃO DE CÓDIGO
CREATE OR REPLACE FUNCTION public.tg_pv_gera_codigo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.codigo IS NULL OR length(trim(NEW.codigo)) = 0 THEN
    NEW.codigo := 'PV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END $fn$;

-- 6) TRIGGERS
CREATE TRIGGER trg_pv_gera_codigo
  BEFORE INSERT ON public.pedidos_venda
  FOR EACH ROW EXECUTE FUNCTION public.tg_pv_gera_codigo();

CREATE TRIGGER trg_pv_updated_at
  BEFORE UPDATE ON public.pedidos_venda
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

CREATE TRIGGER trg_pv_valida_transicao
  BEFORE UPDATE ON public.pedidos_venda
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.tg_pv_valida_transicao();

CREATE TRIGGER trg_pv_status_historico
  AFTER UPDATE ON public.pedidos_venda
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.tg_pv_status_historico();

CREATE TRIGGER trg_pv_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.pedidos_venda
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'pedidos_venda');

CREATE TRIGGER trg_pv_snapshot
  AFTER INSERT OR UPDATE ON public.pedidos_venda
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

-- 7) RPC gerar_pv_do_contrato
CREATE OR REPLACE FUNCTION public.gerar_pv_do_contrato(
  _contrato_id uuid,
  _projeto_contrato_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  c record;
  p record;
  v_pv_id uuid;
BEGIN
  SELECT * INTO c FROM public.contratos
    WHERE id = _contrato_id AND deleted_at IS NULL;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado.' USING ERRCODE = '22023';
  END IF;

  IF NOT (public.is_admin(v_user) OR c.consultor_id = v_user) THEN
    RAISE EXCEPTION 'Sem permissão para gerar PV deste contrato.' USING ERRCODE = '42501';
  END IF;

  IF _projeto_contrato_id IS NOT NULL THEN
    SELECT * INTO p FROM public.projetos_contrato
      WHERE id = _projeto_contrato_id
        AND contrato_id = _contrato_id
        AND deleted_at IS NULL;
  ELSE
    SELECT * INTO p FROM public.projetos_contrato
      WHERE contrato_id = _contrato_id
        AND deleted_at IS NULL
        AND status IN ('APROVADO','ENVIADO_ENGENHARIA','EM_EXECUCAO','FINALIZADO')
      ORDER BY created_at ASC
      LIMIT 1;
  END IF;

  -- idempotência
  SELECT id INTO v_pv_id FROM public.pedidos_venda
    WHERE contrato_id = _contrato_id
      AND COALESCE(projeto_contrato_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(p.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND deleted_at IS NULL
      AND status <> 'CANCELADO'
    LIMIT 1;
  IF v_pv_id IS NOT NULL THEN
    RETURN v_pv_id;
  END IF;

  INSERT INTO public.pedidos_venda (
    contrato_id, projeto_contrato_id, cliente_id, consultor_id,
    status, valor_total, forma_pagamento,
    possui_financiamento, financiamento_banco, financiamento_valor,
    observacoes
  ) VALUES (
    c.id, p.id, c.cliente_id, COALESCE(c.consultor_id, v_user),
    'RASCUNHO',
    COALESCE(p.valor, c.valor_total, 0),
    c.forma_pagamento,
    COALESCE(c.possui_financiamento, false),
    c.financiamento_banco,
    c.financiamento_valor,
    c.observacoes
  ) RETURNING id INTO v_pv_id;

  RETURN v_pv_id;
END $fn$;

-- 8) RPC enviar_pv_para_analise
CREATE OR REPLACE FUNCTION public.enviar_pv_para_analise(_pv_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE pv record;
BEGIN
  SELECT * INTO pv FROM public.pedidos_venda WHERE id = _pv_id AND deleted_at IS NULL;
  IF pv.id IS NULL THEN RAISE EXCEPTION 'PV não encontrado.' USING ERRCODE='22023'; END IF;
  IF pv.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Apenas PV em RASCUNHO pode ir para análise.' USING ERRCODE='22023';
  END IF;
  UPDATE public.pedidos_venda SET status = 'EM_ANALISE' WHERE id = _pv_id;
  RETURN _pv_id;
END $fn$;

-- 9) RPC aprovar_pv
CREATE OR REPLACE FUNCTION public.aprovar_pv(_pv_id uuid, _motivo text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  pv record;
BEGIN
  SELECT * INTO pv FROM public.pedidos_venda WHERE id = _pv_id AND deleted_at IS NULL;
  IF pv.id IS NULL THEN RAISE EXCEPTION 'PV não encontrado.' USING ERRCODE='22023'; END IF;
  IF pv.status <> 'EM_ANALISE' THEN
    RAISE EXCEPTION 'Apenas PV EM_ANALISE pode ser aprovado.' USING ERRCODE='22023';
  END IF;
  UPDATE public.pedidos_venda
    SET status = 'APROVADO',
        aprovado_em = now(),
        aprovado_por = v_user,
        observacoes = COALESCE(observacoes, '') ||
          CASE WHEN _motivo IS NOT NULL THEN E'\n[Aprovação] ' || _motivo ELSE '' END
    WHERE id = _pv_id;
  RETURN _pv_id;
END $fn$;

-- 10) RPC cancelar_pv
CREATE OR REPLACE FUNCTION public.cancelar_pv(_pv_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE pv record;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE='22023';
  END IF;
  SELECT * INTO pv FROM public.pedidos_venda WHERE id = _pv_id AND deleted_at IS NULL;
  IF pv.id IS NULL THEN RAISE EXCEPTION 'PV não encontrado.' USING ERRCODE='22023'; END IF;
  IF pv.status IN ('FINALIZADO','CANCELADO') THEN
    RAISE EXCEPTION 'PV em status % não pode ser cancelado.', pv.status USING ERRCODE='22023';
  END IF;
  UPDATE public.pedidos_venda
    SET status = 'CANCELADO',
        cancelado_em = now(),
        motivo_cancelamento = _motivo
    WHERE id = _pv_id;
END $fn$;

-- 11) RPC enviar_pv_para_engenharia
CREATE OR REPLACE FUNCTION public.enviar_pv_para_engenharia(_pv_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  pv record;
  v_obra_id uuid;
BEGIN
  SELECT * INTO pv FROM public.pedidos_venda WHERE id = _pv_id AND deleted_at IS NULL;
  IF pv.id IS NULL THEN RAISE EXCEPTION 'PV não encontrado.' USING ERRCODE='22023'; END IF;
  IF pv.status <> 'APROVADO' THEN
    RAISE EXCEPTION 'Apenas PV APROVADO pode ir para engenharia.' USING ERRCODE='22023';
  END IF;
  IF pv.projeto_contrato_id IS NULL THEN
    RAISE EXCEPTION 'PV sem projeto vinculado; não é possível gerar obra.' USING ERRCODE='22023';
  END IF;

  IF pv.obra_id IS NOT NULL THEN
    v_obra_id := pv.obra_id;
  ELSE
    v_obra_id := public.enviar_projeto_para_engenharia(pv.projeto_contrato_id);
  END IF;

  UPDATE public.pedidos_venda
    SET obra_id = v_obra_id,
        status = 'EM_EXECUCAO'
    WHERE id = _pv_id;

  RETURN v_obra_id;
END $fn$;

-- 12) VIEW DE BRIDGE
CREATE OR REPLACE VIEW public.vw_bridge_pv
WITH (security_invoker = true)
AS
SELECT
  c.id            AS contrato_id,
  c.codigo        AS contrato_codigo,
  c.status        AS contrato_status,
  pc.id           AS projeto_contrato_id,
  pc.status       AS projeto_status,
  pv.id           AS pv_id,
  pv.codigo       AS pv_codigo,
  pv.status       AS pv_status,
  pv.valor_total  AS pv_valor,
  o.id            AS obra_id,
  o.codigo        AS obra_codigo,
  o.status        AS obra_status,
  pv.consultor_id,
  pv.cliente_id,
  pv.created_at   AS pv_criado_em,
  pv.aprovado_em
FROM public.contratos c
LEFT JOIN public.projetos_contrato pc ON pc.contrato_id = c.id AND pc.deleted_at IS NULL
LEFT JOIN public.pedidos_venda pv     ON pv.contrato_id = c.id
                                     AND (pv.projeto_contrato_id = pc.id OR pv.projeto_contrato_id IS NULL)
                                     AND pv.deleted_at IS NULL
LEFT JOIN public.obras o              ON o.id = pv.obra_id AND o.deleted_at IS NULL
WHERE c.deleted_at IS NULL;

GRANT SELECT ON public.vw_bridge_pv TO authenticated;
GRANT ALL ON public.vw_bridge_pv TO service_role;
