-- =====================================================================
-- D15 — Onda 1.A (REESCRITA pós Onda 1.A.0 REV2)
-- Fonte única de verdade financeira: view derivada + 7 RPCs oficiais
-- =====================================================================
-- Princípios:
--   * 100% baseado no schema real (FKs, enums, RLS, permissões existentes)
--   * Nenhuma migração de dados; nenhuma flag D15_* ativada
--   * UI/stores intactas; nenhuma alteração de comportamento produtivo
--   * Toda RPC: SECURITY DEFINER, search_path=public, REVOKE anon, GRANT authenticated,
--     gate via public.has_permission(auth.uid(), <perm>), audit_log append-only,
--     idempotência via parâmetro request_id (uuid) opcional.
--   * View derivada: security_invoker=on, sem materialização.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) TABELA DE IDEMPOTÊNCIA DE RPCs FINANCEIRAS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rpc_idempotencia (
  request_id    uuid PRIMARY KEY,
  rpc_nome      text NOT NULL,
  user_id       uuid,
  payload_hash  text,
  resultado     jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rpc_idempotencia TO authenticated;
GRANT ALL ON public.rpc_idempotencia TO service_role;

ALTER TABLE public.rpc_idempotencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idempotencia_self_read"
  ON public.rpc_idempotencia FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(),'financeiro.visualizar'));

CREATE POLICY "idempotencia_self_insert"
  ON public.rpc_idempotencia FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS ix_rpc_idem_created ON public.rpc_idempotencia(created_at DESC);

-- ---------------------------------------------------------------------
-- 2) HELPER: registro padronizado em audit_log
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_lancamento(
  _modulo text,
  _entidade text,
  _entidade_id uuid,
  _acao text,
  _valor_novo jsonb,
  _motivo text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log(modulo, entidade, entidade_id, acao, valor_novo, motivo, user_id, user_email)
  VALUES (_modulo, _entidade, _entidade_id, _acao, _valor_novo, _motivo, auth.uid(),
          (SELECT email FROM auth.users WHERE id = auth.uid()));
END $$;

REVOKE ALL ON FUNCTION public.fn_audit_lancamento(text,text,uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_audit_lancamento(text,text,uuid,text,jsonb,text) TO authenticated;

-- ---------------------------------------------------------------------
-- 3) VIEW DERIVADA: v_lancamentos_derivados
--    Une 7 fontes oficiais financeiras (sem duplicar verdade).
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_lancamentos_derivados CASCADE;

CREATE VIEW public.v_lancamentos_derivados
WITH (security_invoker = on) AS
-- 3.1 Títulos financeiros
SELECT
  t.id                                  AS lancamento_id,
  'TITULO'::text                        AS origem,
  t.id                                  AS origem_id,
  t.tipo                                AS tipo,                -- RECEBER/PAGAR/...
  CASE WHEN t.tipo = 'RECEBER' THEN 'ENTRADA' ELSE 'SAIDA' END AS direcao,
  t.competencia                         AS data_competencia,
  t.vencimento                          AS data_vencimento,
  NULL::date                            AS data_realizacao,
  t.valor_bruto                         AS valor_bruto,
  t.valor_liquido                       AS valor_liquido,
  t.saldo                               AS saldo,
  t.status                              AS status,
  t.cliente_id, t.fornecedor_id, t.contrato_id,
  NULL::uuid                            AS obra_id,
  t.conta_id, t.centro_id, t.natureza_id,
  t.codigo, NULL::text AS documento, t.observacoes AS descricao,
  t.codigo_externo, t.status_integracao, t.lote_integracao_id,
  t.created_at, t.created_by
FROM public.titulos_financeiros t
WHERE t.deleted_at IS NULL

UNION ALL
-- 3.2 Parcelas (visão por vencimento)
SELECT
  p.id, 'PARCELA', p.id,
  t.tipo,
  CASE WHEN t.tipo = 'RECEBER' THEN 'ENTRADA' ELSE 'SAIDA' END,
  t.competencia, p.vencimento, p.recebido_em::date,
  p.valor, p.valor, p.saldo, p.status,
  t.cliente_id, t.fornecedor_id, t.contrato_id, NULL::uuid,
  t.conta_id, t.centro_id, t.natureza_id,
  t.codigo || '/' || p.numero::text, NULL, p.observacoes,
  p.codigo_externo, p.status_integracao, p.lote_integracao_id,
  p.created_at, p.created_by
FROM public.parcelas_financeiras p
JOIN public.titulos_financeiros t ON t.id = p.titulo_id AND t.deleted_at IS NULL

UNION ALL
-- 3.3 Movimentações (baixas/estornos)
SELECT
  m.id, 'MOVIMENTO', m.id,
  m.tipo,
  CASE WHEN m.tipo IN ('BAIXA','RECEBIMENTO','ENTRADA') THEN 'ENTRADA' ELSE 'SAIDA' END,
  NULL::date, NULL::date, m.data::date,
  m.valor, m.valor, NULL::numeric, 'REALIZADO',
  t.cliente_id, t.fornecedor_id, t.contrato_id, NULL::uuid,
  m.conta_id, t.centro_id, t.natureza_id,
  t.codigo, NULL, m.observacao,
  m.codigo_externo, m.status_integracao, m.lote_integracao_id,
  m.created_at, m.user_id
FROM public.movimentacoes_financeiras m
LEFT JOIN public.titulos_financeiros t ON t.id = m.titulo_id

UNION ALL
-- 3.4 Adiantamentos
SELECT
  a.id, 'ADIANTAMENTO', a.id,
  'ADIANTAMENTO_' || a.direcao,
  CASE WHEN a.direcao = 'RECEBER' THEN 'ENTRADA' ELSE 'SAIDA' END,
  a.competencia, NULL::date, a.data_movimento,
  a.valor, a.valor - COALESCE(a.valor_abatido,0), a.saldo, a.status,
  a.cliente_id, a.fornecedor_id, a.contrato_id, NULL::uuid,
  a.conta_id, NULL::uuid, NULL::uuid,
  a.codigo, a.documento, a.observacao,
  a.codigo_externo, a.status_integracao, a.lote_integracao_id,
  a.created_at, a.created_by
FROM public.adiantamentos a
WHERE a.deleted_at IS NULL

UNION ALL
-- 3.5 Extrato bancário (apenas linhas não conciliadas; conciliadas já viram movimento)
SELECT
  e.id, 'EXTRATO', e.id,
  CASE WHEN e.valor >= 0 THEN 'EXTRATO_ENTRADA' ELSE 'EXTRATO_SAIDA' END,
  CASE WHEN e.valor >= 0 THEN 'ENTRADA' ELSE 'SAIDA' END,
  NULL::date, NULL::date, e.data,
  e.valor, e.valor, NULL::numeric, e.status,
  NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
  e.conta_id, NULL::uuid, NULL::uuid,
  NULL, e.documento, e.descricao,
  e.codigo_externo, e.status_integracao, e.lote_integracao_id,
  e.created_at, e.importado_por
FROM public.extrato_banco e
WHERE e.deleted_at IS NULL AND e.titulo_id IS NULL AND e.movimento_id IS NULL

UNION ALL
-- 3.6 Boletos (visão de cobrança, não substitui o título)
SELECT
  b.id, 'BOLETO', b.id,
  'BOLETO', 'SAIDA',
  NULL::date, b.data_emissao, b.data_entrada,
  b.valor_total, b.valor_total, NULL::numeric, b.status,
  NULL::uuid, b.fornecedor_id, NULL::uuid, NULL::uuid,
  NULL::uuid, NULL::uuid, NULL::uuid,
  b.codigo, b.numero_boleto, b.observacoes,
  b.codigo_externo, b.status_integracao, b.lote_integracao_id,
  b.created_at, b.created_by
FROM public.boletos b
WHERE b.deleted_at IS NULL

UNION ALL
-- 3.7 Rescisões (devolução / multa)
SELECT
  r.id, 'RESCISAO', r.id,
  'RESCISAO', 'SAIDA',
  NULL::date, r.vencimento_devolucao, r.data_rescisao,
  r.devolucao_liquida, r.devolucao_liquida, NULL::numeric, r.status,
  r.cliente_id, NULL::uuid, r.contrato_id, NULL::uuid,
  r.conta_devolucao_id, NULL::uuid, NULL::uuid,
  r.codigo, NULL, r.motivo,
  r.codigo_externo, r.status_integracao, r.lote_integracao_id,
  r.created_at, r.created_by
FROM public.rescisoes_contrato r
WHERE r.deleted_at IS NULL;

COMMENT ON VIEW public.v_lancamentos_derivados IS
  'D15 Onda 1.A — verdade derivada do financeiro. Não materializada; security_invoker; respeita RLS de cada fonte.';

GRANT SELECT ON public.v_lancamentos_derivados TO authenticated;

-- ---------------------------------------------------------------------
-- 4) RPC 1 — rpc_lancamento_criar
--    Cria título + parcela única atomicamente (substitui "novo lançamento" do LS).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_lancamento_criar(
  _tipo            text,                  -- RECEBER | PAGAR
  _origem_tipo     text,                  -- AVULSO | CONTRATO | PV | OBRA | OUTRO
  _origem_id       uuid,
  _valor           numeric,
  _vencimento      date,
  _natureza_id     uuid,
  _centro_id       uuid DEFAULT NULL,
  _conta_id        uuid DEFAULT NULL,
  _cliente_id      uuid DEFAULT NULL,
  _fornecedor_id   uuid DEFAULT NULL,
  _contrato_id     uuid DEFAULT NULL,
  _competencia     date DEFAULT NULL,
  _observacoes     text DEFAULT NULL,
  _request_id      uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid    uuid := auth.uid();
  _titulo uuid;
  _parc   uuid;
  _exist  jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required' USING ERRCODE='28000'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.editar') THEN
    RAISE EXCEPTION 'forbidden: financeiro.editar' USING ERRCODE='42501';
  END IF;
  IF _tipo NOT IN ('RECEBER','PAGAR') THEN RAISE EXCEPTION 'tipo invalido'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;
  IF _natureza_id IS NULL THEN RAISE EXCEPTION 'natureza obrigatoria'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.naturezas_financeiras WHERE id=_natureza_id AND ativo) THEN
    RAISE EXCEPTION 'natureza inexistente/inativa';
  END IF;

  -- idempotência
  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  INSERT INTO public.titulos_financeiros(
    tipo, origem_tipo, origem_id, cliente_id, fornecedor_id, contrato_id,
    centro_id, conta_id, natureza_id,
    valor_bruto, valor_liquido, saldo,
    competencia, vencimento, status, observacoes, created_by
  ) VALUES (
    _tipo, _origem_tipo, COALESCE(_origem_id, gen_random_uuid()),
    _cliente_id, _fornecedor_id, _contrato_id,
    _centro_id, _conta_id, _natureza_id,
    _valor, _valor, _valor,
    COALESCE(_competencia, _vencimento), _vencimento, 'PENDENTE', _observacoes, _uid
  ) RETURNING id INTO _titulo;

  INSERT INTO public.parcelas_financeiras(
    titulo_id, numero, valor, saldo, vencimento, status, created_by
  ) VALUES (_titulo, 1, _valor, _valor, _vencimento, 'PENDENTE', _uid)
  RETURNING id INTO _parc;

  PERFORM public.fn_audit_lancamento(
    'financeiro','titulo', _titulo, 'CRIAR',
    jsonb_build_object('tipo',_tipo,'valor',_valor,'vencimento',_vencimento,'parcela_id',_parc),
    _observacoes
  );

  _exist := jsonb_build_object('titulo_id',_titulo,'parcela_id',_parc,'status','PENDENTE');
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, resultado)
    VALUES (_request_id,'rpc_lancamento_criar',_uid,_exist)
    ON CONFLICT (request_id) DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_lancamento_criar(text,text,uuid,numeric,date,uuid,uuid,uuid,uuid,uuid,uuid,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lancamento_criar(text,text,uuid,numeric,date,uuid,uuid,uuid,uuid,uuid,uuid,date,text,uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 5) RPC 2 — rpc_titulo_baixar
--    Registra movimentação de baixa em parcela e atualiza saldos.
--    NÃO altera status do título manualmente: triggers de hardening cuidam disso.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_titulo_baixar(
  _parcela_id   uuid,
  _valor        numeric,
  _data         timestamptz,
  _conta_id     uuid,
  _forma        text,
  _observacao   text DEFAULT NULL,
  _request_id   uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid   uuid := auth.uid();
  _tit   uuid;
  _saldo numeric;
  _mov   uuid;
  _exist jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required' USING ERRCODE='28000'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.movimentar') THEN
    RAISE EXCEPTION 'forbidden: financeiro.movimentar' USING ERRCODE='42501';
  END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  SELECT titulo_id, saldo INTO _tit, _saldo
    FROM public.parcelas_financeiras WHERE id=_parcela_id FOR UPDATE;
  IF _tit IS NULL THEN RAISE EXCEPTION 'parcela inexistente'; END IF;
  IF _valor > COALESCE(_saldo,0) THEN
    RAISE EXCEPTION 'valor excede saldo da parcela (saldo=%, tentativa=%)', _saldo, _valor;
  END IF;

  -- flag de hardening D4.1: permitir UPDATE indireto via trigger
  PERFORM set_config('app.via_movimentacao','true', true);

  INSERT INTO public.movimentacoes_financeiras(
    titulo_id, parcela_id, tipo, valor, data, conta_id, forma_pagamento, observacao, user_id, user_email
  ) VALUES (
    _tit, _parcela_id, 'BAIXA', _valor, _data, _conta_id, _forma, _observacao, _uid,
    (SELECT email FROM auth.users WHERE id=_uid)
  ) RETURNING id INTO _mov;

  PERFORM public.fn_audit_lancamento(
    'financeiro','movimentacao', _mov, 'BAIXA',
    jsonb_build_object('parcela_id',_parcela_id,'titulo_id',_tit,'valor',_valor,'conta_id',_conta_id),
    _observacao
  );

  _exist := jsonb_build_object('movimentacao_id',_mov,'titulo_id',_tit,'parcela_id',_parcela_id,'valor',_valor);
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, resultado)
    VALUES (_request_id,'rpc_titulo_baixar',_uid,_exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_titulo_baixar(uuid,numeric,timestamptz,uuid,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_titulo_baixar(uuid,numeric,timestamptz,uuid,text,text,uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 6) RPC 3 — rpc_titulo_estornar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_titulo_estornar(
  _movimentacao_id uuid,
  _motivo          text,
  _request_id      uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _orig RECORD;
  _novo uuid;
  _exist jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required' USING ERRCODE='28000'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.movimentar') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF coalesce(trim(_motivo),'') = '' THEN RAISE EXCEPTION 'motivo obrigatorio'; END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  SELECT * INTO _orig FROM public.movimentacoes_financeiras WHERE id=_movimentacao_id FOR UPDATE;
  IF _orig.id IS NULL THEN RAISE EXCEPTION 'movimentacao inexistente'; END IF;
  IF _orig.tipo = 'ESTORNO' THEN RAISE EXCEPTION 'movimentacao ja eh estorno'; END IF;

  PERFORM set_config('app.via_movimentacao','true', true);

  INSERT INTO public.movimentacoes_financeiras(
    titulo_id, parcela_id, tipo, valor, data, conta_id, forma_pagamento, observacao, user_id, user_email
  ) VALUES (
    _orig.titulo_id, _orig.parcela_id, 'ESTORNO', -1 * _orig.valor, now(),
    _orig.conta_id, _orig.forma_pagamento, _motivo, _uid,
    (SELECT email FROM auth.users WHERE id=_uid)
  ) RETURNING id INTO _novo;

  PERFORM public.fn_audit_lancamento(
    'financeiro','movimentacao', _novo, 'ESTORNO',
    jsonb_build_object('movimentacao_origem',_movimentacao_id,'valor',_orig.valor), _motivo
  );

  _exist := jsonb_build_object('estorno_id',_novo,'movimentacao_origem',_movimentacao_id);
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, resultado)
    VALUES (_request_id,'rpc_titulo_estornar',_uid,_exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_titulo_estornar(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_titulo_estornar(uuid,text,uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 7) RPC 4 — rpc_titulo_cancelar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_titulo_cancelar(
  _titulo_id  uuid,
  _motivo     text,
  _request_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tit RECORD;
  _exist jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.editar') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF coalesce(trim(_motivo),'') = '' THEN RAISE EXCEPTION 'motivo obrigatorio'; END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  SELECT * INTO _tit FROM public.titulos_financeiros WHERE id=_titulo_id FOR UPDATE;
  IF _tit.id IS NULL THEN RAISE EXCEPTION 'titulo inexistente'; END IF;
  IF _tit.status IN ('CANCELADO','LIQUIDADO') THEN
    RAISE EXCEPTION 'titulo em status final: %', _tit.status;
  END IF;
  IF EXISTS(SELECT 1 FROM public.movimentacoes_financeiras WHERE titulo_id=_titulo_id AND tipo <> 'ESTORNO') THEN
    RAISE EXCEPTION 'titulo possui movimentacoes; estorne antes de cancelar';
  END IF;

  UPDATE public.titulos_financeiros
     SET status='CANCELADO', cancelado_em=now(), motivo_cancelamento=_motivo, updated_at=now()
   WHERE id=_titulo_id;

  PERFORM public.fn_audit_lancamento('financeiro','titulo',_titulo_id,'CANCELAR',
    jsonb_build_object('status_anterior',_tit.status), _motivo);

  _exist := jsonb_build_object('titulo_id',_titulo_id,'status','CANCELADO');
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id,rpc_nome,user_id,resultado)
    VALUES (_request_id,'rpc_titulo_cancelar',_uid,_exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_titulo_cancelar(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_titulo_cancelar(uuid,text,uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 8) RPC 5 — rpc_adiantamento_registrar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_adiantamento_registrar(
  _direcao     text,                  -- RECEBER | PAGAR
  _valor       numeric,
  _data        date,
  _conta_id    uuid,
  _cliente_id  uuid DEFAULT NULL,
  _fornecedor_id uuid DEFAULT NULL,
  _contrato_id uuid DEFAULT NULL,
  _competencia date DEFAULT NULL,
  _observacao  text DEFAULT NULL,
  _request_id  uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _ad uuid; _exist jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.movimentar') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _direcao NOT IN ('RECEBER','PAGAR') THEN RAISE EXCEPTION 'direcao invalida'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;
  IF (_cliente_id IS NULL) = (_fornecedor_id IS NULL) THEN
    RAISE EXCEPTION 'informe cliente_id OU fornecedor_id (exclusivo)';
  END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  INSERT INTO public.adiantamentos(
    natureza, direcao, cliente_id, fornecedor_id, contrato_id,
    data_movimento, competencia, valor, valor_abatido, status, conta_id, observacao, created_by
  ) VALUES (
    'ADIANTAMENTO', _direcao, _cliente_id, _fornecedor_id, _contrato_id,
    _data, COALESCE(_competencia,_data), _valor, 0, 'ABERTO', _conta_id, _observacao, _uid
  ) RETURNING id INTO _ad;

  PERFORM public.fn_audit_lancamento('financeiro','adiantamento',_ad,'CRIAR',
    jsonb_build_object('direcao',_direcao,'valor',_valor,'conta_id',_conta_id), _observacao);

  _exist := jsonb_build_object('adiantamento_id',_ad,'saldo',_valor);
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id,rpc_nome,user_id,resultado)
    VALUES (_request_id,'rpc_adiantamento_registrar',_uid,_exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_adiantamento_registrar(text,numeric,date,uuid,uuid,uuid,uuid,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_adiantamento_registrar(text,numeric,date,uuid,uuid,uuid,uuid,date,text,uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 9) RPC 6 — rpc_adiantamento_abater
--    Abate adiantamento em parcela (gera abatimento + movimentação atômico).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_adiantamento_abater(
  _adiantamento_id uuid,
  _parcela_id      uuid,
  _valor           numeric,
  _observacao      text DEFAULT NULL,
  _request_id      uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _ad RECORD; _parc RECORD; _abat uuid; _mov uuid; _exist jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.movimentar') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  SELECT * INTO _ad FROM public.adiantamentos WHERE id=_adiantamento_id FOR UPDATE;
  SELECT * INTO _parc FROM public.parcelas_financeiras WHERE id=_parcela_id FOR UPDATE;
  IF _ad.id IS NULL THEN RAISE EXCEPTION 'adiantamento inexistente'; END IF;
  IF _parc.id IS NULL THEN RAISE EXCEPTION 'parcela inexistente'; END IF;
  IF _valor > COALESCE(_ad.saldo, _ad.valor - COALESCE(_ad.valor_abatido,0)) THEN
    RAISE EXCEPTION 'valor excede saldo do adiantamento';
  END IF;
  IF _valor > COALESCE(_parc.saldo,0) THEN
    RAISE EXCEPTION 'valor excede saldo da parcela';
  END IF;

  PERFORM set_config('app.via_movimentacao','true', true);

  INSERT INTO public.movimentacoes_financeiras(
    titulo_id, parcela_id, tipo, valor, data, conta_id, forma_pagamento, observacao, user_id, user_email
  ) VALUES (
    _parc.titulo_id, _parcela_id, 'BAIXA_ADIANTAMENTO', _valor, now(),
    _ad.conta_id, 'ADIANTAMENTO', COALESCE(_observacao,'abatimento adiantamento'), _uid,
    (SELECT email FROM auth.users WHERE id=_uid)
  ) RETURNING id INTO _mov;

  INSERT INTO public.adiantamento_abatimentos(
    adiantamento_id, titulo_id, parcela_id, movimentacao_id, valor, observacao, created_by
  ) VALUES (_adiantamento_id, _parc.titulo_id, _parcela_id, _mov, _valor, _observacao, _uid)
  RETURNING id INTO _abat;

  UPDATE public.adiantamentos
     SET valor_abatido = COALESCE(valor_abatido,0) + _valor,
         saldo = valor - (COALESCE(valor_abatido,0) + _valor),
         status = CASE WHEN valor - (COALESCE(valor_abatido,0) + _valor) <= 0 THEN 'QUITADO' ELSE status END,
         updated_at = now()
   WHERE id=_adiantamento_id;

  PERFORM public.fn_audit_lancamento('financeiro','adiantamento_abatimento',_abat,'ABATER',
    jsonb_build_object('adiantamento_id',_adiantamento_id,'parcela_id',_parcela_id,'valor',_valor,'movimentacao_id',_mov),
    _observacao);

  _exist := jsonb_build_object('abatimento_id',_abat,'movimentacao_id',_mov);
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id,rpc_nome,user_id,resultado)
    VALUES (_request_id,'rpc_adiantamento_abater',_uid,_exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_adiantamento_abater(uuid,uuid,numeric,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_adiantamento_abater(uuid,uuid,numeric,text,uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 10) RPC 7 — rpc_renegociacao_aplicar
--     Cancela título original e cria substituto, mantendo vínculo rastreável.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_renegociacao_aplicar(
  _titulo_origem_id uuid,
  _novo_valor       numeric,
  _novo_vencimento  date,
  _motivo           text,
  _request_id       uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _orig RECORD; _novo uuid; _parc uuid; _exist jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.renegociar') THEN
    RAISE EXCEPTION 'forbidden: financeiro.renegociar' USING ERRCODE='42501';
  END IF;
  IF coalesce(trim(_motivo),'')='' THEN RAISE EXCEPTION 'motivo obrigatorio'; END IF;
  IF _novo_valor IS NULL OR _novo_valor <= 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;

  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;

  SELECT * INTO _orig FROM public.titulos_financeiros WHERE id=_titulo_origem_id FOR UPDATE;
  IF _orig.id IS NULL THEN RAISE EXCEPTION 'titulo origem inexistente'; END IF;
  IF _orig.status IN ('CANCELADO','LIQUIDADO','RENEGOCIADO') THEN
    RAISE EXCEPTION 'titulo em status final: %', _orig.status;
  END IF;

  INSERT INTO public.titulos_financeiros(
    tipo, origem_tipo, origem_id, cliente_id, fornecedor_id, contrato_id,
    centro_id, conta_id, natureza_id,
    valor_bruto, valor_liquido, saldo,
    competencia, vencimento, status, observacoes, created_by
  ) VALUES (
    _orig.tipo, 'RENEGOCIACAO', _orig.id, _orig.cliente_id, _orig.fornecedor_id, _orig.contrato_id,
    _orig.centro_id, _orig.conta_id, _orig.natureza_id,
    _novo_valor, _novo_valor, _novo_valor,
    _orig.competencia, _novo_vencimento, 'PENDENTE',
    'Renegociação de ' || COALESCE(_orig.codigo,_orig.id::text) || ': ' || _motivo, _uid
  ) RETURNING id INTO _novo;

  INSERT INTO public.parcelas_financeiras(titulo_id, numero, valor, saldo, vencimento, status, created_by)
  VALUES (_novo, 1, _novo_valor, _novo_valor, _novo_vencimento, 'PENDENTE', _uid)
  RETURNING id INTO _parc;

  UPDATE public.titulos_financeiros
     SET status='RENEGOCIADO', titulo_substituto_id=_novo,
         renegociado_em=now(), renegociado_por=_uid, motivo_renegociacao=_motivo, updated_at=now()
   WHERE id=_titulo_origem_id;

  PERFORM public.fn_audit_lancamento('financeiro','titulo',_titulo_origem_id,'RENEGOCIAR',
    jsonb_build_object('novo_titulo_id',_novo,'novo_valor',_novo_valor,'novo_vencimento',_novo_vencimento), _motivo);

  _exist := jsonb_build_object('titulo_origem_id',_titulo_origem_id,'novo_titulo_id',_novo,'parcela_id',_parc);
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id,rpc_nome,user_id,resultado)
    VALUES (_request_id,'rpc_renegociacao_aplicar',_uid,_exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_renegociacao_aplicar(uuid,numeric,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_renegociacao_aplicar(uuid,numeric,date,text,uuid) TO authenticated;

COMMIT;

-- =====================================================================
-- VALIDAÇÕES §5 (executar após COMMIT, todas devem passar):
-- =====================================================================
-- V1) View existe e é security_invoker
--   SELECT relname, reloptions FROM pg_class WHERE relname='v_lancamentos_derivados';
-- V2) View retorna linhas das 7 origens (com banco vazio, retorna 0 linhas sem erro)
--   SELECT origem, count(*) FROM public.v_lancamentos_derivados GROUP BY origem;
-- V3) Todas as 7 RPCs registradas como SECURITY DEFINER + search_path=public
--   SELECT proname, prosecdef, proconfig FROM pg_proc
--    WHERE proname LIKE 'rpc_%' AND pronamespace='public'::regnamespace;
-- V4) anon NÃO tem EXECUTE em nenhuma RPC nova
--   SELECT p.proname FROM pg_proc p
--    WHERE p.proname IN ('rpc_lancamento_criar','rpc_titulo_baixar','rpc_titulo_estornar',
--                        'rpc_titulo_cancelar','rpc_adiantamento_registrar',
--                        'rpc_adiantamento_abater','rpc_renegociacao_aplicar')
--      AND has_function_privilege('anon', p.oid, 'EXECUTE');
--   (deve retornar 0 linhas)
-- V5) rpc_idempotencia tem RLS ativa
--   SELECT relrowsecurity FROM pg_class WHERE relname='rpc_idempotencia';
-- V6) Idempotência: chamar 2x rpc_lancamento_criar com mesmo request_id → retorno idêntico, 1 título.

-- =====================================================================
-- ROLLBACK COMPLETO:
-- =====================================================================
-- BEGIN;
--   DROP FUNCTION IF EXISTS public.rpc_renegociacao_aplicar(uuid,numeric,date,text,uuid);
--   DROP FUNCTION IF EXISTS public.rpc_adiantamento_abater(uuid,uuid,numeric,text,uuid);
--   DROP FUNCTION IF EXISTS public.rpc_adiantamento_registrar(text,numeric,date,uuid,uuid,uuid,uuid,date,text,uuid);
--   DROP FUNCTION IF EXISTS public.rpc_titulo_cancelar(uuid,text,uuid);
--   DROP FUNCTION IF EXISTS public.rpc_titulo_estornar(uuid,text,uuid);
--   DROP FUNCTION IF EXISTS public.rpc_titulo_baixar(uuid,numeric,timestamptz,uuid,text,text,uuid);
--   DROP FUNCTION IF EXISTS public.rpc_lancamento_criar(text,text,uuid,numeric,date,uuid,uuid,uuid,uuid,uuid,uuid,date,text,uuid);
--   DROP FUNCTION IF EXISTS public.fn_audit_lancamento(text,text,uuid,text,jsonb,text);
--   DROP VIEW IF EXISTS public.v_lancamentos_derivados;
--   DROP TABLE IF EXISTS public.rpc_idempotencia;
-- COMMIT;
