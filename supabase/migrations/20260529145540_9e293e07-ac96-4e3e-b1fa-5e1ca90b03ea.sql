
ALTER TABLE public.lotes_integracao_contabil
  ADD COLUMN IF NOT EXISTS tipo_lote text NOT NULL DEFAULT 'CONTABIL',
  ADD COLUMN IF NOT EXISTS conector_id uuid,
  ADD COLUMN IF NOT EXISTS layout_id uuid,
  ADD COLUMN IF NOT EXISTS data_geracao timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS data_exportacao timestamptz,
  ADD COLUMN IF NOT EXISTS data_integracao timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_integracao uuid,
  ADD COLUMN IF NOT EXISTS total_registros integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payload_export jsonb,
  ADD COLUMN IF NOT EXISTS mensagem_retorno text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lotes_integracao_tipo_chk') THEN
    ALTER TABLE public.lotes_integracao_contabil ADD CONSTRAINT lotes_integracao_tipo_chk CHECK (tipo_lote IN ('CONTABIL','FISCAL','FINANCEIRO'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lotes_integracao_status_chk') THEN
    ALTER TABLE public.lotes_integracao_contabil ADD CONSTRAINT lotes_integracao_status_chk CHECK (status IN ('PENDENTE','EXPORTADO','INTEGRADO','ERRO','CANCELADO'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lotes_integracao_tipo_status ON public.lotes_integracao_contabil(tipo_lote, status);
CREATE INDEX IF NOT EXISTS idx_lotes_integracao_competencia ON public.lotes_integracao_contabil(competencia);

CREATE TABLE IF NOT EXISTS public.conectores_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  fornecedor text NOT NULL CHECK (fornecedor IN ('DOMINIO','ALTERDATA','SANKHYA','TOTVS','SAP','OUTRO')),
  categoria text NOT NULL CHECK (categoria IN ('CONTABIL','FISCAL','FINANCEIRO','MISTO')),
  ativo boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.conectores_externos TO authenticated;
GRANT ALL ON public.conectores_externos TO service_role;
ALTER TABLE public.conectores_externos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conectores_select_auth" ON public.conectores_externos;
CREATE POLICY "conectores_select_auth" ON public.conectores_externos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "conectores_admin_all" ON public.conectores_externos;
CREATE POLICY "conectores_admin_all" ON public.conectores_externos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin_master') OR public.has_role(auth.uid(),'admin_geral'))
  WITH CHECK (public.has_role(auth.uid(),'admin_master') OR public.has_role(auth.uid(),'admin_geral'));

CREATE TABLE IF NOT EXISTS public.layouts_exportacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('CONTABIL','FISCAL','FINANCEIRO')),
  conector_id uuid REFERENCES public.conectores_externos(id),
  formato text NOT NULL CHECK (formato IN ('CSV','TXT','JSON','XML','XLSX','OUTRO')) DEFAULT 'JSON',
  versao text NOT NULL DEFAULT '1.0',
  schema_layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.layouts_exportacao TO authenticated;
GRANT ALL ON public.layouts_exportacao TO service_role;
ALTER TABLE public.layouts_exportacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "layouts_select_auth" ON public.layouts_exportacao;
CREATE POLICY "layouts_select_auth" ON public.layouts_exportacao FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "layouts_admin_all" ON public.layouts_exportacao;
CREATE POLICY "layouts_admin_all" ON public.layouts_exportacao FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin_master') OR public.has_role(auth.uid(),'admin_geral'))
  WITH CHECK (public.has_role(auth.uid(),'admin_master') OR public.has_role(auth.uid(),'admin_geral'));

CREATE TABLE IF NOT EXISTS public.lote_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES public.lotes_integracao_contabil(id) ON DELETE CASCADE,
  origem_tipo text NOT NULL CHECK (origem_tipo IN ('PARTIDA_VIRTUAL','TITULO_FINANCEIRO','MOVIMENTO_ESTOQUE','FATURAMENTO_COMERCIAL','OPERACAO_FINANCEIRA','OUTRO')),
  origem_id uuid NOT NULL,
  evento_canonico text,
  valor numeric(18,2),
  hash_registro text,
  codigo_externo text,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EXPORTADO','INTEGRADO','ERRO','CANCELADO')),
  mensagem_retorno text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lote_registros TO authenticated;
GRANT ALL ON public.lote_registros TO service_role;
ALTER TABLE public.lote_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lote_registros_select_auth" ON public.lote_registros;
CREATE POLICY "lote_registros_select_auth" ON public.lote_registros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lote_registros_admin_all" ON public.lote_registros;
CREATE POLICY "lote_registros_admin_all" ON public.lote_registros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin_master') OR public.has_role(auth.uid(),'admin_geral'))
  WITH CHECK (public.has_role(auth.uid(),'admin_master') OR public.has_role(auth.uid(),'admin_geral'));
CREATE INDEX IF NOT EXISTS idx_lote_registros_lote ON public.lote_registros(lote_id);
CREATE INDEX IF NOT EXISTS idx_lote_registros_origem ON public.lote_registros(origem_tipo, origem_id);
CREATE INDEX IF NOT EXISTS idx_lote_registros_status ON public.lote_registros(status);

INSERT INTO public.conectores_externos (codigo, nome, fornecedor, categoria, ativo) VALUES
  ('DOMINIO_CONTABIL','Domínio Sistemas — Contábil','DOMINIO','CONTABIL', false),
  ('DOMINIO_FISCAL','Domínio Sistemas — Fiscal','DOMINIO','FISCAL', false),
  ('ALTERDATA_CONTABIL','Alterdata — Contábil','ALTERDATA','CONTABIL', false),
  ('ALTERDATA_FISCAL','Alterdata — Fiscal','ALTERDATA','FISCAL', false),
  ('SANKHYA_ERP','Sankhya — ERP','SANKHYA','MISTO', false),
  ('TOTVS_RM','TOTVS RM','TOTVS','MISTO', false),
  ('TOTVS_PROTHEUS','TOTVS Protheus','TOTVS','MISTO', false),
  ('SAP_ECC','SAP ECC','SAP','MISTO', false),
  ('SAP_S4HANA','SAP S/4HANA','SAP','MISTO', false)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.layouts_exportacao (codigo, nome, categoria, formato, versao, ativo) VALUES
  ('LAYOUT_CONTABIL_GENERICO_JSON','Layout Contábil Genérico (JSON)','CONTABIL','JSON','1.0', false),
  ('LAYOUT_FISCAL_GENERICO_JSON','Layout Fiscal Genérico (JSON)','FISCAL','JSON','1.0', false),
  ('LAYOUT_FINANCEIRO_GENERICO_JSON','Layout Financeiro Genérico (JSON)','FINANCEIRO','JSON','1.0', false)
ON CONFLICT (codigo) DO NOTHING;

CREATE OR REPLACE VIEW public.v_lotes_integracao_resumo
WITH (security_invoker=on) AS
SELECT l.tipo_lote, l.status, l.competencia,
  COUNT(*)::int AS qtd_lotes,
  COALESCE(SUM(l.total_registros),0)::int AS total_registros,
  COALESCE(SUM(l.total_debito),0)::numeric AS total_debito,
  COALESCE(SUM(l.total_credito),0)::numeric AS total_credito
FROM public.lotes_integracao_contabil l
GROUP BY l.tipo_lote, l.status, l.competencia;

CREATE OR REPLACE VIEW public.v_lote_registros_status
WITH (security_invoker=on) AS
SELECT lr.lote_id, l.codigo AS lote_codigo, l.tipo_lote,
  lr.origem_tipo, lr.status,
  COUNT(*)::int AS qtd,
  COALESCE(SUM(lr.valor),0)::numeric AS valor_total
FROM public.lote_registros lr
JOIN public.lotes_integracao_contabil l ON l.id = lr.lote_id
GROUP BY lr.lote_id, l.codigo, l.tipo_lote, lr.origem_tipo, lr.status;

DROP TRIGGER IF EXISTS trg_conectores_updated ON public.conectores_externos;
CREATE TRIGGER trg_conectores_updated BEFORE UPDATE ON public.conectores_externos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_layouts_updated ON public.layouts_exportacao;
CREATE TRIGGER trg_layouts_updated BEFORE UPDATE ON public.layouts_exportacao
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_lote_registros_updated ON public.lote_registros;
CREATE TRIGGER trg_lote_registros_updated BEFORE UPDATE ON public.lote_registros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
