CREATE OR REPLACE FUNCTION public.rpc_contrato_gerar_de_propostas(p_proposta_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_cliente_id uuid;
  v_count int;
  v_blocked int;
  v_valor numeric := 0;
  v_potencia numeric := 0;
  v_modulos int := 0;
  v_contrato_id uuid;
  v_codigo text;
  v_rec record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT has_permission(v_uid, 'comercial.contrato.criar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão comercial.contrato.criar' USING ERRCODE = '42501';
  END IF;

  IF p_proposta_ids IS NULL OR array_length(p_proposta_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos uma proposta';
  END IF;

  SELECT count(DISTINCT cliente_id), max(cliente_id)
    INTO v_count, v_cliente_id
  FROM public.propostas
  WHERE id = ANY(p_proposta_ids)
    AND deleted_at IS NULL;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma proposta encontrada';
  END IF;
  IF v_count > 1 THEN
    RAISE EXCEPTION 'Todas as propostas devem pertencer ao mesmo cliente';
  END IF;
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Proposta sem cliente vinculado';
  END IF;

  SELECT count(*) INTO v_blocked
  FROM public.propostas p
  WHERE p.id = ANY(p_proposta_ids)
    AND (
      p.status NOT IN ('APROVADA','ASSINADA')
      OR p.contrato_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.contrato_propostas cp WHERE cp.proposta_id = p.id)
    );
  IF v_blocked > 0 THEN
    RAISE EXCEPTION 'Há propostas inválidas (não aprovadas/assinadas, canceladas, substituídas ou já contratadas)';
  END IF;

  SELECT
    COALESCE(SUM(valor_final), 0),
    COALESCE(SUM(potencia_kwp), 0),
    COALESCE(SUM(modulos_qtd), 0)
  INTO v_valor, v_potencia, v_modulos
  FROM public.propostas
  WHERE id = ANY(p_proposta_ids);

  IF v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor total do contrato deve ser maior que zero';
  END IF;

  v_codigo := 'CT-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.seq_contrato_codigo')::text, 5, '0');

  INSERT INTO public.contratos (
    codigo, cliente_id, status, valor_total, potencia_kwp, modulos_qtde,
    dados
  ) VALUES (
    v_codigo, v_cliente_id, 'MINUTA', v_valor, NULLIF(v_potencia,0), NULLIF(v_modulos,0),
    jsonb_build_object(
      'etapa','CONTRATO_PENDENTE',
      'origem','rpc_contrato_gerar_de_propostas',
      'propostas', to_jsonb(p_proposta_ids),
      'criado_por', v_uid,
      'criado_em', now()
    )
  ) RETURNING id INTO v_contrato_id;

  PERFORM set_config('app.via_revisao_proposta','true', true);

  FOR v_rec IN
    SELECT id, numero, valor_final, potencia_kwp, modulos_qtd, dados
    FROM public.propostas
    WHERE id = ANY(p_proposta_ids)
  LOOP
    INSERT INTO public.contrato_propostas (contrato_id, proposta_id, criado_por)
    VALUES (v_contrato_id, v_rec.id, v_uid);

    INSERT INTO public.projetos (
      codigo, cliente_id, contrato_id, tipo, status,
      potencia_kwp, modulos_qtde, valor_estimado, dados
    ) VALUES (
      v_codigo || '-' || COALESCE(v_rec.numero, substr(v_rec.id::text,1,8)),
      v_cliente_id,
      v_contrato_id,
      'Contrato',
      'Rascunho',
      v_rec.potencia_kwp,
      v_rec.modulos_qtd,
      v_rec.valor_final,
      jsonb_build_object(
        'proposta_id', v_rec.id,
        'origem','rpc_contrato_gerar_de_propostas',
        'endereco_instalacao', COALESCE(v_rec.dados->'endereco_instalacao', v_rec.dados->'endereco', 'null'::jsonb)
      )
    );

    UPDATE public.propostas
       SET status = 'CONTRATO_PENDENTE',
           contrato_id = v_contrato_id,
           motivo_status = 'Contrato pendente ' || v_codigo
     WHERE id = v_rec.id;
  END LOOP;

  PERFORM set_config('app.via_revisao_proposta','false', true);

  RETURN v_contrato_id;
END;
$function$;