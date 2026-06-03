-- D27.COM.3.a — Backend operacional do Comercial

-- ============================================================
-- 1) Permissões novas
-- ============================================================
DO $$
BEGIN
  BEGIN ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.aprovar'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
DO $$
BEGIN
  BEGIN ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.gerar'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
DO $$
BEGIN
  BEGIN ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'engenharia.criar_obra'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
DO $$
BEGIN
  BEGIN ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'financiamento.criar_pendencia'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;