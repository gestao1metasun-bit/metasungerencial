
-- =====================================================
-- ONDA C5 — ASSINATURA ENTERPRISE
-- =====================================================

-- 1) Novas permissões
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.contrato.assinar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.contrato.assinar_excecao';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.contrato.ver_assinatura';
