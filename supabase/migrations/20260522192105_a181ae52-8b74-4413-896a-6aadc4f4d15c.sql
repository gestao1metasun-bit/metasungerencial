
-- ============================================================================
-- 1) AUDIT LOG — registro imutável de alterações
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,                 -- 'comercial' | 'engenharia' | 'financeiro' | ...
  entidade text NOT NULL,               -- 'contrato' | 'projeto' | 'obra' | 'aditivo' | 'cliente'
  entidade_id uuid NOT NULL,
  acao text NOT NULL,                   -- 'INSERT' | 'UPDATE' | 'DELETE' | custom
  campo text,
  valor_anterior jsonb,
  valor_novo jsonb,
  user_id uuid,
  user_email text,
  motivo text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entidade ON public.audit_log (entidade, entidade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_modulo ON public.audit_log (modulo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log (user_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Leitura: o usuário pode ver registros que ele próprio gerou, ou admin tudo.
-- (Para visualizar histórico de uma entidade, a UI deve consultar via server fn admin.)
DROP POLICY IF EXISTS audit_log_select_own_or_admin ON public.audit_log;
CREATE POLICY audit_log_select_own_or_admin
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Bloqueia escrita direta — somente triggers SECURITY DEFINER podem inserir.
DROP POLICY IF EXISTS audit_log_no_insert ON public.audit_log;
DROP POLICY IF EXISTS audit_log_no_update ON public.audit_log;
DROP POLICY IF EXISTS audit_log_no_delete ON public.audit_log;

-- ============================================================================
-- 2) PERIOD LOCKS — fechamento mensal por módulo
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.period_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,                 -- 'financeiro' | 'comercial' | 'engenharia'
  ano int NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fechado_em timestamptz NOT NULL DEFAULT now(),
  fechado_por uuid,
  motivo text,
  UNIQUE (modulo, ano, mes)
);

ALTER TABLE public.period_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS period_locks_select_auth ON public.period_locks;
CREATE POLICY period_locks_select_auth
  ON public.period_locks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS period_locks_admin_write ON public.period_locks;
CREATE POLICY period_locks_admin_write
  ON public.period_locks FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 3) HELPERS
-- ============================================================================

-- Indica se um módulo+data caiu em período fechado.
CREATE OR REPLACE FUNCTION public.is_period_closed(_modulo text, _data date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.period_locks
    WHERE modulo = _modulo
      AND ano = EXTRACT(YEAR FROM _data)::int
      AND mes = EXTRACT(MONTH FROM _data)::int
  );
$$;

-- Regra única: admin sempre passa. Caso contrário bloqueia se status final ou período fechado.
CREATE OR REPLACE FUNCTION public.can_edit_operacional(
  _user_id uuid, _status text, _modulo text, _data_ref date
) RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;
  IF _status IN ('Finalizado', 'Cancelado', 'Encerrado') THEN
    RETURN false;
  END IF;
  IF _data_ref IS NOT NULL AND public.is_period_closed(_modulo, _data_ref) THEN
    RETURN false;
  END IF;
  RETURN true;
END $$;

-- ============================================================================
-- 4) TRIGGER DE AUDITORIA GENÉRICA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modulo text := TG_ARGV[0];
  v_entidade text := TG_ARGV[1];
  v_eid uuid;
  v_old jsonb;
  v_new jsonb;
  v_user uuid := auth.uid();
  v_email text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_eid := (row_to_json(OLD)::jsonb ->> 'id')::uuid;
    v_old := row_to_json(OLD)::jsonb;
    v_new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_eid := (row_to_json(NEW)::jsonb ->> 'id')::uuid;
    v_old := NULL;
    v_new := row_to_json(NEW)::jsonb;
  ELSE
    v_eid := (row_to_json(NEW)::jsonb ->> 'id')::uuid;
    v_old := row_to_json(OLD)::jsonb;
    v_new := row_to_json(NEW)::jsonb;
    -- Pula auditoria se nada mudou de fato
    IF v_old = v_new THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  INSERT INTO public.audit_log
    (modulo, entidade, entidade_id, acao, valor_anterior, valor_novo, user_id, user_email)
  VALUES
    (v_modulo, v_entidade, v_eid, TG_OP, v_old, v_new, v_user, v_email);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================================
-- 5) TRIGGER DE GUARDA — bloqueia drift de estado e período fechado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_guard_operacional()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modulo text := TG_ARGV[0];
  v_status_col text := TG_ARGV[1];   -- coluna que carrega o status (ex: 'status')
  v_data_col text := TG_ARGV[2];     -- coluna de data referência ('updated_at' fallback)
  v_status_old text;
  v_data_ref date;
  v_user uuid := auth.uid();
BEGIN
  -- Admin nunca é bloqueado
  IF public.is_admin(v_user) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_status_col IS NOT NULL AND v_status_col <> '' THEN
    v_status_old := (row_to_json(OLD)::jsonb ->> v_status_col);
  END IF;

  IF v_data_col IS NOT NULL AND v_data_col <> '' THEN
    BEGIN
      v_data_ref := ((row_to_json(OLD)::jsonb ->> v_data_col))::date;
    EXCEPTION WHEN others THEN
      v_data_ref := CURRENT_DATE;
    END;
  ELSE
    v_data_ref := CURRENT_DATE;
  END IF;

  IF v_status_old IN ('Finalizado', 'Cancelado', 'Encerrado') THEN
    RAISE EXCEPTION 'Registro em status final (%); edição/exclusão exige administrador.', v_status_old
      USING ERRCODE = '42501';
  END IF;

  IF public.is_period_closed(v_modulo, v_data_ref) THEN
    RAISE EXCEPTION 'Período (% / %) fechado para o módulo %; edição exige administrador.',
      EXTRACT(MONTH FROM v_data_ref), EXTRACT(YEAR FROM v_data_ref), v_modulo
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

-- ============================================================================
-- 6) APLICAÇÃO DOS TRIGGERS
-- ============================================================================

-- CONTRATOS (modulo: comercial; data: data_assinatura → fallback updated_at)
DROP TRIGGER IF EXISTS audit_contratos ON public.contratos;
CREATE TRIGGER audit_contratos
  AFTER INSERT OR UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'contrato');

DROP TRIGGER IF EXISTS guard_contratos ON public.contratos;
CREATE TRIGGER guard_contratos
  BEFORE UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_operacional('comercial', 'status', 'data_assinatura');

-- PROJETOS (modulo: engenharia)
DROP TRIGGER IF EXISTS audit_projetos ON public.projetos;
CREATE TRIGGER audit_projetos
  AFTER INSERT OR UPDATE OR DELETE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('engenharia', 'projeto');

DROP TRIGGER IF EXISTS guard_projetos ON public.projetos;
CREATE TRIGGER guard_projetos
  BEFORE UPDATE OR DELETE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_operacional('engenharia', 'status', '');

-- OBRAS (modulo: engenharia; data: data_finalizacao)
DROP TRIGGER IF EXISTS audit_obras ON public.obras;
CREATE TRIGGER audit_obras
  AFTER INSERT OR UPDATE OR DELETE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('engenharia', 'obra');

DROP TRIGGER IF EXISTS guard_obras ON public.obras;
CREATE TRIGGER guard_obras
  BEFORE UPDATE OR DELETE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_operacional('engenharia', 'status', 'data_finalizacao');

-- ADITIVOS (modulo: comercial; data: data_evento)
DROP TRIGGER IF EXISTS audit_aditivos ON public.aditivos;
CREATE TRIGGER audit_aditivos
  AFTER INSERT OR UPDATE OR DELETE ON public.aditivos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'aditivo');

DROP TRIGGER IF EXISTS guard_aditivos ON public.aditivos;
CREATE TRIGGER guard_aditivos
  BEFORE UPDATE OR DELETE ON public.aditivos
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_operacional('comercial', 'status', 'data_evento');

-- CLIENTES (modulo: comercial; sem trava de status final, só auditoria + período)
DROP TRIGGER IF EXISTS audit_clientes ON public.clientes;
CREATE TRIGGER audit_clientes
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'cliente');
