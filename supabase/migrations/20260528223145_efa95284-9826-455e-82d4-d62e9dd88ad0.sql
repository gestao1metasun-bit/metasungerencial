
-- D15.3.d — Fechamento Supabase: Conciliação, Fechamento, Fluxo, CMV

-- 1) Tabela fechamentos_periodo
CREATE TABLE IF NOT EXISTS public.fechamentos_periodo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas_financeiras(id),
  competencia date NOT NULL,
  status text NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','FECHADO','REABERTO')),
  saldo_apurado numeric NOT NULL DEFAULT 0,
  fechado_em timestamptz, fechado_por uuid,
  reaberto_em timestamptz, reaberto_por uuid, motivo_reabertura text,
  observacoes text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, row_version int NOT NULL DEFAULT 1,
  deleted_at timestamptz, deleted_by uuid, deleted_reason text,
  UNIQUE (conta_id, competencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fechamentos_periodo TO authenticated;
GRANT ALL ON public.fechamentos_periodo TO service_role;
ALTER TABLE public.fechamentos_periodo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fechamentos_select" ON public.fechamentos_periodo FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (is_admin(auth.uid()) OR has_permission(auth.uid(),'financeiro.visualizar')));
CREATE POLICY "fechamentos_admin_write" ON public.fechamentos_periodo FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_fechamentos_updated BEFORE UPDATE ON public.fechamentos_periodo
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_bump_row_version BEFORE INSERT OR UPDATE ON public.fechamentos_periodo
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();
CREATE TRIGGER tg_audit_fechamentos AFTER INSERT OR UPDATE OR DELETE ON public.fechamentos_periodo
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','fechamentos_periodo');
CREATE INDEX IF NOT EXISTS idx_fechamentos_conta_comp ON public.fechamentos_periodo(conta_id, competencia DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fechamentos_status ON public.fechamentos_periodo(status) WHERE deleted_at IS NULL;

-- 2) RPCs de fechamento
CREATE OR REPLACE FUNCTION public.rpc_fechamento_abrir(p_conta_id uuid, p_competencia date, p_observacoes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid; BEGIN
  IF NOT has_permission(auth.uid(),'financeiro.fechar_periodo') AND NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão financeiro.fechar_periodo'; END IF;
  INSERT INTO fechamentos_periodo(conta_id, competencia, status, observacoes, created_by)
  VALUES (p_conta_id, date_trunc('month', p_competencia)::date, 'ABERTO', p_observacoes, auth.uid())
  ON CONFLICT (conta_id, competencia) DO UPDATE SET status='ABERTO', updated_at=now()
  RETURNING id INTO v_id; RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.rpc_fechamento_fechar(p_id uuid, p_saldo_apurado numeric)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT has_permission(auth.uid(),'financeiro.fechar_periodo') AND NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão financeiro.fechar_periodo'; END IF;
  UPDATE fechamentos_periodo SET status='FECHADO', saldo_apurado=COALESCE(p_saldo_apurado,0), fechado_em=now(), fechado_por=auth.uid(), updated_at=now() WHERE id=p_id AND deleted_at IS NULL;
END $$;
CREATE OR REPLACE FUNCTION public.rpc_fechamento_reabrir(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT has_permission(auth.uid(),'financeiro.reabrir_periodo') AND NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão financeiro.reabrir_periodo'; END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN RAISE EXCEPTION 'Motivo obrigatório (>=5 chars)'; END IF;
  UPDATE fechamentos_periodo SET status='REABERTO', reaberto_em=now(), reaberto_por=auth.uid(), motivo_reabertura=p_motivo, updated_at=now() WHERE id=p_id AND deleted_at IS NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_fechamento_abrir(uuid,date,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_fechamento_fechar(uuid,numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_fechamento_reabrir(uuid,text) FROM anon;

-- 3) RPCs de conciliação sobre extrato_banco
CREATE OR REPLACE FUNCTION public.rpc_extrato_conciliar(p_extrato_id uuid, p_titulo_id uuid DEFAULT NULL, p_movimento_id uuid DEFAULT NULL, p_observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT has_permission(auth.uid(),'financeiro.conciliar') AND NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão financeiro.conciliar'; END IF;
  IF p_titulo_id IS NULL AND p_movimento_id IS NULL THEN RAISE EXCEPTION 'Informe titulo_id ou movimento_id'; END IF;
  UPDATE extrato_banco SET status='CONCILIADO', titulo_id=p_titulo_id, movimento_id=p_movimento_id,
    observacao=COALESCE(p_observacao, observacao), updated_at=now()
  WHERE id=p_extrato_id AND deleted_at IS NULL;
END $$;
CREATE OR REPLACE FUNCTION public.rpc_extrato_desconciliar(p_extrato_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT has_permission(auth.uid(),'financeiro.conciliar') AND NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão financeiro.conciliar'; END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN RAISE EXCEPTION 'Motivo obrigatório (>=5 chars)'; END IF;
  UPDATE extrato_banco SET status='PENDENTE', titulo_id=NULL, movimento_id=NULL,
    observacao=COALESCE(observacao,'')||E'\nDesconciliado: '||p_motivo, updated_at=now()
  WHERE id=p_extrato_id AND deleted_at IS NULL;
END $$;
CREATE OR REPLACE FUNCTION public.rpc_extrato_ignorar(p_extrato_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT has_permission(auth.uid(),'financeiro.conciliar') AND NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão financeiro.conciliar'; END IF;
  UPDATE extrato_banco SET status='IGNORADO', observacao=COALESCE(observacao,'')||E'\nIgnorado: '||COALESCE(p_motivo,''), updated_at=now()
  WHERE id=p_extrato_id AND deleted_at IS NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_extrato_conciliar(uuid,uuid,uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_extrato_desconciliar(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_extrato_ignorar(uuid,text) FROM anon;

-- 4) View v_fluxo_caixa_oficial
CREATE OR REPLACE VIEW public.v_fluxo_caixa_oficial WITH (security_invoker=on) AS
SELECT
  COALESCE(data_referencia, competencia)::date AS data,
  conta_id,
  tipo_lancamento,
  natureza_temporal,
  natureza_id,
  centro_resultado_id,
  count(*) AS qtde,
  COALESCE(sum(valor), 0) AS total
FROM public.v_lancamentos_derivados
WHERE COALESCE(data_referencia, competencia) IS NOT NULL
GROUP BY 1,2,3,4,5,6;
GRANT SELECT ON public.v_fluxo_caixa_oficial TO authenticated;

-- 5) View v_cmv_oficial
CREATE OR REPLACE VIEW public.v_cmv_oficial WITH (security_invoker=on) AS
SELECT
  tf.centro_id AS centro_resultado_id,
  tf.natureza_id,
  tf.fornecedor_id,
  date_trunc('month', COALESCE(tf.competencia, tf.vencimento, tf.created_at::date))::date AS competencia,
  count(*) AS qtde_titulos,
  COALESCE(sum(tf.valor_liquido), 0) AS custo_total,
  COALESCE(sum(CASE WHEN tf.status='LIQUIDADO' THEN tf.valor_liquido ELSE 0 END), 0) AS custo_realizado,
  COALESCE(sum(CASE WHEN tf.status IN ('PENDENTE','PARCIAL') THEN tf.saldo ELSE 0 END), 0) AS custo_previsto
FROM public.titulos_financeiros tf
WHERE tf.tipo='AP' AND tf.deleted_at IS NULL
GROUP BY 1,2,3,4;
GRANT SELECT ON public.v_cmv_oficial TO authenticated;
