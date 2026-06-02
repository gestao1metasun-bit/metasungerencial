
CREATE TYPE public.sup_req_tipo AS ENUM ('MATERIAL','SERVICO');

CREATE TYPE public.sup_req_status AS ENUM (
  'RASCUNHO','ENVIADA','EM_APROVACAO','APROVADA','REPROVADA','RETORNADA',
  'AGUARDANDO_ESTOQUE','EM_SEPARACAO','AGUARDANDO_COMPRA','EM_COMPRA',
  'PARCIALMENTE_ATENDIDA','ATENDIDA','CANCELADA'
);

CREATE TABLE public.suprimentos_requisicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigserial NOT NULL UNIQUE,
  tipo public.sup_req_tipo NOT NULL,
  status public.sup_req_status NOT NULL DEFAULT 'RASCUNHO',
  solicitante_id uuid NOT NULL,
  setor text,
  prioridade text NOT NULL DEFAULT 'NORMAL' CHECK (prioridade IN ('BAIXA','NORMAL','ALTA','URGENTE')),
  data_necessidade date,
  justificativa text,
  os_id uuid REFERENCES public.os_ordens(id) ON DELETE SET NULL,
  tarefa_id uuid REFERENCES public.os_tarefas(id) ON DELETE SET NULL,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  natureza_id uuid,
  competencia date,
  valor_estimado numeric(14,2) NOT NULL DEFAULT 0,
  valor_aprovado numeric(14,2),
  aprovador_id uuid,
  aprovado_em timestamptz,
  motivo_reprovacao text,
  motivo_cancelamento text,
  motivo_retorno text,
  codigo_externo text,
  sistema_destino text,
  status_integracao text NOT NULL DEFAULT 'PENDENTE' CHECK (status_integracao IN ('PENDENTE','EXPORTADO','INTEGRADO','ERRO','NAO_APLICAVEL')),
  hash_integracao text,
  lote_integracao_id uuid,
  row_version integer NOT NULL DEFAULT 1,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_sup_req_status ON public.suprimentos_requisicoes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sup_req_tipo ON public.suprimentos_requisicoes(tipo) WHERE deleted_at IS NULL;
CREATE INDEX idx_sup_req_os ON public.suprimentos_requisicoes(os_id) WHERE os_id IS NOT NULL;
CREATE INDEX idx_sup_req_obra ON public.suprimentos_requisicoes(obra_id) WHERE obra_id IS NOT NULL;
CREATE INDEX idx_sup_req_projeto ON public.suprimentos_requisicoes(projeto_id) WHERE projeto_id IS NOT NULL;
CREATE INDEX idx_sup_req_solicitante ON public.suprimentos_requisicoes(solicitante_id);
CREATE INDEX idx_sup_req_criado_em ON public.suprimentos_requisicoes(criado_em DESC);
CREATE INDEX idx_sup_req_cr ON public.suprimentos_requisicoes(centro_resultado_id) WHERE centro_resultado_id IS NOT NULL;

CREATE TABLE public.suprimentos_requisicao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL REFERENCES public.suprimentos_requisicoes(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 1,
  tipo_item public.sup_req_tipo NOT NULL,
  item_estoque_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'UN',
  quantidade_solicitada numeric(14,3) NOT NULL CHECK (quantidade_solicitada > 0),
  quantidade_aprovada numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantidade_aprovada >= 0),
  quantidade_reservada numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantidade_reservada >= 0),
  quantidade_entregue numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantidade_entregue >= 0),
  quantidade_devolvida numeric(14,3) NOT NULL DEFAULT 0 CHECK (quantidade_devolvida >= 0),
  valor_estimado_unitario numeric(14,4) NOT NULL DEFAULT 0,
  valor_estimado_total numeric(14,2) GENERATED ALWAYS AS (ROUND(quantidade_solicitada * valor_estimado_unitario, 2)) STORED,
  fornecedor_sugerido_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sup_req_itens_req ON public.suprimentos_requisicao_itens(requisicao_id);
CREATE INDEX idx_sup_req_itens_estoque ON public.suprimentos_requisicao_itens(item_estoque_id) WHERE item_estoque_id IS NOT NULL;

CREATE TABLE public.suprimentos_requisicao_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL REFERENCES public.suprimentos_requisicoes(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL,
  status_anterior public.sup_req_status,
  status_novo public.sup_req_status,
  usuario_id uuid NOT NULL,
  data_hora timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacao text
);
CREATE INDEX idx_sup_req_eventos_req ON public.suprimentos_requisicao_eventos(requisicao_id, data_hora DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suprimentos_requisicoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suprimentos_requisicao_itens TO authenticated;
GRANT SELECT ON public.suprimentos_requisicao_eventos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.suprimentos_requisicoes_numero_seq TO authenticated;
GRANT ALL ON public.suprimentos_requisicoes TO service_role;
GRANT ALL ON public.suprimentos_requisicao_itens TO service_role;
GRANT ALL ON public.suprimentos_requisicao_eventos TO service_role;

ALTER TABLE public.suprimentos_requisicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suprimentos_requisicao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suprimentos_requisicao_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sup_req_select" ON public.suprimentos_requisicoes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.requisicao.visualizar'::public.app_permission));
CREATE POLICY "sup_req_insert" ON public.suprimentos_requisicoes FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.requisicao.criar'::public.app_permission));
CREATE POLICY "sup_req_update" ON public.suprimentos_requisicoes FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.requisicao.editar'::public.app_permission));
CREATE POLICY "sup_req_delete" ON public.suprimentos_requisicoes FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.requisicao.cancelar'::public.app_permission));

CREATE POLICY "sup_req_itens_select" ON public.suprimentos_requisicao_itens FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.requisicao.visualizar'::public.app_permission));
CREATE POLICY "sup_req_itens_insert" ON public.suprimentos_requisicao_itens FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.requisicao.criar'::public.app_permission)
           OR public.has_permission(auth.uid(), 'suprimentos.requisicao.editar'::public.app_permission));
CREATE POLICY "sup_req_itens_update" ON public.suprimentos_requisicao_itens FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.requisicao.editar'::public.app_permission));
CREATE POLICY "sup_req_itens_delete" ON public.suprimentos_requisicao_itens FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.requisicao.editar'::public.app_permission));

CREATE POLICY "sup_req_eventos_select" ON public.suprimentos_requisicao_eventos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.requisicao.visualizar'::public.app_permission));
-- INSERT em eventos só via RPC (SECURITY DEFINER bypassa RLS). Nenhuma policy de INSERT para usuário comum.

CREATE OR REPLACE FUNCTION public.tg_sup_req_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_sup_req_touch BEFORE UPDATE ON public.suprimentos_requisicoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_sup_req_touch();
CREATE TRIGGER trg_sup_req_itens_touch BEFORE UPDATE ON public.suprimentos_requisicao_itens
  FOR EACH ROW EXECUTE FUNCTION public.tg_sup_req_touch();

CREATE OR REPLACE FUNCTION public.tg_sup_req_status_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE via_rpc text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    via_rpc := current_setting('app.via_sup_req_rpc', true);
    IF via_rpc IS NULL OR via_rpc <> 'true' THEN
      RAISE EXCEPTION 'Mudança de status em suprimentos_requisicoes só pode ocorrer via RPC oficial.' USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sup_req_status_guard BEFORE UPDATE ON public.suprimentos_requisicoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_sup_req_status_guard();

CREATE OR REPLACE FUNCTION public.tg_sup_req_eventos_no_mut()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'suprimentos_requisicao_eventos é append-only' USING ERRCODE = '42501'; END;
$$;
CREATE TRIGGER trg_sup_req_eventos_no_update BEFORE UPDATE ON public.suprimentos_requisicao_eventos
  FOR EACH ROW EXECUTE FUNCTION public.tg_sup_req_eventos_no_mut();
CREATE TRIGGER trg_sup_req_eventos_no_delete BEFORE DELETE ON public.suprimentos_requisicao_eventos
  FOR EACH ROW EXECUTE FUNCTION public.tg_sup_req_eventos_no_mut();

CREATE OR REPLACE FUNCTION public.fn_sup_req_log_evento(
  p_requisicao_id uuid, p_tipo_evento text,
  p_status_anterior public.sup_req_status, p_status_novo public.sup_req_status,
  p_payload jsonb DEFAULT '{}'::jsonb, p_observacao text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.suprimentos_requisicao_eventos
    (requisicao_id, tipo_evento, status_anterior, status_novo, usuario_id, payload, observacao)
  VALUES (p_requisicao_id, p_tipo_evento, p_status_anterior, p_status_novo, COALESCE(auth.uid(), p_requisicao_id), p_payload, p_observacao)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_sup_req_log_evento(uuid,text,public.sup_req_status,public.sup_req_status,jsonb,text) FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.fn_sup_req_set_status(p_id uuid, p_novo public.sup_req_status, p_permissoes text[])
RETURNS public.sup_req_status LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old public.sup_req_status; v_ok boolean := false; v_perm text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  FOREACH v_perm IN ARRAY p_permissoes LOOP
    IF public.has_permission(v_uid, v_perm::public.app_permission) THEN v_ok := true; EXIT; END IF;
  END LOOP;
  IF NOT v_ok THEN RAISE EXCEPTION 'Sem permissão para essa transição' USING ERRCODE='42501'; END IF;
  SELECT status INTO v_old FROM public.suprimentos_requisicoes WHERE id = p_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Requisição não encontrada'; END IF;
  PERFORM set_config('app.via_sup_req_rpc','true', true);
  UPDATE public.suprimentos_requisicoes SET status = p_novo WHERE id = p_id;
  PERFORM set_config('app.via_sup_req_rpc','false', true);
  RETURN v_old;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_sup_req_set_status(uuid,public.sup_req_status,text[]) FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_criar(p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.criar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: suprimentos.requisicao.criar' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.suprimentos_requisicoes (
    tipo, solicitante_id, setor, prioridade, data_necessidade, justificativa,
    os_id, tarefa_id, obra_id, projeto_id, cliente_id,
    centro_custo_id, centro_resultado_id, natureza_id, competencia,
    valor_estimado, criado_por
  ) VALUES (
    (p_payload->>'tipo')::public.sup_req_tipo,
    COALESCE((p_payload->>'solicitante_id')::uuid, v_uid),
    p_payload->>'setor',
    COALESCE(p_payload->>'prioridade','NORMAL'),
    NULLIF(p_payload->>'data_necessidade','')::date,
    p_payload->>'justificativa',
    NULLIF(p_payload->>'os_id','')::uuid,
    NULLIF(p_payload->>'tarefa_id','')::uuid,
    NULLIF(p_payload->>'obra_id','')::uuid,
    NULLIF(p_payload->>'projeto_id','')::uuid,
    NULLIF(p_payload->>'cliente_id','')::uuid,
    NULLIF(p_payload->>'centro_custo_id','')::uuid,
    NULLIF(p_payload->>'centro_resultado_id','')::uuid,
    NULLIF(p_payload->>'natureza_id','')::uuid,
    NULLIF(p_payload->>'competencia','')::date,
    COALESCE((p_payload->>'valor_estimado')::numeric, 0),
    v_uid
  ) RETURNING id INTO v_id;
  PERFORM public.fn_sup_req_log_evento(v_id, 'CRIADA', NULL, 'RASCUNHO', p_payload, NULL);
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_criar(jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_criar(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_atualizar(p_id uuid, p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_status public.sup_req_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.editar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  SELECT status INTO v_status FROM public.suprimentos_requisicoes WHERE id = p_id;
  IF v_status NOT IN ('RASCUNHO','RETORNADA') THEN
    RAISE EXCEPTION 'Só é possível atualizar requisição em RASCUNHO ou RETORNADA (status atual=%)', v_status;
  END IF;
  UPDATE public.suprimentos_requisicoes SET
    setor = COALESCE(p_payload->>'setor', setor),
    prioridade = COALESCE(p_payload->>'prioridade', prioridade),
    data_necessidade = COALESCE(NULLIF(p_payload->>'data_necessidade','')::date, data_necessidade),
    justificativa = COALESCE(p_payload->>'justificativa', justificativa),
    os_id = COALESCE(NULLIF(p_payload->>'os_id','')::uuid, os_id),
    obra_id = COALESCE(NULLIF(p_payload->>'obra_id','')::uuid, obra_id),
    projeto_id = COALESCE(NULLIF(p_payload->>'projeto_id','')::uuid, projeto_id),
    cliente_id = COALESCE(NULLIF(p_payload->>'cliente_id','')::uuid, cliente_id),
    centro_custo_id = COALESCE(NULLIF(p_payload->>'centro_custo_id','')::uuid, centro_custo_id),
    centro_resultado_id = COALESCE(NULLIF(p_payload->>'centro_resultado_id','')::uuid, centro_resultado_id),
    natureza_id = COALESCE(NULLIF(p_payload->>'natureza_id','')::uuid, natureza_id),
    competencia = COALESCE(NULLIF(p_payload->>'competencia','')::date, competencia),
    valor_estimado = COALESCE((p_payload->>'valor_estimado')::numeric, valor_estimado)
  WHERE id = p_id;
  PERFORM public.fn_sup_req_log_evento(p_id, 'ATUALIZADA', v_status, v_status, p_payload, NULL);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_atualizar(uuid,jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_atualizar(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_enviar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status; v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.suprimentos_requisicao_itens WHERE requisicao_id = p_id;
  IF v_count = 0 THEN RAISE EXCEPTION 'Requisição sem itens não pode ser enviada'; END IF;
  v_old := public.fn_sup_req_set_status(p_id, 'EM_APROVACAO', ARRAY['suprimentos.requisicao.criar','suprimentos.requisicao.editar']);
  PERFORM public.fn_sup_req_log_evento(p_id, 'ENVIADA', v_old, 'EM_APROVACAO', '{}'::jsonb, NULL);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_enviar(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_enviar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_aprovar(p_id uuid, p_valor_aprovado numeric DEFAULT NULL, p_observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status; v_qtd_zero int;
BEGIN
  SELECT COUNT(*) INTO v_qtd_zero FROM public.suprimentos_requisicao_itens
    WHERE requisicao_id = p_id AND quantidade_solicitada <= 0;
  IF v_qtd_zero > 0 THEN RAISE EXCEPTION 'Itens com quantidade zero não podem ser aprovados'; END IF;
  v_old := public.fn_sup_req_set_status(p_id, 'APROVADA', ARRAY['suprimentos.requisicao.aprovar']);
  UPDATE public.suprimentos_requisicao_itens
     SET quantidade_aprovada = quantidade_solicitada
   WHERE requisicao_id = p_id AND quantidade_aprovada = 0;
  UPDATE public.suprimentos_requisicoes
     SET aprovador_id = auth.uid(), aprovado_em = now(),
         valor_aprovado = COALESCE(p_valor_aprovado, valor_estimado)
   WHERE id = p_id;
  PERFORM public.fn_sup_req_log_evento(p_id, 'APROVADA', v_old, 'APROVADA',
    jsonb_build_object('valor_aprovado', COALESCE(p_valor_aprovado,0)), p_observacao);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_aprovar(uuid,numeric,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_aprovar(uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_reprovar(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN RAISE EXCEPTION 'Motivo de reprovação obrigatório (mínimo 5 caracteres)'; END IF;
  v_old := public.fn_sup_req_set_status(p_id, 'REPROVADA', ARRAY['suprimentos.requisicao.aprovar']);
  UPDATE public.suprimentos_requisicoes SET motivo_reprovacao = p_motivo, aprovador_id = auth.uid(), aprovado_em = now() WHERE id = p_id;
  PERFORM public.fn_sup_req_log_evento(p_id, 'REPROVADA', v_old, 'REPROVADA', jsonb_build_object('motivo',p_motivo), p_motivo);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_reprovar(uuid,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_reprovar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_cancelar(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN RAISE EXCEPTION 'Motivo de cancelamento obrigatório (mínimo 5 caracteres)'; END IF;
  v_old := public.fn_sup_req_set_status(p_id, 'CANCELADA', ARRAY['suprimentos.requisicao.cancelar']);
  UPDATE public.suprimentos_requisicoes SET motivo_cancelamento = p_motivo WHERE id = p_id;
  PERFORM public.fn_sup_req_log_evento(p_id, 'CANCELADA', v_old, 'CANCELADA', jsonb_build_object('motivo',p_motivo), p_motivo);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_cancelar(uuid,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_cancelar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_retornar(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN RAISE EXCEPTION 'Motivo de retorno obrigatório (mínimo 5 caracteres)'; END IF;
  v_old := public.fn_sup_req_set_status(p_id, 'RETORNADA', ARRAY['suprimentos.requisicao.aprovar']);
  UPDATE public.suprimentos_requisicoes SET motivo_retorno = p_motivo WHERE id = p_id;
  PERFORM public.fn_sup_req_log_evento(p_id, 'RETORNADA', v_old, 'RETORNADA', jsonb_build_object('motivo',p_motivo), p_motivo);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_retornar(uuid,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_retornar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_verificar_estoque(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.visualizar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'item_id', i.id, 'item_estoque_id', i.item_estoque_id, 'descricao', i.descricao,
    'qtd_aprovada', i.quantidade_aprovada, 'qtd_reservada', i.quantidade_reservada,
    'qtd_entregue', i.quantidade_entregue,
    'falta', GREATEST(i.quantidade_aprovada - i.quantidade_entregue, 0)
  )) INTO v_result
  FROM public.suprimentos_requisicao_itens i WHERE i.requisicao_id = p_id;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_verificar_estoque(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_verificar_estoque(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_enviar_compra(p_id uuid, p_justificativa text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status;
BEGIN
  v_old := public.fn_sup_req_set_status(p_id, 'AGUARDANDO_COMPRA', ARRAY['suprimentos.requisicao.comprar','suprimentos.requisicao.atender']);
  PERFORM public.fn_sup_req_log_evento(p_id, 'ENVIADA_COMPRA', v_old, 'AGUARDANDO_COMPRA',
    jsonb_build_object('justificativa', p_justificativa), p_justificativa);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_enviar_compra(uuid,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_enviar_compra(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_atender_parcial(p_id uuid, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status;
BEGIN
  v_old := public.fn_sup_req_set_status(p_id, 'PARCIALMENTE_ATENDIDA', ARRAY['suprimentos.requisicao.atender']);
  PERFORM public.fn_sup_req_log_evento(p_id, 'ATENDIDA_PARCIAL', v_old, 'PARCIALMENTE_ATENDIDA', p_payload, NULL);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_atender_parcial(uuid,jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_atender_parcial(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_atender_total(p_id uuid, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.sup_req_status; v_violacoes int;
BEGIN
  SELECT COUNT(*) INTO v_violacoes FROM public.suprimentos_requisicao_itens
   WHERE requisicao_id = p_id AND quantidade_entregue > quantidade_aprovada;
  IF v_violacoes > 0 THEN RAISE EXCEPTION 'Atendimento excede quantidade aprovada em % itens', v_violacoes; END IF;
  v_old := public.fn_sup_req_set_status(p_id, 'ATENDIDA', ARRAY['suprimentos.requisicao.atender']);
  PERFORM public.fn_sup_req_log_evento(p_id, 'ATENDIDA', v_old, 'ATENDIDA', p_payload, NULL);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_atender_total(uuid,jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_atender_total(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_evento_registrar(p_id uuid, p_tipo_evento text, p_observacao text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_status public.sup_req_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.visualizar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  SELECT status INTO v_status FROM public.suprimentos_requisicoes WHERE id = p_id;
  RETURN public.fn_sup_req_log_evento(p_id, p_tipo_evento, v_status, v_status, p_payload, p_observacao);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_evento_registrar(uuid,text,text,jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_evento_registrar(uuid,text,text,jsonb) TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_requisicoes_resumo
WITH (security_invoker=on) AS
SELECT
  r.id, r.numero, r.tipo, r.status, r.prioridade, r.data_necessidade,
  r.solicitante_id, r.aprovador_id, r.os_id, r.obra_id, r.projeto_id, r.cliente_id,
  r.centro_custo_id, r.centro_resultado_id, r.valor_estimado, r.valor_aprovado,
  r.criado_em, r.atualizado_em,
  (SELECT COUNT(*) FROM public.suprimentos_requisicao_itens i WHERE i.requisicao_id = r.id) AS qtd_itens,
  (SELECT COALESCE(SUM(quantidade_solicitada),0) FROM public.suprimentos_requisicao_itens i WHERE i.requisicao_id = r.id) AS qtd_solicitada_total,
  (SELECT COALESCE(SUM(quantidade_entregue),0) FROM public.suprimentos_requisicao_itens i WHERE i.requisicao_id = r.id) AS qtd_entregue_total
FROM public.suprimentos_requisicoes r
WHERE r.deleted_at IS NULL;

GRANT SELECT ON public.v_suprimentos_requisicoes_resumo TO authenticated;
