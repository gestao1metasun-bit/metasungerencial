
CREATE TABLE IF NOT EXISTS public.gerencial_parametros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  categoria text NOT NULL DEFAULT 'geral',
  descricao text,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.gerencial_parametros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gp_select_auth ON public.gerencial_parametros;
DROP POLICY IF EXISTS gp_admin_write ON public.gerencial_parametros;
CREATE POLICY gp_select_auth ON public.gerencial_parametros
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gp_admin_write ON public.gerencial_parametros
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS tg_gp_set_updated_at ON public.gerencial_parametros;
CREATE TRIGGER tg_gp_set_updated_at
  BEFORE UPDATE ON public.gerencial_parametros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

CREATE TABLE IF NOT EXISTS public.parecer_executivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  severidade text NOT NULL DEFAULT 'info',
  modulo text NOT NULL DEFAULT 'geral',
  privado boolean NOT NULL DEFAULT false,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parecer_executivo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pe_select_amplo ON public.parecer_executivo;
DROP POLICY IF EXISTS pe_admin_write ON public.parecer_executivo;
CREATE POLICY pe_select_amplo ON public.parecer_executivo
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (NOT privado AND public.has_permission(auth.uid(), 'analytics.amplo'))
    OR (privado AND public.has_permission(auth.uid(), 'analytics.privado'))
  );
CREATE POLICY pe_admin_write ON public.parecer_executivo
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_pe_created ON public.parecer_executivo(created_at DESC);

INSERT INTO public.role_permissions(role, permission) VALUES
  ('admin_master'::public.app_role, 'analytics.amplo'::public.app_permission),
  ('admin_geral'::public.app_role,  'analytics.amplo'::public.app_permission),
  ('admin_master'::public.app_role, 'analytics.privado'::public.app_permission),
  ('admin_geral'::public.app_role,  'analytics.privado'::public.app_permission)
ON CONFLICT (role, permission) DO NOTHING;

INSERT INTO public.gerencial_parametros (chave, categoria, descricao, valor) VALUES
  ('ebitda.bands', 'kpi', 'Faixas de Margem EBITDA (%)', '{"critico":0,"muito_ruim":5,"fraco":10,"aceitavel":15,"bom":25}'::jsonb),
  ('roi.bands',    'kpi', 'Faixas de ROI (%)', '{"critico":0,"ruim":10,"aceitavel":20,"bom":40}'::jsonb),
  ('payback.bands','kpi', 'Faixas de Payback (meses)', '{"excelente":6,"bom":12,"aceitavel":24,"atencao":36}'::jsonb),
  ('roce.bands',   'kpi', 'Faixas de ROCE (%)', '{"ruim":5,"aceitavel":10,"bom":20}'::jsonb),
  ('margem_liq.bands','kpi','Margem Líquida (%)','{"prejuizo":0,"ruim":5,"aceitavel":10,"boa":20}'::jsonb),
  ('alavancagem.bands','kpi','Dívida/EBITDA','{"excelente":1,"saudavel":2,"atencao":3}'::jsonb),
  ('cobertura.bands','kpi','EBITDA/Parcelas','{"critico":1,"atencao":1.5,"saudavel":2}'::jsonb),
  ('conversao.bands','kpi','Conversão comercial (%)','{"ruim":10,"aceitavel":20,"boa":35}'::jsonb),
  ('inadimplencia.bands','kpi','Inadimplência (%)','{"excelente":3,"saudavel":5,"atencao":10}'::jsonb),
  ('capacidade.vendedor.mes','operacional','Contratos médios assinados por vendedor/mês','{"valor":4}'::jsonb),
  ('capacidade.equipe.modulos_mes','operacional','Módulos instalados por equipe/mês','{"valor":300}'::jsonb)
ON CONFLICT (chave) DO NOTHING;
