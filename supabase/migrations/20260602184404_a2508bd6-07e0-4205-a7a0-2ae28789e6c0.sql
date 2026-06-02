-- D20.SUP.7 (2/4 — correção) — Schema de Alçadas + Preparação Financeira.
-- Usa nomes reais das funções de audit/row_version já existentes no projeto.

-- =====================================================================
-- 1) suprimentos_alcadas
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.suprimentos_alcadas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text NOT NULL,
  descricao             text,
  ativo                 boolean NOT NULL DEFAULT true,
  prioridade            integer NOT NULL DEFAULT 100,
  etapa                 text NOT NULL CHECK (etapa IN ('REQUISICAO','COTACAO','PEDIDO')),
  tipo                  text CHECK (tipo IN ('MATERIAL','SERVICO')),
  valor_min             numeric(15,2),
  valor_max             numeric(15,2),
  setor                 text,
  natureza_id           uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  centro_custo_id       uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  centro_resultado_id   uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  fornecedor_id         uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  prioridade_req        text CHECK (prioridade_req IN ('BAIXA','NORMAL','ALTA','URGENTE')),
  destino               text CHECK (destino IN ('ALMOXARIFADO','OS','OBRA','PROJETO')),
  aprovador_tipo        text NOT NULL CHECK (aprovador_tipo IN ('PERMISSAO','ROLE')),
  aprovador_valor       text NOT NULL CHECK (length(aprovador_valor) >= 3),
  exige_workflow        boolean NOT NULL DEFAULT false,
  observacao_obrigatoria boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES auth.users(id),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES auth.users(id),
  deleted_at            timestamptz,
  row_version           integer NOT NULL DEFAULT 1,
  CHECK (valor_min IS NULL OR valor_max IS NULL OR valor_min <= valor_max)
);

CREATE INDEX IF NOT EXISTS idx_sup_alcadas_ativo_etapa
  ON public.suprimentos_alcadas (etapa, prioridade)
  WHERE ativo = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sup_alcadas_natureza ON public.suprimentos_alcadas (natureza_id);
CREATE INDEX IF NOT EXISTS idx_sup_alcadas_cc       ON public.suprimentos_alcadas (centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_sup_alcadas_cr       ON public.suprimentos_alcadas (centro_resultado_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suprimentos_alcadas TO authenticated;
GRANT ALL ON public.suprimentos_alcadas TO service_role;

ALTER TABLE public.suprimentos_alcadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sup_alcadas_select_auth"  ON public.suprimentos_alcadas;
DROP POLICY IF EXISTS "sup_alcadas_write_admin"  ON public.suprimentos_alcadas;
DROP POLICY IF EXISTS "sup_alcadas_update_admin" ON public.suprimentos_alcadas;
DROP POLICY IF EXISTS "sup_alcadas_delete_admin" ON public.suprimentos_alcadas;

CREATE POLICY "sup_alcadas_select_auth"
  ON public.suprimentos_alcadas FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'suprimentos.dashboard.ver'::public.app_permission)
    OR public.has_permission(auth.uid(), 'suprimentos.alcada.gerir'::public.app_permission)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  );

CREATE POLICY "sup_alcadas_write_admin"
  ON public.suprimentos_alcadas FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'suprimentos.alcada.gerir'::public.app_permission)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  );

CREATE POLICY "sup_alcadas_update_admin"
  ON public.suprimentos_alcadas FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'suprimentos.alcada.gerir'::public.app_permission)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  );

CREATE POLICY "sup_alcadas_delete_admin"
  ON public.suprimentos_alcadas FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  );

DROP TRIGGER IF EXISTS tg_audit_sup_alcadas ON public.suprimentos_alcadas;
CREATE TRIGGER tg_audit_sup_alcadas
  AFTER INSERT OR UPDATE OR DELETE ON public.suprimentos_alcadas
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS tg_rowver_sup_alcadas ON public.suprimentos_alcadas;
CREATE TRIGGER tg_rowver_sup_alcadas
  BEFORE UPDATE ON public.suprimentos_alcadas
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

-- =====================================================================
-- 2) suprimentos_alcadas_aplicadas (append-only)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.suprimentos_alcadas_aplicadas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo       text NOT NULL CHECK (entidade_tipo IN ('REQUISICAO','COTACAO','PEDIDO')),
  entidade_id         uuid NOT NULL,
  alcada_id           uuid REFERENCES public.suprimentos_alcadas(id) ON DELETE SET NULL,
  alcada_nome         text,
  etapa               text NOT NULL CHECK (etapa IN ('REQUISICAO','COTACAO','PEDIDO')),
  decisao             text NOT NULL CHECK (decisao IN ('APROVADO','REPROVADO','RETORNADO')),
  aprovador_user_id   uuid NOT NULL REFERENCES auth.users(id),
  aprovador_permissao text,
  valor_avaliado      numeric(15,2),
  motivo              text,
  observacao          text,
  data_hora           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sup_aplic_entidade
  ON public.suprimentos_alcadas_aplicadas (entidade_tipo, entidade_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_sup_aplic_alcada
  ON public.suprimentos_alcadas_aplicadas (alcada_id);
CREATE INDEX IF NOT EXISTS idx_sup_aplic_aprovador
  ON public.suprimentos_alcadas_aplicadas (aprovador_user_id, data_hora DESC);

GRANT SELECT, INSERT ON public.suprimentos_alcadas_aplicadas TO authenticated;
GRANT ALL ON public.suprimentos_alcadas_aplicadas TO service_role;

ALTER TABLE public.suprimentos_alcadas_aplicadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sup_aplic_select_auth"    ON public.suprimentos_alcadas_aplicadas;
DROP POLICY IF EXISTS "sup_aplic_insert_via_rpc" ON public.suprimentos_alcadas_aplicadas;

CREATE POLICY "sup_aplic_select_auth"
  ON public.suprimentos_alcadas_aplicadas FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'suprimentos.dashboard.ver'::public.app_permission)
    OR public.has_permission(auth.uid(), 'suprimentos.alcada.gerir'::public.app_permission)
    OR public.has_permission(auth.uid(), 'suprimentos.alcada.aplicar'::public.app_permission)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  );

CREATE POLICY "sup_aplic_insert_via_rpc"
  ON public.suprimentos_alcadas_aplicadas FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'suprimentos.alcada.aplicar'::public.app_permission)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.fn_sup_aplic_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'suprimentos_alcadas_aplicadas é append-only (% bloqueado)', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS tg_sup_aplic_block_upd ON public.suprimentos_alcadas_aplicadas;
CREATE TRIGGER tg_sup_aplic_block_upd
  BEFORE UPDATE ON public.suprimentos_alcadas_aplicadas
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_aplic_block_mutation();

DROP TRIGGER IF EXISTS tg_sup_aplic_block_del ON public.suprimentos_alcadas_aplicadas;
CREATE TRIGGER tg_sup_aplic_block_del
  BEFORE DELETE ON public.suprimentos_alcadas_aplicadas
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_aplic_block_mutation();

-- =====================================================================
-- 3) Preparação financeira em suprimentos_pedidos_compra
-- =====================================================================
ALTER TABLE public.suprimentos_pedidos_compra
  ADD COLUMN IF NOT EXISTS condicao_pagamento         text,
  ADD COLUMN IF NOT EXISTS data_prevista_pagamento    date,
  ADD COLUMN IF NOT EXISTS documento_fiscal           text,
  ADD COLUMN IF NOT EXISTS valor_aprovado_final       numeric(15,2),
  ADD COLUMN IF NOT EXISTS financeiro_observacao      text,
  ADD COLUMN IF NOT EXISTS financeiro_bloqueio_motivo text,
  ADD COLUMN IF NOT EXISTS status_financeiro          text NOT NULL DEFAULT 'NAO_GERADO';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sup_pedidos_status_financeiro_chk'
  ) THEN
    ALTER TABLE public.suprimentos_pedidos_compra
      ADD CONSTRAINT sup_pedidos_status_financeiro_chk
      CHECK (status_financeiro IN ('NAO_GERADO','PRONTO_PARA_FINANCEIRO','GERADO','BLOQUEADO','CANCELADO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sup_pedidos_status_financeiro
  ON public.suprimentos_pedidos_compra (status_financeiro)
  WHERE status_financeiro <> 'NAO_GERADO';