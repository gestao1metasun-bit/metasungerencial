-- D15 Onda 1.A.0 REV2 — Parte 1/2: novos valores do enum app_permission
-- (precisa ser commitado antes de qualquer USE/CAST desses valores)
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'integracao.visualizar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'integracao.mapear';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'integracao.exportar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'integracao.reprocessar';