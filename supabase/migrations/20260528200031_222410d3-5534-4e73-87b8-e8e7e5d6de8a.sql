
-- D15 Ondas 1.B+1.C+8 — versão corrigida com schemas reais

DROP VIEW IF EXISTS public.v_lancamentos_derivados CASCADE;
CREATE VIEW public.v_lancamentos_derivados
WITH (security_invoker = on)
AS
-- Títulos (previsto)
SELECT
  ('TIT-' || t.id::text)::text AS lancamento_id,
  'TITULO'::text AS origem, t.id AS entidade_id,
  t.tipo AS tipo_lancamento, t.codigo,
  t.cliente_id, t.fornecedor_id, t.contrato_id,
  t.natureza_id, t.centro_id AS centro_resultado_id, t.conta_id,
  t.valor_liquido AS valor, t.saldo,
  t.competencia, t.vencimento AS data_referencia,
  t.status, t.observacoes AS descricao,
  t.created_at, t.created_by AS user_id,
  'previsto'::text AS natureza_temporal
FROM public.titulos_financeiros t WHERE t.deleted_at IS NULL

UNION ALL
-- Movimentações (realizado)
SELECT
  ('MOV-' || m.id::text)::text, 'MOVIMENTACAO'::text, m.id,
  m.tipo, ('MF-' || substr(m.id::text,1,8))::text,
  t.cliente_id, t.fornecedor_id, t.contrato_id,
  t.natureza_id, t.centro_id, COALESCE(m.conta_id, t.conta_id),
  m.valor, 0::numeric,
  COALESCE(t.competencia, m.data::date), m.data::date,
  CASE WHEN m.tipo IN ('recebimento','baixa') THEN 'REALIZADO'
       WHEN m.tipo = 'estorno' THEN 'ESTORNADO'
       ELSE upper(m.tipo) END,
  m.observacao, m.created_at, m.user_id,
  'realizado'::text
FROM public.movimentacoes_financeiras m
LEFT JOIN public.titulos_financeiros t ON t.id = m.titulo_id

UNION ALL
-- Adiantamentos (sem natureza_id/centro_resultado_id na tabela; campos nulos)
SELECT
  ('ADT-' || a.id::text)::text, 'ADIANTAMENTO'::text, a.id,
  a.direcao, COALESCE(a.codigo, ('AD-' || substr(a.id::text,1,8)))::text,
  a.cliente_id, a.fornecedor_id, a.contrato_id,
  NULL::uuid, NULL::uuid, a.conta_id,
  a.valor, a.saldo,
  a.competencia, a.data_movimento,
  a.status, a.observacao,
  a.created_at, a.created_by,
  'realizado'::text
FROM public.adiantamentos a WHERE a.deleted_at IS NULL

UNION ALL
-- Boletos (vínculo via título quando existir)
SELECT
  ('BOL-' || b.id::text)::text, 'BOLETO'::text, b.id,
  COALESCE(t.tipo, 'pagar'),
  COALESCE(b.numero_boleto, b.codigo, ('BL-' || substr(b.id::text,1,8)))::text,
  t.cliente_id, COALESCE(b.fornecedor_id, t.fornecedor_id), t.contrato_id,
  t.natureza_id, t.centro_id, t.conta_id,
  b.valor_total, COALESCE(t.saldo, b.valor_total),
  COALESCE(t.competencia, b.data_emissao),
  COALESCE(t.vencimento, b.data_emissao),
  b.status, ('Boleto ' || COALESCE(b.numero_boleto, b.codigo, ''))::text,
  b.created_at, b.created_by,
  'previsto'::text
FROM public.boletos b
LEFT JOIN public.titulos_financeiros t ON t.id = b.titulo_id
WHERE b.deleted_at IS NULL

UNION ALL
-- Extrato bancário
SELECT
  ('EXT-' || e.id::text)::text, 'EXTRATO'::text, e.id,
  CASE WHEN e.valor >= 0 THEN 'receber' ELSE 'pagar' END,
  COALESCE(e.documento, ('EX-' || substr(e.id::text,1,8)))::text,
  NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
  e.conta_id,
  abs(e.valor),
  CASE WHEN e.status = 'CONCILIADO' THEN 0 ELSE abs(e.valor) END,
  e.data, e.data,
  e.status, e.descricao,
  e.created_at, NULL::uuid,
  'realizado'::text
FROM public.extrato_banco e WHERE e.deleted_at IS NULL;

COMMENT ON VIEW public.v_lancamentos_derivados IS
'D15 Onda 1.B/C — VERDADE OFICIAL para lançamentos. Derivada de títulos+movimentações+adiantamentos+boletos+extrato. NUNCA criar tabela lancamentos.';

CREATE INDEX IF NOT EXISTS idx_adiantamentos_data ON public.adiantamentos(data_movimento DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_boletos_titulo ON public.boletos(titulo_id);
CREATE INDEX IF NOT EXISTS idx_extrato_data ON public.extrato_banco(data DESC) WHERE deleted_at IS NULL;

-- RPC oficial de criação de lançamento
CREATE OR REPLACE FUNCTION public.rpc_lancamento_criar(
  _request_id uuid, _tipo text, _valor numeric, _vencimento date,
  _natureza_id uuid, _centro_id uuid, _conta_id uuid,
  _cliente_id uuid DEFAULT NULL, _fornecedor_id uuid DEFAULT NULL, _contrato_id uuid DEFAULT NULL,
  _descricao text DEFAULT NULL, _competencia date DEFAULT NULL, _forma_pagamento text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user uuid := auth.uid(); v_id uuid; v_existing jsonb;
BEGIN
  IF NOT (public.is_admin(v_user) OR public.has_permission(v_user,'financeiro.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para criar lançamento financeiro.' USING ERRCODE='42501'; END IF;
  IF _request_id IS NULL THEN RAISE EXCEPTION 'request_id obrigatório.' USING ERRCODE='22023'; END IF;
  IF _tipo NOT IN ('receber','pagar') THEN RAISE EXCEPTION 'Tipo inválido: %.', _tipo USING ERRCODE='22023'; END IF;
  IF _valor IS NULL OR _valor <= 0 THEN RAISE EXCEPTION 'Valor deve ser positivo.' USING ERRCODE='22023'; END IF;
  IF _vencimento IS NULL THEN RAISE EXCEPTION 'Vencimento obrigatório.' USING ERRCODE='22023'; END IF;
  IF _natureza_id IS NULL THEN RAISE EXCEPTION 'Natureza obrigatória.' USING ERRCODE='22023'; END IF;
  IF _centro_id IS NULL THEN RAISE EXCEPTION 'Centro de resultado obrigatório.' USING ERRCODE='22023'; END IF;
  IF _conta_id IS NULL THEN RAISE EXCEPTION 'Conta financeira obrigatória.' USING ERRCODE='22023'; END IF;
  IF _tipo='receber' AND _cliente_id IS NULL THEN RAISE EXCEPTION 'Cliente obrigatório para receber.' USING ERRCODE='22023'; END IF;
  IF _tipo='pagar' AND _fornecedor_id IS NULL THEN RAISE EXCEPTION 'Fornecedor obrigatório para pagar.' USING ERRCODE='22023'; END IF;

  SELECT resultado INTO v_existing FROM public.rpc_idempotencia WHERE request_id = _request_id;
  IF FOUND AND v_existing IS NOT NULL AND v_existing ? 'titulo_id' THEN
    RETURN (v_existing->>'titulo_id')::uuid;
  END IF;

  INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, payload_hash, resultado)
    VALUES (_request_id,'rpc_lancamento_criar', v_user, md5(_tipo||_valor||_vencimento), NULL)
    ON CONFLICT (request_id) DO NOTHING;

  INSERT INTO public.titulos_financeiros(
    tipo, origem_tipo, origem_id, cliente_id, fornecedor_id, contrato_id,
    natureza_id, centro_id, conta_id,
    valor_bruto, valor_liquido, saldo,
    competencia, vencimento, forma_pagamento,
    status, observacoes, created_by
  ) VALUES (
    _tipo, 'lancamento_manual', _request_id, _cliente_id, _fornecedor_id, _contrato_id,
    _natureza_id, _centro_id, _conta_id,
    _valor, _valor, _valor,
    COALESCE(_competencia, _vencimento), _vencimento, _forma_pagamento,
    'PENDENTE', _descricao, v_user
  ) RETURNING id INTO v_id;

  INSERT INTO public.parcelas_financeiras(titulo_id, numero, valor, saldo, vencimento)
    VALUES (v_id, 1, _valor, _valor, _vencimento);

  UPDATE public.rpc_idempotencia SET resultado = jsonb_build_object('titulo_id', v_id) WHERE request_id = _request_id;
  RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_lancamento_criar(uuid,text,numeric,date,uuid,uuid,uuid,uuid,uuid,uuid,text,date,text) FROM anon;

-- v_saude_sistema (Onda 8)
DROP VIEW IF EXISTS public.v_saude_sistema CASCADE;
CREATE VIEW public.v_saude_sistema WITH (security_invoker = on) AS
SELECT
  (SELECT count(*) FROM public.audit_log WHERE created_at > now() - interval '24 hours') AS auditoria_24h,
  (SELECT count(*) FROM public.audit_log WHERE created_at > now() - interval '7 days') AS auditoria_7d,
  (SELECT count(*) FROM public.governance_pendencias WHERE status IN ('PENDENTE','BLOQUEAR')) AS governance_pendentes,
  (SELECT count(*) FROM public.titulos_financeiros WHERE status_integracao='erro' AND deleted_at IS NULL) AS integracao_titulos_erro,
  (SELECT count(*) FROM public.parcelas_financeiras WHERE status_integracao='erro') AS integracao_parcelas_erro,
  (SELECT count(*) FROM public.movimentacoes_financeiras WHERE status_integracao='erro') AS integracao_mov_erro,
  (SELECT count(*) FROM public.anexos a WHERE a.deleted_at IS NULL AND a.entidade_tipo='titulos_financeiros'
     AND NOT EXISTS (SELECT 1 FROM public.titulos_financeiros t WHERE t.id=a.entidade_id)) AS anexos_orfaos_titulos,
  (SELECT count(*) FROM public.titulos_financeiros WHERE status IN ('PENDENTE','PARCIAL') AND deleted_at IS NULL) AS titulos_em_aberto,
  (SELECT count(*) FROM public.titulos_financeiros WHERE vencimento < current_date AND status IN ('PENDENTE','PARCIAL') AND deleted_at IS NULL) AS titulos_vencidos,
  (SELECT count(*) FROM public.workflow_aprovacoes WHERE status='PENDENTE') AS aprovacoes_pendentes,
  (SELECT count(*) FROM public.workflow_aprovacoes WHERE status='PENDENTE' AND created_at < now() - interval '48 hours') AS aprovacoes_atrasadas,
  (SELECT count(*) FROM public.titulos_financeiros WHERE row_version > 10 AND deleted_at IS NULL) AS titulos_alta_edicao,
  now() AS gerado_em;

COMMENT ON VIEW public.v_saude_sistema IS 'D15 Onda 8 — KPIs operacionais para painel /paineis/saude-sistema.';
