
-- =============================================================================
-- FASE 1.1 — Auditoria universal + Permissões granulares
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1) AUDITORIA: anexa tg_audit_row() nas tabelas operacionais críticas.
--    A função já existe (SECURITY DEFINER, grava em public.audit_log).
--    Args: (modulo, entidade)
-- ----------------------------------------------------------------------------

-- contratos
DROP TRIGGER IF EXISTS audit_contratos ON public.contratos;
CREATE TRIGGER audit_contratos
AFTER INSERT OR UPDATE OR DELETE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'contrato');

-- aditivos
DROP TRIGGER IF EXISTS audit_aditivos ON public.aditivos;
CREATE TRIGGER audit_aditivos
AFTER INSERT OR UPDATE OR DELETE ON public.aditivos
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'aditivo');

-- clientes
DROP TRIGGER IF EXISTS audit_clientes ON public.clientes;
CREATE TRIGGER audit_clientes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('cadastros', 'cliente');

-- obras
DROP TRIGGER IF EXISTS audit_obras ON public.obras;
CREATE TRIGGER audit_obras
AFTER INSERT OR UPDATE OR DELETE ON public.obras
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('engenharia', 'obra');

-- projetos
DROP TRIGGER IF EXISTS audit_projetos ON public.projetos;
CREATE TRIGGER audit_projetos
AFTER INSERT OR UPDATE OR DELETE ON public.projetos
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('engenharia', 'projeto');

-- user_roles (sensível: troca de permissão)
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('seguranca', 'user_role');

-- period_locks (fechamento contábil)
DROP TRIGGER IF EXISTS audit_period_locks ON public.period_locks;
CREATE TRIGGER audit_period_locks
AFTER INSERT OR UPDATE OR DELETE ON public.period_locks
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro', 'period_lock');

-- profiles (alteração de cargo/dados de usuário)
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('seguranca', 'profile');

-- Índices para acelerar consulta da timeline por entidade/registro
CREATE INDEX IF NOT EXISTS audit_log_entidade_idx
  ON public.audit_log (entidade, entidade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_idx
  ON public.audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_modulo_idx
  ON public.audit_log (modulo, created_at DESC);


-- ----------------------------------------------------------------------------
-- 2) PERMISSÕES GRANULARES
--    enum app_permission + role_permissions + has_permission()
-- ----------------------------------------------------------------------------

-- Enum com as ~chaves de permissão do sistema. Pode crescer ao longo do tempo
-- (ALTER TYPE ... ADD VALUE em migrações futuras).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_permission') THEN
    CREATE TYPE public.app_permission AS ENUM (
      -- Comercial
      'comercial.visualizar', 'comercial.editar', 'comercial.aprovar', 'comercial.cancelar',
      'contrato.gerar', 'contrato.assinar', 'aditivo.criar',
      -- Financeiro
      'financeiro.visualizar', 'financeiro.editar', 'financeiro.excluir',
      'financeiro.movimentar', 'financeiro.conciliar', 'financeiro.fechar_periodo',
      -- Engenharia
      'engenharia.visualizar', 'engenharia.editar', 'engenharia.status',
      'engenharia.finalizar', 'engenharia.cancelar',
      -- Estoque
      'estoque.visualizar', 'estoque.movimentar', 'estoque.ajustar', 'estoque.comprar',
      -- Financiamentos
      'financiamento.visualizar', 'financiamento.editar', 'financiamento.aprovar',
      -- Pós-venda
      'posvenda.visualizar', 'posvenda.atender', 'posvenda.fechar',
      -- Executivo / BI (preparação Fase 4)
      'executivo.visualizar',
      -- Segurança / Configurações
      'seguranca.gerenciar_perfis', 'seguranca.gerenciar_usuarios', 'seguranca.ver_auditoria',
      'cadastros.editar', 'configuracoes.editar',
      -- Workflow
      'workflow.pular_etapa'
    );
  END IF;
END $$;

-- Tabela role × permission (M:N)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission public.app_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_select_auth ON public.role_permissions;
CREATE POLICY role_permissions_select_auth
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS role_permissions_admin_write ON public.role_permissions;
CREATE POLICY role_permissions_admin_write
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Função check rápida: o user tem essa permissão por qualquer um de seus roles?
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm public.app_permission)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- admin (master/geral) sempre passa
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id
        AND rp.permission = _perm
    );
$$;

-- Auditoria das próprias permissões
DROP TRIGGER IF EXISTS audit_role_permissions ON public.role_permissions;
CREATE TRIGGER audit_role_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('seguranca', 'role_permission');


-- ----------------------------------------------------------------------------
-- 3) SEED inicial de permissões por role (não destrutivo: ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------

-- admin_master e admin_geral recebem tudo (mas is_admin() já libera; seed
-- redundante apenas para consistência de leitura na UI de perfis).
INSERT INTO public.role_permissions (role, permission)
SELECT r.role, p.permission
FROM (VALUES ('admin_master'::public.app_role), ('admin_geral'::public.app_role)) AS r(role)
CROSS JOIN (
  SELECT unnest(enum_range(NULL::public.app_permission)) AS permission
) p
ON CONFLICT (role, permission) DO NOTHING;

-- usuario: conjunto operacional padrão (somente leitura + ações comuns)
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('usuario', 'comercial.visualizar'),
  ('usuario', 'comercial.editar'),
  ('usuario', 'contrato.gerar'),
  ('usuario', 'financeiro.visualizar'),
  ('usuario', 'engenharia.visualizar'),
  ('usuario', 'engenharia.status'),
  ('usuario', 'estoque.visualizar'),
  ('usuario', 'estoque.movimentar'),
  ('usuario', 'financiamento.visualizar'),
  ('usuario', 'posvenda.visualizar'),
  ('usuario', 'posvenda.atender')
ON CONFLICT (role, permission) DO NOTHING;
