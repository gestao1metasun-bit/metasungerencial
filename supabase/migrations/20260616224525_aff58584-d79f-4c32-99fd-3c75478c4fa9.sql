CREATE OR REPLACE FUNCTION public.rpc_aditivo_aplicar(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contrato_id uuid := (_payload->>'contrato_id')::uuid;
  v_projeto_id uuid := NULLIF(_payload->>'projeto_id','')::uuid;
  v_tipo_escopo text := COALESCE(_payload->>'tipo_escopo','PROJETO');
  v_motivo text := btrim(COALESCE(_payload->>'motivo',''));
  v_descricao text := btrim(COALESCE(_payload->>'descricao',''));
  v_valor_novo numeric := NULLIF(_payload->>'valor_novo','')::numeric;
  v_potencia_nova numeric := NULLIF(_payload->>'potencia_nova','')::numeric;
  v_modulos_novo integer := NULLIF(_payload->>'modulos_novo','')::integer;
  v_inversor_novo text := NULLIF(_payload->>'inversor_novo','');
  v_observacoes text := _payload->>'observacoes';
  v_contrato record;
  v_projeto record;
  v_aditivo_id uuid;
  v_codigo text;
  v_numero int;
  v_valor_ant numeric;
  v_pot_ant numeric;
  v_mod_ant integer;
  v_inv_ant text;
  v_dif_valor numeric := 0;
  v_dif_pot numeric := 0;
  v_dif_mod integer := 0;
  v_houve_alteracao boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF v_contrato_id IS NULL THEN
    RAISE EXCEPTION 'contrato_id obrigatório' USING ERRCODE='22023';
  END IF;
  IF v_tipo_escopo NOT IN ('PROJETO','CONTRATO') THEN
    RAISE EXCEPTION 'tipo_escopo inválido' USING ERRCODE='22023';
  END IF;
  IF length(v_motivo) < 5 THEN
    RAISE EXCEPTION 'Motivo é obrigatório (>=5 caracteres)' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_contrato FROM public.contratos WHERE id=v_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE='P0002';
  END IF;
  IF v_contrato.status='CANCELADO' OR v_contrato.cancelado=true THEN
    RAISE EXCEPTION 'Contrato CANCELADO não aceita aditivo' USING ERRCODE='22023';
  END IF;

  IF v_tipo_escopo='PROJETO' THEN
    IF v_projeto_id IS NULL THEN
      RAISE EXCEPTION 'projeto_id obrigatório para aditivo de projeto' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_projeto FROM public.projetos
      WHERE id=v_projeto_id AND contrato_id=v_contrato_id AND deleted_at IS NULL
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Projeto não pertence ao contrato' USING ERRCODE='22023';
    END IF;
    IF upper(coalesce(v_projeto.status,''))='CANCELADO' THEN
      RAISE EXCEPTION 'Projeto CANCELADO não aceita aditivo' USING ERRCODE='22023';
    END IF;

    v_valor_ant := v_projeto.valor_estimado;
    v_pot_ant := v_projeto.potencia_kwp;
    v_mod_ant := v_projeto.modulos_qtde;
    v_inv_ant := v_projeto.inversor;

    IF v_valor_novo IS NOT NULL AND v_valor_novo <> COALESCE(v_valor_ant,0) THEN
      v_dif_valor := v_valor_novo - COALESCE(v_valor_ant,0); v_houve_alteracao := true;
    END IF;
    IF v_potencia_nova IS NOT NULL AND v_potencia_nova <> COALESCE(v_pot_ant,0) THEN
      v_dif_pot := v_potencia_nova - COALESCE(v_pot_ant,0); v_houve_alteracao := true;
    END IF;
    IF v_modulos_novo IS NOT NULL AND v_modulos_novo <> COALESCE(v_mod_ant,0) THEN
      v_dif_mod := v_modulos_novo - COALESCE(v_mod_ant,0); v_houve_alteracao := true;
    END IF;
    IF v_inversor_novo IS NOT NULL AND v_inversor_novo <> COALESCE(v_inv_ant,'') THEN
      v_houve_alteracao := true;
    END IF;

    IF NOT v_houve_alteracao THEN
      RAISE EXCEPTION 'Nenhuma alteração foi informada.' USING ERRCODE='22023';
    END IF;
  ELSE
    -- CONTRATO
    IF length(v_descricao) < 5 THEN
      RAISE EXCEPTION 'Descrição é obrigatória em aditivo de contrato (>=5 caracteres)' USING ERRCODE='22023';
    END IF;
    v_valor_ant := v_contrato.valor_total;
    v_pot_ant := v_contrato.potencia_kwp;
    v_mod_ant := v_contrato.modulos_qtde;
    v_inv_ant := v_contrato.inversor;
    IF v_valor_novo IS NOT NULL AND v_valor_novo <> COALESCE(v_valor_ant,0) THEN
      v_dif_valor := v_valor_novo - COALESCE(v_valor_ant,0); v_houve_alteracao := true;
    END IF;
    -- aditivo geral pode ter apenas cláusula textual (motivo+descricao) — não bloquear
  END IF;

  -- numero/codigo
  SELECT COALESCE(MAX(numero),0)+1 INTO v_numero FROM public.aditivos WHERE contrato_id=v_contrato_id;
  v_codigo := 'AD-' || COALESCE(v_contrato.codigo, substring(v_contrato_id::text,1,8)) || '-' || lpad(v_numero::text,3,'0');

  INSERT INTO public.aditivos (
    contrato_id, projeto_id, tipo_escopo, codigo, numero, tipo, status,
    motivo, descricao,
    valor_anterior, valor_novo, diferenca_valor, valor_delta,
    potencia_anterior, potencia_nova, diferenca_potencia,
    modulos_anterior, modulos_novo, diferenca_modulos,
    inversor_anterior, inversor_novo,
    payload_alteracoes, dados,
    criado_por, aprovado_por, aplicado_por,
    aprovado_em, aplicado_em,
    consultor_id, data_evento
  ) VALUES (
    v_contrato_id, v_projeto_id, v_tipo_escopo, v_codigo, v_numero,
    CASE WHEN v_tipo_escopo='PROJETO' THEN 'PROJETO_ALTERACAO' ELSE 'CONTRATO_GERAL' END,
    'APLICADO',
    v_motivo, NULLIF(v_descricao,''),
    v_valor_ant, v_valor_novo, COALESCE(v_dif_valor,0), COALESCE(v_dif_valor,0),
    v_pot_ant, v_potencia_nova, COALESCE(v_dif_pot,0),
    v_mod_ant, v_modulos_novo, COALESCE(v_dif_mod,0),
    v_inv_ant, v_inversor_novo,
    COALESCE(_payload->'payload_alteracoes','{}'::jsonb),
    jsonb_build_object('observacoes', v_observacoes),
    v_uid, v_uid, v_uid,
    now(), now(),
    v_uid, current_date
  ) RETURNING id INTO v_aditivo_id;

  -- Atualiza projeto se PROJETO
  IF v_tipo_escopo='PROJETO' THEN
    UPDATE public.projetos SET
      valor_estimado = COALESCE(v_valor_novo, valor_estimado),
      potencia_kwp = COALESCE(v_potencia_nova, potencia_kwp),
      modulos_qtde = COALESCE(v_modulos_novo, modulos_qtde),
      inversor = COALESCE(v_inversor_novo, inversor),
      updated_at = now()
    WHERE id = v_projeto_id;
  END IF;

  -- Atualiza contrato (sempre soma diferença, vinda do projeto ou do aditivo geral)
  UPDATE public.contratos SET
    valor_total = COALESCE(valor_total,0) + COALESCE(v_dif_valor,0),
    potencia_kwp = CASE WHEN v_tipo_escopo='PROJETO' OR v_potencia_nova IS NULL
                        THEN COALESCE(potencia_kwp,0) + COALESCE(v_dif_pot,0)
                        ELSE v_potencia_nova END,
    modulos_qtde = CASE WHEN v_tipo_escopo='PROJETO' OR v_modulos_novo IS NULL
                        THEN COALESCE(modulos_qtde,0) + COALESCE(v_dif_mod,0)
                        ELSE v_modulos_novo END,
    inversor = CASE WHEN v_tipo_escopo='CONTRATO' AND v_inversor_novo IS NOT NULL
                    THEN v_inversor_novo ELSE inversor END,
    updated_at = now()
  WHERE id = v_contrato_id;

  -- Timeline (3 eventos)
  PERFORM public.rpc_timeline_registrar(
    'aditivo', v_aditivo_id, 'ADITIVO_APLICADO',
    'Aditivo aplicado: ' || v_codigo,
    v_motivo,
    jsonb_build_object(
      'aditivo_id', v_aditivo_id,'contrato_id', v_contrato_id,'projeto_id', v_projeto_id,
      'tipo_escopo', v_tipo_escopo,
      'valor_anterior', v_valor_ant,'valor_novo', v_valor_novo,'diferenca_valor', v_dif_valor,
      'potencia_anterior', v_pot_ant,'potencia_nova', v_potencia_nova,'diferenca_potencia', v_dif_pot,
      'modulos_anterior', v_mod_ant,'modulos_novo', v_modulos_novo,'diferenca_modulos', v_dif_mod,
      'inversor_anterior', v_inv_ant,'inversor_novo', v_inversor_novo,
      'motivo', v_motivo
    )
  );
  IF v_tipo_escopo='PROJETO' THEN
    PERFORM public.rpc_timeline_registrar(
      'projeto', v_projeto_id, 'PROJETO_ALTERADO_POR_ADITIVO',
      'Projeto alterado por aditivo ' || v_codigo,
      v_motivo,
      jsonb_build_object('aditivo_id', v_aditivo_id,'contrato_id', v_contrato_id,
        'valor_anterior', v_valor_ant,'valor_novo', v_valor_novo,
        'potencia_anterior', v_pot_ant,'potencia_nova', v_potencia_nova,
        'modulos_anterior', v_mod_ant,'modulos_novo', v_modulos_novo,
        'inversor_anterior', v_inv_ant,'inversor_novo', v_inversor_novo)
    );
  END IF;
  PERFORM public.rpc_timeline_registrar(
    'contrato', v_contrato_id, 'CONTRATO_ALTERADO_POR_ADITIVO',
    'Contrato alterado por aditivo ' || v_codigo,
    v_motivo,
    jsonb_build_object('aditivo_id', v_aditivo_id,'projeto_id', v_projeto_id,
      'tipo_escopo', v_tipo_escopo,
      'diferenca_valor', v_dif_valor,'diferenca_potencia', v_dif_pot,'diferenca_modulos', v_dif_mod)
  );

  RETURN v_aditivo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_aditivo_aplicar(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_aditivo_aplicar(jsonb) TO authenticated;