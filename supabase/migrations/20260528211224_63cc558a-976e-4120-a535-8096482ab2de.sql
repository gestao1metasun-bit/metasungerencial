-- ============================================================================
-- COMERCIAL C3 + C4 (parte 2 - enum ja committed)
-- ============================================================================

-- C3.1: Parametro vigente
INSERT INTO public.gerencial_parametros (chave, categoria, descricao, valor)
VALUES (
  'comercial.parametro_minimo_rs_kwp',
  'comercial',
  'Valor minimo aceitavel de R$/kWp para proposta seguir fluxo normal',
  jsonb_build_object('valor', 2000)
)
ON CONFLICT (chave, COALESCE(setor, '')) DO NOTHING;

-- C3.2: Colunas em propostas
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS rs_kwp_calculado          numeric,
  ADD COLUMN IF NOT EXISTS parametro_rs_kwp_aplicado numeric,
  ADD COLUMN IF NOT EXISTS requer_aprovacao_excecao  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprovacao_excecao_id      uuid REFERENCES public.workflow_aprovacoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprovacao_excecao_status  text;

CREATE INDEX IF NOT EXISTS idx_propostas_aprovacao_excecao
  ON public.propostas(aprovacao_excecao_id) WHERE aprovacao_excecao_id IS NOT NULL;

-- C3.3: Trigger calculo automatico
CREATE OR REPLACE FUNCTION public.tg_propostas_calc_rs_kwp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_param numeric; v_rs_kwp numeric;
BEGIN
  SELECT COALESCE((valor->>'valor')::numeric, 2000) INTO v_param
    FROM public.gerencial_parametros
   WHERE chave = 'comercial.parametro_minimo_rs_kwp' LIMIT 1;
  v_param := COALESCE(v_param, 2000);

  IF NEW.valor_final IS NOT NULL AND NEW.potencia_kwp IS NOT NULL AND NEW.potencia_kwp > 0 THEN
    v_rs_kwp := NEW.valor_final / NEW.potencia_kwp;
  ELSE
    v_rs_kwp := NULL;
  END IF;

  NEW.rs_kwp_calculado := v_rs_kwp;
  NEW.parametro_rs_kwp_aplicado := v_param;

  IF v_rs_kwp IS NOT NULL AND v_rs_kwp < v_param THEN
    NEW.requer_aprovacao_excecao := true;
    IF TG_OP = 'UPDATE'
       AND (OLD.rs_kwp_calculado IS DISTINCT FROM NEW.rs_kwp_calculado
            OR OLD.parametro_rs_kwp_aplicado IS DISTINCT FROM NEW.parametro_rs_kwp_aplicado)
       AND OLD.aprovacao_excecao_status = 'APROVADA' THEN
      NEW.aprovacao_excecao_status := NULL;
      NEW.aprovacao_excecao_id := NULL;
    END IF;
  ELSE
    NEW.requer_aprovacao_excecao := false;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_propostas_calc_rs_kwp ON public.propostas;
CREATE TRIGGER tg_propostas_calc_rs_kwp
BEFORE INSERT OR UPDATE OF valor_final, potencia_kwp, aprovacao_excecao_status
ON public.propostas FOR EACH ROW EXECUTE FUNCTION public.tg_propostas_calc_rs_kwp();

-- C3.4: Trigger bloqueio avanco
CREATE OR REPLACE FUNCTION public.tg_propostas_bloqueia_excecao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('APROVADA','ASSINADA','ENVIADA') THEN RETURN NEW; END IF;

  IF NEW.requer_aprovacao_excecao = true
     AND COALESCE(NEW.aprovacao_excecao_status,'') <> 'APROVADA' THEN
    RAISE EXCEPTION 'Proposta abaixo do parametro minimo R$/kWp (% < %). Solicite aprovacao de excecao antes de avancar para %.',
      NEW.rs_kwp_calculado, NEW.parametro_rs_kwp_aplicado, NEW.status
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_propostas_bloqueia_excecao ON public.propostas;
CREATE TRIGGER tg_propostas_bloqueia_excecao
BEFORE UPDATE OF status ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.tg_propostas_bloqueia_excecao();

-- C3.5: Seed alcada
INSERT INTO public.workflow_alcadas (
  nome, tipo_operacao, valor_min, valor_max,
  permissao_requerida, permite_excecao, ativo, ordem, descricao
)
SELECT
  'Excecao R$/kWp (Gestor Comercial)',
  'proposta_excecao_rs_kwp',
  0, NULL,
  'comercial.proposta.aprovar_excecao'::app_permission,
  true, true, 10,
  'Aprovacao obrigatoria para propostas abaixo do parametro minimo R$/kWp'
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_alcadas WHERE tipo_operacao = 'proposta_excecao_rs_kwp'
);

-- C3.6: RPC solicitar
CREATE OR REPLACE FUNCTION public.rpc_proposta_solicitar_aprovacao_excecao(
  p_proposta_id uuid, p_motivo text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prop public.propostas%ROWTYPE;
  v_alcada_id uuid; v_wf_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Nao autenticado' USING ERRCODE='42501'; END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatorio (min 5 caracteres)' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_prop FROM public.propostas WHERE id = p_proposta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta nao encontrada' USING ERRCODE='P0002'; END IF;
  IF v_prop.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Proposta excluida' USING ERRCODE='42501'; END IF;
  IF NOT (v_prop.consultor_id = v_user
          OR public.has_permission(v_user, 'comercial.proposta.editar'::app_permission)
          OR public.is_admin(v_user)) THEN
    RAISE EXCEPTION 'Sem permissao sobre a proposta' USING ERRCODE='42501';
  END IF;
  IF v_prop.requer_aprovacao_excecao = false THEN
    RAISE EXCEPTION 'Proposta nao requer aprovacao de excecao' USING ERRCODE='22023';
  END IF;
  IF COALESCE(v_prop.aprovacao_excecao_status,'') = 'PENDENTE' THEN
    RAISE EXCEPTION 'Ja existe aprovacao em curso' USING ERRCODE='22023';
  END IF;

  SELECT id INTO v_alcada_id FROM public.workflow_alcadas
   WHERE tipo_operacao = 'proposta_excecao_rs_kwp' AND ativo = true
   ORDER BY ordem LIMIT 1;

  INSERT INTO public.workflow_aprovacoes (
    tipo_operacao, titulo, descricao, valor, contexto,
    origem_tipo, origem_id, solicitante_id, solicitante_email,
    alcada_id, motivo_solicitacao
  ) VALUES (
    'proposta_excecao_rs_kwp',
    'Excecao R$/kWp - Proposta ' || COALESCE(v_prop.numero, v_prop.id::text),
    'R$/kWp calculado abaixo do parametro minimo vigente',
    COALESCE(v_prop.valor_final, 0),
    jsonb_build_object(
      'proposta_id', v_prop.id,
      'rs_kwp_calculado', v_prop.rs_kwp_calculado,
      'parametro_aplicado', v_prop.parametro_rs_kwp_aplicado,
      'valor_final', v_prop.valor_final,
      'potencia_kwp', v_prop.potencia_kwp
    ),
    'proposta', v_prop.id, v_user,
    (SELECT email FROM auth.users WHERE id = v_user),
    v_alcada_id, p_motivo
  ) RETURNING id INTO v_wf_id;

  PERFORM set_config('app.via_revisao_proposta', 'true', true);
  UPDATE public.propostas
     SET aprovacao_excecao_id = v_wf_id, aprovacao_excecao_status = 'PENDENTE'
   WHERE id = p_proposta_id;
  PERFORM set_config('app.via_revisao_proposta', 'false', true);

  RETURN v_wf_id;
END $$;

REVOKE ALL ON FUNCTION public.rpc_proposta_solicitar_aprovacao_excecao(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_solicitar_aprovacao_excecao(uuid,text) TO authenticated;

-- C3.7: RPC decidir
CREATE OR REPLACE FUNCTION public.rpc_proposta_decidir_aprovacao_excecao(
  p_aprovacao_id uuid, p_decisao text, p_motivo text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_wf public.workflow_aprovacoes%ROWTYPE;
  v_proposta_id uuid; v_novo_status text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Nao autenticado' USING ERRCODE='42501'; END IF;
  IF p_decisao NOT IN ('APROVADA','NEGADA','CANCELADA') THEN
    RAISE EXCEPTION 'Decisao invalida' USING ERRCODE='22023';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatorio (min 5 caracteres)' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_wf FROM public.workflow_aprovacoes WHERE id = p_aprovacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aprovacao nao encontrada' USING ERRCODE='P0002'; END IF;
  IF v_wf.tipo_operacao <> 'proposta_excecao_rs_kwp' THEN
    RAISE EXCEPTION 'RPC aplicavel apenas a excecoes R$/kWp' USING ERRCODE='22023';
  END IF;
  IF v_wf.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Aprovacao ja decidida (status=%)', v_wf.status USING ERRCODE='22023';
  END IF;

  IF p_decisao IN ('APROVADA','NEGADA') THEN
    IF NOT (public.has_permission(v_user, 'comercial.proposta.aprovar_excecao'::app_permission)
            OR public.is_admin(v_user)) THEN
      RAISE EXCEPTION 'Sem permissao para aprovar/negar' USING ERRCODE='42501';
    END IF;
  ELSE
    IF NOT (v_wf.solicitante_id = v_user
            OR public.has_permission(v_user, 'workflow.cancelar'::app_permission)
            OR public.is_admin(v_user)) THEN
      RAISE EXCEPTION 'Sem permissao para cancelar' USING ERRCODE='42501';
    END IF;
  END IF;

  PERFORM set_config('app.via_workflow_rpc', 'true', true);
  UPDATE public.workflow_aprovacoes
     SET status = p_decisao::workflow_status,
         aprovador_id = CASE WHEN p_decisao IN ('APROVADA','NEGADA') THEN v_user ELSE aprovador_id END,
         aprovador_email = CASE WHEN p_decisao IN ('APROVADA','NEGADA')
                                THEN (SELECT email FROM auth.users WHERE id = v_user) ELSE aprovador_email END,
         motivo_decisao = p_motivo,
         decidido_em = CASE WHEN p_decisao IN ('APROVADA','NEGADA') THEN now() ELSE decidido_em END,
         cancelado_em = CASE WHEN p_decisao = 'CANCELADA' THEN now() ELSE cancelado_em END
   WHERE id = p_aprovacao_id;
  PERFORM set_config('app.via_workflow_rpc', 'false', true);

  v_proposta_id := (v_wf.contexto->>'proposta_id')::uuid;
  v_novo_status := CASE p_decisao WHEN 'APROVADA' THEN 'APROVADA'
                                  WHEN 'NEGADA' THEN 'NEGADA'
                                  ELSE 'CANCELADA' END;

  IF v_proposta_id IS NOT NULL THEN
    PERFORM set_config('app.via_revisao_proposta', 'true', true);
    UPDATE public.propostas SET aprovacao_excecao_status = v_novo_status WHERE id = v_proposta_id;
    PERFORM set_config('app.via_revisao_proposta', 'false', true);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.rpc_proposta_decidir_aprovacao_excecao(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_decidir_aprovacao_excecao(uuid,text,text) TO authenticated;

-- ============================================================================
-- C4 — Carteira
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comercial_carteira_transferencias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo                text NOT NULL,
  registro_id           uuid NOT NULL,
  vendedor_origem_id    uuid,
  vendedor_destino_id   uuid NOT NULL,
  executor_id           uuid NOT NULL,
  executor_email        text,
  motivo                text NOT NULL,
  lote_id               uuid,
  lote_qtd              integer,
  contexto              jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_at           timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cct_escopo_chk CHECK (escopo IN ('lead','proposta','contrato','cliente')),
  CONSTRAINT cct_motivo_chk CHECK (length(btrim(motivo)) >= 5)
);

GRANT SELECT, INSERT ON public.comercial_carteira_transferencias TO authenticated;
GRANT ALL ON public.comercial_carteira_transferencias TO service_role;

ALTER TABLE public.comercial_carteira_transferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cct_select" ON public.comercial_carteira_transferencias
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'comercial.carteira.ver_historico'::app_permission)
    OR public.has_permission(auth.uid(), 'comercial.carteira.transferir'::app_permission)
    OR vendedor_origem_id = auth.uid()
    OR vendedor_destino_id = auth.uid()
    OR executor_id = auth.uid()
  );

CREATE POLICY "cct_insert_admin_only" ON public.comercial_carteira_transferencias
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_cct_registro ON public.comercial_carteira_transferencias(escopo, registro_id);
CREATE INDEX IF NOT EXISTS idx_cct_destino  ON public.comercial_carteira_transferencias(vendedor_destino_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cct_origem   ON public.comercial_carteira_transferencias(vendedor_origem_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cct_lote     ON public.comercial_carteira_transferencias(lote_id) WHERE lote_id IS NOT NULL;

DROP TRIGGER IF EXISTS tg_audit_cct ON public.comercial_carteira_transferencias;
CREATE TRIGGER tg_audit_cct
AFTER INSERT OR UPDATE OR DELETE ON public.comercial_carteira_transferencias
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'comercial_carteira_transferencias');

-- C4.3: RPC individual
CREATE OR REPLACE FUNCTION public.rpc_carteira_transferir_individual(
  p_escopo text, p_registro_id uuid, p_vendedor_destino_id uuid, p_motivo text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_origem uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Nao autenticado' USING ERRCODE='42501'; END IF;
  IF p_escopo NOT IN ('lead','proposta','contrato','cliente') THEN
    RAISE EXCEPTION 'Escopo invalido' USING ERRCODE='22023';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatorio (min 5 caracteres)' USING ERRCODE='22023';
  END IF;
  IF p_vendedor_destino_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor destino obrigatorio' USING ERRCODE='22023';
  END IF;
  IF NOT (public.has_permission(v_user, 'comercial.carteira.transferir'::app_permission)
          OR public.is_admin(v_user)) THEN
    RAISE EXCEPTION 'Sem permissao' USING ERRCODE='42501';
  END IF;

  CASE p_escopo
    WHEN 'lead' THEN
      SELECT consultor_id INTO v_origem FROM public.leads WHERE id = p_registro_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Lead nao encontrado' USING ERRCODE='P0002'; END IF;
      UPDATE public.leads SET consultor_id = p_vendedor_destino_id WHERE id = p_registro_id;
    WHEN 'proposta' THEN
      SELECT consultor_id INTO v_origem FROM public.propostas WHERE id = p_registro_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Proposta nao encontrada' USING ERRCODE='P0002'; END IF;
      PERFORM set_config('app.via_revisao_proposta', 'true', true);
      UPDATE public.propostas SET consultor_id = p_vendedor_destino_id WHERE id = p_registro_id;
      PERFORM set_config('app.via_revisao_proposta', 'false', true);
    WHEN 'contrato' THEN
      SELECT consultor_id INTO v_origem FROM public.contratos WHERE id = p_registro_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Contrato nao encontrado' USING ERRCODE='P0002'; END IF;
      UPDATE public.contratos SET consultor_id = p_vendedor_destino_id WHERE id = p_registro_id;
    WHEN 'cliente' THEN
      SELECT consultor_id INTO v_origem FROM public.clientes WHERE id = p_registro_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Cliente nao encontrado' USING ERRCODE='P0002'; END IF;
      UPDATE public.clientes SET consultor_id = p_vendedor_destino_id WHERE id = p_registro_id;
  END CASE;

  INSERT INTO public.comercial_carteira_transferencias (
    escopo, registro_id, vendedor_origem_id, vendedor_destino_id,
    executor_id, executor_email, motivo, contexto
  ) VALUES (
    p_escopo, p_registro_id, v_origem, p_vendedor_destino_id,
    v_user, (SELECT email FROM auth.users WHERE id = v_user),
    p_motivo, jsonb_build_object('modo','individual')
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.rpc_carteira_transferir_individual(text,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_carteira_transferir_individual(text,uuid,uuid,text) TO authenticated;

-- C4.4: RPC lote
CREATE OR REPLACE FUNCTION public.rpc_carteira_transferir_lote(
  p_escopo text, p_registro_ids uuid[], p_vendedor_destino_id uuid, p_motivo text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_lote uuid := gen_random_uuid(); v_id uuid; v_qtd integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Nao autenticado' USING ERRCODE='42501'; END IF;
  IF p_escopo NOT IN ('lead','proposta','contrato','cliente') THEN
    RAISE EXCEPTION 'Escopo invalido' USING ERRCODE='22023';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatorio (min 5 caracteres)' USING ERRCODE='22023';
  END IF;
  IF p_vendedor_destino_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor destino obrigatorio' USING ERRCODE='22023';
  END IF;
  IF p_registro_ids IS NULL OR array_length(p_registro_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Lista vazia' USING ERRCODE='22023';
  END IF;
  IF array_length(p_registro_ids, 1) > 1000 THEN
    RAISE EXCEPTION 'Lote maximo 1000 registros' USING ERRCODE='22023';
  END IF;
  IF NOT (public.has_permission(v_user, 'comercial.carteira.transferir_lote'::app_permission)
          OR public.is_admin(v_user)) THEN
    RAISE EXCEPTION 'Sem permissao para lote' USING ERRCODE='42501';
  END IF;

  v_qtd := array_length(p_registro_ids, 1);

  FOR i IN 1..v_qtd LOOP
    SELECT public.rpc_carteira_transferir_individual(
      p_escopo, p_registro_ids[i], p_vendedor_destino_id, p_motivo
    ) INTO v_id;
    UPDATE public.comercial_carteira_transferencias
       SET lote_id = v_lote, lote_qtd = v_qtd,
           contexto = contexto || jsonb_build_object('modo','lote','indice',i)
     WHERE id = v_id;
  END LOOP;

  RETURN v_lote;
END $$;

REVOKE ALL ON FUNCTION public.rpc_carteira_transferir_lote(text,uuid[],uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_carteira_transferir_lote(text,uuid[],uuid,text) TO authenticated;