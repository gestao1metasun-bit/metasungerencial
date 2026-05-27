
-- =====================================================================
-- D8.0.1 — Cadastros estruturais financeiros
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.bancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  ispb text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bancos TO authenticated;
GRANT ALL ON public.bancos TO service_role;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
CREATE POLICY bancos_select_auth ON public.bancos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY bancos_admin_write ON public.bancos
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.naturezas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('RECEITA','DESPESA','AMBOS')),
  grupo text,
  subgrupo text,
  classificacao_contabil text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.naturezas_financeiras TO authenticated;
GRANT ALL ON public.naturezas_financeiras TO service_role;
ALTER TABLE public.naturezas_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY naturezas_select_auth ON public.naturezas_financeiras
  FOR SELECT TO authenticated USING (true);
CREATE POLICY naturezas_admin_write ON public.naturezas_financeiras
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.plano_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  nivel int NOT NULL DEFAULT 1,
  pai_id uuid REFERENCES public.plano_contas(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('ATIVO','PASSIVO','RECEITA','DESPESA','RESULTADO')),
  natureza_id uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plano_contas TO authenticated;
GRANT ALL ON public.plano_contas TO service_role;
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY plano_contas_select_auth ON public.plano_contas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY plano_contas_admin_write ON public.plano_contas
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.contas_financeiras
  ADD COLUMN IF NOT EXISTS tipo_conta text
    CHECK (tipo_conta IN ('CAIXA','BANCO','CARTAO','INTERNA','GATEWAY'));

UPDATE public.contas_financeiras
   SET tipo_conta = CASE
     WHEN banco IS NOT NULL AND length(trim(banco)) > 0 THEN 'BANCO'
     ELSE 'INTERNA'
   END
 WHERE tipo_conta IS NULL;

CREATE TABLE IF NOT EXISTS public.portadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('BANCO','CAIXA','CARTAO','GATEWAY','OUTRO')),
  banco_id uuid REFERENCES public.bancos(id) ON DELETE SET NULL,
  conta_financeira_id uuid REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  agencia text,
  conta text,
  carteira text,
  ativo boolean NOT NULL DEFAULT true,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portadores_banco ON public.portadores(banco_id);
CREATE INDEX IF NOT EXISTS idx_portadores_conta ON public.portadores(conta_financeira_id);
GRANT SELECT ON public.portadores TO authenticated;
GRANT ALL ON public.portadores TO service_role;
ALTER TABLE public.portadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY portadores_select_auth ON public.portadores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY portadores_admin_write ON public.portadores
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- updated_at triggers (usa função existente do projeto)
CREATE TRIGGER trg_bancos_updated_at BEFORE UPDATE ON public.bancos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_naturezas_financeiras_updated_at BEFORE UPDATE ON public.naturezas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_plano_contas_updated_at BEFORE UPDATE ON public.plano_contas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_portadores_updated_at BEFORE UPDATE ON public.portadores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- SEED: bancos ----------
INSERT INTO public.bancos (codigo, nome) VALUES
  ('001','Banco do Brasil'),
  ('033','Santander'),
  ('104','Caixa Econômica Federal'),
  ('237','Bradesco'),
  ('260','Nu Pagamentos (Nubank)'),
  ('341','Itaú Unibanco'),
  ('336','C6 Bank'),
  ('077','Inter'),
  ('212','Banco Original'),
  ('756','Sicoob')
ON CONFLICT (codigo) DO NOTHING;

-- ---------- SEED: naturezas ----------
INSERT INTO public.naturezas_financeiras (codigo, nome, tipo, grupo) VALUES
  ('R001','Venda de Sistema Solar','RECEITA','Vendas'),
  ('R002','Venda de Material Avulso','RECEITA','Vendas'),
  ('R003','Serviço de Instalação','RECEITA','Serviços'),
  ('R004','Serviço de Manutenção','RECEITA','Serviços'),
  ('R005','Aditivo Contratual','RECEITA','Vendas'),
  ('R099','Outras Receitas','RECEITA','Outros'),
  ('D001','Compra de Material','DESPESA','Custos Diretos'),
  ('D002','Comissão Vendedor','DESPESA','Comercial'),
  ('D003','Comissão Gerente','DESPESA','Comercial'),
  ('D004','Frete / Logística','DESPESA','Operacional'),
  ('D005','Mão de Obra Instalação','DESPESA','Operacional'),
  ('D006','Folha de Pagamento','DESPESA','Pessoal'),
  ('D007','Encargos Sociais','DESPESA','Pessoal'),
  ('D008','Aluguel','DESPESA','Administrativo'),
  ('D009','Energia / Água / Internet','DESPESA','Administrativo'),
  ('D010','Combustível','DESPESA','Operacional'),
  ('D011','Marketing','DESPESA','Comercial'),
  ('D012','Impostos / Taxas','DESPESA','Tributário'),
  ('D013','Tarifas Bancárias','DESPESA','Financeiro'),
  ('D014','Juros / Multas','DESPESA','Financeiro'),
  ('D099','Outras Despesas','DESPESA','Outros')
ON CONFLICT (codigo) DO NOTHING;

-- ---------- SEED: plano de contas raiz ----------
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo) VALUES
  ('1','Ativo',1,'ATIVO'),
  ('2','Passivo',1,'PASSIVO'),
  ('3','Receitas',1,'RECEITA'),
  ('4','Despesas',1,'DESPESA')
ON CONFLICT (codigo) DO NOTHING;

-- nível 2 + 3 (depende do nível 1 já existir)
INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, pai_id) VALUES
  ('3.1','Receita Operacional',2,'RECEITA',(SELECT id FROM public.plano_contas WHERE codigo='3')),
  ('4.1','Custos Diretos',2,'DESPESA',(SELECT id FROM public.plano_contas WHERE codigo='4')),
  ('4.2','Despesas Operacionais',2,'DESPESA',(SELECT id FROM public.plano_contas WHERE codigo='4')),
  ('4.3','Despesas Administrativas',2,'DESPESA',(SELECT id FROM public.plano_contas WHERE codigo='4')),
  ('4.4','Despesas Financeiras',2,'DESPESA',(SELECT id FROM public.plano_contas WHERE codigo='4'))
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.plano_contas (codigo, nome, nivel, tipo, pai_id) VALUES
  ('3.1.01','Vendas Solar',3,'RECEITA',(SELECT id FROM public.plano_contas WHERE codigo='3.1'))
ON CONFLICT (codigo) DO NOTHING;
