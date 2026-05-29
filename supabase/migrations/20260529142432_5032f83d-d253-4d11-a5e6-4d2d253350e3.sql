
-- =====================================================
-- D18.3 — Comercial / Faturamento / NF-Ready
-- =====================================================

-- ---------- 1) CONTRATOS FISCAL-READY ----------
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS competencia            date,
  ADD COLUMN IF NOT EXISTS tipo_documento_fiscal  text,
  ADD COLUMN IF NOT EXISTS situacao_fiscal        text NOT NULL DEFAULT 'NAO_APLICAVEL',
  ADD COLUMN IF NOT EXISTS codigo_externo         text,
  ADD COLUMN IF NOT EXISTS sistema_destino        text,
  ADD COLUMN IF NOT EXISTS status_integracao      text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao        timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao        text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id     uuid;

DO $$ BEGIN
  ALTER TABLE public.contratos ADD CONSTRAINT contratos_tipo_doc_fiscal_chk
    CHECK (tipo_documento_fiscal IS NULL OR tipo_documento_fiscal = ANY (ARRAY['NFE','NFSE','NFCE','CTE','MDFE','RECIBO','CONTRATO','OUTRO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contratos ADD CONSTRAINT contratos_situacao_fiscal_chk
    CHECK (situacao_fiscal = ANY (ARRAY['NAO_APLICAVEL','PENDENTE','PREPARADO','EMITIDO','CANCELADO','ERRO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contratos ADD CONSTRAINT contratos_status_integracao_chk
    CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_contratos_competencia    ON public.contratos(competencia) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_sit_fiscal     ON public.contratos(situacao_fiscal) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_status_integr  ON public.contratos(status_integracao) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_codigo_externo ON public.contratos(codigo_externo) WHERE codigo_externo IS NOT NULL;

-- ---------- 2) PEDIDOS DE VENDA FISCAL-READY ----------
ALTER TABLE public.pedidos_venda DROP CONSTRAINT IF EXISTS pv_status_faturamento_chk;
UPDATE public.pedidos_venda SET status_faturamento = 'NAO_FATURADO' WHERE status_faturamento = 'PENDENTE';
ALTER TABLE public.pedidos_venda ALTER COLUMN status_faturamento SET DEFAULT 'NAO_FATURADO';
ALTER TABLE public.pedidos_venda ADD CONSTRAINT pv_status_faturamento_chk
  CHECK (status_faturamento = ANY (ARRAY['NAO_FATURADO','PARCIALMENTE_FATURADO','FATURADO','CANCELADO','NAO_APLICAVEL']));

ALTER TABLE public.pedidos_venda
  ADD COLUMN IF NOT EXISTS valor_faturado     numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_faturamento   date,
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao    text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id uuid;

DO $$ BEGIN
  ALTER TABLE public.pedidos_venda ADD CONSTRAINT pv_status_integracao_chk
    CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pv_codigo_externo  ON public.pedidos_venda(codigo_externo) WHERE codigo_externo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pv_status_integr   ON public.pedidos_venda(status_integracao) WHERE deleted_at IS NULL;

-- ---------- 3) CLIENTES ----------
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_pessoa        text NOT NULL DEFAULT 'PF',
  ADD COLUMN IF NOT EXISTS rg                 text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text,
  ADD COLUMN IF NOT EXISTS regime_tributario  text,
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao    text;

DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_tipo_pessoa_chk
    CHECK (tipo_pessoa = ANY (ARRAY['PF','PJ','EX']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_regime_trib_chk
    CHECK (regime_tributario IS NULL OR regime_tributario = ANY (ARRAY['SIMPLES','LUCRO_PRESUMIDO','LUCRO_REAL','MEI','ISENTO','NAO_INFORMADO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_status_integracao_chk
    CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_clientes_tipo_pessoa    ON public.clientes(tipo_pessoa) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_externo ON public.clientes(codigo_externo) WHERE codigo_externo IS NOT NULL;

-- ---------- 4) PRODUTOS ----------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS tipo_item         text NOT NULL DEFAULT 'MATERIAL',
  ADD COLUMN IF NOT EXISTS ncm               text,
  ADD COLUMN IF NOT EXISTS cfop_padrao       text,
  ADD COLUMN IF NOT EXISTS cst_padrao        text,
  ADD COLUMN IF NOT EXISTS origem_fiscal     text,
  ADD COLUMN IF NOT EXISTS codigo_servico_lc116 text,
  ADD COLUMN IF NOT EXISTS codigo_externo    text,
  ADD COLUMN IF NOT EXISTS sistema_destino   text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE';

DO $$ BEGIN
  ALTER TABLE public.produtos ADD CONSTRAINT produtos_tipo_item_chk
    CHECK (tipo_item = ANY (ARRAY['MATERIAL','SERVICO','KIT','REVENDA','CONSUMO','IMOBILIZADO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.produtos ADD CONSTRAINT produtos_status_integracao_chk
    CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_prod_tipo_item ON public.produtos(tipo_item);
CREATE INDEX IF NOT EXISTS idx_prod_ncm       ON public.produtos(ncm) WHERE ncm IS NOT NULL;

-- ---------- 5) TÍTULOS — Retenções (idempotente) ----------
ALTER TABLE public.titulos_financeiros
  ADD COLUMN IF NOT EXISTS valor_iss    numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_inss   numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_irrf   numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pis    numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_cofins numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_csll   numeric(14,2) NOT NULL DEFAULT 0;

-- ---------- 6) FATURAMENTOS COMERCIAIS ----------
CREATE TABLE IF NOT EXISTS public.faturamentos_comercial (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_venda_id          uuid REFERENCES public.pedidos_venda(id) ON DELETE SET NULL,
  contrato_id              uuid REFERENCES public.contratos(id)     ON DELETE SET NULL,
  cliente_id               uuid REFERENCES public.clientes(id)      ON DELETE SET NULL,
  numero_interno           text,
  data_emissao             date NOT NULL DEFAULT CURRENT_DATE,
  competencia              date,
  natureza_receita_id      uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  centro_resultado_id      uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  centro_custo_id          uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  tipo_documento_fiscal    text,
  situacao                 text NOT NULL DEFAULT 'PREPARADO',
  valor_bruto              numeric(14,2) NOT NULL DEFAULT 0,
  valor_desconto           numeric(14,2) NOT NULL DEFAULT 0,
  valor_acrescimo          numeric(14,2) NOT NULL DEFAULT 0,
  valor_iss                numeric(14,2) NOT NULL DEFAULT 0,
  valor_inss               numeric(14,2) NOT NULL DEFAULT 0,
  valor_irrf               numeric(14,2) NOT NULL DEFAULT 0,
  valor_pis                numeric(14,2) NOT NULL DEFAULT 0,
  valor_cofins             numeric(14,2) NOT NULL DEFAULT 0,
  valor_csll               numeric(14,2) NOT NULL DEFAULT 0,
  valor_liquido            numeric(14,2) NOT NULL DEFAULT 0,
  observacao               text,
  numero_nf                text,
  serie_nf                 text,
  chave_nfe                text,
  data_emissao_nf          timestamptz,
  codigo_externo           text,
  sistema_destino          text,
  status_integracao        text NOT NULL DEFAULT 'PENDENTE',
  data_integracao          timestamptz,
  hash_integracao          text,
  lote_integracao_id       uuid,
  cancelado                boolean NOT NULL DEFAULT false,
  motivo_cancelamento      text,
  row_version              integer NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  deleted_reason           text,
  deleted_by               uuid,
  CONSTRAINT fat_situacao_chk CHECK (situacao = ANY (ARRAY['PREPARADO','FATURADO','CANCELADO','ESTORNADO','ERRO'])),
  CONSTRAINT fat_tipo_doc_chk CHECK (tipo_documento_fiscal IS NULL OR tipo_documento_fiscal = ANY (ARRAY['NFE','NFSE','NFCE','CTE','MDFE','RECIBO','CONTRATO','OUTRO'])),
  CONSTRAINT fat_status_integracao_chk CHECK (status_integracao = ANY (ARRAY['PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO']))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturamentos_comercial TO authenticated;
GRANT ALL ON public.faturamentos_comercial TO service_role;

ALTER TABLE public.faturamentos_comercial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fat_select_auth" ON public.faturamentos_comercial FOR SELECT TO authenticated USING (true);
CREATE POLICY "fat_insert_auth" ON public.faturamentos_comercial FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fat_update_auth" ON public.faturamentos_comercial FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fat_delete_admin" ON public.faturamentos_comercial FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fat_pv          ON public.faturamentos_comercial(pedido_venda_id);
CREATE INDEX IF NOT EXISTS idx_fat_contrato    ON public.faturamentos_comercial(contrato_id);
CREATE INDEX IF NOT EXISTS idx_fat_cliente     ON public.faturamentos_comercial(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fat_situacao    ON public.faturamentos_comercial(situacao) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fat_competencia ON public.faturamentos_comercial(competencia) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fat_status_integr ON public.faturamentos_comercial(status_integracao) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_fat_updated_at  BEFORE UPDATE ON public.faturamentos_comercial FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at_generic();
CREATE TRIGGER trg_fat_row_version BEFORE INSERT OR UPDATE ON public.faturamentos_comercial FOR EACH ROW EXECUTE FUNCTION tg_bump_row_version();
CREATE TRIGGER trg_fat_audit       AFTER INSERT OR UPDATE OR DELETE ON public.faturamentos_comercial FOR EACH ROW EXECUTE FUNCTION tg_audit_row('comercial', 'faturamento');

-- ---------- 7) CATÁLOGO DE EVENTOS COMERCIAIS ----------
CREATE TABLE IF NOT EXISTS public.comercial_eventos_catalogo (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento           text NOT NULL UNIQUE,
  descricao        text NOT NULL,
  evento_canonico  text NOT NULL,
  ativo            boolean NOT NULL DEFAULT true,
  observacoes      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cec_evento_canonico_chk CHECK (evento_canonico = ANY (ARRAY['VENDA','RECEBIMENTO','PAGAMENTO','COMPRA','ENTRADA_ESTOQUE','SAIDA_ESTOQUE','COMISSAO','SERVICO_OBRA','EMPRESTIMO','APORTE','RENEGOCIACAO','RESCISAO','OPERACAO_FINANCEIRA']))
);

GRANT SELECT ON public.comercial_eventos_catalogo TO authenticated;
GRANT ALL ON public.comercial_eventos_catalogo TO service_role;
ALTER TABLE public.comercial_eventos_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cec_select_auth" ON public.comercial_eventos_catalogo FOR SELECT TO authenticated USING (true);
CREATE POLICY "cec_admin_write" ON public.comercial_eventos_catalogo FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_cec_updated_at BEFORE UPDATE ON public.comercial_eventos_catalogo FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at_generic();

INSERT INTO public.comercial_eventos_catalogo (evento, descricao, evento_canonico)
SELECT v.evento, v.descricao, v.canonico FROM (VALUES
  ('CONTRATO_APROVADO',      'Contrato aprovado pelo gestor',     'VENDA'),
  ('CONTRATO_ASSINADO',      'Contrato assinado pelo cliente',    'VENDA'),
  ('CONTRATO_ADITIVADO',     'Aditivo contratual aplicado',       'VENDA'),
  ('CONTRATO_CANCELADO',     'Cancelamento contratual',           'RESCISAO'),
  ('PEDIDO_VENDA_APROVADO',  'Pedido de Venda aprovado',          'VENDA'),
  ('PEDIDO_VENDA_FATURADO',  'Faturamento de Pedido de Venda',    'VENDA'),
  ('PEDIDO_VENDA_CANCELADO', 'Cancelamento de Pedido de Venda',   'RESCISAO'),
  ('FATURAMENTO_EMITIDO',    'Faturamento emitido',               'VENDA'),
  ('FATURAMENTO_CANCELADO',  'Faturamento cancelado',             'RESCISAO'),
  ('FATURAMENTO_ESTORNADO',  'Faturamento estornado',             'RESCISAO')
) AS v(evento, descricao, canonico)
WHERE NOT EXISTS (SELECT 1 FROM public.comercial_eventos_catalogo c WHERE c.evento = v.evento);

-- ---------- 8) Comentários ----------
COMMENT ON COLUMN public.contratos.situacao_fiscal IS 'D18.3: status fiscal preparatório. ERP não emite NF — uso para integração futura.';
COMMENT ON COLUMN public.pedidos_venda.status_faturamento IS 'D18.3: NAO_FATURADO/PARCIALMENTE_FATURADO/FATURADO/CANCELADO/NAO_APLICAVEL.';
COMMENT ON TABLE  public.faturamentos_comercial IS 'D18.3: camada preparatória de faturamento. Não emite NF, não calcula tributo.';
COMMENT ON TABLE  public.comercial_eventos_catalogo IS 'D18.3: catálogo dos eventos comerciais e seu mapeamento para o evento canônico de mapeamentos_contabeis.';
