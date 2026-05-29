
-- ============================================================
-- D18.2 — Cadastros, Centros e Estrutura Contábil-Ready
-- Fundação universal para integração futura.
-- Sem fiscal/contábil interno. Sem alteração de RLS operacional.
-- ============================================================

-- ------------------------------------------------------------
-- 1) centros_custo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'GERAL',
  area_default text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  -- integrabilidade
  codigo_externo text,
  sistema_destino text,
  status_integracao text NOT NULL DEFAULT 'PENDENTE',
  data_integracao timestamptz,
  hash_integracao text,
  -- padrão
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  deleted_reason text,
  CONSTRAINT centros_custo_tipo_chk CHECK (tipo IN ('OBRA','EQUIPE','VENDEDOR','VEICULO','ALMOXARIFADO','ADMINISTRATIVO','GERAL')),
  CONSTRAINT centros_custo_status_integracao_chk CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY centros_custo_select_auth ON public.centros_custo FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY centros_custo_admin_write ON public.centros_custo
    FOR ALL TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS tg_audit_centros_custo ON public.centros_custo;
CREATE TRIGGER tg_audit_centros_custo
  AFTER INSERT OR DELETE OR UPDATE ON public.centros_custo
  FOR EACH ROW EXECUTE FUNCTION tg_audit_row('financeiro','centros_custo');

DROP TRIGGER IF EXISTS tg_bump_row_version ON public.centros_custo;
CREATE TRIGGER tg_bump_row_version
  BEFORE INSERT OR UPDATE ON public.centros_custo
  FOR EACH ROW EXECUTE FUNCTION tg_bump_row_version();

DROP TRIGGER IF EXISTS cc_set_updated_at ON public.centros_custo;
CREATE TRIGGER cc_set_updated_at
  BEFORE UPDATE ON public.centros_custo
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at_generic();

CREATE INDEX IF NOT EXISTS idx_cc_ativo ON public.centros_custo(ativo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cc_tipo ON public.centros_custo(tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cc_codigo_lower ON public.centros_custo(lower(codigo)) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- 2) centros_resultado — ampliação
-- ------------------------------------------------------------
ALTER TABLE public.centros_resultado
  ADD COLUMN IF NOT EXISTS area_default text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao text;

DO $$ BEGIN
  ALTER TABLE public.centros_resultado
    ADD CONSTRAINT cr_status_integracao_chk CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seeds canônicos (idempotente)
INSERT INTO public.centros_resultado(codigo,nome,tipo,area_default) VALUES
  ('COMERCIAL',     'Comercial',      'ambos','COMERCIAL'),
  ('FINANCEIRO',    'Financeiro',     'ambos','FINANCEIRO'),
  ('ENGENHARIA',    'Engenharia',     'ambos','ENGENHARIA'),
  ('ESTOQUE',       'Estoque',        'ambos','ESTOQUE'),
  ('COMPRAS',       'Compras',        'ambos','COMPRAS'),
  ('ADMINISTRATIVO','Administrativo', 'ambos','ADMINISTRATIVO'),
  ('MARKETING',     'Marketing',      'despesa','MARKETING'),
  ('DIRETORIA',     'Diretoria',      'ambos','DIRETORIA'),
  ('FINANCIAMENTOS','Financiamentos', 'ambos','FINANCIAMENTOS'),
  ('POS_VENDA',     'Pós-venda',      'ambos','POS_VENDA')
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------------------
-- 3) plano_contas — ampliação + seeds canônicos
-- ------------------------------------------------------------
ALTER TABLE public.plano_contas
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS retencao_padrao_pct numeric(6,3),
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao text;

DO $$ BEGIN
  ALTER TABLE public.plano_contas
    ADD CONSTRAINT pc_status_integracao_chk CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seeds raízes canônicas (nivel 1)
INSERT INTO public.plano_contas(codigo,nome,nivel,tipo) VALUES
  ('1','ATIVO',1,'ATIVO'),
  ('2','PASSIVO',1,'PASSIVO'),
  ('3','PATRIMONIO LIQUIDO',1,'PASSIVO'),
  ('4','RECEITAS',1,'RECEITA'),
  ('5','CUSTOS',1,'DESPESA'),
  ('6','DESPESAS',1,'DESPESA')
ON CONFLICT (codigo) DO NOTHING;

-- Filhos canônicos mínimos (nivel 2)
WITH p AS (
  SELECT codigo, id FROM public.plano_contas WHERE codigo IN ('1','2','3','4','5','6')
)
INSERT INTO public.plano_contas(codigo,nome,nivel,pai_id,tipo)
SELECT v.codigo, v.nome, 2, p.id, v.tipo FROM (VALUES
  ('1.1','Bancos','ATIVO','1'),
  ('1.2','Clientes','ATIVO','1'),
  ('1.3','Estoque','ATIVO','1'),
  ('1.4','Empréstimos a Receber','ATIVO','1'),
  ('1.5','Adiantamentos','ATIVO','1'),
  ('2.1','Fornecedores','PASSIVO','2'),
  ('2.2','Obrigações','PASSIVO','2'),
  ('2.3','Impostos','PASSIVO','2'),
  ('2.4','Empréstimos','PASSIVO','2'),
  ('3.1','Capital Social','PASSIVO','3'),
  ('3.2','Aportes','PASSIVO','3'),
  ('3.3','Lucros Acumulados','PASSIVO','3'),
  ('4.1','Receita Venda Solar','RECEITA','4'),
  ('4.2','Receita Serviços','RECEITA','4'),
  ('4.3','Receita Manutenção','RECEITA','4'),
  ('5.1','CMV','DESPESA','5'),
  ('5.2','Instalação','DESPESA','5'),
  ('5.3','Serviços Terceirizados','DESPESA','5'),
  ('6.1','Salários','DESPESA','6'),
  ('6.2','Aluguel','DESPESA','6'),
  ('6.3','Marketing','DESPESA','6'),
  ('6.4','Combustível','DESPESA','6'),
  ('6.5','Energia','DESPESA','6'),
  ('6.6','Administrativas','DESPESA','6')
) AS v(codigo,nome,tipo,pai_codigo)
JOIN p ON p.codigo = v.pai_codigo
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------------------
-- 4) mapeamentos_contabeis
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mapeamentos_contabeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  natureza_id uuid REFERENCES public.naturezas_financeiras(id) ON DELETE CASCADE,
  evento_canonico text NOT NULL,
  plano_conta_id uuid REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  centro_resultado_default_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  -- integrabilidade
  codigo_externo text,
  sistema_destino text,
  status_integracao text NOT NULL DEFAULT 'PENDENTE',
  data_integracao timestamptz,
  hash_integracao text,
  -- padrão
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mc_evento_chk CHECK (evento_canonico IN (
    'VENDA','RECEBIMENTO','PAGAMENTO','COMPRA','ENTRADA_ESTOQUE','SAIDA_ESTOQUE',
    'COMISSAO','SERVICO_OBRA','EMPRESTIMO','APORTE','RENEGOCIACAO','RESCISAO','OPERACAO_FINANCEIRA'
  )),
  CONSTRAINT mc_status_integracao_chk CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO')),
  CONSTRAINT mc_unq UNIQUE (natureza_id, evento_canonico)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapeamentos_contabeis TO authenticated;
GRANT ALL ON public.mapeamentos_contabeis TO service_role;
ALTER TABLE public.mapeamentos_contabeis ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY mc_select_auth ON public.mapeamentos_contabeis FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY mc_admin_write ON public.mapeamentos_contabeis
    FOR ALL TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS tg_audit_mapeamentos_contabeis ON public.mapeamentos_contabeis;
CREATE TRIGGER tg_audit_mapeamentos_contabeis
  AFTER INSERT OR DELETE OR UPDATE ON public.mapeamentos_contabeis
  FOR EACH ROW EXECUTE FUNCTION tg_audit_row('financeiro','mapeamentos_contabeis');

DROP TRIGGER IF EXISTS tg_bump_row_version ON public.mapeamentos_contabeis;
CREATE TRIGGER tg_bump_row_version
  BEFORE INSERT OR UPDATE ON public.mapeamentos_contabeis
  FOR EACH ROW EXECUTE FUNCTION tg_bump_row_version();

DROP TRIGGER IF EXISTS mc_set_updated_at ON public.mapeamentos_contabeis;
CREATE TRIGGER mc_set_updated_at
  BEFORE UPDATE ON public.mapeamentos_contabeis
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at_generic();

CREATE INDEX IF NOT EXISTS idx_mc_natureza ON public.mapeamentos_contabeis(natureza_id);
CREATE INDEX IF NOT EXISTS idx_mc_evento ON public.mapeamentos_contabeis(evento_canonico);
CREATE INDEX IF NOT EXISTS idx_mc_pc ON public.mapeamentos_contabeis(plano_conta_id);

-- ------------------------------------------------------------
-- 5) naturezas_financeiras — ampliação contábil-ready
-- ------------------------------------------------------------
ALTER TABLE public.naturezas_financeiras
  ADD COLUMN IF NOT EXISTS plano_conta_id uuid REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS categoria_canonica text,
  ADD COLUMN IF NOT EXISTS retencao_iss_pct numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_inss_pct numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_irrf_pct numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_pis_pct numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_cofins_pct numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_csll_pct numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS sistema_destino text,
  ADD COLUMN IF NOT EXISTS status_integracao text NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_integracao timestamptz,
  ADD COLUMN IF NOT EXISTS hash_integracao text;

DO $$ BEGIN
  ALTER TABLE public.naturezas_financeiras
    ADD CONSTRAINT nf_status_integracao_chk CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_nf_plano_conta ON public.naturezas_financeiras(plano_conta_id);

-- ------------------------------------------------------------
-- 6) contratos — prep contábil/fiscal-ready
-- ------------------------------------------------------------
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS natureza_receita_id uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_natureza ON public.contratos(natureza_receita_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cr ON public.contratos(centro_resultado_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cc ON public.contratos(centro_custo_id);

-- ------------------------------------------------------------
-- 7) pedidos_venda — prep contábil/fiscal-ready
-- ------------------------------------------------------------
ALTER TABLE public.pedidos_venda
  ADD COLUMN IF NOT EXISTS natureza_receita_id uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS competencia date,
  ADD COLUMN IF NOT EXISTS status_faturamento text NOT NULL DEFAULT 'PENDENTE';

DO $$ BEGIN
  ALTER TABLE public.pedidos_venda
    ADD CONSTRAINT pv_status_faturamento_chk CHECK (status_faturamento IN ('PENDENTE','FATURADO','CANCELADO','NAO_APLICAVEL'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pv_natureza ON public.pedidos_venda(natureza_receita_id);
CREATE INDEX IF NOT EXISTS idx_pv_cr ON public.pedidos_venda(centro_resultado_id);
CREATE INDEX IF NOT EXISTS idx_pv_cc ON public.pedidos_venda(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_pv_status_fat ON public.pedidos_venda(status_faturamento) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- 8) projetos — centro de custo
-- ------------------------------------------------------------
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projetos_cc ON public.projetos(centro_custo_id);

-- ------------------------------------------------------------
-- 9) obras — centro resultado + centro custo
-- ------------------------------------------------------------
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_obras_cr ON public.obras(centro_resultado_id);
CREATE INDEX IF NOT EXISTS idx_obras_cc ON public.obras(centro_custo_id);

-- ------------------------------------------------------------
-- 10) estoque_movimentos — cr/cc + categoria contábil
-- ------------------------------------------------------------
ALTER TABLE public.estoque_movimentos
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS categoria_contabil text;

DO $$ BEGIN
  ALTER TABLE public.estoque_movimentos
    ADD CONSTRAINT em_categoria_contabil_chk CHECK (categoria_contabil IS NULL OR categoria_contabil IN
      ('REVENDA','MATERIAL_INSTALACAO','CONSUMO','FERRAMENTA','IMOBILIZADO','SERVICO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_em_cr ON public.estoque_movimentos(centro_resultado_id);
CREATE INDEX IF NOT EXISTS idx_em_cc ON public.estoque_movimentos(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_em_cat_contabil ON public.estoque_movimentos(categoria_contabil);

-- ------------------------------------------------------------
-- 11) produtos — categoria contábil canônica
-- ------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS categoria_contabil text;

DO $$ BEGIN
  ALTER TABLE public.produtos
    ADD CONSTRAINT prod_categoria_contabil_chk CHECK (categoria_contabil IS NULL OR categoria_contabil IN
      ('REVENDA','MATERIAL_INSTALACAO','CONSUMO','FERRAMENTA','IMOBILIZADO','SERVICO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_prod_cat_contabil ON public.produtos(categoria_contabil);

-- ------------------------------------------------------------
-- 12) operacoes_financeiras — cc + competencia
-- ------------------------------------------------------------
ALTER TABLE public.operacoes_financeiras
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS competencia date;
CREATE INDEX IF NOT EXISTS idx_op_fin_cc ON public.operacoes_financeiras(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_op_fin_competencia ON public.operacoes_financeiras(competencia);

-- ------------------------------------------------------------
-- 13) titulos_financeiros — cc + retenções
-- ------------------------------------------------------------
ALTER TABLE public.titulos_financeiros
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retencao_iss numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_inss numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_irrf numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_pis numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_cofins numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencao_csll numeric(14,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tf_cc ON public.titulos_financeiros(centro_custo_id);

-- ============================================================
-- FIM D18.2
-- ============================================================
