-- ============================================================================
-- D6.13.4 — Attachment Engine Enterprise
-- Motor único de anexos polimórficos para todas as entidades críticas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Função SECURITY DEFINER: pode_acessar_entidade(tipo, id)
--    Delega a verificação para a regra de acesso original de cada módulo.
--    Mantém as RLS existentes como única fonte da verdade.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pode_acessar_entidade(_tipo text, _id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  IF public.is_admin(v_uid) THEN
    RETURN true;
  END IF;

  CASE _tipo
    WHEN 'clientes' THEN
      RETURN EXISTS (SELECT 1 FROM public.clientes
                     WHERE id = _id AND consultor_id = v_uid);
    WHEN 'contratos' THEN
      RETURN EXISTS (SELECT 1 FROM public.contratos
                     WHERE id = _id AND consultor_id = v_uid);
    WHEN 'pedidos_venda' THEN
      RETURN EXISTS (SELECT 1 FROM public.pedidos_venda
                     WHERE id = _id AND consultor_id = v_uid);
    WHEN 'titulos_financeiros' THEN
      RETURN EXISTS (SELECT 1 FROM public.titulos_financeiros
                     WHERE id = _id AND consultor_id = v_uid);
    WHEN 'obras' THEN
      RETURN EXISTS (SELECT 1 FROM public.obras
                     WHERE id = _id AND consultor_id = v_uid);
    WHEN 'workflow_aprovacoes' THEN
      -- aprovações: quem solicitou, o aprovador atribuído, ou admin
      RETURN EXISTS (
        SELECT 1 FROM public.workflow_aprovacoes wa
        WHERE wa.id = _id
          AND (wa.solicitante_id = v_uid OR wa.aprovador_id = v_uid)
      );
    WHEN 'estoque_movimentos' THEN
      -- estoque: só quem tem permissão de comprar/estoque vê anexos de movimento
      RETURN public.has_permission(v_uid, 'estoque.comprar'::app_permission);
    WHEN 'financiamentos' THEN
      -- financiamento vive dentro do contrato — usa a mesma regra do contrato
      RETURN EXISTS (SELECT 1 FROM public.contratos
                     WHERE id = _id AND consultor_id = v_uid);
    ELSE
      RETURN false;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pode_acessar_entidade(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_acessar_entidade(text, uuid) TO service_role;

-- ----------------------------------------------------------------------------
-- 2) Tabela polimórfica `public.anexos`
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anexos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo   text NOT NULL
                  CHECK (entidade_tipo IN (
                    'clientes','contratos','pedidos_venda','titulos_financeiros',
                    'obras','workflow_aprovacoes','estoque_movimentos','financiamentos'
                  )),
  entidade_id     uuid NOT NULL,
  categoria       text NOT NULL DEFAULT 'outros'
                  CHECK (categoria IN (
                    'contrato','comprovante','boleto','nota_fiscal',
                    'documento_cliente','foto_obra','laudo','projeto',
                    'aprovacao','orcamento','financeiro','estoque','outros'
                  )),
  storage_path    text NOT NULL,
  nome            text NOT NULL,
  mime            text NOT NULL,
  tamanho         bigint NOT NULL CHECK (tamanho > 0),
  observacao      text,
  owner_id        uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  deleted_by      uuid,
  deleted_reason  text
);

CREATE INDEX IF NOT EXISTS anexos_entidade_idx
  ON public.anexos (entidade_tipo, entidade_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS anexos_owner_idx
  ON public.anexos (owner_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS anexos_created_idx
  ON public.anexos (created_at DESC)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.anexos TO authenticated;
GRANT ALL ON public.anexos TO service_role;

ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;

-- SELECT: só vê se ainda não foi excluído e tem acesso à entidade
CREATE POLICY anexos_select_via_entidade
  ON public.anexos
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.pode_acessar_entidade(entidade_tipo, entidade_id)
  );

-- INSERT: só pode anexar em entidade que pode acessar
CREATE POLICY anexos_insert_via_entidade
  ON public.anexos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND deleted_at IS NULL
    AND public.pode_acessar_entidade(entidade_tipo, entidade_id)
  );

-- UPDATE (apenas soft-delete): owner do anexo ou admin
CREATE POLICY anexos_soft_delete
  ON public.anexos
  FOR UPDATE
  TO authenticated
  USING (
    (owner_id = auth.uid() OR public.is_admin(auth.uid()))
    AND public.pode_acessar_entidade(entidade_tipo, entidade_id)
  )
  WITH CHECK (
    owner_id = auth.uid() OR public.is_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 3) Estender `anexos_audit` para auditoria polimórfica
--    (mantém a tabela existente — só adiciona colunas opcionais)
-- ----------------------------------------------------------------------------
ALTER TABLE public.anexos_audit
  ADD COLUMN IF NOT EXISTS entidade_tipo  text,
  ADD COLUMN IF NOT EXISTS entidade_id    uuid,
  ADD COLUMN IF NOT EXISTS categoria      text,
  ADD COLUMN IF NOT EXISTS motivo         text;

-- ----------------------------------------------------------------------------
-- 4) Bucket privado `anexos` no Storage
--    Acesso sempre via server fn + signed URL — nenhuma policy authenticated.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos', 'anexos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Garante que NÃO existem policies authenticated abertas para este bucket.
-- (Service role bypassa RLS — server functions seguem operando.)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'anexos_%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;