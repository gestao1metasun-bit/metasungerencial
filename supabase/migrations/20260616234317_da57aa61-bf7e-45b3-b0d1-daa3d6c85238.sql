
-- C-ENT.9 — Aditivo Compensatório

-- 1) Permissão
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.aditivo.compensar';

-- 2) Colunas em aditivos
ALTER TABLE public.aditivos
  ADD COLUMN IF NOT EXISTS tipo_aditivo text NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS aditivo_origem_id uuid NULL REFERENCES public.aditivos(id),
  ADD COLUMN IF NOT EXISTS motivo_compensacao text NULL,
  ADD COLUMN IF NOT EXISTS observacao_compensacao text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aditivos_tipo_aditivo_chk'
  ) THEN
    ALTER TABLE public.aditivos
      ADD CONSTRAINT aditivos_tipo_aditivo_chk
      CHECK (tipo_aditivo IN ('NORMAL','COMPENSATORIO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aditivos_compensatorio_origem_chk'
  ) THEN
    ALTER TABLE public.aditivos
      ADD CONSTRAINT aditivos_compensatorio_origem_chk
      CHECK (
        (tipo_aditivo = 'NORMAL' AND aditivo_origem_id IS NULL)
        OR (tipo_aditivo = 'COMPENSATORIO' AND aditivo_origem_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_aditivos_origem ON public.aditivos(aditivo_origem_id) WHERE aditivo_origem_id IS NOT NULL;

-- 3) RPC atualizada
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
  v_tipo_aditivo text := upper(COALESCE(_payload->>'tipo_aditivo','NORMAL'));
  v_origem_id uuid := NULLIF(_payload->>'aditivo_origem_id','')::uuid;
  v_motivo_comp text := _payload->>'motivo_compensacao';
  v_obs_comp text := _payload->>'observacao_compensacao';
  v_origem record;
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
  v_event_aditivo text;
  v_event_proj text;
  v_event_contr text;
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
  IF v_tipo_aditivo NOT IN ('NORMAL','COMPENSATORIO') THEN
    RAISE EXCEPTION 'tipo_aditivo inválido' USING ERRCODE='22023';
  END IF;
  IF length(v_motivo) < 5 THEN
    RAISE EXCEPTION 'Motivo é obrigatório (>=5 caracteres)' USING ERRCODE='22023';
  END IF;

  -- Validação compensatório
  IF v_tipo_aditivo = 'COMPENSATORIO' THEN
    IF v_origem_id IS NULL THEN
      RAISE EXCEPTION 'aditivo_origem_id obrigatório em aditivo compensatório' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_origem FROM public.aditivos WHERE id = v_origem_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Aditivo de origem não encontrado' USING ERRCODE='P0002';
    END IF;
    IF v_origem.status <> 'APLICADO' THEN
      RAISE EXCEPTION 'Aditivo de origem precisa estar APLICADO para ser compensado' USING ERRCODE='22023';
    END IF;
    IF v_origem.contrato_id <> v_contrato_id THEN
      RAISE EXCEPTION 'Aditivo compensatório deve pertencer ao mesmo contrato do aditivo original' USING ERRCODE='22023';
    END IF;
    IF v_origem.tipo_escopo <> v_tipo_escopo THEN
      RAISE EXCEPTION 'Escopo do compensatório deve ser igual ao do aditivo original' USING ERRCODE='22023';
    END IF;
    IF v_origem.tipo_escopo = 'PROJETO'
       AND COALESCE(v_origem.projeto_id::text,'') <> COALESCE(v_projeto_id::text,'') THEN
      RAISE EXCEPTION 'Compensatório de projeto deve apontar para o mesmo projeto do aditivo original' USING ERRCODE='22023';
    END IF;
    IF length(COALESCE(v_motivo_comp,'')) < 5 THEN
      v_motivo_comp := v_motivo;
    END IF;
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
    IF length(v_descricao) < 5 AND v_tipo_aditivo = 'NORMAL' THEN
      RAISE EXCEPTION 'Descrição é obrigatória em aditivo de contrato (>=5 caracteres)' USING ERRCODE='22023';
    END IF;
    v_valor_ant := v_contrato.valor_total;
    v_pot_ant := v_contrato.potencia_kwp;
    v_mod_ant := v_contrato.modulos_qtde;
    v_inv_ant := v_contrato.inversor;
    IF v_valor_novo IS NOT NULL AND v_valor_novo <> COALESCE(v_valor_ant,0) THEN
      v_dif_valor := v_valor_novo - COALESCE(v_valor_ant,0); v_houve_alteracao := true;
    END IF;
  END IF;

  -- numero/codigo
  SELECT COALESCE(MAX(numero),0)+1 INTO v_numero FROM public.aditivos WHERE contrato_id=v_contrato_id;
  v_codigo := 'AD-' || COALESCE(v_contrato.codigo, substring(v_contrato_id::text,1,8)) || '-' || lpad(v_numero::text,3,'0');
  IF v_tipo_aditivo = 'COMPENSATORIO' THEN
    v_codigo := v_codigo || '-C';
  END IF;

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
    consultor_id, data_evento,
    tipo_aditivo, aditivo_origem_id, motivo_compensacao, observacao_compensacao
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
    v_uid, current_date,
    v_tipo_aditivo, v_origem_id, v_motivo_comp, v_obs_comp
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

  -- Atualiza contrato
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

  -- Eventos
  IF v_tipo_aditivo = 'COMPENSATORIO' THEN
    v_event_aditivo := 'ADITIVO_COMPENSATORIO_APLICADO';
    v_event_proj    := 'ALTERACAO_POR_ADITIVO_COMPENSATORIO';
    v_event_contr   := 'ALTERACAO_POR_ADITIVO_COMPENSATORIO';
  ELSE
    v_event_aditivo := 'ADITIVO_APLICADO';
    v_event_proj    := 'PROJETO_ALTERADO_POR_ADITIVO';
    v_event_contr   := 'CONTRATO_ALTERADO_POR_ADITIVO';
  END IF;

  -- Aditivo novo
  PERFORM public.rpc_timeline_registrar(
    'aditivo', v_aditivo_id, v_event_aditivo,
    CASE WHEN v_tipo_aditivo='COMPENSATORIO'
         THEN 'Aditivo compensatório aplicado: ' || v_codigo
         ELSE 'Aditivo aplicado: ' || v_codigo END,
    v_motivo,
    jsonb_build_object(
      'aditivo_id', v_aditivo_id,'contrato_id', v_contrato_id,'projeto_id', v_projeto_id,
      'tipo_escopo', v_tipo_escopo, 'tipo_aditivo', v_tipo_aditivo,
      'aditivo_origem_id', v_origem_id,
      'valor_anterior', v_valor_ant,'valor_novo', v_valor_novo,'diferenca_valor', v_dif_valor,
      'potencia_anterior', v_pot_ant,'potencia_nova', v_potencia_nova,'diferenca_potencia', v_dif_pot,
      'modulos_anterior', v_mod_ant,'modulos_novo', v_modulos_novo,'diferenca_modulos', v_dif_mod,
      'inversor_anterior', v_inv_ant,'inversor_novo', v_inversor_novo,
      'motivo', v_motivo,
      'motivo_compensacao', v_motivo_comp
    )
  );

  -- Evento no aditivo de origem (quando compensatório)
  IF v_tipo_aditivo = 'COMPENSATORIO' THEN
    PERFORM public.rpc_timeline_registrar(
      'aditivo', v_origem_id, 'ADITIVO_COMPENSADO',
      'Aditivo compensado por ' || v_codigo,
      COALESCE(v_motivo_comp, v_motivo),
      jsonb_build_object(
        'aditivo_compensatorio_id', v_aditivo_id,
        'codigo_compensatorio', v_codigo,
        'motivo', COALESCE(v_motivo_comp, v_motivo),
        'usuario_id', v_uid
      )
    );
  END IF;

  -- Projeto
  IF v_tipo_escopo='PROJETO' THEN
    PERFORM public.rpc_timeline_registrar(
      'projeto', v_projeto_id, v_event_proj,
      'Projeto alterado por ' || (CASE WHEN v_tipo_aditivo='COMPENSATORIO' THEN 'aditivo compensatório ' ELSE 'aditivo ' END) || v_codigo,
      v_motivo,
      jsonb_build_object('aditivo_id', v_aditivo_id,'contrato_id', v_contrato_id,
        'tipo_aditivo', v_tipo_aditivo, 'aditivo_origem_id', v_origem_id,
        'valor_anterior', v_valor_ant,'valor_novo', v_valor_novo,
        'potencia_anterior', v_pot_ant,'potencia_nova', v_potencia_nova,
        'modulos_anterior', v_mod_ant,'modulos_novo', v_modulos_novo,
        'inversor_anterior', v_inv_ant,'inversor_novo', v_inversor_novo)
    );
  END IF;

  -- Contrato
  PERFORM public.rpc_timeline_registrar(
    'contrato', v_contrato_id, v_event_contr,
    'Contrato alterado por ' || (CASE WHEN v_tipo_aditivo='COMPENSATORIO' THEN 'aditivo compensatório ' ELSE 'aditivo ' END) || v_codigo,
    v_motivo,
    jsonb_build_object('aditivo_id', v_aditivo_id,'projeto_id', v_projeto_id,
      'tipo_escopo', v_tipo_escopo, 'tipo_aditivo', v_tipo_aditivo,
      'aditivo_origem_id', v_origem_id,
      'diferenca_valor', v_dif_valor,'diferenca_potencia', v_dif_pot,'diferenca_modulos', v_dif_mod)
  );

  RETURN v_aditivo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_aditivo_aplicar(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_aditivo_aplicar(jsonb) TO authenticated;
