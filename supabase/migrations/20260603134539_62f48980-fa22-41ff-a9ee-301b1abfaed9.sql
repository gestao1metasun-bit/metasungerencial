DO $$
BEGIN
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.reprovar'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.cancelar'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.reabrir'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.contrato.enviar_assinatura'; EXCEPTION WHEN duplicate_object THEN NULL; END;
EXCEPTION WHEN others THEN
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.rpc_proposta_gerar_contrato(
  p_proposta_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proposta propostas%ROWTYPE;
  v_contrato_id uuid;
  v_codigo text;
  v_inversor text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid, 'contrato.gerar'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para gerar contrato' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;

  IF v_proposta.contrato_id IS NOT NULL THEN
    RETURN v_proposta.contrato_id;
  END IF;

  IF v_proposta.status NOT IN ('GERADA','ENVIADA','APROVADA') THEN
    RAISE EXCEPTION 'Apenas propostas GERADA, ENVIADA ou APROVADA geram contrato (status atual: %)', v_proposta.status USING ERRCODE = 'P0001';
  END IF;

  v_codigo := 'CT-' || to_char(now(),'YYYYMMDD') || '-' || substring(p_proposta_id::text from 1 for 8);
  v_inversor := COALESCE(v_proposta.dados #>> '{inversores,0,label}', v_proposta.dados #>> '{inversores,0,inversorId}', v_proposta.dados ->> 'inversorMarca');

  INSERT INTO contratos (
    codigo, cliente_id, consultor_id, status,
    valor_total, potencia_kwp, modulos_qtde, inversor,
    proposta_id, lead_id, vendedor, possui_financiamento, financiamento_banco, financiamento_valor,
    dados, observacoes
  ) VALUES (
    v_codigo,
    v_proposta.cliente_id,
    v_proposta.consultor_id,
    CASE WHEN v_proposta.status = 'APROVADA' THEN 'Aprovado' ELSE 'Rascunho' END,
    COALESCE(v_proposta.valor_final, 0),
    v_proposta.potencia_kwp,
    v_proposta.modulos_qtd,
    v_inversor,
    p_proposta_id,
    v_proposta.lead_id,
    COALESCE(v_proposta.dados ->> 'consultor', v_proposta.cliente_nome),
    COALESCE((v_proposta.dados ->> 'possuiFinanciamento')::boolean, false),
    v_proposta.dados ->> 'financiamentoBanco',
    NULLIF(v_proposta.dados ->> 'valorFinanciado', '')::numeric,
    COALESCE(v_proposta.dados, '{}'::jsonb)
      || jsonb_build_object(
        'origem', 'proposta',
        'proposta_numero', v_proposta.numero,
        'cliente_nome', v_proposta.cliente_nome,
        'cidade', v_proposta.dados ->> 'cidade',
        'estado', v_proposta.dados ->> 'estado',
        'consultor', v_proposta.dados ->> 'consultor'
      ),
    'Gerado a partir da proposta ' || COALESCE(v_proposta.numero, p_proposta_id::text)
  )
  RETURNING id INTO v_contrato_id;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE propostas SET
    contrato_id = v_contrato_id,
    status = 'APROVADA',
    data_aprovacao = COALESCE(data_aprovacao, now()),
    motivo_status = COALESCE(motivo_status, 'Contrato gerado'),
    updated_at = now()
  WHERE id = p_proposta_id;

  INSERT INTO audit_log (modulo, entidade, entidade_id, acao, user_id, motivo, valor_novo)
  VALUES (
    'comercial', 'proposta', p_proposta_id, 'GERAR_CONTRATO', v_uid,
    'Contrato gerado a partir da proposta',
    jsonb_build_object('contrato_id', v_contrato_id, 'codigo', v_codigo)
  );

  RETURN v_contrato_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_proposta_gerar_contrato(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_gerar_contrato(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_proposta_reprovar(
  p_proposta_id uuid,
  p_motivo text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proposta propostas%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres).' USING ERRCODE = '22023';
  END IF;
  IF NOT (
    has_permission(v_uid, 'comercial.proposta.reprovar'::app_permission)
    OR has_permission(v_uid, 'comercial.proposta.aprovar'::app_permission)
    OR has_permission(v_uid, 'comercial.proposta.editar'::app_permission)
    OR is_admin(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para reprovar propostas' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM public.propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF v_proposta.status = 'CANCELADA' THEN
    RAISE EXCEPTION 'Proposta cancelada não pode ser reprovada' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE public.propostas
     SET status = 'RECUSADA',
         motivo_status = p_motivo,
         updated_at = now()
   WHERE id = p_proposta_id;

  INSERT INTO public.audit_log (modulo, entidade, entidade_id, acao, user_id, motivo, valor_anterior, valor_novo)
  VALUES (
    'comercial', 'proposta', p_proposta_id, 'REPROVAR', v_uid, p_motivo,
    jsonb_build_object('status', v_proposta.status),
    jsonb_build_object('status', 'RECUSADA')
  );

  RETURN p_proposta_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_proposta_reprovar(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_reprovar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_proposta_cancelar(
  p_proposta_id uuid,
  p_motivo text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proposta propostas%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres).' USING ERRCODE = '22023';
  END IF;
  IF NOT (
    has_permission(v_uid, 'comercial.proposta.cancelar'::app_permission)
    OR has_permission(v_uid, 'comercial.proposta.editar'::app_permission)
    OR is_admin(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar propostas' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM public.propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF v_proposta.status = 'CANCELADA' THEN
    RETURN p_proposta_id;
  END IF;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE public.propostas
     SET status = 'CANCELADA',
         motivo_status = p_motivo,
         updated_at = now()
   WHERE id = p_proposta_id;

  INSERT INTO public.audit_log (modulo, entidade, entidade_id, acao, user_id, motivo, valor_anterior, valor_novo)
  VALUES (
    'comercial', 'proposta', p_proposta_id, 'CANCELAR', v_uid, p_motivo,
    jsonb_build_object('status', v_proposta.status),
    jsonb_build_object('status', 'CANCELADA')
  );

  RETURN p_proposta_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_proposta_cancelar(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_cancelar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_proposta_reabrir(
  p_proposta_id uuid,
  p_motivo text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proposta propostas%ROWTYPE;
  v_status_destino text := 'GERADA';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres).' USING ERRCODE = '22023';
  END IF;
  IF NOT (
    has_permission(v_uid, 'comercial.proposta.reabrir'::app_permission)
    OR has_permission(v_uid, 'comercial.proposta.editar'::app_permission)
    OR is_admin(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para reabrir propostas' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM public.propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF v_proposta.status NOT IN ('CANCELADA','RECUSADA','VENCIDA') THEN
    RAISE EXCEPTION 'Somente propostas canceladas, recusadas ou vencidas podem ser reabertas (status atual: %)', v_proposta.status USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE public.propostas
     SET status = v_status_destino,
         motivo_status = p_motivo,
         updated_at = now(),
         validade = COALESCE(validade, (CURRENT_DATE + INTERVAL '45 days')::date)
   WHERE id = p_proposta_id;

  INSERT INTO public.audit_log (modulo, entidade, entidade_id, acao, user_id, motivo, valor_anterior, valor_novo)
  VALUES (
    'comercial', 'proposta', p_proposta_id, 'REABRIR', v_uid, p_motivo,
    jsonb_build_object('status', v_proposta.status),
    jsonb_build_object('status', v_status_destino)
  );

  RETURN p_proposta_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_proposta_reabrir(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_reabrir(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_contrato_enviar_assinatura(
  p_contrato_id uuid,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contrato public.contratos%ROWTYPE;
  v_evento_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (
    has_permission(v_uid, 'comercial.contrato.enviar_assinatura'::app_permission)
    OR has_permission(v_uid, 'comercial.contrato.assinar'::app_permission)
    OR has_permission(v_uid, 'comercial.contrato.assinar_excecao'::app_permission)
    OR is_admin(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para enviar contrato para assinatura' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contrato FROM public.contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v_contrato.cancelado THEN
    RAISE EXCEPTION 'Contrato cancelado não pode ir para assinatura' USING ERRCODE = 'P0001';
  END IF;
  IF v_contrato.assinado THEN
    RETURN COALESCE(v_contrato.assinatura_evento_id, p_contrato_id);
  END IF;

  INSERT INTO public.comercial_assinatura_eventos (
    contrato_id, assinado_por, permissao_usada, observacao, metadata
  ) VALUES (
    p_contrato_id,
    v_uid,
    'comercial.contrato.enviar_assinatura',
    COALESCE(p_observacao, 'Fluxo interno: aguardando assinatura'),
    jsonb_build_object('status_fluxo', 'AGUARDANDO_ASSINATURA', 'modo', 'interno_sem_integracao')
  ) RETURNING id INTO v_evento_id;

  PERFORM set_config('app.via_assinatura_rpc', 'true', true);
  UPDATE public.contratos
     SET status = 'Aguardando assinatura',
         assinatura_evento_id = COALESCE(assinatura_evento_id, v_evento_id),
         updated_at = now()
   WHERE id = p_contrato_id;

  INSERT INTO public.audit_log (modulo, entidade, entidade_id, acao, user_id, motivo, valor_novo)
  VALUES (
    'comercial', 'contrato', p_contrato_id, 'ENVIAR_ASSINATURA', v_uid,
    COALESCE(p_observacao, 'Contrato enviado para assinatura'),
    jsonb_build_object('status', 'Aguardando assinatura', 'assinatura_evento_id', v_evento_id)
  );

  RETURN v_evento_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_contrato_enviar_assinatura(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_enviar_assinatura(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_contrato_gerar_aditivo(
  p_contrato_id uuid,
  p_descricao text,
  p_tipo text DEFAULT 'Comercial',
  p_valor_delta numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contrato public.contratos%ROWTYPE;
  v_aditivo_id uuid;
  v_numero integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF p_descricao IS NULL OR length(btrim(p_descricao)) < 5 THEN
    RAISE EXCEPTION 'Descrição do aditivo obrigatória (mínimo 5 caracteres).' USING ERRCODE = '22023';
  END IF;
  IF NOT (
    has_permission(v_uid, 'aditivo.criar'::app_permission)
    OR is_admin(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para criar aditivo' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contrato FROM public.contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v_contrato.cancelado THEN
    RAISE EXCEPTION 'Contrato cancelado não pode receber aditivo' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (
    COALESCE(v_contrato.assinado, false)
    OR COALESCE(v_contrato.assinado_aprovado, false)
    OR v_contrato.status IN ('Assinado','Aprovado')
  ) THEN
    RAISE EXCEPTION 'Gere e aprove/assine o contrato antes de criar aditivo' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero
  FROM public.aditivos
  WHERE contrato_id = p_contrato_id AND deleted_at IS NULL;

  INSERT INTO public.aditivos (
    contrato_id, consultor_id, numero, tipo, descricao, valor_delta, status, data_evento, dados
  ) VALUES (
    p_contrato_id, COALESCE(v_contrato.consultor_id, v_uid), v_numero, COALESCE(p_tipo, 'Comercial'), p_descricao,
    COALESCE(p_valor_delta, 0), 'Pendente', current_date,
    jsonb_build_object('origem', 'ribbon_comercial', 'contrato_codigo', v_contrato.codigo)
  ) RETURNING id INTO v_aditivo_id;

  INSERT INTO public.audit_log (modulo, entidade, entidade_id, acao, user_id, motivo, valor_novo)
  VALUES (
    'comercial', 'aditivo', v_aditivo_id, 'CRIAR', v_uid, p_descricao,
    jsonb_build_object('contrato_id', p_contrato_id, 'numero', v_numero, 'tipo', p_tipo, 'valor_delta', COALESCE(p_valor_delta,0))
  );

  RETURN v_aditivo_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_contrato_gerar_aditivo(uuid, text, text, numeric) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_gerar_aditivo(uuid, text, text, numeric) TO authenticated;