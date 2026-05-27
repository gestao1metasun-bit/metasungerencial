
CREATE TABLE public.adiantamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  natureza text NOT NULL CHECK (natureza IN (
    'SINAL_CLIENTE','ENTRADA_CLIENTE','ANTECIPACAO_CLIENTE',
    'SINAL_FORNECEDOR','ADIANTAMENTO_FORNECEDOR','ADIANTAMENTO_FUNCIONARIO','OUTRO'
  )),
  direcao text NOT NULL CHECK (direcao IN ('RECEBIDO','PAGO')),
  origem_tipo text CHECK (origem_tipo IN ('contrato','pedido_venda','fornecedor','funcionario','livre')),
  origem_id uuid,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  pv_id uuid REFERENCES public.pedidos_venda(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  consultor_id uuid,
  data_movimento date NOT NULL DEFAULT CURRENT_DATE,
  competencia date,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  valor_abatido numeric(14,2) NOT NULL DEFAULT 0 CHECK (valor_abatido >= 0),
  saldo numeric(14,2) GENERATED ALWAYS AS (valor - valor_abatido) STORED,
  status text NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','PARCIAL','QUITADO','CANCELADO','ESTORNADO')),
  forma_pagamento text,
  conta_id uuid,
  documento text,
  observacao text,
  legacy_id text,
  legacy_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.adiantamentos TO authenticated;
GRANT ALL ON public.adiantamentos TO service_role;

ALTER TABLE public.adiantamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adiantamentos_select" ON public.adiantamentos FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR consultor_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
  )
);

CREATE POLICY "adiantamentos_insert" ON public.adiantamentos FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_permission(auth.uid(), 'financeiro.movimentar'::app_permission)
);

CREATE POLICY "adiantamentos_update" ON public.adiantamentos FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_permission(auth.uid(), 'financeiro.editar'::app_permission)
);

CREATE POLICY "adiantamentos_delete" ON public.adiantamentos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_adiantamentos_updated_at
BEFORE UPDATE ON public.adiantamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_adiantamentos_status         ON public.adiantamentos(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_natureza       ON public.adiantamentos(natureza) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_direcao        ON public.adiantamentos(direcao) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_contrato       ON public.adiantamentos(contrato_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_pv             ON public.adiantamentos(pv_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_cliente        ON public.adiantamentos(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_fornecedor     ON public.adiantamentos(fornecedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_data           ON public.adiantamentos(data_movimento DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_competencia    ON public.adiantamentos(competencia) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_origem         ON public.adiantamentos(origem_tipo, origem_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_adiantamentos_legacy         ON public.adiantamentos(legacy_id, legacy_source) WHERE legacy_id IS NOT NULL;
CREATE INDEX idx_adiantamentos_codigo_lower   ON public.adiantamentos(lower(codigo)) WHERE deleted_at IS NULL;

CREATE TABLE public.adiantamento_abatimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adiantamento_id uuid NOT NULL REFERENCES public.adiantamentos(id) ON DELETE RESTRICT,
  titulo_id uuid REFERENCES public.titulos_financeiros(id) ON DELETE RESTRICT,
  parcela_id uuid REFERENCES public.parcelas_financeiras(id) ON DELETE RESTRICT,
  movimentacao_id uuid REFERENCES public.movimentacoes_financeiras(id) ON DELETE SET NULL,
  data_abatimento date NOT NULL DEFAULT CURRENT_DATE,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  observacao text,
  estornado boolean NOT NULL DEFAULT false,
  estornado_em timestamptz,
  estornado_por uuid,
  estorno_motivo text,
  legacy_id text,
  legacy_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT chk_abat_destino CHECK (titulo_id IS NOT NULL OR parcela_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.adiantamento_abatimentos TO authenticated;
GRANT ALL ON public.adiantamento_abatimentos TO service_role;

ALTER TABLE public.adiantamento_abatimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adiantamento_abat_select" ON public.adiantamento_abatimentos FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
  OR created_by = auth.uid()
);

CREATE POLICY "adiantamento_abat_insert" ON public.adiantamento_abatimentos FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_permission(auth.uid(), 'financeiro.movimentar'::app_permission)
);

CREATE POLICY "adiantamento_abat_update" ON public.adiantamento_abatimentos FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "adiantamento_abat_delete" ON public.adiantamento_abatimentos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_abat_adiantamento ON public.adiantamento_abatimentos(adiantamento_id);
CREATE INDEX idx_abat_titulo       ON public.adiantamento_abatimentos(titulo_id) WHERE titulo_id IS NOT NULL;
CREATE INDEX idx_abat_parcela      ON public.adiantamento_abatimentos(parcela_id) WHERE parcela_id IS NOT NULL;
CREATE INDEX idx_abat_movimentacao ON public.adiantamento_abatimentos(movimentacao_id) WHERE movimentacao_id IS NOT NULL;
CREATE INDEX idx_abat_data         ON public.adiantamento_abatimentos(data_abatimento DESC);
CREATE INDEX idx_abat_ativos       ON public.adiantamento_abatimentos(adiantamento_id) WHERE estornado = false;
CREATE INDEX idx_abat_legacy       ON public.adiantamento_abatimentos(legacy_id, legacy_source) WHERE legacy_id IS NOT NULL;
