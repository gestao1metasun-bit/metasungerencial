-- C-ENT.10 — Motor Enterprise de Comissões
-- Extensão da entidade comercial_comissoes para suporte a:
--   beneficiários múltiplos, origem, versionamento (SUBSTITUIDA),
--   vínculo a projeto/proposta/aditivo, código, preparação financeira.

-- 1. Novos enums --------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.comercial_comissao_origem AS ENUM ('CONTRATO','ADITIVO','AJUSTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.comercial_comissao_tipo_beneficiario AS ENUM
    ('CONSULTOR','INDICADOR','GERENTE','PARCEIRO','BANCO','OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extensão do enum de status ----------------------------------------
ALTER TYPE public.comercial_comissao_status ADD VALUE IF NOT EXISTS 'APROVADA';
ALTER TYPE public.comercial_comissao_status ADD VALUE IF NOT EXISTS 'SUBSTITUIDA';

-- 3. Novas colunas ------------------------------------------------------
ALTER TABLE public.comercial_comissoes
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.projetos(id),
  ADD COLUMN IF NOT EXISTS proposta_id uuid REFERENCES public.propostas(id),
  ADD COLUMN IF NOT EXISTS aditivo_id uuid REFERENCES public.aditivos(id),
  ADD COLUMN IF NOT EXISTS beneficiario_id uuid,
  ADD COLUMN IF NOT EXISTS beneficiario_nome text,
  ADD COLUMN IF NOT EXISTS tipo_beneficiario public.comercial_comissao_tipo_beneficiario
    NOT NULL DEFAULT 'CONSULTOR',
  ADD COLUMN IF NOT EXISTS origem public.comercial_comissao_origem
    NOT NULL DEFAULT 'CONTRATO',
  ADD COLUMN IF NOT EXISTS comissao_origem_id uuid REFERENCES public.comercial_comissoes(id),
  ADD COLUMN IF NOT EXISTS valor_previsto numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_aprovado numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_pago numeric(14,2),
  ADD COLUMN IF NOT EXISTS motivo text,
  ADD COLUMN IF NOT EXISTS aprovada_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovada_por uuid,
  ADD COLUMN IF NOT EXISTS justificativa_aprovacao text,
  ADD COLUMN IF NOT EXISTS substituida_em timestamptz,
  ADD COLUMN IF NOT EXISTS substituida_por uuid,
  ADD COLUMN IF NOT EXISTS substituida_por_comissao_id uuid REFERENCES public.comercial_comissoes(id),
  ADD COLUMN IF NOT EXISTS titulo_financeiro_id uuid REFERENCES public.titulos_financeiros(id);

-- Backfill básico
UPDATE public.comercial_comissoes
SET beneficiario_id = COALESCE(beneficiario_id, vendedor_id),
    beneficiario_nome = COALESCE(beneficiario_nome, vendedor_nome),
    valor_previsto = COALESCE(valor_previsto, valor_calculado),
    origem = COALESCE(origem, 'CONTRATO'),
    tipo_beneficiario = COALESCE(tipo_beneficiario, 'CONSULTOR')
WHERE beneficiario_id IS NULL
   OR valor_previsto IS NULL;

-- Backfill proposta_id a partir do contrato
UPDATE public.comercial_comissoes c
SET proposta_id = ct.proposta_id
FROM public.contratos ct
WHERE c.contrato_id = ct.id AND c.proposta_id IS NULL AND ct.proposta_id IS NOT NULL;

-- Sequência de código
CREATE SEQUENCE IF NOT EXISTS public.comissao_codigo_seq START 1;

UPDATE public.comercial_comissoes
SET codigo = 'COM-' || lpad(nextval('public.comissao_codigo_seq')::text, 6, '0')
WHERE codigo IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS comercial_comissoes_codigo_uk
  ON public.comercial_comissoes(codigo);

CREATE INDEX IF NOT EXISTS comercial_comissoes_projeto_idx ON public.comercial_comissoes(projeto_id);
CREATE INDEX IF NOT EXISTS comercial_comissoes_aditivo_idx ON public.comercial_comissoes(aditivo_id);
CREATE INDEX IF NOT EXISTS comercial_comissoes_beneficiario_idx ON public.comercial_comissoes(beneficiario_id);
CREATE INDEX IF NOT EXISTS comercial_comissoes_origem_status_idx ON public.comercial_comissoes(origem, status);

-- 4. Permissões novas (criar/editar/pagar) ------------------------------
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.criar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.editar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.pagar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.aprovar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.substituir';

-- 5. Anexos: adicionar entidade 'comercial_comissoes' -------------------
ALTER TABLE public.anexos DROP CONSTRAINT IF EXISTS anexos_entidade_tipo_check;
ALTER TABLE public.anexos ADD CONSTRAINT anexos_entidade_tipo_check CHECK (entidade_tipo = ANY (ARRAY[
  'clientes','fornecedores','contratos','aditivos','propostas','pedidos_venda','projetos',
  'projetos_contrato','obras','titulos_financeiros','parcelas_financeiras','movimentacoes_financeiras',
  'boletos','adiantamentos','rescisoes_contrato','extrato_banco','workflow_aprovacoes','estoque_movimentos',
  'estoque_reservas','estoque_entregas','ordens_compra','cotacoes_compra','solicitacoes_material',
  'financiamentos','produtos','leads','tarefas','operacoes_financeiras','operacoes_financeiras_parcelas',
  'os_ordens','os_tarefas','os_formularios_definicao','os_servicos_faturar','os_requisicoes_equipamento',
  'comercial_comissoes'
]));