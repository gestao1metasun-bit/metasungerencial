
-- ============================================================================
-- D15.3.c — RPCs e views oficiais
-- ============================================================================

-- 2) RPC: executar rescisão de contrato
CREATE OR REPLACE FUNCTION public.rpc_rescisao_executar(
  _contrato_id          uuid,
  _multa_tipo           text,
  _multa_valor          numeric,
  _motivo               text,
  _vencimento_devolucao date DEFAULT NULL,
  _conta_devolucao_id   uuid DEFAULT NULL,
  _observacoes          text DEFAULT NULL,
  _request_id           uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid              uuid := auth.uid();
  _exist            jsonb;
  _ctr              RECORD;
  _valor_recebido   numeric := 0;
  _multa_calc       numeric := 0;
  _dev_liquida      numeric := 0;
  _rescisao_id      uuid;
  _titulo_dev_id    uuid := NULL;
  _t                RECORD;
  _qtd              int := 0;
BEGIN
  -- 2.1 auth + permissão
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (public.is_admin(_uid) OR public.has_permission(_uid, 'financeiro.rescindir')) THEN
    RAISE EXCEPTION 'forbidden: financeiro.rescindir' USING ERRCODE = '42501';
  END IF;

  -- 2.2 validações
  IF coalesce(length(trim(_motivo)), 0) < 5 THEN
    RAISE EXCEPTION 'motivo obrigatorio (>= 5 caracteres)';
  END IF;
  IF _multa_tipo NOT IN ('percentual','fixo') THEN
    RAISE EXCEPTION 'multa_tipo invalido: %', _multa_tipo;
  END IF;
  IF _multa_valor < 0 THEN
    RAISE EXCEPTION 'multa_valor negativo';
  END IF;

  -- 2.3 idempotência
  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id = _request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  -- 2.4 contrato
  SELECT id, cliente_id, codigo INTO _ctr
    FROM public.contratos WHERE id = _contrato_id FOR UPDATE;
  IF _ctr.id IS NULL THEN RAISE EXCEPTION 'contrato inexistente'; END IF;

  -- 2.5 impede rescindir duas vezes o mesmo contrato (ativa)
  IF EXISTS (
    SELECT 1 FROM public.rescisoes_contrato
     WHERE contrato_id = _contrato_id
       AND status = 'CONFIRMADA'
       AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'contrato ja possui rescisao confirmada';
  END IF;

  -- 2.6 calcula valor recebido (sum valor_liquido - saldo) dos AR ativos
  SELECT coalesce(sum(valor_liquido - saldo), 0)
    INTO _valor_recebido
    FROM public.titulos_financeiros
   WHERE contrato_id = _contrato_id
     AND tipo = 'AR'
     AND status NOT IN ('CANCELADO')
     AND deleted_at IS NULL;

  -- 2.7 calcula multa
  IF _multa_tipo = 'percentual' THEN
    _multa_calc := round((_valor_recebido * _multa_valor / 100.0)::numeric, 2);
  ELSE
    _multa_calc := round(_multa_valor::numeric, 2);
  END IF;
  _dev_liquida := greatest(0, _valor_recebido - _multa_calc);

  -- 2.8 cria registro de rescisão
  INSERT INTO public.rescisoes_contrato (
    contrato_id, cliente_id, motivo, valor_recebido,
    multa_tipo, multa_valor, multa_calculada, devolucao_liquida,
    conta_devolucao_id, vencimento_devolucao, observacoes, status, created_by
  ) VALUES (
    _contrato_id, _ctr.cliente_id, trim(_motivo), _valor_recebido,
    _multa_tipo, _multa_valor, _multa_calc, _dev_liquida,
    _conta_devolucao_id, _vencimento_devolucao, _observacoes, 'CONFIRMADA', _uid
  )
  RETURNING id INTO _rescisao_id;

  -- 2.9 cancela cada título AR ativo + parcelas + registra item
  FOR _t IN
    SELECT id, saldo
      FROM public.titulos_financeiros
     WHERE contrato_id = _contrato_id
       AND tipo = 'AR'
       AND status NOT IN ('CANCELADO')
       AND deleted_at IS NULL
     FOR UPDATE
  LOOP
    UPDATE public.titulos_financeiros
       SET status = 'CANCELADO',
           cancelado_em = now(),
           motivo_cancelamento = 'Rescisão contratual: ' || trim(_motivo),
           updated_at = now()
     WHERE id = _t.id;

    UPDATE public.parcelas_financeiras
       SET status = 'CANCELADA',
           updated_at = now()
     WHERE titulo_id = _t.id
       AND coalesce(status,'') NOT IN ('LIQUIDADA','CANCELADA');

    INSERT INTO public.rescisoes_itens (rescisao_id, titulo_id, saldo_cancelado)
    VALUES (_rescisao_id, _t.id, coalesce(_t.saldo, 0));

    PERFORM public.fn_audit_lancamento(
      'financeiro','titulo', _t.id,'CANCELAR_RESCISAO',
      jsonb_build_object('rescisao_id', _rescisao_id, 'saldo_cancelado', _t.saldo),
      'Rescisão contratual'
    );
    _qtd := _qtd + 1;
  END LOOP;

  -- 2.10 cria AP de devolução se aplicável
  IF _dev_liquida > 0 THEN
    IF _vencimento_devolucao IS NULL THEN
      RAISE EXCEPTION 'vencimento_devolucao obrigatorio quando ha devolucao liquida';
    END IF;
    INSERT INTO public.titulos_financeiros (
      tipo, origem_tipo, origem_id, cliente_id, contrato_id,
      valor_bruto, valor_liquido, saldo, vencimento, status,
      observacoes, conta_id, created_by
    ) VALUES (
      'AP', 'RESCISAO', _rescisao_id, _ctr.cliente_id, _contrato_id,
      _dev_liquida, _dev_liquida, _dev_liquida, _vencimento_devolucao, 'PENDENTE',
      'Devolução por rescisão de contrato ' || coalesce(_ctr.codigo,_contrato_id::text),
      _conta_devolucao_id, _uid
    ) RETURNING id INTO _titulo_dev_id;

    UPDATE public.rescisoes_contrato
       SET titulo_devolucao_id = _titulo_dev_id, updated_at = now()
     WHERE id = _rescisao_id;
  END IF;

  -- 2.11 audit raiz
  PERFORM public.fn_audit_lancamento(
    'financeiro','rescisao', _rescisao_id, 'EXECUTAR',
    jsonb_build_object(
      'contrato_id', _contrato_id,
      'valor_recebido', _valor_recebido,
      'multa_calculada', _multa_calc,
      'devolucao_liquida', _dev_liquida,
      'titulos_cancelados', _qtd,
      'titulo_devolucao_id', _titulo_dev_id
    ),
    trim(_motivo)
  );

  _exist := jsonb_build_object(
    'rescisao_id', _rescisao_id,
    'titulos_cancelados', _qtd,
    'valor_recebido', _valor_recebido,
    'multa_calculada', _multa_calc,
    'devolucao_liquida', _dev_liquida,
    'titulo_devolucao_id', _titulo_dev_id
  );

  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, resultado)
    VALUES (_request_id, 'rpc_rescisao_executar', _uid, _exist)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _exist;
END
$$;

REVOKE ALL ON FUNCTION public.rpc_rescisao_executar(uuid,text,numeric,text,date,uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_rescisao_executar(uuid,text,numeric,text,date,uuid,text,uuid) TO authenticated;

-- 3) RPC: aplicar taxa em título
CREATE OR REPLACE FUNCTION public.rpc_taxa_aplicar(
  _titulo_id           uuid,
  _tipo                text,
  _valor               numeric,
  _motivo              text,
  _parcela_id          uuid    DEFAULT NULL,
  _categoria           text    DEFAULT NULL,
  _natureza_id         uuid    DEFAULT NULL,
  _centro_resultado_id uuid    DEFAULT NULL,
  _percentual          numeric DEFAULT NULL,
  _observacao          text    DEFAULT NULL,
  _data_aplicacao      date    DEFAULT NULL,
  _request_id          uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid    uuid := auth.uid();
  _exist  jsonb;
  _tx_id  uuid;
  _email  text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (public.is_admin(_uid) OR public.has_permission(_uid, 'financeiro.taxa.editar')) THEN
    RAISE EXCEPTION 'forbidden: financeiro.taxa.editar' USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(trim(_motivo)), 0) < 5 THEN
    RAISE EXCEPTION 'motivo obrigatorio (>= 5 caracteres)';
  END IF;
  IF _valor <= 0 THEN
    RAISE EXCEPTION 'valor da taxa deve ser > 0';
  END IF;
  IF _tipo NOT IN ('juros','multa','desconto','tarifa','iof','encargo','imposto','outro') THEN
    RAISE EXCEPTION 'tipo invalido: %', _tipo;
  END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id = _request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.titulos_financeiros WHERE id = _titulo_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'titulo inexistente';
  END IF;
  IF _parcela_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.parcelas_financeiras WHERE id = _parcela_id AND titulo_id = _titulo_id
  ) THEN
    RAISE EXCEPTION 'parcela nao pertence ao titulo';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.titulos_taxas (
    titulo_id, parcela_id, tipo, valor, data_aplicacao,
    motivo, observacao, user_id, user_email,
    categoria, percentual, natureza_id, centro_resultado_id, origem
  ) VALUES (
    _titulo_id, _parcela_id, _tipo, _valor, coalesce(_data_aplicacao, CURRENT_DATE),
    trim(_motivo), _observacao, _uid, _email,
    _categoria, _percentual, _natureza_id, _centro_resultado_id, 'MANUAL'
  )
  RETURNING id INTO _tx_id;

  PERFORM public.fn_audit_lancamento(
    'financeiro','titulo_taxa', _tx_id, 'APLICAR',
    jsonb_build_object(
      'titulo_id', _titulo_id, 'parcela_id', _parcela_id,
      'tipo', _tipo, 'valor', _valor, 'categoria', _categoria
    ),
    trim(_motivo)
  );

  _exist := jsonb_build_object('taxa_id', _tx_id, 'titulo_id', _titulo_id);
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, resultado)
    VALUES (_request_id, 'rpc_taxa_aplicar', _uid, _exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END
$$;

REVOKE ALL ON FUNCTION public.rpc_taxa_aplicar(uuid,text,numeric,text,uuid,text,uuid,uuid,numeric,text,date,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_taxa_aplicar(uuid,text,numeric,text,uuid,text,uuid,uuid,numeric,text,date,uuid) TO authenticated;

-- 4) RPC: estornar taxa (soft delete)
CREATE OR REPLACE FUNCTION public.rpc_taxa_estornar(
  _taxa_id    uuid,
  _motivo     text,
  _request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid   uuid := auth.uid();
  _exist jsonb;
  _tx    RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (public.is_admin(_uid) OR public.has_permission(_uid, 'financeiro.taxa.editar')) THEN
    RAISE EXCEPTION 'forbidden: financeiro.taxa.editar' USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(trim(_motivo)), 0) < 5 THEN
    RAISE EXCEPTION 'motivo obrigatorio (>= 5 caracteres)';
  END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id = _request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  SELECT * INTO _tx FROM public.titulos_taxas WHERE id = _taxa_id FOR UPDATE;
  IF _tx.id IS NULL THEN RAISE EXCEPTION 'taxa inexistente'; END IF;
  IF _tx.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'taxa ja estornada'; END IF;

  UPDATE public.titulos_taxas
     SET deleted_at = now(), deleted_by = _uid, deleted_reason = trim(_motivo)
   WHERE id = _taxa_id;

  PERFORM public.fn_audit_lancamento(
    'financeiro','titulo_taxa', _taxa_id, 'ESTORNAR',
    jsonb_build_object('titulo_id', _tx.titulo_id, 'tipo', _tx.tipo, 'valor', _tx.valor),
    trim(_motivo)
  );

  _exist := jsonb_build_object('taxa_id', _taxa_id, 'titulo_id', _tx.titulo_id, 'status', 'ESTORNADA');
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, resultado)
    VALUES (_request_id, 'rpc_taxa_estornar', _uid, _exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END
$$;

REVOKE ALL ON FUNCTION public.rpc_taxa_estornar(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_taxa_estornar(uuid,text,uuid) TO authenticated;

-- 5) Views de leitura
CREATE OR REPLACE VIEW public.v_rescisoes_enriquecido
WITH (security_invoker = on)
AS
SELECT
  r.id,
  r.codigo,
  r.contrato_id,
  c.codigo                AS contrato_codigo,
  r.cliente_id,
  cli.nome                AS cliente_nome,
  r.data_rescisao,
  r.motivo,
  r.valor_recebido,
  r.multa_tipo,
  r.multa_valor,
  r.multa_calculada,
  r.devolucao_liquida,
  r.titulo_devolucao_id,
  r.vencimento_devolucao,
  r.status,
  r.observacoes,
  r.created_at,
  r.created_by,
  (SELECT count(*) FROM public.rescisoes_itens ri WHERE ri.rescisao_id = r.id) AS titulos_cancelados
FROM public.rescisoes_contrato r
LEFT JOIN public.contratos c ON c.id = r.contrato_id
LEFT JOIN public.clientes  cli ON cli.id = r.cliente_id
WHERE r.deleted_at IS NULL;

GRANT SELECT ON public.v_rescisoes_enriquecido TO authenticated;

CREATE OR REPLACE VIEW public.v_renegociacoes_enriquecido
WITH (security_invoker = on)
AS
SELECT
  r.id,
  r.tipo,
  r.titulo_novo_id,
  t.codigo                AS titulo_novo_codigo,
  r.cliente_id,
  cli.nome                AS cliente_nome,
  r.motivo,
  r.juros_aplicado,
  r.multa_aplicada,
  r.desconto_aplicado,
  r.valor_original_total,
  r.valor_renegociado_total,
  r.qtd_titulos_consolidados,
  r.observacao,
  r.created_at,
  r.user_id,
  r.user_email
FROM public.titulos_renegociacoes r
LEFT JOIN public.titulos_financeiros t ON t.id = r.titulo_novo_id
LEFT JOIN public.clientes cli ON cli.id = r.cliente_id;

GRANT SELECT ON public.v_renegociacoes_enriquecido TO authenticated;

CREATE OR REPLACE VIEW public.v_taxas_titulo
WITH (security_invoker = on)
AS
SELECT
  x.id,
  x.titulo_id,
  t.codigo                AS titulo_codigo,
  t.tipo                  AS titulo_tipo,
  x.parcela_id,
  p.numero                AS parcela_numero,
  x.tipo,
  x.categoria,
  x.valor,
  x.percentual,
  x.data_aplicacao,
  x.motivo,
  x.observacao,
  x.natureza_id,
  n.nome                  AS natureza_nome,
  x.centro_resultado_id,
  cr.nome                 AS centro_resultado_nome,
  x.origem,
  x.user_id,
  x.user_email,
  x.created_at,
  x.deleted_at,
  x.deleted_by,
  x.deleted_reason
FROM public.titulos_taxas x
LEFT JOIN public.titulos_financeiros t ON t.id = x.titulo_id
LEFT JOIN public.parcelas_financeiras p ON p.id = x.parcela_id
LEFT JOIN public.naturezas_financeiras n ON n.id = x.natureza_id
LEFT JOIN public.centros_resultado cr ON cr.id = x.centro_resultado_id;

GRANT SELECT ON public.v_taxas_titulo TO authenticated;
