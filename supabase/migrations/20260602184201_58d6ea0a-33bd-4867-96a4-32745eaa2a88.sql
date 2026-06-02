-- D20.SUP.7 (1/4) — Novas permissões de Alçada e Preparação Financeira de Suprimentos.
-- Apenas adiciona valores ao enum app_permission. Sem tabelas/RLS aqui — necessário commit
-- separado antes que policies usem essas chaves (mesmo padrão D20.SUP.2/SUP.4).

ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'suprimentos.alcada.gerir';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'suprimentos.alcada.aplicar';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'suprimentos.pedido.preparar_financeiro';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'suprimentos.pedido.bloquear_financeiro';