-- FIN.MIG.1b — Tabelas do módulo Financiamentos

-- 1) Gerentes de banco
CREATE TABLE IF NOT EXISTS public.financiamentos_gerentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  banco_nome text,
  telefone text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  criado_por uuid,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financiamentos_gerentes TO authenticated;
GRANT ALL ON public.financiamentos_gerentes TO service_role;

ALTER TABLE public.financiamentos_gerentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_ger_select" ON public.financiamentos_gerentes
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'financiamento.visualizar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_ger_insert" ON public.financiamentos_gerentes
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'financiamento.gerenciar_cadastros'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_ger_update" ON public.financiamentos_gerentes
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'financiamento.gerenciar_cadastros'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_ger_delete_admin" ON public.financiamentos_gerentes
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fin_ger_banco ON public.financiamentos_gerentes (banco_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_ger_ativo ON public.financiamentos_gerentes (ativo) WHERE deleted_at IS NULL;

-- 2) Carteira de operações de financiamento
CREATE TABLE IF NOT EXISTS public.financiamentos_operacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome text NOT NULL,
  vendedor text,
  vendedor_id uuid,
  pfpj text NOT NULL DEFAULT 'PF' CHECK (pfpj IN ('PF','PJ')),
  cpfcnpj text,
  valor_contrato numeric(14,2) NOT NULL DEFAULT 0,
  valor_financiado numeric(14,2) NOT NULL DEFAULT 0,
  kwp numeric(10,2),
  banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  banco_nome text,
  gerente_id uuid REFERENCES public.financiamentos_gerentes(id) ON DELETE SET NULL,
  gerente_nome text,
  envio_em date,
  status text NOT NULL DEFAULT 'SEM_CONTRATO' CHECK (status IN (
    'SEM_CONTRATO','COM_CONTRATO','EM_ANALISE','PENDENTE_BANCO','PENDENTE_CLIENTE',
    'AGUARDANDO_DOCUMENTACAO','AGUARDANDO_LIBERACAO','APROVADO','LIBERADO',
    'FINALIZADO','CANCELADO'
  )),
  prazo_dias integer NOT NULL DEFAULT 0,
  data_base date,
  previsao_liberacao date,
  andamento text,
  observacao text,
  motivo_cancelamento text,
  cancelado_em timestamptz,
  cancelado_por uuid,
  finalizado_em timestamptz,
  finalizado_por uuid,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financiamentos_operacoes TO authenticated;
GRANT ALL ON public.financiamentos_operacoes TO service_role;

ALTER TABLE public.financiamentos_operacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_op_select" ON public.financiamentos_operacoes
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'financiamento.visualizar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_op_insert" ON public.financiamentos_operacoes
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'financiamento.criar'::app_permission) OR is_admin(auth.uid()));

CREATE POLICY "fin_op_update" ON public.financiamentos_operacoes
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'financiamento.editar'::app_permission)
      OR has_permission(auth.uid(), 'financiamento.aprovar'::app_permission)
      OR has_permission(auth.uid(), 'financiamento.finalizar'::app_permission)
      OR has_permission(auth.uid(), 'financiamento.cancelar'::app_permission)
      OR is_admin(auth.uid()));

CREATE POLICY "fin_op_delete_admin" ON public.financiamentos_operacoes
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fin_op_status ON public.financiamentos_operacoes (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_op_banco ON public.financiamentos_operacoes (banco_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_op_gerente ON public.financiamentos_operacoes (gerente_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_op_contrato ON public.financiamentos_operacoes (contrato_id) WHERE deleted_at IS NULL AND contrato_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_op_cliente_nome ON public.financiamentos_operacoes (lower(cliente_nome)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fin_op_previsao ON public.financiamentos_operacoes (previsao_liberacao) WHERE deleted_at IS NULL AND status NOT IN ('FINALIZADO','CANCELADO');

-- 3) Triggers de updated_at + row_version (reusa padrão do ERP)
CREATE OR REPLACE FUNCTION public.fn_fin_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_fin_ger_touch ON public.financiamentos_gerentes;
CREATE TRIGGER tg_fin_ger_touch BEFORE UPDATE ON public.financiamentos_gerentes
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_touch();

DROP TRIGGER IF EXISTS tg_fin_op_touch ON public.financiamentos_operacoes;
CREATE TRIGGER tg_fin_op_touch BEFORE UPDATE ON public.financiamentos_operacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_touch();

-- 4) Seeds mínimos de bancos usuais (idempotente por código)
INSERT INTO public.bancos (codigo, nome, ativo)
SELECT x.codigo, x.nome, true FROM (VALUES
  ('341','Itaú'),('001','Banco do Brasil'),('104','Caixa Econômica'),('237','Bradesco'),
  ('033','Santander'),('077','Banco Inter'),('260','Nubank'),('336','C6 Bank'),
  ('290','PagBank'),('380','PicPay'),('623','Banco Pan'),('655','Votorantim'),
  ('707','Daycoval'),('212','Banco Original'),('756','Sicoob'),('748','Sicredi'),
  ('422','Safra'),('070','BRB'),('085','Ailos'),('097','Sisprime')
) AS x(codigo, nome)
WHERE NOT EXISTS (SELECT 1 FROM public.bancos b WHERE b.codigo = x.codigo);