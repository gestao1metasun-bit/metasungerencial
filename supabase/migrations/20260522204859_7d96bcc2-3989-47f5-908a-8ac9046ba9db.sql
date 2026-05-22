
-- ============================================================
-- FASE 1.3 — Versionamento + Soft-delete + Guarda de estado
-- ============================================================

-- 1) Tabela de versões (snapshots) ---------------------------
CREATE TABLE IF NOT EXISTS public.entidade_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade text NOT NULL,           -- ex: 'contratos', 'obras'
  entidade_id uuid NOT NULL,
  versao integer NOT NULL,
  snapshot jsonb NOT NULL,
  motivo text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entidade_versoes_lookup
  ON public.entidade_versoes (entidade, entidade_id, versao DESC);

ALTER TABLE public.entidade_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ev_select_admin_or_owner"
  ON public.entidade_versoes FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "ev_insert_system"
  ON public.entidade_versoes FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2) Colunas de soft-delete em tabelas críticas --------------
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.aditivos
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- 3) Trigger genérico de snapshot ----------------------------
CREATE OR REPLACE FUNCTION public.tg_snapshot_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidade text := TG_TABLE_NAME;
  v_eid uuid;
  v_proxima int;
  v_user uuid := auth.uid();
  v_email text;
  v_motivo text;
BEGIN
  v_eid := (row_to_json(NEW)::jsonb ->> 'id')::uuid;

  SELECT COALESCE(MAX(versao), 0) + 1 INTO v_proxima
  FROM public.entidade_versoes
  WHERE entidade = v_entidade AND entidade_id = v_eid;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  -- motivo opcional vindo de current_setting
  BEGIN
    v_motivo := current_setting('app.motivo', true);
  EXCEPTION WHEN others THEN v_motivo := NULL;
  END;

  INSERT INTO public.entidade_versoes
    (entidade, entidade_id, versao, snapshot, motivo, user_id, user_email)
  VALUES
    (v_entidade, v_eid, v_proxima, row_to_json(NEW)::jsonb, v_motivo, v_user, v_email);

  RETURN NEW;
END $$;

-- Triggers nas tabelas críticas
DROP TRIGGER IF EXISTS tg_contratos_versao ON public.contratos;
CREATE TRIGGER tg_contratos_versao
  AFTER INSERT OR UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

DROP TRIGGER IF EXISTS tg_aditivos_versao ON public.aditivos;
CREATE TRIGGER tg_aditivos_versao
  AFTER INSERT OR UPDATE ON public.aditivos
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

DROP TRIGGER IF EXISTS tg_obras_versao ON public.obras;
CREATE TRIGGER tg_obras_versao
  AFTER INSERT OR UPDATE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

DROP TRIGGER IF EXISTS tg_projetos_versao ON public.projetos;
CREATE TRIGGER tg_projetos_versao
  AFTER INSERT OR UPDATE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

-- 4) Guarda de transição de status ---------------------------
CREATE OR REPLACE FUNCTION public.tg_guard_estado_critico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF public.is_admin(v_user) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'contratos' THEN
    IF OLD.status = 'Assinado' AND NEW.status <> 'Assinado' THEN
      RAISE EXCEPTION 'Contrato assinado só pode ser alterado via aditivo ou por administrador.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'obras' THEN
    IF OLD.status = 'Finalizada' AND NEW.status <> 'Finalizada' THEN
      RAISE EXCEPTION 'Obra finalizada é imutável fora do administrador.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_contratos_guard_estado ON public.contratos;
CREATE TRIGGER tg_contratos_guard_estado
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_estado_critico();

DROP TRIGGER IF EXISTS tg_obras_guard_estado ON public.obras;
CREATE TRIGGER tg_obras_guard_estado
  BEFORE UPDATE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_estado_critico();

-- 5) Soft-delete RPC ----------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_entidade(
  _modulo text,
  _id uuid,
  _motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_sql text;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE = '22023';
  END IF;

  IF _modulo NOT IN ('contratos','aditivos','obras','projetos','clientes') THEN
    RAISE EXCEPTION 'Módulo inválido: %', _modulo USING ERRCODE = '22023';
  END IF;

  v_sql := format(
    'UPDATE public.%I SET deleted_at = now(), deleted_reason = $1, deleted_by = $2 WHERE id = $3',
    _modulo
  );
  EXECUTE v_sql USING _motivo, v_user, _id;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  INSERT INTO public.audit_log
    (modulo, entidade, entidade_id, acao, motivo, user_id, user_email)
  VALUES
    (_modulo, _modulo, _id, 'SOFT_DELETE', _motivo, v_user, v_email);
END $$;

-- 6) Restore RPC (admin only) -------------------------------
CREATE OR REPLACE FUNCTION public.restore_entidade(
  _modulo text,
  _id uuid,
  _motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_sql text;
BEGIN
  IF NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'Apenas administradores podem restaurar registros.' USING ERRCODE = '42501';
  END IF;

  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE = '22023';
  END IF;

  IF _modulo NOT IN ('contratos','aditivos','obras','projetos','clientes') THEN
    RAISE EXCEPTION 'Módulo inválido: %', _modulo USING ERRCODE = '22023';
  END IF;

  v_sql := format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_reason = NULL, deleted_by = NULL WHERE id = $1',
    _modulo
  );
  EXECUTE v_sql USING _id;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  INSERT INTO public.audit_log
    (modulo, entidade, entidade_id, acao, motivo, user_id, user_email)
  VALUES
    (_modulo, _modulo, _id, 'RESTORE', _motivo, v_user, v_email);
END $$;
