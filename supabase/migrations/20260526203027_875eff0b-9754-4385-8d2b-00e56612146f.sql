
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'workflow.solicitar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'workflow.cancelar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'workflow.administrar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'workflow.aprovar.operacional';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'workflow.aprovar.financeiro';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'workflow.aprovar.diretoria';
