
-- ============================================================================
-- D18.8 — MOTOR DE EXPORTAÇÃO E CONSOLIDAÇÃO FINAL
-- 100% preparatório. Sem SPED/ECD/ECF/NF-e/transmissão real.
-- ============================================================================

-- 1) EXPORTADORES EXTERNOS (inativos, homologação)
CREATE TABLE IF NOT EXISTS public.exportadores_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  sistema_destino text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('CONTABIL','FISCAL','FINANCEIRO','MULTI')),
  formato_padrao text NOT NULL CHECK (formato_padrao IN ('CSV','TXT','JSON','XML','XLSX')),
  layout_id uuid REFERENCES public.layouts_exportacao(id) ON DELETE SET NULL,
  conector_id uuid REFERENCES public.conectores_externos(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT false,
  ambiente text NOT NULL DEFAULT 'HOMOLOGACAO' CHECK (ambiente IN ('HOMOLOGACAO','PRODUCAO')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exportadores_externos TO authenticated;
GRANT ALL ON public.exportadores_externos TO service_role;
ALTER TABLE public.exportadores_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exportadores_select_auth" ON public.exportadores_externos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "exportadores_write_admin" ON public.exportadores_externos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_geral'))
  WITH CHECK (has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_geral'));

CREATE TRIGGER tg_exportadores_updated BEFORE UPDATE ON public.exportadores_externos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- Seeds inativos (homologação)
INSERT INTO public.exportadores_externos (codigo, nome, sistema_destino, categoria, formato_padrao, ativo, ambiente, observacao) VALUES
  ('EXP_DOMINIO_CONT','Domínio Contábil (homologação)','DOMINIO','CONTABIL','TXT',false,'HOMOLOGACAO','Exportador inativo — apenas payload simulado'),
  ('EXP_DOMINIO_FISC','Domínio Fiscal (homologação)','DOMINIO','FISCAL','TXT',false,'HOMOLOGACAO','Exportador inativo — apenas payload simulado'),
  ('EXP_ALTERDATA_CONT','Alterdata Contábil (homologação)','ALTERDATA','CONTABIL','CSV',false,'HOMOLOGACAO','Exportador inativo'),
  ('EXP_ALTERDATA_FISC','Alterdata Fiscal (homologação)','ALTERDATA','FISCAL','CSV',false,'HOMOLOGACAO','Exportador inativo'),
  ('EXP_SANKHYA','Sankhya ERP (homologação)','SANKHYA','MULTI','JSON',false,'HOMOLOGACAO','Exportador inativo'),
  ('EXP_TOTVS_RM','TOTVS RM (homologação)','TOTVS_RM','MULTI','XML',false,'HOMOLOGACAO','Exportador inativo'),
  ('EXP_TOTVS_PROTHEUS','TOTVS Protheus (homologação)','TOTVS_PROTHEUS','MULTI','XML',false,'HOMOLOGACAO','Exportador inativo'),
  ('EXP_SAP_ECC','SAP ECC (homologação)','SAP_ECC','MULTI','XML',false,'HOMOLOGACAO','Exportador inativo'),
  ('EXP_SAP_S4','SAP S/4HANA (homologação)','SAP_S4','MULTI','JSON',false,'HOMOLOGACAO','Exportador inativo')
ON CONFLICT (codigo) DO NOTHING;

-- 2) EXPORTAÇÕES GERADAS (registro de payloads de homologação)
CREATE TABLE IF NOT EXISTS public.exportacoes_geradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exportador_id uuid NOT NULL REFERENCES public.exportadores_externos(id) ON DELETE RESTRICT,
  lote_id uuid REFERENCES public.lotes_integracao_contabil(id) ON DELETE SET NULL,
  categoria text NOT NULL CHECK (categoria IN ('CONTABIL','FISCAL','FINANCEIRO','MULTI')),
  competencia date,
  total_registros integer NOT NULL DEFAULT 0,
  hash_payload text,
  payload jsonb,
  status text NOT NULL DEFAULT 'GERADO' CHECK (status IN ('GERADO','VALIDADO','DESCARTADO','ERRO')),
  ambiente text NOT NULL DEFAULT 'HOMOLOGACAO' CHECK (ambiente IN ('HOMOLOGACAO','PRODUCAO')),
  mensagem text,
  gerado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exp_geradas_exportador ON public.exportacoes_geradas(exportador_id);
CREATE INDEX IF NOT EXISTS idx_exp_geradas_lote ON public.exportacoes_geradas(lote_id);
CREATE INDEX IF NOT EXISTS idx_exp_geradas_status ON public.exportacoes_geradas(status, ambiente);

GRANT SELECT, INSERT ON public.exportacoes_geradas TO authenticated;
GRANT ALL ON public.exportacoes_geradas TO service_role;
ALTER TABLE public.exportacoes_geradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exp_geradas_select_auth" ON public.exportacoes_geradas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "exp_geradas_insert_admin" ON public.exportacoes_geradas
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_geral'));
CREATE POLICY "exp_geradas_update_admin" ON public.exportacoes_geradas
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_geral'))
  WITH CHECK (has_role(auth.uid(),'admin_master') OR has_role(auth.uid(),'admin_geral'));

CREATE TRIGGER tg_exp_geradas_updated BEFORE UPDATE ON public.exportacoes_geradas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- 3) MATRIZ DE COBERTURA — Evento ERP → Natureza → CR → CC → Plano → Partida → Lote → Exportação
CREATE OR REPLACE VIEW public.v_cobertura_eventos_canonicos
WITH (security_invoker = on) AS
SELECT
  cat.modulo,
  cat.evento_canonico,
  COUNT(DISTINCT m.id) AS qtd_mapeamentos,
  COUNT(DISTINCT p.id) AS qtd_partidas,
  COUNT(DISTINCT p.lote_id) FILTER (WHERE p.lote_id IS NOT NULL) AS qtd_lotes,
  COUNT(DISTINCT lr.lote_id) FILTER (WHERE lr.lote_id IS NOT NULL) AS qtd_lotes_registros,
  CASE
    WHEN COUNT(DISTINCT m.id) = 0 THEN 'SEM_MAPEAMENTO'
    WHEN COUNT(DISTINCT p.id) = 0 THEN 'MAPEADO_SEM_PARTIDA'
    WHEN COUNT(DISTINCT p.lote_id) FILTER (WHERE p.lote_id IS NOT NULL) = 0 THEN 'PARTIDA_SEM_LOTE'
    ELSE 'COBERTO'
  END AS status_cobertura
FROM public.v_eventos_canonicos_catalogo cat
LEFT JOIN public.mapeamentos_contabeis m ON m.evento_canonico = cat.evento_canonico
LEFT JOIN public.partidas_contabeis_virtuais p ON p.evento_canonico = cat.evento_canonico
LEFT JOIN public.lote_registros lr ON lr.origem_id = p.id AND lr.origem_tipo = 'PARTIDA_VIRTUAL'
GROUP BY cat.modulo, cat.evento_canonico;

-- 4) LACUNAS DE MAPEAMENTO
CREATE OR REPLACE VIEW public.v_lacunas_mapeamento_contabil
WITH (security_invoker = on) AS
SELECT modulo, evento_canonico, status_cobertura
FROM public.v_cobertura_eventos_canonicos
WHERE status_cobertura <> 'COBERTO';

-- 5) AUDITORIA DE INTEGRIDADE
CREATE OR REPLACE VIEW public.v_auditoria_integridade_integracao
WITH (security_invoker = on) AS
SELECT
  l.id AS lote_id,
  l.codigo AS lote_codigo,
  l.tipo_lote,
  l.status AS lote_status,
  l.competencia,
  c.codigo AS conector_codigo,
  c.ativo AS conector_ativo,
  ly.codigo AS layout_codigo,
  ly.formato AS layout_formato,
  COUNT(lr.id) AS qtd_registros,
  COUNT(lr.id) FILTER (WHERE lr.hash_registro IS NULL) AS registros_sem_hash,
  COUNT(lr.id) FILTER (WHERE lr.codigo_externo IS NULL) AS registros_sem_codigo_externo,
  COUNT(lr.id) FILTER (WHERE lr.status = 'ERRO') AS registros_em_erro
FROM public.lotes_integracao_contabil l
LEFT JOIN public.conectores_externos c ON c.id = l.conector_id
LEFT JOIN public.layouts_exportacao ly ON ly.id = l.layout_id
LEFT JOIN public.lote_registros lr ON lr.lote_id = l.id
GROUP BY l.id, l.codigo, l.tipo_lote, l.status, l.competencia, c.codigo, c.ativo, ly.codigo, ly.formato;

-- 6) COBERTURA CONSOLIDADA D18 (resumo final)
CREATE OR REPLACE VIEW public.v_d18_cobertura_consolidada
WITH (security_invoker = on) AS
SELECT
  'EVENTOS_CATALOGADOS'::text AS dimensao,
  (SELECT COUNT(*) FROM public.v_eventos_canonicos_catalogo)::numeric AS total,
  NULL::text AS observacao
UNION ALL SELECT 'EVENTOS_MAPEADOS',
  (SELECT COUNT(*) FROM public.v_cobertura_eventos_canonicos WHERE status_cobertura <> 'SEM_MAPEAMENTO'), NULL
UNION ALL SELECT 'EVENTOS_COBERTOS',
  (SELECT COUNT(*) FROM public.v_cobertura_eventos_canonicos WHERE status_cobertura = 'COBERTO'), NULL
UNION ALL SELECT 'LACUNAS_MAPEAMENTO',
  (SELECT COUNT(*) FROM public.v_lacunas_mapeamento_contabil), 'Eventos sem mapeamento/partida/lote'
UNION ALL SELECT 'PARTIDAS_VIRTUAIS_TOTAL',
  (SELECT COUNT(*) FROM public.partidas_contabeis_virtuais), NULL
UNION ALL SELECT 'LOTES_INTEGRACAO_TOTAL',
  (SELECT COUNT(*) FROM public.lotes_integracao_contabil), NULL
UNION ALL SELECT 'EXPORTADORES_CADASTRADOS',
  (SELECT COUNT(*) FROM public.exportadores_externos), 'Todos inativos (HOMOLOGACAO)'
UNION ALL SELECT 'EXPORTADORES_ATIVOS',
  (SELECT COUNT(*) FROM public.exportadores_externos WHERE ativo = true), 'Deve ser 0 nesta fase'
UNION ALL SELECT 'EXPORTACOES_GERADAS',
  (SELECT COUNT(*) FROM public.exportacoes_geradas), 'Payloads de homologação'
UNION ALL SELECT 'CONECTORES_EXTERNOS',
  (SELECT COUNT(*) FROM public.conectores_externos), 'Todos inativos'
UNION ALL SELECT 'LAYOUTS_EXPORTACAO',
  (SELECT COUNT(*) FROM public.layouts_exportacao), NULL;
