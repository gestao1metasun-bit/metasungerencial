-- ============================================================================
-- Onda E.OS.2 — RPCs oficiais de Ordem de Serviço (Gestão de O.S.)
-- ============================================================================

-- 1) Corrigir trigger antigo: tg_os_bloqueia_status referencia NEW.status,
--    mas os_ordens usa status_codigo. Separamos em duas funções dedicadas.
DROP TRIGGER IF EXISTS tg_os_ord_st ON public.os_ordens;
DROP TRIGGER IF EXISTS tg_os_tar_st ON public.os_tarefas;

CREATE OR REPLACE FUNCTION public.tg_os_ord_bloqueia_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status_codigo IS DISTINCT FROM OLD.status_codigo THEN
    IF coalesce(current_setting('app.via_os_rpc', true), '') <> 'true' THEN
      RAISE EXCEPTION 'Mudança direta de status em os_ordens proibida; use RPC oficial.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_os_tar_bloqueia_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF coalesce(current_setting('app.via_os_rpc', true), '') <> 'true' THEN
      RAISE EXCEPTION 'Mudança direta de status em os_tarefas proibida; use RPC oficial.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_os_ord_st
  BEFORE UPDATE ON public.os_ordens
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_os_ord_bloqueia_status();

CREATE TRIGGER tg_os_tar_st
  BEFORE UPDATE ON public.os_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_os_tar_bloqueia_status();

-- 2) Ampliar status de tarefa (alinha ao vídeo: Em deslocamento / Pausa / Impedida)
ALTER TABLE public.os_tarefas DROP CONSTRAINT IF EXISTS os_tarefas_status_check;
ALTER TABLE public.os_tarefas
  ADD CONSTRAINT os_tarefas_status_check
  CHECK (status = ANY (ARRAY[
    'PLANEJAMENTO','AGENDADA','EM_DESLOCAMENTO','EM_EXECUCAO',
    'PAUSA','IMPEDIDA','FINALIZADA','CANCELADA'
  ]));

-- ============================================================================
-- 3) Helper interno: registrar evento de histórico com flag app.via_os_rpc
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_os_log_evento(
  p_os_id     uuid,
  p_tarefa_id uuid,
  p_tipo      text,
  p_descricao text,
  p_payload   jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM set_config('app.via_os_rpc','true', true);
  INSERT INTO public.os_eventos (os_id, tarefa_id, tipo, ator_id, descricao, payload)
  VALUES (p_os_id, p_tarefa_id, p_tipo, auth.uid(), p_descricao, coalesce(p_payload,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_os_log_evento(uuid,uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_os_log_evento(uuid,uuid,text,text,jsonb) TO authenticated;

-- ============================================================================
-- 4) RPCs oficiais
-- ============================================================================

-- 4.1 — criar O.S.
CREATE OR REPLACE FUNCTION public.rpc_os_criar(
  p_cliente_id            uuid,
  p_proposta_id           uuid DEFAULT NULL,
  p_contrato_id           uuid DEFAULT NULL,
  p_pedido_venda_id       uuid DEFAULT NULL,
  p_projeto_id            uuid DEFAULT NULL,
  p_obra_id               uuid DEFAULT NULL,
  p_pipeline_id           uuid DEFAULT NULL,
  p_area_negocio_id       uuid DEFAULT NULL,
  p_ocorrencia_id         uuid DEFAULT NULL,
  p_tecnico_responsavel_id uuid DEFAULT NULL,
  p_status_codigo         text DEFAULT 'VISTORIA_PRE_CONTRATO',
  p_data_prev_inicio      date DEFAULT NULL,
  p_data_prev_termino     date DEFAULT NULL,
  p_valor_orcado          numeric DEFAULT 0,
  p_custo_orcado          numeric DEFAULT 0,
  p_valor_em_pv           numeric DEFAULT 0,
  p_endereco_logradouro   text DEFAULT NULL,
  p_endereco_numero       text DEFAULT NULL,
  p_endereco_bairro       text DEFAULT NULL,
  p_endereco_cidade       text DEFAULT NULL,
  p_endereco_uf           text DEFAULT NULL,
  p_endereco_cep          text DEFAULT NULL,
  p_observacoes           text DEFAULT NULL,
  p_idempotency_key       text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_idem uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_uid, 'os.criar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão os.criar.' USING ERRCODE = '42501';
  END IF;
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id obrigatório.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.os_status_catalogo WHERE codigo = p_status_codigo AND ativo) THEN
    RAISE EXCEPTION 'Status % inválido.', p_status_codigo USING ERRCODE = '22023';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    v_idem := public.rpc_idempotente_check(p_idempotency_key, 'rpc_os_criar');
    IF v_idem IS NOT NULL THEN
      RETURN v_idem;
    END IF;
  END IF;

  INSERT INTO public.os_ordens (
    cliente_id, proposta_id, contrato_id, pedido_venda_id, projeto_id, obra_id,
    pipeline_id, area_negocio_id, ocorrencia_id, tecnico_responsavel_id,
    status_codigo, data_prev_inicio, data_prev_termino,
    valor_orcado, custo_orcado, valor_em_pv,
    endereco_logradouro, endereco_numero, endereco_bairro,
    endereco_cidade, endereco_uf, endereco_cep,
    observacoes, created_by
  ) VALUES (
    p_cliente_id, p_proposta_id, p_contrato_id, p_pedido_venda_id, p_projeto_id, p_obra_id,
    p_pipeline_id, p_area_negocio_id, p_ocorrencia_id, p_tecnico_responsavel_id,
    p_status_codigo, p_data_prev_inicio, p_data_prev_termino,
    coalesce(p_valor_orcado,0), coalesce(p_custo_orcado,0), coalesce(p_valor_em_pv,0),
    p_endereco_logradouro, p_endereco_numero, p_endereco_bairro,
    p_endereco_cidade, p_endereco_uf, p_endereco_cep,
    p_observacoes, v_uid
  )
  RETURNING id INTO v_id;

  PERFORM public.fn_os_log_evento(
    v_id, NULL, 'OS_CRIADA',
    'Ordem de serviço criada.',
    jsonb_build_object('status', p_status_codigo)
  );

  IF p_idempotency_key IS NOT NULL THEN
    PERFORM public.rpc_idempotente_commit(p_idempotency_key, 'rpc_os_criar', v_id);
  END IF;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_criar(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,date,date,numeric,numeric,numeric,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_criar(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,date,date,numeric,numeric,numeric,text,text,text,text,text,text,text,text) TO authenticated;

-- 4.2 — atualizar campos não-status
CREATE OR REPLACE FUNCTION public.rpc_os_atualizar(
  p_os_id        uuid,
  p_row_version  integer,
  p_patch        jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_uid, 'os.editar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão os.editar.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.os_ordens WHERE id = p_os_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);

  UPDATE public.os_ordens SET
    cliente_id              = coalesce((p_patch->>'cliente_id')::uuid, cliente_id),
    proposta_id             = CASE WHEN p_patch ? 'proposta_id'           THEN nullif(p_patch->>'proposta_id','')::uuid           ELSE proposta_id END,
    contrato_id             = CASE WHEN p_patch ? 'contrato_id'           THEN nullif(p_patch->>'contrato_id','')::uuid           ELSE contrato_id END,
    pedido_venda_id         = CASE WHEN p_patch ? 'pedido_venda_id'       THEN nullif(p_patch->>'pedido_venda_id','')::uuid       ELSE pedido_venda_id END,
    projeto_id              = CASE WHEN p_patch ? 'projeto_id'            THEN nullif(p_patch->>'projeto_id','')::uuid            ELSE projeto_id END,
    obra_id                 = CASE WHEN p_patch ? 'obra_id'               THEN nullif(p_patch->>'obra_id','')::uuid               ELSE obra_id END,
    pipeline_id             = CASE WHEN p_patch ? 'pipeline_id'           THEN nullif(p_patch->>'pipeline_id','')::uuid           ELSE pipeline_id END,
    area_negocio_id         = CASE WHEN p_patch ? 'area_negocio_id'       THEN nullif(p_patch->>'area_negocio_id','')::uuid       ELSE area_negocio_id END,
    ocorrencia_id           = CASE WHEN p_patch ? 'ocorrencia_id'         THEN nullif(p_patch->>'ocorrencia_id','')::uuid         ELSE ocorrencia_id END,
    tecnico_responsavel_id  = CASE WHEN p_patch ? 'tecnico_responsavel_id' THEN nullif(p_patch->>'tecnico_responsavel_id','')::uuid ELSE tecnico_responsavel_id END,
    veiculo_id              = CASE WHEN p_patch ? 'veiculo_id'            THEN nullif(p_patch->>'veiculo_id','')::uuid            ELSE veiculo_id END,
    motorista_id            = CASE WHEN p_patch ? 'motorista_id'          THEN nullif(p_patch->>'motorista_id','')::uuid          ELSE motorista_id END,
    valor_orcado            = coalesce((p_patch->>'valor_orcado')::numeric, valor_orcado),
    custo_orcado            = coalesce((p_patch->>'custo_orcado')::numeric, custo_orcado),
    custo_total             = coalesce((p_patch->>'custo_total')::numeric, custo_total),
    valor_em_pv             = coalesce((p_patch->>'valor_em_pv')::numeric, valor_em_pv),
    data_prev_inicio        = CASE WHEN p_patch ? 'data_prev_inicio'      THEN nullif(p_patch->>'data_prev_inicio','')::date      ELSE data_prev_inicio END,
    data_prev_termino       = CASE WHEN p_patch ? 'data_prev_termino'     THEN nullif(p_patch->>'data_prev_termino','')::date     ELSE data_prev_termino END,
    endereco_logradouro     = coalesce(p_patch->>'endereco_logradouro', endereco_logradouro),
    endereco_numero         = coalesce(p_patch->>'endereco_numero', endereco_numero),
    endereco_bairro         = coalesce(p_patch->>'endereco_bairro', endereco_bairro),
    endereco_cidade         = coalesce(p_patch->>'endereco_cidade', endereco_cidade),
    endereco_uf             = coalesce(p_patch->>'endereco_uf', endereco_uf),
    endereco_cep            = coalesce(p_patch->>'endereco_cep', endereco_cep),
    observacoes             = coalesce(p_patch->>'observacoes', observacoes),
    updated_at              = now()
  WHERE id = p_os_id;

  PERFORM public.fn_os_log_evento(p_os_id, NULL, 'OS_ATUALIZADA', 'Campos atualizados.', p_patch);
  RETURN p_os_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_atualizar(uuid,integer,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_atualizar(uuid,integer,jsonb) TO authenticated;

-- 4.3 — mudar status (genérico)
CREATE OR REPLACE FUNCTION public.rpc_os_mudar_status(
  p_os_id        uuid,
  p_row_version  integer,
  p_novo_status  text,
  p_motivo       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.os_ordens;
  v_is_final boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'os.editar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão os.editar.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_row FROM public.os_ordens WHERE id=p_os_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);

  IF v_row.status_codigo IN ('FINALIZADA','CANCELADA') THEN
    RAISE EXCEPTION 'O.S. já está em status final (%); use RPC de reabertura.', v_row.status_codigo USING ERRCODE='42501';
  END IF;

  SELECT is_final INTO v_is_final FROM public.os_status_catalogo WHERE codigo=p_novo_status AND ativo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Status % inválido.', p_novo_status USING ERRCODE='22023';
  END IF;

  PERFORM set_config('app.via_os_rpc','true', true);
  UPDATE public.os_ordens SET status_codigo=p_novo_status, updated_at=now() WHERE id=p_os_id;

  PERFORM public.fn_os_log_evento(
    p_os_id, NULL, 'OS_STATUS',
    coalesce(p_motivo, 'Mudança de status.'),
    jsonb_build_object('de', v_row.status_codigo, 'para', p_novo_status)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_mudar_status(uuid,integer,text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_mudar_status(uuid,integer,text,text) TO authenticated;

-- 4.4 — finalizar
CREATE OR REPLACE FUNCTION public.rpc_os_finalizar(
  p_os_id       uuid,
  p_row_version integer,
  p_observacao  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_ordens;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_permission(v_uid,'os.finalizar'::app_permission)
       OR public.has_permission(v_uid,'os.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão os.finalizar.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_row FROM public.os_ordens WHERE id=p_os_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);
  IF v_row.status_codigo IN ('FINALIZADA','CANCELADA') THEN
    RAISE EXCEPTION 'O.S. já está em %; impossível finalizar.', v_row.status_codigo USING ERRCODE='42501';
  END IF;

  PERFORM set_config('app.via_os_rpc','true', true);
  UPDATE public.os_ordens
    SET status_codigo='FINALIZADA', data_fim=coalesce(data_fim, CURRENT_DATE), updated_at=now()
    WHERE id=p_os_id;

  PERFORM public.fn_os_log_evento(
    p_os_id, NULL, 'OS_FINALIZADA',
    coalesce(p_observacao,'O.S. finalizada.'),
    jsonb_build_object('de', v_row.status_codigo)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_finalizar(uuid,integer,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_finalizar(uuid,integer,text) TO authenticated;

-- 4.5 — cancelar
CREATE OR REPLACE FUNCTION public.rpc_os_cancelar(
  p_os_id       uuid,
  p_row_version integer,
  p_motivo      text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_ordens;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_permission(v_uid,'os.cancelar'::app_permission)
       OR public.has_permission(v_uid,'os.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão os.cancelar.' USING ERRCODE='42501';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mín. 5 caracteres).' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.os_ordens WHERE id=p_os_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);
  IF v_row.status_codigo = 'CANCELADA' THEN
    RAISE EXCEPTION 'O.S. já está CANCELADA.' USING ERRCODE='42501';
  END IF;

  PERFORM set_config('app.via_os_rpc','true', true);
  UPDATE public.os_ordens
    SET status_codigo='CANCELADA', updated_at=now()
    WHERE id=p_os_id;

  PERFORM public.fn_os_log_evento(
    p_os_id, NULL, 'OS_CANCELADA', p_motivo,
    jsonb_build_object('de', v_row.status_codigo)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_cancelar(uuid,integer,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_cancelar(uuid,integer,text) TO authenticated;

-- 4.6 — excluir (soft delete; exige status final ou cancelada)
CREATE OR REPLACE FUNCTION public.rpc_os_excluir(
  p_os_id  uuid,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_ordens;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid,'os.excluir'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão os.excluir.' USING ERRCODE='42501';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mín. 5 caracteres).' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.os_ordens WHERE id=p_os_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002'; END IF;
  IF v_row.status_codigo NOT IN ('FINALIZADA','CANCELADA') THEN
    RAISE EXCEPTION 'Só é possível excluir O.S. já finalizada ou cancelada.' USING ERRCODE='42501';
  END IF;

  UPDATE public.os_ordens
    SET deleted_at=now(), deleted_by=v_uid, delete_motivo=p_motivo
    WHERE id=p_os_id;

  PERFORM public.fn_os_log_evento(p_os_id, NULL, 'OS_EXCLUIDA', p_motivo, '{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_excluir(uuid,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_excluir(uuid,text) TO authenticated;

-- 4.7 — criar tarefa
CREATE OR REPLACE FUNCTION public.rpc_os_tarefa_criar(
  p_os_id          uuid,
  p_nome           text,
  p_descricao      text DEFAULT NULL,
  p_ordem          integer DEFAULT 0,
  p_modelo_id      uuid DEFAULT NULL,
  p_formulario_id  uuid DEFAULT NULL,
  p_tecnico_id     uuid DEFAULT NULL,
  p_funcao_tecnico_id uuid DEFAULT NULL,
  p_data_prevista  date DEFAULT NULL,
  p_duracao_min    integer DEFAULT NULL,
  p_obrigatorio    boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_permission(v_uid,'os.tarefa.executar'::app_permission)
       OR public.has_permission(v_uid,'os.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para criar tarefas.' USING ERRCODE='42501';
  END IF;
  IF p_nome IS NULL OR length(btrim(p_nome))=0 THEN
    RAISE EXCEPTION 'Nome da tarefa obrigatório.' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.os_ordens WHERE id=p_os_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002';
  END IF;

  INSERT INTO public.os_tarefas (
    os_id, modelo_id, formulario_id, nome, descricao, ordem, status,
    tecnico_id, funcao_tecnico_id, data_prevista, duracao_estimada_min, obrigatorio, created_by
  ) VALUES (
    p_os_id, p_modelo_id, p_formulario_id, p_nome, p_descricao, coalesce(p_ordem,0), 'PLANEJAMENTO',
    p_tecnico_id, p_funcao_tecnico_id, p_data_prevista, p_duracao_min, coalesce(p_obrigatorio,false), v_uid
  ) RETURNING id INTO v_id;

  PERFORM public.fn_os_log_evento(
    p_os_id, v_id, 'TAREFA_CRIADA', p_nome,
    jsonb_build_object('tecnico_id', p_tecnico_id, 'data_prevista', p_data_prevista)
  );
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_tarefa_criar(uuid,text,text,integer,uuid,uuid,uuid,uuid,date,integer,boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_tarefa_criar(uuid,text,text,integer,uuid,uuid,uuid,uuid,date,integer,boolean) TO authenticated;

-- 4.8 — atualizar tarefa (sem mudar status)
CREATE OR REPLACE FUNCTION public.rpc_os_tarefa_atualizar(
  p_tarefa_id   uuid,
  p_row_version integer,
  p_patch       jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_tarefas;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_permission(v_uid,'os.tarefa.executar'::app_permission)
       OR public.has_permission(v_uid,'os.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para editar tarefa.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_row FROM public.os_tarefas WHERE id=p_tarefa_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada.' USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);

  UPDATE public.os_tarefas SET
    nome             = coalesce(p_patch->>'nome', nome),
    descricao        = coalesce(p_patch->>'descricao', descricao),
    ordem            = coalesce((p_patch->>'ordem')::integer, ordem),
    formulario_id    = CASE WHEN p_patch ? 'formulario_id'    THEN nullif(p_patch->>'formulario_id','')::uuid    ELSE formulario_id END,
    tecnico_id       = CASE WHEN p_patch ? 'tecnico_id'       THEN nullif(p_patch->>'tecnico_id','')::uuid       ELSE tecnico_id END,
    funcao_tecnico_id= CASE WHEN p_patch ? 'funcao_tecnico_id' THEN nullif(p_patch->>'funcao_tecnico_id','')::uuid ELSE funcao_tecnico_id END,
    data_prevista    = CASE WHEN p_patch ? 'data_prevista'    THEN nullif(p_patch->>'data_prevista','')::date    ELSE data_prevista END,
    duracao_estimada_min = coalesce((p_patch->>'duracao_estimada_min')::integer, duracao_estimada_min),
    obrigatorio      = coalesce((p_patch->>'obrigatorio')::boolean, obrigatorio),
    observacoes      = coalesce(p_patch->>'observacoes', observacoes),
    latitude         = coalesce((p_patch->>'latitude')::double precision, latitude),
    longitude        = coalesce((p_patch->>'longitude')::double precision, longitude),
    updated_at       = now()
  WHERE id=p_tarefa_id;

  PERFORM public.fn_os_log_evento(v_row.os_id, p_tarefa_id, 'TAREFA_ATUALIZADA', 'Campos atualizados.', p_patch);
  RETURN p_tarefa_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_tarefa_atualizar(uuid,integer,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_tarefa_atualizar(uuid,integer,jsonb) TO authenticated;

-- 4.9 — atribuir responsável a uma tarefa
CREATE OR REPLACE FUNCTION public.rpc_os_tarefa_atribuir(
  p_tarefa_id        uuid,
  p_row_version      integer,
  p_tecnico_id       uuid,
  p_funcao_tecnico_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_tarefas;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid,'os.tarefa.atribuir'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão os.tarefa.atribuir.' USING ERRCODE='42501';
  END IF;
  IF p_tecnico_id IS NULL THEN
    RAISE EXCEPTION 'Técnico obrigatório.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.os_tarefas WHERE id=p_tarefa_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada.' USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);

  UPDATE public.os_tarefas
    SET tecnico_id=p_tecnico_id,
        funcao_tecnico_id=coalesce(p_funcao_tecnico_id, funcao_tecnico_id),
        updated_at=now()
    WHERE id=p_tarefa_id;

  PERFORM public.fn_os_log_evento(
    v_row.os_id, p_tarefa_id, 'TAREFA_ATRIBUIDA', 'Responsável atribuído.',
    jsonb_build_object('tecnico_id', p_tecnico_id, 'funcao_id', p_funcao_tecnico_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_tarefa_atribuir(uuid,integer,uuid,uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_tarefa_atribuir(uuid,integer,uuid,uuid) TO authenticated;

-- 4.10 — mudar status da tarefa (Agendada / Em deslocamento / Em execução / Pausa / Impedida / Cancelada)
CREATE OR REPLACE FUNCTION public.rpc_os_tarefa_mudar_status(
  p_tarefa_id   uuid,
  p_row_version integer,
  p_novo_status text,
  p_motivo      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_tarefas;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_permission(v_uid,'os.tarefa.executar'::app_permission)
       OR public.has_permission(v_uid,'os.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para mudar status de tarefa.' USING ERRCODE='42501';
  END IF;
  IF p_novo_status NOT IN ('PLANEJAMENTO','AGENDADA','EM_DESLOCAMENTO','EM_EXECUCAO','PAUSA','IMPEDIDA','FINALIZADA','CANCELADA') THEN
    RAISE EXCEPTION 'Status % inválido para tarefa.', p_novo_status USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.os_tarefas WHERE id=p_tarefa_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada.' USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);
  IF v_row.status IN ('FINALIZADA','CANCELADA') THEN
    RAISE EXCEPTION 'Tarefa já em status final (%).', v_row.status USING ERRCODE='42501';
  END IF;

  PERFORM set_config('app.via_os_rpc','true', true);
  UPDATE public.os_tarefas
    SET status=p_novo_status,
        data_inicio = CASE WHEN p_novo_status='EM_EXECUCAO' AND data_inicio IS NULL THEN now() ELSE data_inicio END,
        updated_at=now()
    WHERE id=p_tarefa_id;

  PERFORM public.fn_os_log_evento(
    v_row.os_id, p_tarefa_id, 'TAREFA_STATUS',
    coalesce(p_motivo, 'Mudança de status.'),
    jsonb_build_object('de', v_row.status, 'para', p_novo_status)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_tarefa_mudar_status(uuid,integer,text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_tarefa_mudar_status(uuid,integer,text,text) TO authenticated;

-- 4.11 — concluir tarefa
CREATE OR REPLACE FUNCTION public.rpc_os_tarefa_concluir(
  p_tarefa_id   uuid,
  p_row_version integer,
  p_observacao  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_tarefas;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_permission(v_uid,'os.tarefa.executar'::app_permission)
       OR public.has_permission(v_uid,'os.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para concluir tarefa.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_row FROM public.os_tarefas WHERE id=p_tarefa_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa não encontrada.' USING ERRCODE='P0002'; END IF;
  PERFORM public.check_row_version(v_row.row_version, p_row_version);
  IF v_row.status IN ('FINALIZADA','CANCELADA') THEN
    RAISE EXCEPTION 'Tarefa já em status final (%).', v_row.status USING ERRCODE='42501';
  END IF;

  PERFORM set_config('app.via_os_rpc','true', true);
  UPDATE public.os_tarefas
    SET status='FINALIZADA', data_fim=now(), updated_at=now()
    WHERE id=p_tarefa_id;

  PERFORM public.fn_os_log_evento(
    v_row.os_id, p_tarefa_id, 'TAREFA_FINALIZADA',
    coalesce(p_observacao,'Tarefa concluída.'),
    jsonb_build_object('de', v_row.status)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_tarefa_concluir(uuid,integer,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_tarefa_concluir(uuid,integer,text) TO authenticated;

-- 4.12 — vincular Pedido de Venda existente à O.S. (criação real de PV é responsabilidade do módulo Comercial)
CREATE OR REPLACE FUNCTION public.rpc_os_gerar_pv(
  p_os_id              uuid,
  p_pedido_venda_id    uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.os_ordens;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid,'os.gerar_pv'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão os.gerar_pv.' USING ERRCODE='42501';
  END IF;
  IF p_pedido_venda_id IS NULL THEN
    RAISE EXCEPTION 'pedido_venda_id obrigatório (PV deve ser criado via RPC oficial do Comercial).' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.os_ordens WHERE id=p_os_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002'; END IF;
  IF v_row.pedido_venda_id IS NOT NULL AND v_row.pedido_venda_id <> p_pedido_venda_id THEN
    RAISE EXCEPTION 'O.S. já está vinculada a outro PV (%).', v_row.pedido_venda_id USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pedidos_venda WHERE id=p_pedido_venda_id) THEN
    RAISE EXCEPTION 'PV % não encontrado.', p_pedido_venda_id USING ERRCODE='P0002';
  END IF;

  UPDATE public.os_ordens SET pedido_venda_id=p_pedido_venda_id, updated_at=now() WHERE id=p_os_id;

  PERFORM public.fn_os_log_evento(
    p_os_id, NULL, 'OS_PV_VINCULADO',
    'PV vinculado à O.S.',
    jsonb_build_object('pedido_venda_id', p_pedido_venda_id)
  );
  RETURN p_pedido_venda_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_gerar_pv(uuid,uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_gerar_pv(uuid,uuid) TO authenticated;

-- 4.13 — responder formulário de tarefa
CREATE OR REPLACE FUNCTION public.rpc_os_formulario_responder(
  p_tarefa_id      uuid,
  p_formulario_id  uuid,
  p_respostas      jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_os uuid; v_idem uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid,'os.formulario.responder'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão os.formulario.responder.' USING ERRCODE='42501';
  END IF;
  IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'object' THEN
    RAISE EXCEPTION 'Respostas devem ser objeto JSON.' USING ERRCODE='22023';
  END IF;

  SELECT os_id INTO v_os FROM public.os_tarefas WHERE id=p_tarefa_id AND deleted_at IS NULL;
  IF v_os IS NULL THEN RAISE EXCEPTION 'Tarefa não encontrada.' USING ERRCODE='P0002'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.os_formularios_definicao WHERE id=p_formulario_id) THEN
    RAISE EXCEPTION 'Formulário % não encontrado.', p_formulario_id USING ERRCODE='P0002';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    v_idem := public.rpc_idempotente_check(p_idempotency_key, 'rpc_os_formulario_responder');
    IF v_idem IS NOT NULL THEN RETURN v_idem; END IF;
  END IF;

  INSERT INTO public.os_formulario_respostas (tarefa_id, formulario_id, respondido_por, respostas)
  VALUES (p_tarefa_id, p_formulario_id, v_uid, p_respostas)
  RETURNING id INTO v_id;

  PERFORM public.fn_os_log_evento(
    v_os, p_tarefa_id, 'FORMULARIO_RESPONDIDO',
    'Formulário respondido.',
    jsonb_build_object('formulario_id', p_formulario_id, 'resposta_id', v_id)
  );

  IF p_idempotency_key IS NOT NULL THEN
    PERFORM public.rpc_idempotente_commit(p_idempotency_key, 'rpc_os_formulario_responder', v_id);
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_formulario_responder(uuid,uuid,jsonb,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_formulario_responder(uuid,uuid,jsonb,text) TO authenticated;

-- 4.14 — registrar evento/histórico manual
CREATE OR REPLACE FUNCTION public.rpc_os_evento_registrar(
  p_os_id     uuid,
  p_tarefa_id uuid,
  p_tipo      text,
  p_descricao text,
  p_payload   jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_permission(v_uid,'os.editar'::app_permission)
       OR public.has_permission(v_uid,'os.tarefa.executar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para registrar evento.' USING ERRCODE='42501';
  END IF;
  IF p_tipo IS NULL OR length(btrim(p_tipo))=0 THEN
    RAISE EXCEPTION 'Tipo de evento obrigatório.' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.os_ordens WHERE id=p_os_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'O.S. % não encontrada.', p_os_id USING ERRCODE='P0002';
  END IF;
  RETURN public.fn_os_log_evento(p_os_id, p_tarefa_id, p_tipo, p_descricao, p_payload);
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_os_evento_registrar(uuid,uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_os_evento_registrar(uuid,uuid,text,text,jsonb) TO authenticated;
