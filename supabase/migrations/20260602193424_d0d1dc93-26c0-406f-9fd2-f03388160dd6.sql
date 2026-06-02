
CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_gerar_titulo_ap(
  p_pedido_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_ped       record;
  v_req       record;
  v_titulo_id uuid;
  v_codigo    text;
  v_valor     numeric;
  v_venc      date;
  v_comp      date;
  v_natureza  uuid;
  v_cc        uuid;
  v_cr        uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;

  IF NOT public.has_permission(v_user, 'suprimentos.pedido.gerar_titulo_ap'::public.app_permission)
     AND NOT public.has_role(v_user, 'admin_master'::public.app_role)
     AND NOT public.has_role(v_user, 'admin_geral'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para gerar Conta a Pagar' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_ped
    FROM public.suprimentos_pedidos_compra
   WHERE id = p_pedido_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', p_pedido_id USING ERRCODE='22023';
  END IF;

  IF v_ped.titulo_ap_id IS NOT NULL THEN
    SELECT codigo INTO v_codigo FROM public.titulos_financeiros WHERE id = v_ped.titulo_ap_id;
    RETURN jsonb_build_object('titulo_id', v_ped.titulo_ap_id, 'codigo', v_codigo, 'criado_agora', false);
  END IF;

  IF v_ped.status::text = 'CANCELADO' THEN
    RAISE EXCEPTION 'Pedido cancelado: não é possível gerar título' USING ERRCODE='22023';
  END IF;
  IF v_ped.status_financeiro <> 'PRONTO_PARA_FINANCEIRO' THEN
    RAISE EXCEPTION 'Pedido não está PRONTO_PARA_FINANCEIRO (atual: %)', v_ped.status_financeiro USING ERRCODE='22023';
  END IF;

  IF v_ped.fornecedor_id IS NULL THEN
    RAISE EXCEPTION 'Pedido sem fornecedor' USING ERRCODE='22023';
  END IF;

  SELECT natureza_id, centro_custo_id, centro_resultado_id INTO v_req
    FROM public.suprimentos_requisicoes WHERE id = v_ped.requisicao_id;

  v_natureza := v_req.natureza_id;
  v_cc       := COALESCE(v_ped.centro_custo_id,     v_req.centro_custo_id);
  v_cr       := COALESCE(v_ped.centro_resultado_id, v_req.centro_resultado_id);

  IF v_cc IS NULL OR v_cr IS NULL THEN
    RAISE EXCEPTION 'Pedido/requisição sem Centro de Custo/Resultado' USING ERRCODE='22023';
  END IF;
  IF v_natureza IS NULL THEN
    RAISE EXCEPTION 'Requisição sem natureza financeira: corrija a requisição de origem' USING ERRCODE='22023';
  END IF;

  v_valor := COALESCE(v_ped.valor_aprovado_final, v_ped.valor_total);
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor do título inválido' USING ERRCODE='22023';
  END IF;
  v_venc := v_ped.data_prevista_pagamento;
  IF v_venc IS NULL THEN
    RAISE EXCEPTION 'Vencimento (data_prevista_pagamento) não informado' USING ERRCODE='22023';
  END IF;
  v_comp := date_trunc('month', v_venc)::date;

  INSERT INTO public.titulos_financeiros (
    tipo, origem_tipo, origem_id,
    fornecedor_id, natureza_id, centro_id,
    consultor_id, created_by,
    valor_bruto, valor_liquido, saldo,
    competencia, vencimento, forma_pagamento,
    tipo_documento, numero_documento,
    observacoes, dados
  ) VALUES (
    'pagar', 'pedido_compra', p_pedido_id,
    v_ped.fornecedor_id, v_natureza, v_cr,
    v_user, v_user,
    v_valor, v_valor, v_valor,
    v_comp, v_venc, v_ped.condicao_pagamento,
    CASE WHEN v_ped.documento_fiscal IS NOT NULL THEN 'NF' END,
    v_ped.documento_fiscal,
    'Pedido de Compra #' || v_ped.numero::text,
    jsonb_build_object(
      'pedido_id', p_pedido_id, 'pedido_numero', v_ped.numero,
      'requisicao_id', v_ped.requisicao_id, 'cotacao_id', v_ped.cotacao_id,
      'os_id', v_ped.os_id, 'obra_id', v_ped.obra_id, 'projeto_id', v_ped.projeto_id,
      'centro_custo_id', v_cc, 'centro_resultado_id', v_cr,
      'condicao_pagamento', v_ped.condicao_pagamento,
      'gerado_em', now(), 'gerado_por', v_user
    )
  )
  RETURNING id, codigo INTO v_titulo_id, v_codigo;

  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_pedidos_compra
     SET titulo_ap_id      = v_titulo_id,
         status_financeiro = 'GERADO',
         atualizado_em     = now()
   WHERE id = p_pedido_id;

  INSERT INTO public.suprimentos_pedido_eventos (pedido_id, tipo_evento, observacao, payload)
  VALUES (
    p_pedido_id, 'TITULO_AP_GERADO',
    'Título a pagar gerado: ' || COALESCE(v_codigo, v_titulo_id::text),
    jsonb_build_object('titulo_id', v_titulo_id, 'codigo', v_codigo,
                       'valor', v_valor, 'vencimento', v_venc)
  );

  RETURN jsonb_build_object('titulo_id', v_titulo_id, 'codigo', v_codigo, 'criado_agora', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_sup_pedido_gerar_titulo_ap(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_gerar_titulo_ap(uuid) TO authenticated;

-- View de alerta (deriva natureza/CC/CR da requisição quando ausentes no pedido)
CREATE OR REPLACE VIEW public.v_sup_pedidos_prontos_financeiro
WITH (security_invoker = on)
AS
SELECT
  p.id                          AS pedido_id,
  p.numero                      AS pedido_numero,
  p.fornecedor_id,
  f.nome                        AS fornecedor_nome,
  COALESCE(p.valor_aprovado_final, p.valor_total) AS valor,
  p.data_prevista_pagamento     AS vencimento_previsto,
  p.condicao_pagamento,
  p.documento_fiscal,
  COALESCE(r.natureza_id)                                  AS natureza_id,
  n.codigo                      AS natureza_codigo,
  n.nome                        AS natureza_nome,
  COALESCE(p.centro_custo_id, r.centro_custo_id)           AS centro_custo_id,
  cc.codigo                     AS cc_codigo,
  cc.nome                       AS cc_nome,
  COALESCE(p.centro_resultado_id, r.centro_resultado_id)   AS centro_resultado_id,
  cr.codigo                     AS cr_codigo,
  cr.nome                       AS cr_nome,
  p.os_id, p.obra_id, p.projeto_id, p.requisicao_id, p.cotacao_id,
  p.atualizado_em
FROM public.suprimentos_pedidos_compra p
LEFT JOIN public.suprimentos_requisicoes r ON r.id = p.requisicao_id
LEFT JOIN public.fornecedores        f  ON f.id  = p.fornecedor_id
LEFT JOIN public.naturezas_financeiras n ON n.id = r.natureza_id
LEFT JOIN public.centros_custo       cc ON cc.id = COALESCE(p.centro_custo_id, r.centro_custo_id)
LEFT JOIN public.centros_resultado   cr ON cr.id = COALESCE(p.centro_resultado_id, r.centro_resultado_id)
WHERE p.deleted_at IS NULL
  AND p.status_financeiro = 'PRONTO_PARA_FINANCEIRO';

GRANT SELECT ON public.v_sup_pedidos_prontos_financeiro TO authenticated;
