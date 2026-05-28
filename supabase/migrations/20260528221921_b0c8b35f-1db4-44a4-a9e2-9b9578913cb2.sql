
-- ============================================================================
-- D15.3.c — Rescisões / Renegociações / Edição de Taxa
-- Backend canônico para finalizar o fechamento financeiro UI → Supabase.
-- ============================================================================

-- 1) Permissões novas
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'financeiro.rescindir';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'financeiro.taxa.editar';
