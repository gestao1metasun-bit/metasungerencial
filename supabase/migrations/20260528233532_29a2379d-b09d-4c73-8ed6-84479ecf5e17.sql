
-- Enums
DO $$ BEGIN
  CREATE TYPE public.op_fin_tipo AS ENUM (
    'EMPRESTIMO_COLABORADOR','EMPRESTIMO_CLIENTE','EMPRESTIMO_FORNECEDOR',
    'EMPRESTIMO_SOCIO_EMPRESA','EMPRESTIMO_EMPRESA_TERCEIRO',
    'APORTE_CAPITAL','CAPITAL_DE_GIRO','APLICACAO_FINANCEIRA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.op_fin_status AS ENUM (
    'RASCUNHO','EM_APROVACAO','APROVADA','LIBERADA',
    'EM_PAGAMENTO','QUITADA','RENEGOCIADA','CANCELADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.op_fin_natureza_caixa AS ENUM ('ENTRADA','SAIDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.op_fin_forma_baixa AS ENUM (
    'FOLHA','COMISSAO','MANUAL','PIX','TED','BOLETO','DESCONTO_TITULO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permissões (cada ALTER TYPE em statement próprio, fora de bloco DO)
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.visualizar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.criar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.aprovar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.liberar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.quitar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.renegociar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.cancelar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'operacao_financeira.estornar';
