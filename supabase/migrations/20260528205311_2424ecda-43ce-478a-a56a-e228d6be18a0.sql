
-- ============================================================
-- D15 / Módulo Comercial — Onda C1 (REV2 — corrige TG_ARGV)
-- Catálogos configuráveis + Permissões + Seeds + RLS
-- ============================================================

-- 1. Permissões novas (idempotente)
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.lead.criar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.lead.editar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.criar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.editar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.revisar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.proposta.aprovar_excecao';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.carteira.transferir';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.carteira.transferir_lote';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'contrato.cancelar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'contrato.reabrir';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.pipeline.configurar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.parametro.configurar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.visualizar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'comercial.comissao.liberar';

-- 2. comercial_pipeline_etapas
CREATE TABLE IF NOT EXISTS public.comercial_pipeline_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('LEAD','PROPOSTA','CONTRATO')),
  ordem integer NOT NULL DEFAULT 0,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid,
  row_version integer NOT NULL DEFAULT 1,
  CONSTRAINT comercial_pipeline_etapas_codigo_unique UNIQUE (codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_pipeline_etapas TO authenticated;
GRANT ALL ON public.comercial_pipeline_etapas TO service_role;
ALTER TABLE public.comercial_pipeline_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_etapas_select_auth" ON public.comercial_pipeline_etapas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pipeline_etapas_write" ON public.comercial_pipeline_etapas
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "pipeline_etapas_update" ON public.comercial_pipeline_etapas
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'))
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "pipeline_etapas_delete" ON public.comercial_pipeline_etapas
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER tg_audit_pipeline_etapas
  AFTER INSERT OR UPDATE OR DELETE ON public.comercial_pipeline_etapas
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'comercial_pipeline_etapas');
CREATE TRIGGER tg_bump_pipeline_etapas
  BEFORE UPDATE ON public.comercial_pipeline_etapas
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

-- 3. lead_origens
CREATE TABLE IF NOT EXISTS public.lead_origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid,
  row_version integer NOT NULL DEFAULT 1,
  CONSTRAINT lead_origens_codigo_unique UNIQUE (codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_origens TO authenticated;
GRANT ALL ON public.lead_origens TO service_role;
ALTER TABLE public.lead_origens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_origens_select_auth" ON public.lead_origens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_origens_write" ON public.lead_origens
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "lead_origens_update" ON public.lead_origens
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'))
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "lead_origens_delete" ON public.lead_origens
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER tg_audit_lead_origens
  AFTER INSERT OR UPDATE OR DELETE ON public.lead_origens
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'lead_origens');
CREATE TRIGGER tg_bump_lead_origens
  BEFORE UPDATE ON public.lead_origens
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

-- 4. motivos_perda
CREATE TABLE IF NOT EXISTS public.motivos_perda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  exige_observacao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid,
  row_version integer NOT NULL DEFAULT 1,
  CONSTRAINT motivos_perda_codigo_unique UNIQUE (codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos_perda TO authenticated;
GRANT ALL ON public.motivos_perda TO service_role;
ALTER TABLE public.motivos_perda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motivos_perda_select_auth" ON public.motivos_perda
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "motivos_perda_write" ON public.motivos_perda
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "motivos_perda_update" ON public.motivos_perda
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'))
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "motivos_perda_delete" ON public.motivos_perda
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER tg_audit_motivos_perda
  AFTER INSERT OR UPDATE OR DELETE ON public.motivos_perda
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'motivos_perda');
CREATE TRIGGER tg_bump_motivos_perda
  BEFORE UPDATE ON public.motivos_perda
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

-- 5. motivos_ganho
CREATE TABLE IF NOT EXISTS public.motivos_ganho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid,
  row_version integer NOT NULL DEFAULT 1,
  CONSTRAINT motivos_ganho_codigo_unique UNIQUE (codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos_ganho TO authenticated;
GRANT ALL ON public.motivos_ganho TO service_role;
ALTER TABLE public.motivos_ganho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motivos_ganho_select_auth" ON public.motivos_ganho
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "motivos_ganho_write" ON public.motivos_ganho
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "motivos_ganho_update" ON public.motivos_ganho
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'))
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'comercial.editar'));
CREATE POLICY "motivos_ganho_delete" ON public.motivos_ganho
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER tg_audit_motivos_ganho
  AFTER INSERT OR UPDATE OR DELETE ON public.motivos_ganho
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'motivos_ganho');
CREATE TRIGGER tg_bump_motivos_ganho
  BEFORE UPDATE ON public.motivos_ganho
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

-- 6. SEEDS idempotentes
INSERT INTO public.comercial_pipeline_etapas (codigo, nome, tipo, ordem, cor) VALUES
  ('LEAD','Lead','LEAD',10,'#94a3b8'),
  ('ORCAMENTO','Orçamento','PROPOSTA',20,'#60a5fa'),
  ('EM_ANALISE','Em Análise','PROPOSTA',30,'#fbbf24'),
  ('NEGOCIACAO','Negociação','PROPOSTA',40,'#f97316'),
  ('AGUARDANDO','Aguardando Cliente','PROPOSTA',45,'#a78bfa'),
  ('APROVADA','Aprovada','PROPOSTA',50,'#22c55e'),
  ('PERDIDA','Perdida','PROPOSTA',55,'#ef4444'),
  ('PROPOSTA_VENCIDA','Proposta Vencida','PROPOSTA',56,'#71717a'),
  ('CONTRATO','Contrato','CONTRATO',60,'#0ea5e9'),
  ('ASSINADO','Assinado','CONTRATO',70,'#16a34a'),
  ('CANCELADO','Cancelado','CONTRATO',80,'#dc2626'),
  ('OPERACIONAL','Operacional','CONTRATO',90,'#0d9488')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.lead_origens (codigo, nome, ordem) VALUES
  ('INSTAGRAM','Instagram',10),
  ('FACEBOOK','Facebook',20),
  ('GOOGLE','Google',30),
  ('SITE','Site',40),
  ('WHATSAPP','WhatsApp',50),
  ('INDICACAO','Indicação',60),
  ('FEIRAO','Feirão',70),
  ('PANFLETAGEM','Panfletagem',80),
  ('PORTA_PORTA','Porta a Porta',90),
  ('RADIO','Rádio',100),
  ('TV','TV',110),
  ('OUTRO','Outro',120)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.motivos_perda (codigo, nome, ordem, exige_observacao) VALUES
  ('PRECO','Preço',10,false),
  ('CONCORRENCIA','Concorrência',20,false),
  ('FINANCIAMENTO_RECUSADO','Financiamento recusado',30,false),
  ('DESISTENCIA','Desistência',40,false),
  ('SEM_RETORNO','Sem retorno',50,false),
  ('ADIOU_PROJETO','Adiou projeto',60,false),
  ('FORA_PERFIL','Fora do perfil',70,false),
  ('OUTRO','Outro',80,true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.motivos_ganho (codigo, nome, ordem) VALUES
  ('MELHOR_PRECO','Melhor preço',10),
  ('CONFIANCA','Confiança',20),
  ('INDICACAO','Indicação',30),
  ('PRAZO','Prazo',40),
  ('FINANCIAMENTO_APROVADO','Financiamento aprovado',50),
  ('QUALIDADE_TECNICA','Qualidade técnica',60),
  ('MARCA_META_SUN','Marca Meta Sun',70),
  ('OUTRO','Outro',80)
ON CONFLICT (codigo) DO NOTHING;

-- 7. Parâmetro mínimo R$/kWp (configurável)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='parametros_gerenciais') THEN
    INSERT INTO public.parametros_gerenciais (chave, valor, descricao)
    VALUES ('comercial.parametro_minimo_rs_kwp','2000',
      'R$/kWp mínimo para aprovação automática de proposta. Abaixo exige workflow alçada diretoria.')
    ON CONFLICT (chave) DO NOTHING;
  END IF;
END $$;
