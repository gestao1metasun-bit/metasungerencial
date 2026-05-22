
-- Tabela de overrides por usuário
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission public.app_permission NOT NULL,
  effect text NOT NULL CHECK (effect IN ('grant','deny')),
  motivo text NOT NULL,
  granted_by uuid,
  -- Reservados para uso futuro (escopo por filial/setor/carteira)
  filial_id uuid,
  setor text,
  carteira_id uuid,
  escopo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission, effect)
);

CREATE INDEX IF NOT EXISTS idx_upo_user ON public.user_permission_overrides(user_id);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- updated_at
DROP TRIGGER IF EXISTS trg_upo_updated_at ON public.user_permission_overrides;
CREATE TRIGGER trg_upo_updated_at
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- Auditoria automática
DROP TRIGGER IF EXISTS trg_upo_audit ON public.user_permission_overrides;
CREATE TRIGGER trg_upo_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('seguranca','user_permission_override');

-- RLS
CREATE POLICY upo_select_self_or_admin ON public.user_permission_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY upo_admin_write ON public.user_permission_overrides
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- has_permission: admin → true; senão (role tem) ∪ (grant) \ (deny)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm public.app_permission)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR (
      NOT EXISTS (
        SELECT 1 FROM public.user_permission_overrides
        WHERE user_id = _user_id AND permission = _perm AND effect = 'deny'
      )
      AND (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.role_permissions rp ON rp.role = ur.role
          WHERE ur.user_id = _user_id AND rp.permission = _perm
        )
        OR EXISTS (
          SELECT 1 FROM public.user_permission_overrides
          WHERE user_id = _user_id AND permission = _perm AND effect = 'grant'
        )
      )
    );
$$;
