CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_criar(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
  v_tipo public.sup_req_tipo;
  v_setor text;
  v_natureza uuid;
  v_destino_almox boolean := COALESCE((p_payload->>'destino_almoxarifado')::boolean, false);
  v_projeto uuid := NULLIF(p_payload->>'projeto_id','')::uuid;
  v_obra uuid := NULLIF(p_payload->>'obra_id','')::uuid;
  v_os uuid := NULLIF(p_payload->>'os_id','')::uuid;
  v_cc uuid := NULLIF(p_payload->>'centro_custo_id','')::uuid;
  v_cr uuid := NULLIF(p_payload->>'centro_resultado_id','')::uuid;
  v_cc_almox uuid;
  v_cr_almox uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.criar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: suprimentos.requisicao.criar' USING ERRCODE='42501';
  END IF;

  v_tipo := (p_payload->>'tipo')::public.sup_req_tipo;
  v_setor := NULLIF(trim(p_payload->>'setor'), '');
  v_natureza := NULLIF(p_payload->>'natureza_id','')::uuid;

  IF v_natureza IS NULL THEN
    RAISE EXCEPTION 'Natureza é obrigatória' USING ERRCODE='22023';
  END IF;
  IF v_setor IS NULL THEN
    RAISE EXCEPTION 'Setor é obrigatório' USING ERRCODE='22023';
  END IF;

  -- Bloqueia SERVIÇO + Almoxarifado (estoque só faz sentido para material)
  IF v_destino_almox AND v_tipo = 'SERVICO' THEN
    RAISE EXCEPTION 'Almoxarifado é destino apenas para MATERIAL. Serviço deve ser vinculado a Projeto/Obra/O.S.'
      USING ERRCODE='22023';
  END IF;

  IF v_destino_almox THEN
    v_projeto := NULL; v_obra := NULL; v_os := NULL;
    SELECT id INTO v_cc_almox FROM public.centros_custo WHERE codigo='ALMOXARIFADO' LIMIT 1;
    SELECT id INTO v_cr_almox FROM public.centros_resultado WHERE codigo='ALMOXARIFADO' LIMIT 1;
    v_cc := COALESCE(v_cc, v_cc_almox);
    v_cr := COALESCE(v_cr, v_cr_almox);
  ELSE
    IF v_projeto IS NULL AND v_obra IS NULL AND v_os IS NULL THEN
      RAISE EXCEPTION 'Vincule Projeto, Obra ou O.S. — ou marque destino Almoxarifado'
        USING ERRCODE='22023';
    END IF;
  END IF;

  -- CC e CR são sempre obrigatórios (após resolução do almoxarifado)
  IF v_cc IS NULL THEN
    RAISE EXCEPTION 'Centro de Custo é obrigatório' USING ERRCODE='22023';
  END IF;
  IF v_cr IS NULL THEN
    RAISE EXCEPTION 'Centro de Resultado é obrigatório' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.suprimentos_requisicoes (
    tipo, solicitante_id, setor, prioridade, data_necessidade, justificativa,
    os_id, tarefa_id, obra_id, projeto_id, cliente_id,
    centro_custo_id, centro_resultado_id, natureza_id, competencia,
    valor_estimado, destino_almoxarifado, criado_por
  ) VALUES (
    v_tipo,
    COALESCE((p_payload->>'solicitante_id')::uuid, v_uid),
    v_setor,
    COALESCE(p_payload->>'prioridade','NORMAL'),
    NULLIF(p_payload->>'data_necessidade','')::date,
    p_payload->>'justificativa',
    v_os,
    NULLIF(p_payload->>'tarefa_id','')::uuid,
    v_obra,
    v_projeto,
    NULLIF(p_payload->>'cliente_id','')::uuid,
    v_cc, v_cr, v_natureza,
    NULLIF(p_payload->>'competencia','')::date,
    COALESCE((p_payload->>'valor_estimado')::numeric, 0),
    v_destino_almox,
    v_uid
  ) RETURNING id INTO v_id;

  PERFORM public.fn_sup_req_log_evento(v_id, 'CRIADA', NULL, 'RASCUNHO', p_payload, NULL);
  RETURN v_id;
END;
$function$;