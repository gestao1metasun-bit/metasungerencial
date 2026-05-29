-- Onda F2.1 — Competência e observação por parcela em Operações Financeiras
-- D18 Contábil-Ready: rastreabilidade por parcela + título herda competência/observação da parcela.

-- 1) Schema: novas colunas em operacoes_financeiras_parcelas
ALTER TABLE public.operacoes_financeiras_parcelas
  ADD COLUMN IF NOT EXISTS competencia DATE,
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS status_integracao TEXT NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS hash_integracao TEXT;

ALTER TABLE public.operacoes_financeiras_parcelas
  DROP CONSTRAINT IF EXISTS op_fin_parc_status_integracao_chk;
ALTER TABLE public.operacoes_financeiras_parcelas
  ADD CONSTRAINT op_fin_parc_status_integracao_chk
  CHECK (status_integracao IN ('PENDENTE','EXPORTADO','INTEGRADO','ERRO','CANCELADO'));

-- Backfill competência a partir do vencimento (1º dia do mês)
UPDATE public.operacoes_financeiras_parcelas
   SET competencia = date_trunc('month', vencimento)::date
 WHERE competencia IS NULL;

-- A partir daqui, competência passa a ser obrigatória (mas a coluna pode ficar nullable
-- por compat; RPCs garantem preenchimento).

-- 2) RPC gerar_parcelas — aceita opcionalmente uma grade explícita por parcela
CREATE OR REPLACE FUNCTION public.rpc_op_fin_gerar_parcelas(
  _request_id uuid,
  _operacao_id uuid,
  _vencimento_primeiro date,
  _intervalo_dias integer DEFAULT 30,
  _parcelas jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_idem jsonb;
  v_op public.operacoes_financeiras%ROWTYPE;
  v_qtd int; v_valor numeric; v_parcela numeric; v_resto numeric; v_i int;
  v_total numeric := 0;
  v_item jsonb; v_arr_qtd int;
  v_venc date; v_comp date; v_obs text; v_val numeric;
BEGIN
  IF NOT public.has_permission(auth.uid(),'operacao_financeira.criar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;

  v_idem := public.rpc_idempotente_check(_request_id,'rpc_op_fin_gerar_parcelas',
    jsonb_build_object('op',_operacao_id,'venc',_vencimento_primeiro,'int',_intervalo_dias,'parc',_parcelas));
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

  IF _parcelas IS NOT NULL AND jsonb_typeof(_parcelas) = 'array' THEN
    -- Modo grade explícita: cada item {numero,valor,vencimento,competencia,observacao}
    v_arr_qtd := jsonb_array_length(_parcelas);
    IF v_arr_qtd <> v_qtd THEN
      RAISE EXCEPTION 'Grade enviada (%) difere de qtd_parcelas (%)', v_arr_qtd, v_qtd;
    END IF;

    FOR v_i IN 0..v_arr_qtd-1 LOOP
      v_item := _parcelas->v_i;
      v_val  := (v_item->>'valor')::numeric;
      v_venc := (v_item->>'vencimento')::date;
      v_comp := COALESCE(NULLIF(v_item->>'competencia','')::date, date_trunc('month', v_venc)::date);
      v_obs  := NULLIF(v_item->>'observacao','');

      IF v_val IS NULL OR v_val <= 0 THEN
        RAISE EXCEPTION 'Parcela % com valor inválido', v_i+1;
      END IF;
      IF v_venc IS NULL THEN
        RAISE EXCEPTION 'Parcela % sem vencimento', v_i+1;
      END IF;

      INSERT INTO public.operacoes_financeiras_parcelas
        (operacao_id,numero,valor,vencimento,competencia,observacao)
      VALUES (_operacao_id, v_i+1, v_val, v_venc, v_comp, v_obs);
      v_total := v_total + v_val;
    END LOOP;
  ELSE
    -- Modo uniforme legado (compat)
    v_parcela := round(v_valor / v_qtd, 2);
    v_resto := v_valor - (v_parcela * v_qtd);

    FOR v_i IN 1..v_qtd LOOP
      v_venc := _vencimento_primeiro + ((v_i-1) * _intervalo_dias);
      v_comp := date_trunc('month', v_venc)::date;
      v_val  := CASE WHEN v_i = v_qtd THEN v_parcela + v_resto ELSE v_parcela END;
      INSERT INTO public.operacoes_financeiras_parcelas
        (operacao_id,numero,valor,vencimento,competencia)
      VALUES (_operacao_id, v_i, v_val, v_venc, v_comp);
      v_total := v_total + v_val;
    END LOOP;
  END IF;

  IF round(v_total,2) <> round(v_valor,2) THEN
    RAISE EXCEPTION 'Soma das parcelas (%) difere do valor_total (%)', v_total, v_valor;
  END IF;

  PERFORM public.fn_op_fin_log_evento(_operacao_id,'PARCELAS_GERADAS',NULL,
    jsonb_build_object('qtd',v_qtd,'total',v_total,'modo',CASE WHEN _parcelas IS NULL THEN 'uniforme' ELSE 'grade' END));

  v_idem := jsonb_build_object('operacao_id',_operacao_id,'qtd',v_qtd,'total',v_total);
  PERFORM public.rpc_idempotente_commit(_request_id, v_idem);
  RETURN v_idem;
END $function$;

REVOKE ALL ON FUNCTION public.rpc_op_fin_gerar_parcelas(uuid,uuid,date,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_gerar_parcelas(uuid,uuid,date,integer,jsonb) TO authenticated;

-- 3) RPC liberar — título herda competência e observação da parcela
CREATE OR REPLACE FUNCTION public.rpc_op_fin_liberar(_request_id uuid, _operacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_idem jsonb; v_op public.operacoes_financeiras%ROWTYPE;
  v_p record; v_tipo_titulo text; v_titulo_id uuid;
  v_codigo text; v_count int := 0;
  v_competencia date; v_obs text;
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

  v_tipo_titulo := CASE WHEN v_op.natureza_caixa = 'ENTRADA' THEN 'receber' ELSE 'pagar' END;

  FOR v_p IN
    SELECT * FROM public.operacoes_financeiras_parcelas
    WHERE operacao_id = _operacao_id ORDER BY numero
  LOOP
    IF v_p.titulo_id IS NOT NULL THEN CONTINUE; END IF;

    v_codigo := v_op.codigo || '/' || v_p.numero;
    v_competencia := COALESCE(v_p.competencia, v_op.competencia, date_trunc('month', v_p.vencimento)::date);
    v_obs := COALESCE(v_p.observacao, v_op.finalidade, v_op.observacoes);

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
      v_competencia, v_p.vencimento, 'PENDENTE',
      v_obs,
      v_op.natureza_id, v_op.fornecedor_id, auth.uid(),
      jsonb_build_object(
        'origem','OPERACAO_FINANCEIRA',
        'operacao_id', _operacao_id,
        'parcela_id', v_p.id,
        'parcela_numero', v_p.numero,
        'op_tipo', v_op.tipo,
        'competencia_parcela', v_competencia,
        'observacao_parcela', v_p.observacao
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
END $function$;

REVOKE ALL ON FUNCTION public.rpc_op_fin_liberar(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_op_fin_liberar(uuid,uuid) TO authenticated;