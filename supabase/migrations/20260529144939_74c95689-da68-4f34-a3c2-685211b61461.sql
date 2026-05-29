
-- D18.6 — Partidas Contábeis Virtuais

-- 1) LOTES
CREATE TABLE IF NOT EXISTS public.lotes_integracao_contabil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text,
  competencia date,
  sistema_destino text,
  status text NOT NULL DEFAULT 'ABERTO'
    CHECK (status IN ('ABERTO','FECHADO','EXPORTADO','CANCELADO')),
  total_partidas integer NOT NULL DEFAULT 0,
  total_debito numeric(18,2) NOT NULL DEFAULT 0,
  total_credito numeric(18,2) NOT NULL DEFAULT 0,
  hash_integracao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.lotes_integracao_contabil TO authenticated;
GRANT ALL ON public.lotes_integracao_contabil TO service_role;
ALTER TABLE public.lotes_integracao_contabil ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lotes_integracao_contabil' AND policyname='lotes_select_auth') THEN
    CREATE POLICY lotes_select_auth ON public.lotes_integracao_contabil
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lotes_integracao_contabil' AND policyname='lotes_write_admin') THEN
    CREATE POLICY lotes_write_admin ON public.lotes_integracao_contabil
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role));
  END IF;
END $$;

-- 2) PARTIDAS CONTÁBEIS VIRTUAIS
CREATE TABLE IF NOT EXISTS public.partidas_contabeis_virtuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid,
  evento_canonico text NOT NULL,
  modulo_origem text NOT NULL
    CHECK (modulo_origem IN ('COMERCIAL','FINANCEIRO','ESTOQUE','ENGENHARIA','OPERACAO_FINANCEIRA','COMPRAS','OUTROS')),
  origem_tipo text NOT NULL,
  origem_id uuid,
  conta_debito_id uuid REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  conta_credito_id uuid REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  conta_debito_codigo text,
  conta_credito_codigo text,
  valor numeric(18,2) NOT NULL DEFAULT 0,
  competencia date,
  data_evento date NOT NULL DEFAULT CURRENT_DATE,
  natureza_id uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  centro_resultado_id uuid REFERENCES public.centros_resultado(id) ON DELETE SET NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  lote_id uuid REFERENCES public.lotes_integracao_contabil(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','MAPEADA','CONCILIADA','EXPORTADA','BLOQUEADA','IGNORADA','CANCELADA')),
  origem_payload jsonb,
  observacoes text,
  codigo_externo text,
  sistema_destino text,
  status_integracao text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status_integracao IN ('PENDENTE','ENVIADO','CONFIRMADO','ERRO','IGNORADO')),
  data_integracao timestamptz,
  hash_integracao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.partidas_contabeis_virtuais TO authenticated;
GRANT ALL ON public.partidas_contabeis_virtuais TO service_role;
ALTER TABLE public.partidas_contabeis_virtuais ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidas_contabeis_virtuais' AND policyname='partidas_select_auth') THEN
    CREATE POLICY partidas_select_auth ON public.partidas_contabeis_virtuais
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidas_contabeis_virtuais' AND policyname='partidas_write_admin') THEN
    CREATE POLICY partidas_write_admin ON public.partidas_contabeis_virtuais
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pcv_evento_canonico ON public.partidas_contabeis_virtuais(evento_canonico);
CREATE INDEX IF NOT EXISTS idx_pcv_modulo ON public.partidas_contabeis_virtuais(modulo_origem);
CREATE INDEX IF NOT EXISTS idx_pcv_origem ON public.partidas_contabeis_virtuais(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_pcv_competencia ON public.partidas_contabeis_virtuais(competencia);
CREATE INDEX IF NOT EXISTS idx_pcv_status ON public.partidas_contabeis_virtuais(status);
CREATE INDEX IF NOT EXISTS idx_pcv_lote ON public.partidas_contabeis_virtuais(lote_id);
CREATE INDEX IF NOT EXISTS idx_pcv_cr_cc ON public.partidas_contabeis_virtuais(centro_resultado_id, centro_custo_id);

-- 3) FINANCEIRO EVENTOS CATÁLOGO
CREATE TABLE IF NOT EXISTS public.financeiro_eventos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text NOT NULL,
  evento_canonico text NOT NULL,
  natureza_default text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.financeiro_eventos_catalogo TO authenticated;
GRANT ALL ON public.financeiro_eventos_catalogo TO service_role;
ALTER TABLE public.financeiro_eventos_catalogo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financeiro_eventos_catalogo' AND policyname='fin_eventos_select_auth') THEN
    CREATE POLICY fin_eventos_select_auth ON public.financeiro_eventos_catalogo
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financeiro_eventos_catalogo' AND policyname='fin_eventos_write_admin') THEN
    CREATE POLICY fin_eventos_write_admin ON public.financeiro_eventos_catalogo
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin_master'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role));
  END IF;
END $$;

INSERT INTO public.financeiro_eventos_catalogo (codigo, descricao, evento_canonico) VALUES
  ('RECEBIMENTO','Recebimento de título','RECEBIMENTO'),
  ('PAGAMENTO','Pagamento de título','PAGAMENTO'),
  ('ADIANTAMENTO_REGISTRADO','Adiantamento registrado','ADIANTAMENTO_REGISTRADO'),
  ('ADIANTAMENTO_ABATIDO','Adiantamento abatido em título','ADIANTAMENTO_ABATIDO'),
  ('RENEGOCIACAO','Título renegociado','RENEGOCIACAO'),
  ('RESCISAO','Rescisão contratual','RESCISAO'),
  ('OPERACAO_FIN_LIBERADA','Operação financeira liberada','OPERACAO_FIN_LIBERADA'),
  ('OPERACAO_FIN_BAIXA','Baixa de parcela de operação financeira','OPERACAO_FIN_BAIXA'),
  ('ESTORNO_RECEBIMENTO','Estorno de recebimento','ESTORNO_RECEBIMENTO'),
  ('ESTORNO_PAGAMENTO','Estorno de pagamento','ESTORNO_PAGAMENTO')
ON CONFLICT (codigo) DO NOTHING;

-- 4) VIEW CONSOLIDADA DE CATÁLOGOS (normaliza colunas: comercial/estoque usam "evento", engenharia usa "codigo")
CREATE OR REPLACE VIEW public.v_eventos_canonicos_catalogo
WITH (security_invoker=on) AS
  SELECT 'COMERCIAL'::text AS modulo, evento AS codigo, descricao, evento_canonico, ativo
    FROM public.comercial_eventos_catalogo
  UNION ALL
  SELECT 'FINANCEIRO'::text, codigo, descricao, evento_canonico, ativo
    FROM public.financeiro_eventos_catalogo
  UNION ALL
  SELECT 'ESTOQUE'::text, evento AS codigo, descricao, evento_canonico, ativo
    FROM public.estoque_eventos_catalogo
  UNION ALL
  SELECT 'ENGENHARIA'::text, codigo, descricao, evento_canonico, ativo
    FROM public.engenharia_eventos_catalogo;

GRANT SELECT ON public.v_eventos_canonicos_catalogo TO authenticated;

-- 5) VIEW DE PARTIDAS PENDENTES
CREATE OR REPLACE VIEW public.v_partidas_contabeis_pendentes
WITH (security_invoker=on) AS
SELECT
  p.id,
  p.evento_canonico,
  p.modulo_origem,
  p.origem_tipo,
  p.origem_id,
  p.valor,
  p.competencia,
  p.data_evento,
  p.conta_debito_codigo,
  p.conta_credito_codigo,
  p.centro_resultado_id,
  p.centro_custo_id,
  p.natureza_id,
  p.status,
  p.status_integracao,
  cr.nome AS centro_resultado_nome,
  cc.nome AS centro_custo_nome,
  n.nome AS natureza_nome
FROM public.partidas_contabeis_virtuais p
LEFT JOIN public.centros_resultado cr ON cr.id = p.centro_resultado_id
LEFT JOIN public.centros_custo cc ON cc.id = p.centro_custo_id
LEFT JOIN public.naturezas_financeiras n ON n.id = p.natureza_id
WHERE p.status IN ('PENDENTE','MAPEADA','BLOQUEADA');

GRANT SELECT ON public.v_partidas_contabeis_pendentes TO authenticated;

-- 6) VIEW DE RESUMO
CREATE OR REPLACE VIEW public.v_partidas_contabeis_resumo
WITH (security_invoker=on) AS
SELECT
  modulo_origem,
  competencia,
  evento_canonico,
  status,
  COUNT(*)::bigint AS qtde,
  COALESCE(SUM(valor),0)::numeric AS valor_total
FROM public.partidas_contabeis_virtuais
GROUP BY modulo_origem, competencia, evento_canonico, status;

GRANT SELECT ON public.v_partidas_contabeis_resumo TO authenticated;
