
-- D18.12 — rpc_contrato_gerar_final: MINUTA → GERADO (aguarda assinatura)
CREATE OR REPLACE FUNCTION public.rpc_contrato_gerar_final(
  p_contrato_id uuid,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_c contratos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid,'comercial.contrato.aprovar_minuta'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.contrato.aprovar_minuta' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_c FROM contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF upper(v_c.status) NOT IN ('MINUTA','PENDENTE_REVISAO','RASCUNHO','PENDENTE') THEN
    RAISE EXCEPTION 'Contrato não está em minuta (status atual: %)', v_c.status USING ERRCODE = 'P0001';
  END IF;
  IF v_c.cancelado THEN
    RAISE EXCEPTION 'Contrato cancelado não pode ser gerado';
  END IF;
  IF v_c.cliente_id IS NULL THEN
    RAISE EXCEPTION 'Contrato sem cliente — preencha o cadastro antes de gerar';
  END IF;
  IF v_c.proposta_id IS NULL THEN
    RAISE EXCEPTION 'Contrato sem proposta origem';
  END IF;
  IF COALESCE(v_c.valor_total,0) <= 0 THEN
    RAISE EXCEPTION 'Contrato sem valor — preencha o valor antes de gerar';
  END IF;

  UPDATE contratos
     SET status = 'GERADO',
         dados = COALESCE(dados,'{}'::jsonb) || jsonb_build_object(
           'etapa','AGUARDANDO_ASSINATURA',
           'gerado_em', now(),
           'gerado_por', v_uid,
           'geracao_observacao', p_observacao
         )
   WHERE id = p_contrato_id;

  RETURN p_contrato_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_contrato_gerar_final(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_gerar_final(uuid, text) TO authenticated;

-- D18.12 — rpc_contrato_marcar_assinado: GERADO → ATIVO + proposta CONTRATADA
CREATE OR REPLACE FUNCTION public.rpc_contrato_marcar_assinado(
  p_contrato_id uuid,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_c contratos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid,'comercial.contrato.aprovar_minuta'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.contrato.aprovar_minuta' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_c FROM contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF upper(v_c.status) NOT IN ('GERADO','AGUARDANDO_ASSINATURA') THEN
    RAISE EXCEPTION 'Contrato não está aguardando assinatura (status atual: %)', v_c.status USING ERRCODE = 'P0001';
  END IF;
  IF v_c.cancelado THEN
    RAISE EXCEPTION 'Contrato cancelado não pode ser assinado';
  END IF;

  UPDATE contratos
     SET status = 'ATIVO',
         data_assinatura = COALESCE(data_assinatura, now()::date),
         dados = COALESCE(dados,'{}'::jsonb) || jsonb_build_object(
           'etapa','ASSINADO',
           'assinado_em', now(),
           'assinado_por', v_uid,
           'assinatura_observacao', p_observacao
         )
   WHERE id = p_contrato_id;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE propostas
     SET status = 'CONTRATADA',
         motivo_status = 'Contrato ' || COALESCE(v_c.codigo,'') || ' assinado'
   WHERE id = v_c.proposta_id;
  PERFORM set_config('app.via_revisao_proposta','false', true);

  RETURN p_contrato_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_contrato_marcar_assinado(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_marcar_assinado(uuid, text) TO authenticated;
