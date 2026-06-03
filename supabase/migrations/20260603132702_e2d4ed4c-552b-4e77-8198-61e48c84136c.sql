-- ============================================================
-- 2) Tabela financiamentos_pendencias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financiamentos_pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  vendedor text,
  vendedor_id uuid,
  valor_contrato numeric(14,2) NOT NULL DEFAULT 0,
  valor_financiado numeric(14,2),
  banco_sugerido text,
  banco_definitivo text,
  observacao text,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','EM_ANALISE','APROVADO','REPROVADO','CANCELADO')),
  motivo_decisao text,
  decidido_em timestamptz,
  decidido_por uuid,
  criado_por uuid,
  -- Integrabilidade
  codigo_externo text,
  sistema_destino text,
  status_integracao text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO')),
  hash_integracao text,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financiamentos_pendencias TO authenticated;
GRANT ALL ON public.financiamentos_pendencias TO service_role;

ALTER TABLE public.financiamentos_pendencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_pend_select" ON public.financiamentos_pendencias
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'financiamento.visualizar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_pend_insert" ON public.financiamentos_pendencias
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'financiamento.criar_pendencia'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_pend_update" ON public.financiamentos_pendencias
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'financiamento.editar'::app_permission) OR has_permission(auth.uid(), 'financiamento.aprovar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_pend_delete_admin" ON public.financiamentos_pendencias
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_pend_contrato_ativo
  ON public.financiamentos_pendencias (contrato_id)
  WHERE deleted_at IS NULL AND status NOT IN ('REPROVADO','CANCELADO');

CREATE INDEX IF NOT EXISTS idx_fin_pend_status
  ON public.financiamentos_pendencias (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_pend_created
  ON public.financiamentos_pendencias (created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- 3) RPC: aprovar proposta
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_proposta_aprovar(
  p_proposta_id uuid,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proposta propostas%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid, 'comercial.proposta.aprovar'::app_permission)
          OR has_permission(v_uid, 'comercial.proposta.editar'::app_permission)
          OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar propostas' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_proposta.status IN ('CANCELADA','ASSINADA','APROVADA') THEN
    -- idempotente: já está aprovada ou em estado terminal
    IF v_proposta.status = 'APROVADA' THEN RETURN v_proposta.id; END IF;
    RAISE EXCEPTION 'Proposta em status % não pode ser aprovada', v_proposta.status USING ERRCODE = 'P0001';
  END IF;
  IF v_proposta.requer_aprovacao_excecao = true
     AND COALESCE(v_proposta.aprovacao_excecao_status,'PENDENTE') <> 'APROVADA' THEN
    RAISE EXCEPTION 'Proposta exige aprovação de exceção R$/kWp antes da aprovação comercial' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE propostas SET
    status = 'APROVADA',
    data_aprovacao = now(),
    motivo_status = COALESCE(p_observacao, motivo_status),
    updated_at = now()
  WHERE id = p_proposta_id;

  INSERT INTO audit_log (table_name, op, row_id, user_id, payload)
  VALUES ('propostas','APROVAR', p_proposta_id, v_uid,
          jsonb_build_object('status_anterior', v_proposta.status, 'observacao', p_observacao));

  RETURN p_proposta_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_proposta_aprovar(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_aprovar(uuid, text) TO authenticated;

-- ============================================================
-- 4) RPC: gerar contrato a partir da proposta
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_proposta_gerar_contrato(
  p_proposta_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proposta propostas%ROWTYPE;
  v_contrato_id uuid;
  v_codigo text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid, 'contrato.gerar'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para gerar contrato' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;

  -- Idempotência
  IF v_proposta.contrato_id IS NOT NULL THEN
    RETURN v_proposta.contrato_id;
  END IF;

  IF v_proposta.status NOT IN ('APROVADA') THEN
    RAISE EXCEPTION 'Apenas propostas APROVADAS geram contrato (status atual: %)', v_proposta.status USING ERRCODE = 'P0001';
  END IF;

  v_codigo := 'CT-' || to_char(now(),'YYYYMMDD') || '-' || substring(p_proposta_id::text from 1 for 8);

  INSERT INTO contratos (
    codigo, cliente_id, consultor_id, status,
    valor_total, potencia_kwp, modulos_qtde,
    proposta_id, lead_id, dados, observacoes
  ) VALUES (
    v_codigo,
    v_proposta.cliente_id,
    v_proposta.consultor_id,
    'EM_ABERTO',
    COALESCE(v_proposta.valor_final, 0),
    v_proposta.potencia_kwp,
    v_proposta.modulos_qtd,
    p_proposta_id,
    v_proposta.lead_id,
    COALESCE(v_proposta.dados, '{}'::jsonb)
      || jsonb_build_object('origem','proposta','proposta_numero', v_proposta.numero),
    'Gerado a partir da proposta ' || COALESCE(v_proposta.numero, p_proposta_id::text)
  )
  RETURNING id INTO v_contrato_id;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE propostas SET
    contrato_id = v_contrato_id,
    status = CASE WHEN status IN ('APROVADA') THEN 'CONVERTIDA_EM_CONTRATO' ELSE status END,
    updated_at = now()
  WHERE id = p_proposta_id;

  INSERT INTO audit_log (table_name, op, row_id, user_id, payload)
  VALUES ('propostas','GERAR_CONTRATO', p_proposta_id, v_uid,
          jsonb_build_object('contrato_id', v_contrato_id, 'codigo', v_codigo));

  RETURN v_contrato_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_proposta_gerar_contrato(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_gerar_contrato(uuid) TO authenticated;

-- ============================================================
-- 5) RPC: enviar contrato para Engenharia (cria obra)
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_contrato_enviar_engenharia(
  p_contrato_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contrato contratos%ROWTYPE;
  v_obra_id uuid;
  v_codigo text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid, 'engenharia.criar_obra'::app_permission)
          OR has_permission(v_uid, 'engenharia.editar'::app_permission)
          OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para enviar para engenharia' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contrato FROM contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v_contrato.cancelado = true THEN
    RAISE EXCEPTION 'Contrato cancelado não pode ir para Engenharia' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotência: se já existe obra para este contrato (ativa), retorna ela
  SELECT id INTO v_obra_id FROM obras
   WHERE contrato_id = p_contrato_id AND deleted_at IS NULL
   ORDER BY created_at ASC LIMIT 1;
  IF v_obra_id IS NOT NULL THEN
    -- marca contrato como liberado para engenharia se ainda não estiver
    UPDATE contratos SET
      liberado_para_engenharia = true,
      liberado_para_engenharia_em = COALESCE(liberado_para_engenharia_em, now()),
      pendente_engenharia = false,
      updated_at = now()
    WHERE id = p_contrato_id;
    RETURN v_obra_id;
  END IF;

  v_codigo := 'OB-' || to_char(now(),'YYYYMMDD') || '-' || substring(p_contrato_id::text from 1 for 8);

  INSERT INTO obras (
    codigo, contrato_id, cliente_id, consultor_id, status,
    modulos_qtde, potencia_kwp, inversor, observacoes,
    dados, centro_resultado_id, centro_custo_id
  ) VALUES (
    v_codigo,
    p_contrato_id,
    v_contrato.cliente_id,
    COALESCE(v_contrato.consultor_id, v_uid),
    'EM_PROJETO_APROVACAO',
    v_contrato.modulos_qtde,
    v_contrato.potencia_kwp,
    v_contrato.inversor,
    'Criada via Comercial → Engenharia a partir do contrato ' || COALESCE(v_contrato.codigo, p_contrato_id::text),
    COALESCE(v_contrato.dados, '{}'::jsonb)
      || jsonb_build_object('origem','contrato','contrato_codigo', v_contrato.codigo),
    v_contrato.centro_resultado_id,
    v_contrato.centro_custo_id
  )
  RETURNING id INTO v_obra_id;

  UPDATE contratos SET
    liberado_para_engenharia = true,
    liberado_para_engenharia_em = now(),
    pendente_engenharia = false,
    updated_at = now()
  WHERE id = p_contrato_id;

  INSERT INTO audit_log (table_name, op, row_id, user_id, payload)
  VALUES ('contratos','ENVIAR_ENGENHARIA', p_contrato_id, v_uid,
          jsonb_build_object('obra_id', v_obra_id, 'codigo_obra', v_codigo));

  RETURN v_obra_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_contrato_enviar_engenharia(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_enviar_engenharia(uuid) TO authenticated;

-- ============================================================
-- 6) RPC: enviar contrato para Financiamentos
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_contrato_enviar_financiamento(
  p_contrato_id uuid,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contrato contratos%ROWTYPE;
  v_pend_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid, 'financiamento.criar_pendencia'::app_permission)
          OR has_permission(v_uid, 'financiamento.editar'::app_permission)
          OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para enviar para Financiamentos' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contrato FROM contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v_contrato.possui_financiamento IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Contrato não está marcado como possui_financiamento=true' USING ERRCODE = 'P0001';
  END IF;
  IF v_contrato.cancelado = true THEN
    RAISE EXCEPTION 'Contrato cancelado não pode ir para Financiamentos' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotência: se já existe pendência ativa, retorna
  SELECT id INTO v_pend_id FROM financiamentos_pendencias
   WHERE contrato_id = p_contrato_id
     AND deleted_at IS NULL
     AND status NOT IN ('REPROVADO','CANCELADO')
   LIMIT 1;
  IF v_pend_id IS NOT NULL THEN
    RETURN v_pend_id;
  END IF;

  INSERT INTO financiamentos_pendencias (
    contrato_id, cliente_id, vendedor, vendedor_id,
    valor_contrato, valor_financiado, banco_sugerido,
    observacao, status, criado_por
  ) VALUES (
    p_contrato_id,
    v_contrato.cliente_id,
    v_contrato.vendedor,
    v_contrato.consultor_id,
    COALESCE(v_contrato.valor_total, 0),
    v_contrato.financiamento_valor,
    v_contrato.financiamento_banco,
    p_observacao,
    'PENDENTE',
    v_uid
  )
  RETURNING id INTO v_pend_id;

  UPDATE contratos SET
    pendente_financeiro = false,
    liberado_para_financeiro = true,
    liberado_para_financeiro_em = COALESCE(liberado_para_financeiro_em, now()),
    financiamento_status = COALESCE(financiamento_status, 'AGUARDANDO_ANALISE'),
    updated_at = now()
  WHERE id = p_contrato_id;

  INSERT INTO audit_log (table_name, op, row_id, user_id, payload)
  VALUES ('contratos','ENVIAR_FINANCIAMENTO', p_contrato_id, v_uid,
          jsonb_build_object('pendencia_id', v_pend_id, 'valor', v_contrato.valor_total));

  RETURN v_pend_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_contrato_enviar_financiamento(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_enviar_financiamento(uuid, text) TO authenticated;

-- ============================================================
-- 7) RPC: gerar/recalcular comissão a partir do contrato
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_comissao_gerar_de_contrato(
  p_contrato_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contrato contratos%ROWTYPE;
  v_existing uuid;
  v_rs_kwp numeric;
  v_pct numeric;
  v_valor_comissao numeric;
  v_comissao_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid, 'comercial.comissao.gerar'::app_permission)
          OR has_permission(v_uid, 'comercial.comissao.liberar'::app_permission)
          OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para gerar comissão' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contrato FROM contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;

  -- Idempotência: já existe comissão PREVISTA não excluída? retorna
  SELECT id INTO v_existing FROM comercial_comissoes
   WHERE contrato_id = p_contrato_id
     AND status = 'PREVISTA'
     AND deleted_at IS NULL
   LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF COALESCE(v_contrato.valor_total,0) <= 0 OR COALESCE(v_contrato.potencia_kwp,0) <= 0 THEN
    RAISE EXCEPTION 'Contrato sem valor ou potência (Wp) para calcular comissão' USING ERRCODE = 'P0001';
  END IF;

  -- R$/kWp (potência já em kWp na tabela)
  v_rs_kwp := v_contrato.valor_total / v_contrato.potencia_kwp / 1000.0;

  -- Faixas oficiais Meta Sun (R$/Wp)
  v_pct := CASE
    WHEN v_rs_kwp >= 2.45 THEN 6.0
    WHEN v_rs_kwp >= 2.31 THEN 5.0
    WHEN v_rs_kwp >= 2.11 THEN 4.0
    WHEN v_rs_kwp >= 2.00 THEN 3.0
    ELSE 0.0
  END;

  v_valor_comissao := ROUND(v_contrato.valor_total * v_pct / 100.0, 2);

  PERFORM set_config('app.via_comissao_rpc','true', true);
  INSERT INTO comercial_comissoes (
    contrato_id, vendedor_id, vendedor_nome,
    percentual, valor_base, valor_calculado,
    status, prevista_em, observacao, created_by
  ) VALUES (
    p_contrato_id,
    v_contrato.consultor_id,
    v_contrato.vendedor,
    v_pct,
    v_contrato.valor_total,
    v_valor_comissao,
    'PREVISTA',
    now(),
    'Gerada via D27.COM.3 (R$/Wp=' || to_char(v_rs_kwp,'FM999990.0000') || ', faixa ' || v_pct || '%)',
    v_uid
  )
  RETURNING id INTO v_comissao_id;

  INSERT INTO audit_log (table_name, op, row_id, user_id, payload)
  VALUES ('comercial_comissoes','GERAR_DE_CONTRATO', v_comissao_id, v_uid,
          jsonb_build_object('contrato_id', p_contrato_id, 'rs_wp', v_rs_kwp, 'pct', v_pct, 'valor', v_valor_comissao));

  RETURN v_comissao_id;
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_comissao_gerar_de_contrato(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_gerar_de_contrato(uuid) TO authenticated;