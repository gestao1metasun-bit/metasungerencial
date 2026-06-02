
-- ============================================================================
-- D20.SUP.4 — COMPRAS DENTRO DE SUPRIMENTOS
-- ============================================================================

-- 1) ENUMS -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.sup_cot_status AS ENUM (
    'RASCUNHO','ENVIADA','EM_ANALISE','APROVADA','REPROVADA','CANCELADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sup_ped_status AS ENUM (
    'EMITIDO','APROVADO','ENVIADO_FORNECEDOR','PARCIALMENTE_RECEBIDO','RECEBIDO','CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sup_rec_status AS ENUM (
    'RASCUNHO','CONFIRMADO','CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) PERMISSÕES --------------------------------------------------------------
DO $$
DECLARE p text;
BEGIN
  FOREACH p IN ARRAY ARRAY[
    'suprimentos.cotacao.visualizar','suprimentos.cotacao.criar','suprimentos.cotacao.editar',
    'suprimentos.cotacao.aprovar','suprimentos.cotacao.cancelar',
    'suprimentos.pedido.visualizar','suprimentos.pedido.criar','suprimentos.pedido.aprovar',
    'suprimentos.pedido.enviar','suprimentos.pedido.cancelar',
    'suprimentos.recebimento.visualizar','suprimentos.recebimento.criar','suprimentos.recebimento.confirmar'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS %L', p);
    EXCEPTION WHEN others THEN NULL; END;
  END LOOP;
END $$;
