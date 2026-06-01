
-- ===========================================================================
-- E.OS.1 — Foundation DB: Gestão de Serviços / Ordens de Serviço
-- Replica conceitualmente o módulo flow2 visto no vídeo.
-- Sem UI, sem dados operacionais, sem flag ativa.
-- ===========================================================================

-- 1) Permissões (14 novas) -------------------------------------------------
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.visualizar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.criar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.editar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.cancelar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.finalizar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.excluir';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.gerar_pv';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.tarefa.executar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.tarefa.atribuir';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.formulario.responder';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.cadastros.editar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.modelo.editar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.relatorio.ver';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'os.dashboard.ver';
