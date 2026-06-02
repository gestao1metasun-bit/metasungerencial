-- D20.SUP.7 (3/4) — RPCs oficiais de Alçadas + Preparação Financeira.

-- =====================================================================
-- 1) rpc_sup_alcada_avaliar
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_sup_alcada_avaliar(
  p_entidade_tipo text,
  p_entidade_id   uuid,
  p_etapa         text,
  p_valor         numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alcada record;
  v_tipo            text;
  v_setor           text;
  v_natureza_id     uuid;
  v_cc_id           uuid;
  v_cr_id           uuid;
  v_forn_id         uuid;
  v_prioridade_req  text;
  v_destino         text;
  v_valor           numeric := p_valor;
BEGIN
  IF p_etapa NOT IN ('REQUISICAO','COTACAO','PEDIDO') THEN
    RAISE EXCEPTION 'Etapa inválida: %', p_etapa USING ERRCODE='22023';
  END IF;
  IF p_entidade_tipo NOT IN ('REQUISICAO','COTACAO','PEDIDO') THEN
    RAISE EXCEPTION 'Entidade inválida: %', p_entidade_tipo USING ERRCODE='22023';
  END IF;

  -- Carrega contexto conforme entidade
  IF p_entidade_tipo = 'REQUISICAO' THEN
    SELECT r.tipo::text, r.setor, r.natureza_id, r.centro_custo_id, r.centro_resultado_id,
           NULL::uuid, r.prioridade::text,
           CASE
             WHEN r.destino_almoxarifado THEN 'ALMOXARIFADO'
             WHEN r.os_id IS NOT NULL THEN 'OS'
             WHEN r.obra_id IS NOT NULL THEN 'OBRA'
             WHEN r.projeto_id IS NOT NULL THEN 'PROJETO'
             ELSE NULL
           END,
           COALESCE(p_valor,
             (SELECT COALESCE(SUM(quantidade_solicitada*COALESCE(valor_estimado_unitario,0)),0)
                FROM public.suprimentos_requisicao_itens WHERE requisicao_id=r.id))
      INTO v_tipo, v_setor, v_natureza_id, v_cc_id, v_cr_id, v_forn_id, v_prioridade_req, v_destino, v_valor
      FROM public.suprimentos_requisicoes r WHERE r.id = p_entidade_id;
  ELSIF p_entidade_tipo = 'COTACAO' THEN
    SELECT NULL::text, NULL::text, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::text,
           COALESCE(p_valor, c.valor_total, 0)
      INTO v_tipo, v_setor, v_natureza_id, v_cc_id, v_cr_id, v_forn_id, v_prioridade_req, v_destino, v_valor
      FROM public.suprimentos_cotacoes c WHERE c.id = p_entidade_id;
  ELSE -- PEDIDO
    SELECT NULL::text, NULL::text, NULL::uuid,
           p.centro_custo_id, p.centro_resultado_id, p.fornecedor_id, NULL::text, NULL::text,
           COALESCE(p_valor, p.valor_aprovado_final, p.valor_total, 0)
      INTO v_tipo, v_setor, v_natureza_id, v_cc_id, v_cr_id, v_forn_id, v_prioridade_req, v_destino, v_valor
      FROM public.suprimentos_pedidos_compra p WHERE p.id = p_entidade_id;
  END IF;

  -- Match: regra ativa, etapa correta, todos critérios definidos casando
  SELECT a.* INTO v_alcada
    FROM public.suprimentos_alcadas a
   WHERE a.ativo = true AND a.deleted_at IS NULL
     AND a.etapa = p_etapa
     AND (a.tipo IS NULL OR a.tipo = v_tipo)
     AND (a.valor_min IS NULL OR v_valor >= a.valor_min)
     AND (a.valor_max IS NULL OR v_valor <= a.valor_max)
     AND (a.setor IS NULL OR a.setor = v_setor)
     AND (a.natureza_id IS NULL OR a.natureza_id = v_natureza_id)
     AND (a.centro_custo_id IS NULL OR a.centro_custo_id = v_cc_id)
     AND (a.centro_resultado_id IS NULL OR a.centro_resultado_id = v_cr_id)
     AND (a.fornecedor_id IS NULL OR a.fornecedor_id = v_forn_id)
     AND (a.prioridade_req IS NULL OR a.prioridade_req = v_prioridade_req)
     AND (a.destino IS NULL OR a.destino = v_destino)
   ORDER BY a.prioridade ASC, a.created_at ASC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'matched', false,
      'etapa', p_etapa,
      'valor_avaliado', v_valor,
      'mensagem', 'Nenhuma alçada cadastrada cobre este caso. Cadastre uma regra em Suprimentos → Alçadas.'
    );
  END IF;

  RETURN jsonb_build_object(
    'matched', true,
    'alcada_id', v_alcada.id,
    'alcada_nome', v_alcada.nome,
    'etapa', v_alcada.etapa,
    'aprovador_tipo', v_alcada.aprovador_tipo,
    'aprovador_valor', v_alcada.aprovador_valor,
    'exige_workflow', v_alcada.exige_workflow,
    'observacao_obrigatoria', v_alcada.observacao_obrigatoria,
    'valor_avaliado', v_valor
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sup_alcada_avaliar(text,uuid,text,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_alcada_avaliar(text,uuid,text,numeric) TO authenticated;

-- =====================================================================
-- 2) rpc_sup_alcada_registrar_decisao
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_sup_alcada_registrar_decisao(
  p_entidade_tipo text,
  p_entidade_id   uuid,
  p_etapa         text,
  p_decisao       text,
  p_alcada_id     uuid DEFAULT NULL,
  p_motivo        text DEFAULT NULL,
  p_observacao    text DEFAULT NULL,
  p_valor_avaliado numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_alcada record;
  v_id uuid;
  v_ok boolean := false;
  v_perm text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF p_decisao NOT IN ('APROVADO','REPROVADO','RETORNADO') THEN
    RAISE EXCEPTION 'Decisão inválida: %', p_decisao USING ERRCODE='22023';
  END IF;
  IF p_decisao <> 'APROVADO' AND (p_motivo IS NULL OR length(trim(p_motivo)) < 5) THEN
    RAISE EXCEPTION 'Motivo é obrigatório (mínimo 5 caracteres) para reprovação ou retorno' USING ERRCODE='22023';
  END IF;

  -- Carrega alçada (se informada)
  IF p_alcada_id IS NOT NULL THEN
    SELECT * INTO v_alcada FROM public.suprimentos_alcadas WHERE id = p_alcada_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Alçada % não encontrada', p_alcada_id USING ERRCODE='22023';
    END IF;
    IF v_alcada.observacao_obrigatoria AND (p_observacao IS NULL OR length(trim(p_observacao)) < 3) THEN
      RAISE EXCEPTION 'Observação obrigatória pela alçada %', v_alcada.nome USING ERRCODE='22023';
    END IF;

    -- Valida permissão do aprovador
    IF v_alcada.aprovador_tipo = 'PERMISSAO' THEN
      v_perm := v_alcada.aprovador_valor;
      BEGIN
        v_ok := public.has_permission(v_user, v_perm::public.app_permission);
      EXCEPTION WHEN OTHERS THEN
        v_ok := false;
      END;
    ELSE
      BEGIN
        v_ok := public.has_role(v_user, v_alcada.aprovador_valor::public.app_role);
      EXCEPTION WHEN OTHERS THEN
        v_ok := false;
      END;
    END IF;

    IF NOT v_ok
       AND NOT public.has_role(v_user, 'admin_master'::public.app_role)
       AND NOT public.has_role(v_user, 'admin_geral'::public.app_role) THEN
      RAISE EXCEPTION 'Usuário não possui % "%" exigido pela alçada %',
        v_alcada.aprovador_tipo, v_alcada.aprovador_valor, v_alcada.nome
        USING ERRCODE='42501';
    END IF;
  ELSE
    -- Sem alçada explícita: exige permissão genérica 'suprimentos.alcada.aplicar'
    IF NOT public.has_permission(v_user, 'suprimentos.alcada.aplicar'::public.app_permission)
       AND NOT public.has_role(v_user, 'admin_master'::public.app_role)
       AND NOT public.has_role(v_user, 'admin_geral'::public.app_role) THEN
      RAISE EXCEPTION 'Usuário sem permissão para aplicar decisão sem alçada vinculada' USING ERRCODE='42501';
    END IF;
  END IF;

  INSERT INTO public.suprimentos_alcadas_aplicadas (
    entidade_tipo, entidade_id, alcada_id, alcada_nome, etapa, decisao,
    aprovador_user_id, aprovador_permissao, valor_avaliado, motivo, observacao
  ) VALUES (
    p_entidade_tipo, p_entidade_id,
    NULLIF(p_alcada_id, NULL),
    COALESCE(v_alcada.nome, '(sem alçada)'),
    p_etapa, p_decisao,
    v_user, COALESCE(v_alcada.aprovador_valor, NULL), p_valor_avaliado, p_motivo, p_observacao
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sup_alcada_registrar_decisao(text,uuid,text,text,uuid,text,text,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_alcada_registrar_decisao(text,uuid,text,text,uuid,text,text,numeric) TO authenticated;

-- =====================================================================
-- 3) rpc_sup_pedido_preparar_financeiro
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_preparar_financeiro(
  p_pedido_id uuid,
  p_payload   jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pedido record;
  v_condicao text;
  v_data date;
  v_doc text;
  v_valor numeric;
  v_obs text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_user, 'suprimentos.pedido.preparar_financeiro'::public.app_permission)
     AND NOT public.has_role(v_user, 'admin_master'::public.app_role)
     AND NOT public.has_role(v_user, 'admin_geral'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para preparar pedido para financeiro' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_pedido FROM public.suprimentos_pedidos_compra WHERE id = p_pedido_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', p_pedido_id USING ERRCODE='22023';
  END IF;
  IF v_pedido.fornecedor_id IS NULL THEN
    RAISE EXCEPTION 'Pedido sem fornecedor: aprove cotação antes' USING ERRCODE='22023';
  END IF;
  IF v_pedido.centro_custo_id IS NULL OR v_pedido.centro_resultado_id IS NULL THEN
    RAISE EXCEPTION 'Pedido sem Centro de Custo/Resultado: corrija a requisição de origem' USING ERRCODE='22023';
  END IF;
  IF v_pedido.status_financeiro IN ('GERADO','CANCELADO') THEN
    RAISE EXCEPTION 'Pedido em status financeiro % não pode ser preparado novamente', v_pedido.status_financeiro USING ERRCODE='22023';
  END IF;

  v_condicao := COALESCE(NULLIF(p_payload->>'condicao_pagamento',''), v_pedido.condicao_pagamento);
  v_data     := COALESCE((p_payload->>'data_prevista_pagamento')::date, v_pedido.data_prevista_pagamento);
  v_doc      := COALESCE(NULLIF(p_payload->>'documento_fiscal',''), v_pedido.documento_fiscal);
  v_valor    := COALESCE((p_payload->>'valor_aprovado_final')::numeric, v_pedido.valor_aprovado_final, v_pedido.valor_total);
  v_obs      := COALESCE(NULLIF(p_payload->>'financeiro_observacao',''), v_pedido.financeiro_observacao);

  IF v_condicao IS NULL OR length(trim(v_condicao)) = 0 THEN
    RAISE EXCEPTION 'Condição de pagamento é obrigatória' USING ERRCODE='22023';
  END IF;
  IF v_data IS NULL THEN
    RAISE EXCEPTION 'Data prevista de pagamento é obrigatória' USING ERRCODE='22023';
  END IF;
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor aprovado final deve ser positivo' USING ERRCODE='22023';
  END IF;

  PERFORM set_config('app.via_sup_compras_rpc','true', true);

  UPDATE public.suprimentos_pedidos_compra
     SET condicao_pagamento      = v_condicao,
         data_prevista_pagamento = v_data,
         documento_fiscal        = v_doc,
         valor_aprovado_final    = v_valor,
         financeiro_observacao   = v_obs,
         status_financeiro       = 'PRONTO_PARA_FINANCEIRO',
         financeiro_bloqueio_motivo = NULL,
         atualizado_em           = now()
   WHERE id = p_pedido_id;

  RETURN p_pedido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sup_pedido_preparar_financeiro(uuid,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_preparar_financeiro(uuid,jsonb) TO authenticated;

-- =====================================================================
-- 4) rpc_sup_pedido_bloquear_financeiro
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_bloquear_financeiro(
  p_pedido_id uuid,
  p_motivo    text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_user, 'suprimentos.pedido.bloquear_financeiro'::public.app_permission)
     AND NOT public.has_role(v_user, 'admin_master'::public.app_role)
     AND NOT public.has_role(v_user, 'admin_geral'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para bloquear pedido no financeiro' USING ERRCODE='42501';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)' USING ERRCODE='22023';
  END IF;

  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_pedidos_compra
     SET status_financeiro='BLOQUEADO',
         financeiro_bloqueio_motivo=p_motivo,
         atualizado_em=now()
   WHERE id=p_pedido_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', p_pedido_id USING ERRCODE='22023';
  END IF;
  RETURN p_pedido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sup_pedido_bloquear_financeiro(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_bloquear_financeiro(uuid,text) TO authenticated;

-- =====================================================================
-- 5) rpc_sup_pedido_desbloquear_financeiro
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_desbloquear_financeiro(
  p_pedido_id uuid,
  p_motivo    text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_user, 'suprimentos.pedido.bloquear_financeiro'::public.app_permission)
     AND NOT public.has_role(v_user, 'admin_master'::public.app_role)
     AND NOT public.has_role(v_user, 'admin_geral'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para desbloquear pedido' USING ERRCODE='42501';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)' USING ERRCODE='22023';
  END IF;

  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_pedidos_compra
     SET status_financeiro = CASE
            WHEN condicao_pagamento IS NOT NULL AND data_prevista_pagamento IS NOT NULL
                 AND valor_aprovado_final IS NOT NULL
            THEN 'PRONTO_PARA_FINANCEIRO' ELSE 'NAO_GERADO' END,
         financeiro_bloqueio_motivo = NULL,
         financeiro_observacao = COALESCE(financeiro_observacao,'') || E'\n[Desbloqueio] ' || p_motivo,
         atualizado_em = now()
   WHERE id=p_pedido_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', p_pedido_id USING ERRCODE='22023';
  END IF;
  RETURN p_pedido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sup_pedido_desbloquear_financeiro(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_desbloquear_financeiro(uuid,text) TO authenticated;