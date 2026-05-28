
-- ============================================================
-- Onda F2 — RPCs oficiais de Operações Financeiras
-- ============================================================

-- 1) Ampliar CHECK de origem_tipo em titulos_financeiros
ALTER TABLE public.titulos_financeiros DROP CONSTRAINT IF EXISTS titulos_financeiros_origem_tipo_check;
ALTER TABLE public.titulos_financeiros ADD CONSTRAINT titulos_financeiros_origem_tipo_check
  CHECK (origem_tipo = ANY (ARRAY[
    'contrato','projeto','pedido_venda','obra','cliente','fornecedor',
    'aditivo','estoque','manual_controlado','renegociacao','OPERACAO_FINANCEIRA'
  ]));

-- 2) Helper interno: registra evento append-only
CREATE OR REPLACE FUNCTION public.fn_op_fin_log_evento(
  _op_id uuid, _evento text, _motivo text, _detalhes jsonb
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.operacoes_financeiras_eventos (operacao_id, evento, detalhes, motivo, ator)
  VALUES (_op_id, _evento, COALESCE(_detalhes,'{}'::jsonb), _motivo, auth.uid());
$$;
REVOKE ALL ON FUNCTION public.fn_op_fin_log_evento(uuid,text,text,jsonb) FROM PUBLIC, anon;

-- =====================================================================
-- 3) rpc_op_fin_criar
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_op_fin_criar(
  _request_id uuid,
  _payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idem jsonb;
  v_id uuid;
  v_tipo op_fin_tipo;
  v_natureza_caixa op_fin_natureza_caixa;
  v_valor numeric;
  v_qtd int;
  v_codigo text;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.criar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: operacao_financeira.criar' USING ERRCODE='42501';
  END IF;

  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_criar',_payload);
  IF (v_idem->>'cached')::boolean THEN RETURN v_idem->'resultado'; END IF;

  v_tipo := (_payload->>'tipo')::op_fin_tipo;
  v_natureza_caixa := (_payload->>'natureza_caixa')::op_fin_natureza_caixa;
  v_valor := (_payload->>'valor_total')::numeric;
  v_qtd := COALESCE((_payload->>'qtd_parcelas')::int, 1);

  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'valor_total inválido';
  END IF;
  IF _payload->>'natureza_id' IS NULL OR _payload->>'centro_resultado_id' IS NULL OR _payload->>'conta_id' IS NULL THEN
    RAISE EXCEPTION 'natureza_id, centro_resultado_id e conta_id são obrigatórios';
  END IF;
  IF COALESCE(_payload->>'finalidade','') = '' THEN
    RAISE EXCEPTION 'finalidade/motivo é obrigatório';
  END IF;

  v_codigo := 'OF-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

  INSERT INTO public.operacoes_financeiras (
    codigo, tipo, status, natureza_caixa,
    cliente_id, fornecedor_id, colaborador_user_id, colaborador_nome,
    socio_nome, terceiro_nome, terceiro_documento,
    valor_total, data_operacao, finalidade, observacoes,
    qtd_parcelas, forma_baixa,
    natureza_id, centro_resultado_id, conta_id,
    banco_contrato, juros_pct, instituicao, competencia,
    created_by
  ) VALUES (
    v_codigo, v_tipo, 'RASCUNHO', v_natureza_caixa,
    NULLIF(_payload->>'cliente_id','')::uuid,
    NULLIF(_payload->>'fornecedor_id','')::uuid,
    NULLIF(_payload->>'colaborador_user_id','')::uuid,
    NULLIF(_payload->>'colaborador_nome',''),
    NULLIF(_payload->>'socio_nome',''),
    NULLIF(_payload->>'terceiro_nome',''),
    NULLIF(_payload->>'terceiro_documento',''),
    v_valor,
    COALESCE((_payload->>'data_operacao')::date, current_date),
    _payload->>'finalidade',
    _payload->>'observacoes',
    v_qtd,
    NULLIF(_payload->>'forma_baixa','')::op_fin_forma_baixa,
    (_payload->>'natureza_id')::uuid,
    (_payload->>'centro_resultado_id')::uuid,
    (_payload->>'conta_id')::uuid,
    _payload->>'banco_contrato',
    NULLIF(_payload->>'juros_pct','')::numeric,
    _payload->>'instituicao',
    NULLIF(_payload->>'competencia','')::date,
    auth.uid()
  ) RETURNING id INTO v_id;

  PERFORM public.fn_op_fin_log_evento(v_id,'CRIADA',_payload->>'finalidade',
    jsonb_build_object('codigo',v_codigo,'tipo',v_tipo,'valor',v_valor));

  v_idem := jsonb_build_object('id',v_id,'codigo',v_codigo,'status','RASCUNHO');
  PERFORM public.rpc_idempotente_commit(_request_id, v_idem);
  RETURN v_idem;
END $$;
REVOKE ALL ON FUNCTION public.rpc_op_fin_criar(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_criar(uuid,jsonb) TO authenticated;

-- =====================================================================
-- 4) rpc_op_fin_gerar_parcelas
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_op_fin_gerar_parcelas(
  _request_id uuid,
  _operacao_id uuid,
  _vencimento_primeiro date,
  _intervalo_dias int DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idem jsonb;
  v_op public.operacoes_financeiras%ROWTYPE;
  v_qtd int; v_valor numeric; v_parcela numeric; v_resto numeric; v_i int;
  v_total numeric := 0;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.criar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;

  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_gerar_parcelas',
    jsonb_build_object('op',_operacao_id,'venc',_vencimento_primeiro,'int',_intervalo_dias));
  IF (v_idem->>'cached')::boolean THEN RETURN v_idem->'resultado'; END IF;

  SELECT * INTO v_op FROM public.operacoes_financeiras WHERE id=_operacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operação não encontrada'; END IF;
  IF v_op.status NOT IN ('RASCUNHO','EM_APROVACAO') THEN
    RAISE EXCEPTION 'Parcelas só podem ser geradas em RASCUNHO/EM_APROVACAO (atual %)', v_op.status;
  END IF;

  IF EXISTS (SELECT 1 FROM public.operacoes_financeiras_parcelas WHERE operacao_id=_operacao_id) THEN
    DELETE FROM public.operacoes_financeiras_parcelas
      WHERE operacao_id=_operacao_id AND titulo_id IS NULL;
    IF EXISTS (SELECT 1 FROM public.operacoes_financeiras_parcelas WHERE operacao_id=_operacao_id) THEN
      RAISE EXCEPTION 'Já existem parcelas com títulos vinculados; cancele/estornar antes';
    END IF;
  END IF;

  v_qtd := v_op.qtd_parcelas; v_valor := v_op.valor_total;
  IF v_op.tipo IN ('APORTE_CAPITAL','EMPRESTIMO_SOCIO_EMPRESA') AND v_qtd <> 1 THEN
    RAISE EXCEPTION '% aceita apenas 1 parcela', v_op.tipo;
  END IF;

  v_parcela := round(v_valor / v_qtd, 2);
  v_resto := v_valor - (v_parcela * v_qtd);

  FOR v_i IN 1..v_qtd LOOP
    INSERT INTO public.operacoes_financeiras_parcelas (operacao_id,numero,valor,vencimento)
    VALUES (
      _operacao_id, v_i,
      CASE WHEN v_i = v_qtd THEN v_parcela + v_resto ELSE v_parcela END,
      _vencimento_primeiro + ((v_i-1) * _intervalo_dias)
    );
    v_total := v_total + CASE WHEN v_i=v_qtd THEN v_parcela+v_resto ELSE v_parcela END;
  END LOOP;

  IF round(v_total,2) <> round(v_valor,2) THEN
    RAISE EXCEPTION 'Soma das parcelas (%) difere do valor_total (%)', v_total, v_valor;
  END IF;

  PERFORM public.fn_op_fin_log_evento(_operacao_id,'PARCELAS_GERADAS',NULL,
    jsonb_build_object('qtd',v_qtd,'total',v_total));

  v_idem := jsonb_build_object('operacao_id',_operacao_id,'qtd',v_qtd,'total',v_total);
  PERFORM public.rpc_idempotente_commit(_request_id, v_idem);
  RETURN v_idem;
END $$;
REVOKE ALL ON FUNCTION public.rpc_op_fin_gerar_parcelas(uuid,uuid,date,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_gerar_parcelas(uuid,uuid,date,int) TO authenticated;

-- =====================================================================
-- 5) rpc_op_fin_aprovar
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_op_fin_aprovar(
  _request_id uuid, _operacao_id uuid, _observacao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_idem jsonb; v_st op_fin_status;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.aprovar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: operacao_financeira.aprovar' USING ERRCODE='42501';
  END IF;
  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_aprovar',
    jsonb_build_object('op',_operacao_id));
  IF (v_idem->>'cached')::boolean THEN RETURN v_idem->'resultado'; END IF;

  SELECT status INTO v_st FROM public.operacoes_financeiras WHERE id=_operacao_id FOR UPDATE;
  IF v_st IS NULL THEN RAISE EXCEPTION 'Operação não encontrada'; END IF;
  IF v_st = 'APROVADA' THEN RAISE EXCEPTION 'Operação já está APROVADA'; END IF;
  IF v_st NOT IN ('RASCUNHO','EM_APROVACAO') THEN
    RAISE EXCEPTION 'Aprovação inválida no estado %', v_st;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.operacoes_financeiras_parcelas WHERE operacao_id=_operacao_id) THEN
    RAISE EXCEPTION 'Gere as parcelas antes de aprovar';
  END IF;

  PERFORM set_config('app.via_op_fin_rpc','true',true);
  UPDATE public.operacoes_financeiras SET status='APROVADA' WHERE id=_operacao_id;

  PERFORM public.fn_op_fin_log_evento(_operacao_id,'APROVADA',_observacao,
    jsonb_build_object('aprovador',auth.uid(),'em',now()));

  v_idem := jsonb_build_object('operacao_id',_operacao_id,'status','APROVADA');
  PERFORM public.rpc_idempotente_commit(_request_id,v_idem);
  RETURN v_idem;
END $$;
REVOKE ALL ON FUNCTION public.rpc_op_fin_aprovar(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_aprovar(uuid,uuid,text) TO authenticated;

-- =====================================================================
-- 6) rpc_op_fin_liberar — gera títulos financeiros
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_op_fin_liberar(
  _request_id uuid, _operacao_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idem jsonb; v_op public.operacoes_financeiras%ROWTYPE;
  v_p record; v_tipo_titulo text; v_titulo_id uuid;
  v_codigo text; v_count int := 0;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.liberar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: operacao_financeira.liberar' USING ERRCODE='42501';
  END IF;
  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_liberar',
    jsonb_build_object('op',_operacao_id));
  IF (v_idem->>'cached')::boolean THEN RETURN v_idem->'resultado'; END IF;

  SELECT * INTO v_op FROM public.operacoes_financeiras WHERE id=_operacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operação não encontrada'; END IF;
  IF v_op.status <> 'APROVADA' THEN
    RAISE EXCEPTION 'Liberação exige status APROVADA (atual %)', v_op.status;
  END IF;

  -- ENTRADA no caixa => empresa RECEBE => título "receber"; SAIDA => título "pagar"
  v_tipo_titulo := CASE WHEN v_op.natureza_caixa = 'ENTRADA' THEN 'receber' ELSE 'pagar' END;

  FOR v_p IN
    SELECT * FROM public.operacoes_financeiras_parcelas
    WHERE operacao_id = _operacao_id ORDER BY numero
  LOOP
    IF v_p.titulo_id IS NOT NULL THEN CONTINUE; END IF;

    v_codigo := v_op.codigo || '/' || v_p.numero;

    INSERT INTO public.titulos_financeiros (
      codigo, tipo, origem_tipo, origem_id,
      cliente_id, centro_id, conta_id,
      valor_bruto, valor_liquido, saldo,
      competencia, vencimento, status,
      observacoes, natureza_id, fornecedor_id, created_by,
      dados
    ) VALUES (
      v_codigo, v_tipo_titulo, 'OPERACAO_FINANCEIRA', _operacao_id,
      v_op.cliente_id, v_op.centro_resultado_id, v_op.conta_id,
      v_p.valor, v_p.valor, v_p.valor,
      COALESCE(v_op.competencia, v_p.vencimento), v_p.vencimento, 'PENDENTE',
      COALESCE(v_op.finalidade, v_op.observacoes),
      v_op.natureza_id, v_op.fornecedor_id, auth.uid(),
      jsonb_build_object(
        'origem','OPERACAO_FINANCEIRA',
        'operacao_id', _operacao_id,
        'parcela_id', v_p.id,
        'parcela_numero', v_p.numero,
        'op_tipo', v_op.tipo
      )
    ) RETURNING id INTO v_titulo_id;

    UPDATE public.operacoes_financeiras_parcelas SET titulo_id=v_titulo_id WHERE id=v_p.id;
    v_count := v_count + 1;
  END LOOP;

  PERFORM set_config('app.via_op_fin_rpc','true',true);
  UPDATE public.operacoes_financeiras SET status='LIBERADA' WHERE id=_operacao_id;

  PERFORM public.fn_op_fin_log_evento(_operacao_id,'LIBERADA',NULL,
    jsonb_build_object('titulos_gerados',v_count,'tipo_titulo',v_tipo_titulo));

  v_idem := jsonb_build_object('operacao_id',_operacao_id,'titulos_gerados',v_count);
  PERFORM public.rpc_idempotente_commit(_request_id,v_idem);
  RETURN v_idem;
END $$;
REVOKE ALL ON FUNCTION public.rpc_op_fin_liberar(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_liberar(uuid,uuid) TO authenticated;

-- =====================================================================
-- 7) rpc_op_fin_renegociar
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_op_fin_renegociar(
  _request_id uuid,
  _operacao_origem_id uuid,
  _payload jsonb,
  _motivo text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idem jsonb; v_orig public.operacoes_financeiras%ROWTYPE;
  v_nova jsonb; v_nova_id uuid;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.renegociar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: operacao_financeira.renegociar' USING ERRCODE='42501';
  END IF;
  IF COALESCE(_motivo,'')='' OR length(_motivo) < 5 THEN
    RAISE EXCEPTION 'Motivo é obrigatório (mín. 5 chars)';
  END IF;
  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_renegociar',
    jsonb_build_object('o',_operacao_origem_id,'m',_motivo));
  IF (v_idem->>'cached')::boolean THEN RETURN v_idem->'resultado'; END IF;

  SELECT * INTO v_orig FROM public.operacoes_financeiras WHERE id=_operacao_origem_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operação origem não encontrada'; END IF;
  IF v_orig.status NOT IN ('LIBERADA','EM_PAGAMENTO') THEN
    RAISE EXCEPTION 'Só é possível renegociar LIBERADA ou EM_PAGAMENTO (atual %)', v_orig.status;
  END IF;

  -- Cria nova operação (RASCUNHO) com referência à origem.
  v_nova := public.rpc_op_fin_criar(
    gen_random_uuid(),
    _payload || jsonb_build_object('finalidade', COALESCE(_payload->>'finalidade','Renegociação: '||_motivo))
  );
  v_nova_id := (v_nova->>'id')::uuid;
  UPDATE public.operacoes_financeiras SET renegociacao_de=_operacao_origem_id WHERE id=v_nova_id;

  -- Marca origem como RENEGOCIADA (preserva histórico).
  PERFORM set_config('app.via_op_fin_rpc','true',true);
  UPDATE public.operacoes_financeiras SET status='RENEGOCIADA' WHERE id=_operacao_origem_id;

  PERFORM public.fn_op_fin_log_evento(_operacao_origem_id,'RENEGOCIADA',_motivo,
    jsonb_build_object('nova_operacao_id',v_nova_id));
  PERFORM public.fn_op_fin_log_evento(v_nova_id,'CRIADA',_motivo,
    jsonb_build_object('renegociacao_de',_operacao_origem_id));

  v_idem := jsonb_build_object('origem',_operacao_origem_id,'nova',v_nova_id);
  PERFORM public.rpc_idempotente_commit(_request_id,v_idem);
  RETURN v_idem;
END $$;
REVOKE ALL ON FUNCTION public.rpc_op_fin_renegociar(uuid,uuid,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_renegociar(uuid,uuid,jsonb,text) TO authenticated;

-- =====================================================================
-- 8) rpc_op_fin_cancelar
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_op_fin_cancelar(
  _request_id uuid, _operacao_id uuid, _motivo text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_idem jsonb; v_st op_fin_status; v_baixados int;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.cancelar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  IF COALESCE(_motivo,'')='' OR length(_motivo) < 5 THEN
    RAISE EXCEPTION 'Motivo é obrigatório (mín. 5 chars)';
  END IF;
  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_cancelar',
    jsonb_build_object('op',_operacao_id,'m',_motivo));
  IF (v_idem->>'cached')::boolean THEN RETURN v_idem->'resultado'; END IF;

  SELECT status INTO v_st FROM public.operacoes_financeiras WHERE id=_operacao_id FOR UPDATE;
  IF v_st IS NULL THEN RAISE EXCEPTION 'Operação não encontrada'; END IF;
  IF v_st IN ('CANCELADA','QUITADA','RENEGOCIADA') THEN
    RAISE EXCEPTION 'Não é possível cancelar em estado %', v_st;
  END IF;

  -- Bloqueia se houver título com baixa (saldo < valor_bruto) e ainda não cancelado.
  SELECT COUNT(*) INTO v_baixados
  FROM public.titulos_financeiros t
  JOIN public.operacoes_financeiras_parcelas p ON p.titulo_id = t.id
  WHERE p.operacao_id = _operacao_id
    AND t.status NOT IN ('CANCELADO','RENEGOCIADO')
    AND t.saldo < t.valor_bruto;
  IF v_baixados > 0 THEN
    RAISE EXCEPTION 'Existem % título(s) com baixa pendente de estorno. Estorne primeiro.', v_baixados;
  END IF;

  -- Cancela títulos ainda PENDENTES vinculados.
  UPDATE public.titulos_financeiros t
  SET status='CANCELADO', cancelado_em=now(), motivo_cancelamento=_motivo
  WHERE t.id IN (
    SELECT p.titulo_id FROM public.operacoes_financeiras_parcelas p
    WHERE p.operacao_id=_operacao_id AND p.titulo_id IS NOT NULL
  ) AND t.status='PENDENTE';

  PERFORM set_config('app.via_op_fin_rpc','true',true);
  UPDATE public.operacoes_financeiras SET status='CANCELADA' WHERE id=_operacao_id;

  PERFORM public.fn_op_fin_log_evento(_operacao_id,'CANCELADA',_motivo,'{}'::jsonb);

  v_idem := jsonb_build_object('operacao_id',_operacao_id,'status','CANCELADA');
  PERFORM public.rpc_idempotente_commit(_request_id,v_idem);
  RETURN v_idem;
END $$;
REVOKE ALL ON FUNCTION public.rpc_op_fin_cancelar(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_cancelar(uuid,uuid,text) TO authenticated;

-- =====================================================================
-- 9) rpc_op_fin_estornar_recebimento
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_op_fin_estornar_recebimento(
  _request_id uuid, _titulo_id uuid, _motivo text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idem jsonb; v_op_id uuid; v_origem text;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.estornar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  IF COALESCE(_motivo,'')='' OR length(_motivo) < 5 THEN
    RAISE EXCEPTION 'Motivo é obrigatório (mín. 5 chars)';
  END IF;
  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_estornar_recebimento',
    jsonb_build_object('t',_titulo_id,'m',_motivo));
  IF (v_idem->>'cached')::boolean THEN RETURN v_idem->'resultado'; END IF;

  SELECT origem_tipo, origem_id INTO v_origem, v_op_id
  FROM public.titulos_financeiros WHERE id=_titulo_id;
  IF v_op_id IS NULL THEN RAISE EXCEPTION 'Título não encontrado'; END IF;
  IF v_origem <> 'OPERACAO_FINANCEIRA' THEN
    RAISE EXCEPTION 'Título não pertence a Operação Financeira (origem=%)', v_origem;
  END IF;

  PERFORM public.fn_op_fin_log_evento(v_op_id,'ESTORNADA',_motivo,
    jsonb_build_object('titulo_id',_titulo_id,'em',now(),'ator',auth.uid()));

  v_idem := jsonb_build_object('titulo_id',_titulo_id,'operacao_id',v_op_id,'estornado',true);
  PERFORM public.rpc_idempotente_commit(_request_id,v_idem);
  RETURN v_idem;
END $$;
REVOKE ALL ON FUNCTION public.rpc_op_fin_estornar_recebimento(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_estornar_recebimento(uuid,uuid,text) TO authenticated;
