
-- ============================================================================
-- D15.1.a.0.i+ — Consolidação Estrutural Financeira
-- Apenas estrutura. Nenhuma carga de dados. Nenhuma alteração de RPCs/views.
-- Trigger updated_at: public.tg_set_updated_at (função existente no projeto).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) FORNECEDORES (global)
-- ----------------------------------------------------------------------------
CREATE TABLE public.fornecedores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text,
  nome            text NOT NULL,
  tipo_pessoa     text NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PJ','PF')),
  documento       text,
  inscricao_est   text,
  email           text,
  telefone        text,
  telefone2       text,
  cep             text,
  rua             text,
  numero          text,
  complemento     text,
  bairro          text,
  cidade          text,
  uf              text,
  banco_id        uuid REFERENCES public.bancos(id),
  banco_agencia   text,
  banco_conta     text,
  banco_tipo      text,
  pix_chave       text,
  observacoes     text,
  ativo           boolean NOT NULL DEFAULT true,
  dados           jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  deleted_by      uuid,
  deleted_reason  text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY fornecedores_select_auth ON public.fornecedores
  FOR SELECT TO authenticated USING (deleted_at IS NULL OR is_admin(auth.uid()));

CREATE POLICY fornecedores_admin_write ON public.fornecedores
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_fornecedores_nome_lower
  ON public.fornecedores (lower(nome)) WHERE deleted_at IS NULL;
CREATE INDEX idx_fornecedores_doc
  ON public.fornecedores (documento) WHERE deleted_at IS NULL;
CREATE INDEX idx_fornecedores_codigo_lower
  ON public.fornecedores (lower(codigo)) WHERE deleted_at IS NULL;
CREATE INDEX idx_fornecedores_ativo
  ON public.fornecedores (ativo) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_fornecedores_updated
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- 2) BOLETOS (lote de compra / NF)
-- ----------------------------------------------------------------------------
CREATE TABLE public.boletos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text,
  fornecedor_id   uuid REFERENCES public.fornecedores(id),
  titulo_id       uuid REFERENCES public.titulos_financeiros(id),
  numero_nf       text,
  numero_boleto   text,
  data_emissao    date,
  data_entrada    date,
  valor_total     numeric NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  status          text NOT NULL DEFAULT 'ABERTO'
                  CHECK (status IN ('ABERTO','ESTOCADO','CANCELADO')),
  observacoes     text,
  dados           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  cancelado_em    timestamptz,
  motivo_cancelamento text,
  deleted_at      timestamptz,
  deleted_by      uuid,
  deleted_reason  text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletos TO authenticated;
GRANT ALL ON public.boletos TO service_role;

ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY boletos_select ON public.boletos
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
    OR has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
  );

CREATE POLICY boletos_write ON public.boletos
  FOR ALL TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
  );

CREATE INDEX idx_boletos_fornecedor ON public.boletos (fornecedor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_boletos_titulo ON public.boletos (titulo_id);
CREATE INDEX idx_boletos_status ON public.boletos (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_boletos_data_emissao ON public.boletos (data_emissao DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_boletos_codigo_lower ON public.boletos (lower(codigo)) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_boletos_updated
  BEFORE UPDATE ON public.boletos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3) BOLETOS_ITENS
-- ----------------------------------------------------------------------------
CREATE TABLE public.boletos_itens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boleto_id       uuid NOT NULL REFERENCES public.boletos(id) ON DELETE CASCADE,
  produto_id      uuid,
  descricao       text,
  quantidade      numeric NOT NULL CHECK (quantidade > 0),
  custo_unitario  numeric NOT NULL DEFAULT 0 CHECK (custo_unitario >= 0),
  custo_total     numeric NOT NULL DEFAULT 0 CHECK (custo_total >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletos_itens TO authenticated;
GRANT ALL ON public.boletos_itens TO service_role;

ALTER TABLE public.boletos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY boletos_itens_select ON public.boletos_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boletos b WHERE b.id = boletos_itens.boleto_id));

CREATE POLICY boletos_itens_write ON public.boletos_itens
  FOR ALL TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'estoque.comprar'::app_permission)
  );

CREATE INDEX idx_boletos_itens_boleto ON public.boletos_itens (boleto_id);
CREATE INDEX idx_boletos_itens_produto ON public.boletos_itens (produto_id);

-- ----------------------------------------------------------------------------
-- 4) RESCISOES_CONTRATO
-- ----------------------------------------------------------------------------
CREATE TABLE public.rescisoes_contrato (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                text,
  contrato_id           uuid NOT NULL REFERENCES public.contratos(id),
  cliente_id            uuid REFERENCES public.clientes(id),
  data_rescisao         date NOT NULL DEFAULT current_date,
  motivo                text NOT NULL,
  responsavel_id        uuid,
  valor_recebido        numeric NOT NULL DEFAULT 0 CHECK (valor_recebido >= 0),
  multa_tipo            text NOT NULL DEFAULT 'percentual'
                        CHECK (multa_tipo IN ('percentual','fixo')),
  multa_valor           numeric NOT NULL DEFAULT 0 CHECK (multa_valor >= 0),
  multa_calculada       numeric NOT NULL DEFAULT 0 CHECK (multa_calculada >= 0),
  devolucao_liquida     numeric NOT NULL DEFAULT 0,
  conta_devolucao_id    uuid REFERENCES public.contas_financeiras(id),
  vencimento_devolucao  date,
  titulo_devolucao_id   uuid REFERENCES public.titulos_financeiros(id),
  status                text NOT NULL DEFAULT 'CONFIRMADA'
                        CHECK (status IN ('SIMULADA','CONFIRMADA','CANCELADA')),
  observacoes           text,
  dados                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  deleted_at            timestamptz,
  deleted_by            uuid,
  deleted_reason        text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rescisoes_contrato TO authenticated;
GRANT ALL ON public.rescisoes_contrato TO service_role;

ALTER TABLE public.rescisoes_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY rescisoes_select_via_contrato ON public.rescisoes_contrato
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id = rescisoes_contrato.contrato_id
        AND c.consultor_id = auth.uid()
    )
  );

CREATE POLICY rescisoes_insert_via_contrato ON public.rescisoes_contrato
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id = rescisoes_contrato.contrato_id
        AND c.consultor_id = auth.uid()
    )
  );

CREATE POLICY rescisoes_update_via_contrato ON public.rescisoes_contrato
  FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id = rescisoes_contrato.contrato_id
        AND c.consultor_id = auth.uid()
    )
  );

CREATE POLICY rescisoes_delete_admin ON public.rescisoes_contrato
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE INDEX idx_rescisoes_contrato ON public.rescisoes_contrato (contrato_id);
CREATE INDEX idx_rescisoes_cliente ON public.rescisoes_contrato (cliente_id);
CREATE INDEX idx_rescisoes_data ON public.rescisoes_contrato (data_rescisao DESC);
CREATE INDEX idx_rescisoes_status ON public.rescisoes_contrato (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_rescisoes_updated
  BEFORE UPDATE ON public.rescisoes_contrato
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5) RESCISOES_ITENS (títulos cancelados na rescisão)
-- ----------------------------------------------------------------------------
CREATE TABLE public.rescisoes_itens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rescisao_id       uuid NOT NULL REFERENCES public.rescisoes_contrato(id) ON DELETE CASCADE,
  titulo_id         uuid NOT NULL REFERENCES public.titulos_financeiros(id),
  saldo_cancelado   numeric NOT NULL CHECK (saldo_cancelado >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rescisao_id, titulo_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rescisoes_itens TO authenticated;
GRANT ALL ON public.rescisoes_itens TO service_role;

ALTER TABLE public.rescisoes_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY rescisoes_itens_select ON public.rescisoes_itens
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rescisoes_contrato r
      JOIN public.contratos c ON c.id = r.contrato_id
      WHERE r.id = rescisoes_itens.rescisao_id
        AND c.consultor_id = auth.uid()
    )
  );

CREATE POLICY rescisoes_itens_write ON public.rescisoes_itens
  FOR ALL TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rescisoes_contrato r
      JOIN public.contratos c ON c.id = r.contrato_id
      WHERE r.id = rescisoes_itens.rescisao_id
        AND c.consultor_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rescisoes_contrato r
      JOIN public.contratos c ON c.id = r.contrato_id
      WHERE r.id = rescisoes_itens.rescisao_id
        AND c.consultor_id = auth.uid()
    )
  );

CREATE INDEX idx_rescisoes_itens_rescisao ON public.rescisoes_itens (rescisao_id);
CREATE INDEX idx_rescisoes_itens_titulo ON public.rescisoes_itens (titulo_id);

-- ----------------------------------------------------------------------------
-- 6) EXTRATO_BANCO
-- ----------------------------------------------------------------------------
CREATE TABLE public.extrato_banco (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id        uuid NOT NULL REFERENCES public.contas_financeiras(id),
  data            date NOT NULL,
  descricao       text NOT NULL,
  valor           numeric NOT NULL,
  documento       text,
  status          text NOT NULL DEFAULT 'PENDENTE'
                  CHECK (status IN ('PENDENTE','CONCILIADO','IGNORADO')),
  titulo_id       uuid REFERENCES public.titulos_financeiros(id),
  movimento_id    uuid REFERENCES public.movimentacoes_financeiras(id),
  observacao      text,
  hash_linha      text,
  importado_em    timestamptz NOT NULL DEFAULT now(),
  importado_por   uuid,
  dados           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  deleted_by      uuid,
  deleted_reason  text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extrato_banco TO authenticated;
GRANT ALL ON public.extrato_banco TO service_role;

ALTER TABLE public.extrato_banco ENABLE ROW LEVEL SECURITY;

CREATE POLICY extrato_select ON public.extrato_banco
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
  );

CREATE POLICY extrato_admin_write ON public.extrato_banco
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX idx_extrato_conta_data ON public.extrato_banco (conta_id, data DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_extrato_status ON public.extrato_banco (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_extrato_titulo ON public.extrato_banco (titulo_id);
CREATE INDEX idx_extrato_movimento ON public.extrato_banco (movimento_id);
CREATE INDEX idx_extrato_hash ON public.extrato_banco (conta_id, hash_linha) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_extrato_updated
  BEFORE UPDATE ON public.extrato_banco
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- 7) TITULOS_TAXAS (encargos aplicados ao título, fora das baixas)
-- ----------------------------------------------------------------------------
CREATE TABLE public.titulos_taxas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id         uuid NOT NULL REFERENCES public.titulos_financeiros(id) ON DELETE RESTRICT,
  parcela_id        uuid REFERENCES public.parcelas_financeiras(id) ON DELETE RESTRICT,
  tipo              text NOT NULL
                    CHECK (tipo IN ('juros','multa','desconto','iof','tarifa','outros')),
  valor             numeric NOT NULL CHECK (valor >= 0),
  data_aplicacao    date NOT NULL DEFAULT current_date,
  motivo            text,
  observacao        text,
  user_id           uuid,
  user_email        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.titulos_taxas TO authenticated;
GRANT ALL ON public.titulos_taxas TO service_role;

ALTER TABLE public.titulos_taxas ENABLE ROW LEVEL SECURITY;

CREATE POLICY tt_select_via_titulo ON public.titulos_taxas
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.titulos_financeiros t
      WHERE t.id = titulos_taxas.titulo_id
        AND t.consultor_id = auth.uid()
    )
  );

CREATE POLICY tt_insert_via_titulo ON public.titulos_taxas
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.titulos_financeiros t
      WHERE t.id = titulos_taxas.titulo_id
        AND t.consultor_id = auth.uid()
    )
  );

CREATE POLICY tt_delete_admin ON public.titulos_taxas
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Sem UPDATE: taxas são imutáveis (auditoria). Ajustes via estorno + nova taxa.

CREATE INDEX idx_titulos_taxas_titulo ON public.titulos_taxas (titulo_id);
CREATE INDEX idx_titulos_taxas_parcela ON public.titulos_taxas (parcela_id);
CREATE INDEX idx_titulos_taxas_tipo_data ON public.titulos_taxas (tipo, data_aplicacao DESC);
