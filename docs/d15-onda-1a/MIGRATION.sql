-- =====================================================================
-- D15 — Onda 1.A — Fundação Financeira Supabase (LS → DB)
-- Modo: ESTRUTURA APENAS. Nenhum corte. Nenhuma migração de dados.
-- Flags D15_* permanecem false. UI não muda.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. INFRAESTRUTURA DE MIGRAÇÃO / IDEMPOTÊNCIA
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.migracao_d15_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onda            text NOT NULL,                 -- ex: '1.A', '1.B'
  origem          text NOT NULL,                 -- 'LS' | 'SNAPSHOT' | 'MANUAL'
  origem_ref      text,                          -- chave LS ou hash do snapshot
  snapshot_hash   text,                          -- ex: '658dff81'
  correlation_id  uuid NOT NULL DEFAULT gen_random_uuid(),
  entidade        text NOT NULL,                 -- 'titulo' | 'parcela' | 'movimentacao' | ...
  entidade_id     uuid,
  acao            text NOT NULL,                 -- 'criar' | 'editar' | 'cancelar' | 'baixar' | 'estornar' | 'conciliar' | 'desconciliar'
  status          text NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | OK | ERRO | IGNORADO
  payload_in      jsonb,
  payload_out     jsonb,
  erro            text,
  user_id         uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_migracao_d15_log_correlation
  ON public.migracao_d15_log(correlation_id);
CREATE INDEX IF NOT EXISTS ix_migracao_d15_log_entidade
  ON public.migracao_d15_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS ix_migracao_d15_log_status
  ON public.migracao_d15_log(status) WHERE status <> 'OK';

GRANT SELECT, INSERT ON public.migracao_d15_log TO authenticated;
GRANT ALL ON public.migracao_d15_log TO service_role;

ALTER TABLE public.migracao_d15_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY migracao_d15_log_select ON public.migracao_d15_log
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY migracao_d15_log_insert ON public.migracao_d15_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chaves_de_idempotencia (
  idempotency_key  text PRIMARY KEY,            -- UUID v4 ou hash determinístico
  escopo           text NOT NULL,               -- 'rpc_lancamento_criar', etc.
  user_id          uuid,
  resultado        jsonb,                       -- payload retornado na primeira execução
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS ix_chaves_idem_expires
  ON public.chaves_de_idempotencia(expires_at);

GRANT SELECT, INSERT ON public.chaves_de_idempotencia TO authenticated;
GRANT ALL ON public.chaves_de_idempotencia TO service_role;

ALTER TABLE public.chaves_de_idempotencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY chaves_idem_select ON public.chaves_de_idempotencia
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY chaves_idem_insert ON public.chaves_de_idempotencia
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 2. VIEW DERIVADA — v_lancamentos_derivados
-- Fonte oficial unificada (verdade derivada das tabelas canônicas).
-- security_invoker=on para herdar RLS do chamador.
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_lancamentos_derivados
WITH (security_invoker = on) AS
WITH base_titulos AS (
  SELECT
    t.id                              AS lancamento_id,
    'TITULO'::text                    AS origem,
    t.id                              AS titulo_id,
    NULL::uuid                        AS parcela_id,
    NULL::uuid                        AS movimentacao_id,
    t.codigo,
    t.tipo                            AS tipo,          -- AR | AP
    t.status,
    t.descricao,
    t.valor_total                     AS valor,
    t.data_emissao                    AS data_evento,
    t.data_vencimento                 AS data_vencimento,
    t.natureza_id,
    t.centro_resultado_id,
    t.conta_id,
    t.cliente_id,
    t.fornecedor_id,
    t.consultor_id,
    t.contrato_id,
    t.pv_id,
    t.obra_id,
    t.observacao,
    t.deleted_at,
    t.created_by,
    t.created_at,
    t.updated_at
  FROM public.titulos_financeiros t
),
base_parcelas AS (
  SELECT
    p.id                              AS lancamento_id,
    'PARCELA'::text                   AS origem,
    p.titulo_id,
    p.id                              AS parcela_id,
    NULL::uuid                        AS movimentacao_id,
    t.codigo,
    t.tipo,
    p.status,
    COALESCE(p.descricao, t.descricao) AS descricao,
    p.valor,
    p.data_vencimento                 AS data_evento,
    p.data_vencimento,
    t.natureza_id,
    t.centro_resultado_id,
    t.conta_id,
    t.cliente_id,
    t.fornecedor_id,
    t.consultor_id,
    t.contrato_id,
    t.pv_id,
    t.obra_id,
    p.observacao,
    p.deleted_at,
    p.created_by,
    p.created_at,
    p.updated_at
  FROM public.parcelas_financeiras p
  JOIN public.titulos_financeiros t ON t.id = p.titulo_id
),
base_movimentos AS (
  SELECT
    m.id                              AS lancamento_id,
    'MOVIMENTO'::text                 AS origem,
    m.titulo_id,
    m.parcela_id,
    m.id                              AS movimentacao_id,
    t.codigo,
    t.tipo,
    m.tipo                            AS status,        -- BAIXA | ESTORNO | CONCILIACAO
    COALESCE(m.observacao, t.descricao) AS descricao,
    m.valor,
    m.data                            AS data_evento,
    t.data_vencimento,
    t.natureza_id,
    t.centro_resultado_id,
    m.conta_id,
    t.cliente_id,
    t.fornecedor_id,
    t.consultor_id,
    t.contrato_id,
    t.pv_id,
    t.obra_id,
    m.observacao,
    NULL::timestamptz                 AS deleted_at,
    m.user_id                         AS created_by,
    m.created_at,
    m.created_at                      AS updated_at
  FROM public.movimentacoes_financeiras m
  JOIN public.titulos_financeiros t ON t.id = m.titulo_id
)
SELECT
  b.*,
  c.nome              AS conta_nome,
  c.banco             AS conta_banco,
  cr.nome             AS centro_resultado_nome,
  cli.nome            AS cliente_nome,
  forn.nome           AS fornecedor_nome
FROM (
  SELECT * FROM base_titulos
  UNION ALL SELECT * FROM base_parcelas
  UNION ALL SELECT * FROM base_movimentos
) b
LEFT JOIN public.contas_financeiras c   ON c.id  = b.conta_id
LEFT JOIN public.centros_resultado cr   ON cr.id = b.centro_resultado_id
LEFT JOIN public.clientes cli           ON cli.id = b.cliente_id
LEFT JOIN public.fornecedores forn      ON forn.id = b.fornecedor_id;

COMMENT ON VIEW public.v_lancamentos_derivados IS
  'D15 Onda 1.A — Verdade oficial de lançamentos derivada de titulos+parcelas+movimentações. NÃO é tabela. security_invoker=on.';

GRANT SELECT ON public.v_lancamentos_derivados TO authenticated;

-- ---------------------------------------------------------------------
-- 3. HELPER — registro idempotente + audit
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._d15_check_idem(
  _key text, _escopo text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v jsonb;
BEGIN
  IF _key IS NULL THEN RETURN NULL; END IF;
  SELECT resultado INTO v
    FROM public.chaves_de_idempotencia
   WHERE idempotency_key = _key AND escopo = _escopo;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public._d15_store_idem(
  _key text, _escopo text, _resultado jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _key IS NULL THEN RETURN; END IF;
  INSERT INTO public.chaves_de_idempotencia(idempotency_key, escopo, user_id, resultado)
       VALUES (_key, _escopo, auth.uid(), _resultado)
  ON CONFLICT (idempotency_key) DO NOTHING;
END $$;

REVOKE EXECUTE ON FUNCTION public._d15_check_idem(text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public._d15_store_idem(text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._d15_check_idem(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._d15_store_idem(text,text,jsonb) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. RPCs FINANCEIRAS ATÔMICAS
-- Padrão de retorno: jsonb { ok, lancamento_id, titulo_id, parcela_id?, movimentacao_id?, idempotent_hit, correlation_id }
-- Todas: SECURITY INVOKER (RLS do usuário aplica), validam permissão e auditam em audit_log.
-- ---------------------------------------------------------------------

-- 4.1 rpc_lancamento_criar — cria título + parcelas (sem baixa)
CREATE OR REPLACE FUNCTION public.rpc_lancamento_criar(
  _payload jsonb,
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_hit          jsonb;
  v_titulo_id    uuid;
  v_corr         uuid := gen_random_uuid();
  v_tipo         text := _payload->>'tipo';
  v_parcelas     jsonb := COALESCE(_payload->'parcelas', '[]'::jsonb);
  v_parc         jsonb;
  v_parcela_ids  uuid[] := ARRAY[]::uuid[];
  v_pid          uuid;
BEGIN
  -- Idempotência
  v_hit := public._d15_check_idem(_idempotency_key, 'rpc_lancamento_criar');
  IF v_hit IS NOT NULL THEN
    RETURN v_hit || jsonb_build_object('idempotent_hit', true);
  END IF;

  -- Permissão mínima
  IF NOT (is_admin(auth.uid())
       OR has_permission(auth.uid(), 'financeiro.movimentar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.movimentar';
  END IF;

  -- Validações canônicas
  IF v_tipo NOT IN ('AR','AP') THEN
    RAISE EXCEPTION 'tipo inválido: % (esperado AR|AP)', v_tipo;
  END IF;
  IF (_payload->>'natureza_id') IS NULL THEN
    RAISE EXCEPTION 'natureza_id obrigatório';
  END IF;
  IF (_payload->>'centro_resultado_id') IS NULL THEN
    RAISE EXCEPTION 'centro_resultado_id obrigatório';
  END IF;
  IF (_payload->>'conta_id') IS NULL THEN
    RAISE EXCEPTION 'conta_id obrigatório';
  END IF;
  IF jsonb_array_length(v_parcelas) < 1 THEN
    RAISE EXCEPTION 'pelo menos uma parcela é obrigatória';
  END IF;

  -- Criar título
  INSERT INTO public.titulos_financeiros(
    id, tipo, status, descricao, valor_total,
    data_emissao, data_vencimento,
    natureza_id, centro_resultado_id, conta_id,
    cliente_id, fornecedor_id, consultor_id,
    contrato_id, pv_id, obra_id,
    observacao, codigo, created_by
  ) VALUES (
    gen_random_uuid(),
    v_tipo,
    'ABERTO',
    _payload->>'descricao',
    (_payload->>'valor_total')::numeric,
    COALESCE((_payload->>'data_emissao')::date, CURRENT_DATE),
    (_payload->>'data_vencimento')::date,
    (_payload->>'natureza_id')::uuid,
    (_payload->>'centro_resultado_id')::uuid,
    (_payload->>'conta_id')::uuid,
    NULLIF(_payload->>'cliente_id','')::uuid,
    NULLIF(_payload->>'fornecedor_id','')::uuid,
    NULLIF(_payload->>'consultor_id','')::uuid,
    NULLIF(_payload->>'contrato_id','')::uuid,
    NULLIF(_payload->>'pv_id','')::uuid,
    NULLIF(_payload->>'obra_id','')::uuid,
    _payload->>'observacao',
    _payload->>'codigo',
    auth.uid()
  ) RETURNING id INTO v_titulo_id;

  -- Criar parcelas
  FOR v_parc IN SELECT * FROM jsonb_array_elements(v_parcelas)
  LOOP
    INSERT INTO public.parcelas_financeiras(
      id, titulo_id, numero, valor, data_vencimento, status, descricao, created_by
    ) VALUES (
      gen_random_uuid(),
      v_titulo_id,
      (v_parc->>'numero')::int,
      (v_parc->>'valor')::numeric,
      (v_parc->>'data_vencimento')::date,
      'ABERTO',
      v_parc->>'descricao',
      auth.uid()
    ) RETURNING id INTO v_pid;
    v_parcela_ids := v_parcela_ids || v_pid;
  END LOOP;

  -- Auditoria
  INSERT INTO public.audit_log(acao, modulo, entidade, entidade_id, valor_novo, user_id, user_email)
       VALUES ('criar', 'financeiro', 'titulo', v_titulo_id, _payload, auth.uid(),
               (SELECT email FROM auth.users WHERE id = auth.uid()));

  -- Log migração (sempre, mesmo em produção)
  INSERT INTO public.migracao_d15_log(onda, origem, entidade, entidade_id, acao, status, payload_in, correlation_id, user_id)
       VALUES ('1.A','MANUAL','titulo', v_titulo_id, 'criar', 'OK', _payload, v_corr, auth.uid());

  -- Persistir resultado idem
  DECLARE v_out jsonb := jsonb_build_object(
      'ok', true,
      'lancamento_id', v_titulo_id,
      'titulo_id', v_titulo_id,
      'parcela_ids', to_jsonb(v_parcela_ids),
      'correlation_id', v_corr,
      'idempotent_hit', false
    );
  BEGIN
    PERFORM public._d15_store_idem(_idempotency_key, 'rpc_lancamento_criar', v_out);
    RETURN v_out;
  END;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_lancamento_criar(jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lancamento_criar(jsonb,text) TO authenticated;

-- 4.2 rpc_lancamento_editar — edita campos não-financeiros do título
CREATE OR REPLACE FUNCTION public.rpc_lancamento_editar(
  _titulo_id uuid, _patch jsonb, _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_hit jsonb; v_old jsonb; v_corr uuid := gen_random_uuid();
BEGIN
  v_hit := public._d15_check_idem(_idempotency_key, 'rpc_lancamento_editar');
  IF v_hit IS NOT NULL THEN RETURN v_hit || jsonb_build_object('idempotent_hit', true); END IF;

  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'financeiro.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.editar';
  END IF;

  SELECT to_jsonb(t) INTO v_old FROM public.titulos_financeiros t WHERE id = _titulo_id;
  IF v_old IS NULL THEN RAISE EXCEPTION 'título não encontrado'; END IF;
  IF (v_old->>'status') IN ('CANCELADO','BAIXADO') THEN
    RAISE EXCEPTION 'título em status % não pode ser editado', v_old->>'status';
  END IF;

  UPDATE public.titulos_financeiros SET
    descricao            = COALESCE(_patch->>'descricao', descricao),
    observacao           = COALESCE(_patch->>'observacao', observacao),
    natureza_id          = COALESCE(NULLIF(_patch->>'natureza_id','')::uuid, natureza_id),
    centro_resultado_id  = COALESCE(NULLIF(_patch->>'centro_resultado_id','')::uuid, centro_resultado_id),
    conta_id             = COALESCE(NULLIF(_patch->>'conta_id','')::uuid, conta_id),
    data_vencimento      = COALESCE(NULLIF(_patch->>'data_vencimento','')::date, data_vencimento),
    updated_at           = now()
  WHERE id = _titulo_id;

  INSERT INTO public.audit_log(acao,modulo,entidade,entidade_id,valor_anterior,valor_novo,user_id)
       VALUES ('editar','financeiro','titulo',_titulo_id,v_old,_patch,auth.uid());
  INSERT INTO public.migracao_d15_log(onda,origem,entidade,entidade_id,acao,status,payload_in,correlation_id,user_id)
       VALUES ('1.A','MANUAL','titulo',_titulo_id,'editar','OK',_patch,v_corr,auth.uid());

  DECLARE v_out jsonb := jsonb_build_object('ok',true,'titulo_id',_titulo_id,'correlation_id',v_corr,'idempotent_hit',false);
  BEGIN PERFORM public._d15_store_idem(_idempotency_key,'rpc_lancamento_editar',v_out); RETURN v_out; END;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_lancamento_editar(uuid,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lancamento_editar(uuid,jsonb,text) TO authenticated;

-- 4.3 rpc_lancamento_cancelar
CREATE OR REPLACE FUNCTION public.rpc_lancamento_cancelar(
  _titulo_id uuid, _motivo text, _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_hit jsonb; v_corr uuid := gen_random_uuid(); v_status text;
BEGIN
  v_hit := public._d15_check_idem(_idempotency_key,'rpc_lancamento_cancelar');
  IF v_hit IS NOT NULL THEN RETURN v_hit || jsonb_build_object('idempotent_hit',true); END IF;

  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'financeiro.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.editar';
  END IF;
  IF _motivo IS NULL OR length(_motivo) < 3 THEN
    RAISE EXCEPTION 'motivo obrigatório';
  END IF;

  SELECT status INTO v_status FROM public.titulos_financeiros WHERE id = _titulo_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'título não encontrado'; END IF;
  IF v_status = 'BAIXADO' THEN RAISE EXCEPTION 'título BAIXADO — use estorno'; END IF;

  UPDATE public.titulos_financeiros
     SET status='CANCELADO', deleted_at=now(), deleted_by=auth.uid(), deleted_reason=_motivo, updated_at=now()
   WHERE id = _titulo_id;
  UPDATE public.parcelas_financeiras
     SET status='CANCELADA', updated_at=now()
   WHERE titulo_id = _titulo_id AND status NOT IN ('BAIXADA','CANCELADA');

  INSERT INTO public.audit_log(acao,modulo,entidade,entidade_id,motivo,user_id)
       VALUES ('cancelar','financeiro','titulo',_titulo_id,_motivo,auth.uid());
  INSERT INTO public.migracao_d15_log(onda,origem,entidade,entidade_id,acao,status,payload_in,correlation_id,user_id)
       VALUES ('1.A','MANUAL','titulo',_titulo_id,'cancelar','OK',jsonb_build_object('motivo',_motivo),v_corr,auth.uid());

  DECLARE v_out jsonb := jsonb_build_object('ok',true,'titulo_id',_titulo_id,'correlation_id',v_corr,'idempotent_hit',false);
  BEGIN PERFORM public._d15_store_idem(_idempotency_key,'rpc_lancamento_cancelar',v_out); RETURN v_out; END;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_lancamento_cancelar(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_lancamento_cancelar(uuid,text,text) TO authenticated;

-- 4.4 rpc_baixar_em_lote — baixa N parcelas atomicamente
CREATE OR REPLACE FUNCTION public.rpc_baixar_em_lote(
  _baixas jsonb,           -- [{ parcela_id, valor, conta_id, data, forma_pagamento, observacao }]
  _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_hit jsonb; v_corr uuid := gen_random_uuid();
  v_b jsonb; v_titulo_id uuid; v_parcela_id uuid;
  v_mov_ids uuid[] := ARRAY[]::uuid[]; v_mid uuid;
BEGIN
  v_hit := public._d15_check_idem(_idempotency_key,'rpc_baixar_em_lote');
  IF v_hit IS NOT NULL THEN RETURN v_hit || jsonb_build_object('idempotent_hit',true); END IF;

  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'financeiro.movimentar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.movimentar';
  END IF;
  IF jsonb_array_length(_baixas) < 1 THEN
    RAISE EXCEPTION 'lista de baixas vazia';
  END IF;

  -- Flag para os triggers de hardening financeiro (D4.1) reconhecerem origem oficial
  PERFORM set_config('app.via_movimentacao','true', true);

  FOR v_b IN SELECT * FROM jsonb_array_elements(_baixas)
  LOOP
    v_parcela_id := (v_b->>'parcela_id')::uuid;
    SELECT titulo_id INTO v_titulo_id FROM public.parcelas_financeiras
      WHERE id = v_parcela_id FOR UPDATE;
    IF v_titulo_id IS NULL THEN
      RAISE EXCEPTION 'parcela % não encontrada', v_parcela_id;
    END IF;

    INSERT INTO public.movimentacoes_financeiras(
      id, titulo_id, parcela_id, tipo, valor, data, conta_id, forma_pagamento, observacao, user_id
    ) VALUES (
      gen_random_uuid(), v_titulo_id, v_parcela_id, 'BAIXA',
      (v_b->>'valor')::numeric,
      COALESCE((v_b->>'data')::timestamptz, now()),
      NULLIF(v_b->>'conta_id','')::uuid,
      v_b->>'forma_pagamento',
      v_b->>'observacao',
      auth.uid()
    ) RETURNING id INTO v_mid;
    v_mov_ids := v_mov_ids || v_mid;

    -- Trigger auto-status D4.6 cuida do status da parcela/título.
  END LOOP;

  INSERT INTO public.audit_log(acao,modulo,entidade,entidade_id,valor_novo,user_id)
       VALUES ('baixar_lote','financeiro','movimentacao',NULL,_baixas,auth.uid());
  INSERT INTO public.migracao_d15_log(onda,origem,entidade,entidade_id,acao,status,payload_in,correlation_id,user_id)
       VALUES ('1.A','MANUAL','movimentacao',NULL,'baixar',
               'OK',_baixas,v_corr,auth.uid());

  DECLARE v_out jsonb := jsonb_build_object('ok',true,'movimentacao_ids',to_jsonb(v_mov_ids),'correlation_id',v_corr,'idempotent_hit',false);
  BEGIN PERFORM public._d15_store_idem(_idempotency_key,'rpc_baixar_em_lote',v_out); RETURN v_out; END;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_baixar_em_lote(jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_baixar_em_lote(jsonb,text) TO authenticated;

-- 4.5 rpc_estornar — cria movimentação ESTORNO
CREATE OR REPLACE FUNCTION public.rpc_estornar(
  _movimentacao_id uuid, _motivo text, _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_hit jsonb; v_corr uuid := gen_random_uuid(); v_orig record; v_new uuid;
BEGIN
  v_hit := public._d15_check_idem(_idempotency_key,'rpc_estornar');
  IF v_hit IS NOT NULL THEN RETURN v_hit || jsonb_build_object('idempotent_hit',true); END IF;

  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'financeiro.movimentar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.movimentar';
  END IF;
  IF _motivo IS NULL OR length(_motivo) < 3 THEN
    RAISE EXCEPTION 'motivo obrigatório';
  END IF;

  SELECT * INTO v_orig FROM public.movimentacoes_financeiras WHERE id = _movimentacao_id;
  IF v_orig.id IS NULL THEN RAISE EXCEPTION 'movimentação não encontrada'; END IF;
  IF v_orig.tipo = 'ESTORNO' THEN RAISE EXCEPTION 'movimentação já é ESTORNO'; END IF;

  PERFORM set_config('app.via_movimentacao','true', true);

  INSERT INTO public.movimentacoes_financeiras(
    id, titulo_id, parcela_id, tipo, valor, data, conta_id, observacao, user_id
  ) VALUES (
    gen_random_uuid(), v_orig.titulo_id, v_orig.parcela_id, 'ESTORNO',
    -1 * v_orig.valor, now(), v_orig.conta_id,
    'Estorno de '||_movimentacao_id||': '||_motivo,
    auth.uid()
  ) RETURNING id INTO v_new;

  INSERT INTO public.audit_log(acao,modulo,entidade,entidade_id,motivo,user_id)
       VALUES ('estornar','financeiro','movimentacao',_movimentacao_id,_motivo,auth.uid());
  INSERT INTO public.migracao_d15_log(onda,origem,entidade,entidade_id,acao,status,payload_in,correlation_id,user_id)
       VALUES ('1.A','MANUAL','movimentacao',_movimentacao_id,'estornar','OK',jsonb_build_object('motivo',_motivo,'novo_id',v_new),v_corr,auth.uid());

  DECLARE v_out jsonb := jsonb_build_object('ok',true,'movimentacao_id',v_new,'origem_id',_movimentacao_id,'correlation_id',v_corr,'idempotent_hit',false);
  BEGIN PERFORM public._d15_store_idem(_idempotency_key,'rpc_estornar',v_out); RETURN v_out; END;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_estornar(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_estornar(uuid,text,text) TO authenticated;

-- 4.6 rpc_conciliar — vincula linha de extrato a movimento
CREATE OR REPLACE FUNCTION public.rpc_conciliar(
  _extrato_id uuid, _movimentacao_id uuid, _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_hit jsonb; v_corr uuid := gen_random_uuid();
BEGIN
  v_hit := public._d15_check_idem(_idempotency_key,'rpc_conciliar');
  IF v_hit IS NOT NULL THEN RETURN v_hit || jsonb_build_object('idempotent_hit',true); END IF;

  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'financeiro.movimentar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.movimentar';
  END IF;

  UPDATE public.extrato_banco
     SET movimento_id=_movimentacao_id, status='CONCILIADO', updated_at=now()
   WHERE id=_extrato_id AND deleted_at IS NULL
   RETURNING id INTO _extrato_id;
  IF _extrato_id IS NULL THEN RAISE EXCEPTION 'linha de extrato não encontrada'; END IF;

  INSERT INTO public.audit_log(acao,modulo,entidade,entidade_id,valor_novo,user_id)
       VALUES ('conciliar','financeiro','extrato',_extrato_id,jsonb_build_object('movimentacao_id',_movimentacao_id),auth.uid());
  INSERT INTO public.migracao_d15_log(onda,origem,entidade,entidade_id,acao,status,payload_in,correlation_id,user_id)
       VALUES ('1.A','MANUAL','extrato',_extrato_id,'conciliar','OK',jsonb_build_object('movimentacao_id',_movimentacao_id),v_corr,auth.uid());

  DECLARE v_out jsonb := jsonb_build_object('ok',true,'extrato_id',_extrato_id,'movimentacao_id',_movimentacao_id,'correlation_id',v_corr,'idempotent_hit',false);
  BEGIN PERFORM public._d15_store_idem(_idempotency_key,'rpc_conciliar',v_out); RETURN v_out; END;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_conciliar(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_conciliar(uuid,uuid,text) TO authenticated;

-- 4.7 rpc_desconciliar
CREATE OR REPLACE FUNCTION public.rpc_desconciliar(
  _extrato_id uuid, _motivo text, _idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE v_hit jsonb; v_corr uuid := gen_random_uuid();
BEGIN
  v_hit := public._d15_check_idem(_idempotency_key,'rpc_desconciliar');
  IF v_hit IS NOT NULL THEN RETURN v_hit || jsonb_build_object('idempotent_hit',true); END IF;

  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'financeiro.movimentar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão financeiro.movimentar';
  END IF;
  IF _motivo IS NULL OR length(_motivo) < 3 THEN RAISE EXCEPTION 'motivo obrigatório'; END IF;

  UPDATE public.extrato_banco
     SET movimento_id=NULL, status='PENDENTE', updated_at=now()
   WHERE id=_extrato_id AND deleted_at IS NULL
   RETURNING id INTO _extrato_id;
  IF _extrato_id IS NULL THEN RAISE EXCEPTION 'linha de extrato não encontrada'; END IF;

  INSERT INTO public.audit_log(acao,modulo,entidade,entidade_id,motivo,user_id)
       VALUES ('desconciliar','financeiro','extrato',_extrato_id,_motivo,auth.uid());
  INSERT INTO public.migracao_d15_log(onda,origem,entidade,entidade_id,acao,status,payload_in,correlation_id,user_id)
       VALUES ('1.A','MANUAL','extrato',_extrato_id,'desconciliar','OK',jsonb_build_object('motivo',_motivo),v_corr,auth.uid());

  DECLARE v_out jsonb := jsonb_build_object('ok',true,'extrato_id',_extrato_id,'correlation_id',v_corr,'idempotent_hit',false);
  BEGIN PERFORM public._d15_store_idem(_idempotency_key,'rpc_desconciliar',v_out); RETURN v_out; END;
END $$;

REVOKE EXECUTE ON FUNCTION public.rpc_desconciliar(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_desconciliar(uuid,text,text) TO authenticated;

-- =====================================================================
-- FIM Onda 1.A — Nenhum dado migrado. Nenhum corte. UI inalterada.
-- =====================================================================
