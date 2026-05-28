
-- D15 Onda 2 — Cadastros canônicos faltantes
-- Cria 4 tabelas oficiais: grupos_financeiros, subgrupos_financeiros, meios_pagamento, tipos_aplicacao
-- + seeds idempotentes alinhadas aos seeds históricos dos stores LS

-- ============ GRUPOS FINANCEIROS ============
CREATE TABLE IF NOT EXISTS public.grupos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN (
    'Receita','Custo Direto','Custo Indireto',
    'Despesa Administrativa','Despesa Comercial',
    'Imobilizado','Financeiro/Patrimonial'
  )),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.grupos_financeiros TO authenticated;
GRANT ALL ON public.grupos_financeiros TO service_role;
ALTER TABLE public.grupos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grupos_select_auth" ON public.grupos_financeiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "grupos_mut_cad" ON public.grupos_financeiros FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'cadastros.editar'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(),'cadastros.editar'::app_permission));
CREATE TRIGGER trg_grupos_updated BEFORE UPDATE ON public.grupos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ============ SUBGRUPOS FINANCEIROS ============
CREATE TABLE IF NOT EXISTS public.subgrupos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos_financeiros(id) ON DELETE RESTRICT,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subgrupos_grupo ON public.subgrupos_financeiros(grupo_id);
GRANT SELECT ON public.subgrupos_financeiros TO authenticated;
GRANT ALL ON public.subgrupos_financeiros TO service_role;
ALTER TABLE public.subgrupos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subgrupos_select_auth" ON public.subgrupos_financeiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "subgrupos_mut_cad" ON public.subgrupos_financeiros FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'cadastros.editar'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(),'cadastros.editar'::app_permission));
CREATE TRIGGER trg_subgrupos_updated BEFORE UPDATE ON public.subgrupos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ============ MEIOS DE PAGAMENTO ============
CREATE TABLE IF NOT EXISTS public.meios_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN (
    'PIX','Boleto','Cartão crédito','Cartão débito',
    'Transferência','Dinheiro','Reembolso'
  )),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meios_pagamento TO authenticated;
GRANT ALL ON public.meios_pagamento TO service_role;
ALTER TABLE public.meios_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meios_select_auth" ON public.meios_pagamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "meios_mut_cad" ON public.meios_pagamento FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'cadastros.editar'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(),'cadastros.editar'::app_permission));
CREATE TRIGGER trg_meios_updated BEFORE UPDATE ON public.meios_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ============ TIPOS DE APLICAÇÃO ============
CREATE TABLE IF NOT EXISTS public.tipos_aplicacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  pos_venda boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tipos_aplicacao TO authenticated;
GRANT ALL ON public.tipos_aplicacao TO service_role;
ALTER TABLE public.tipos_aplicacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipos_app_select_auth" ON public.tipos_aplicacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "tipos_app_mut_cad" ON public.tipos_aplicacao FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'cadastros.editar'::app_permission))
  WITH CHECK (public.has_permission(auth.uid(),'cadastros.editar'::app_permission));
CREATE TRIGGER trg_tipos_app_updated BEFORE UPDATE ON public.tipos_aplicacao
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ============ SEEDS IDEMPOTENTES ============
-- Grupos
INSERT INTO public.grupos_financeiros (codigo,nome,tipo) VALUES
 ('1','Receitas','Receita'),
 ('2','Custos Diretos','Custo Direto'),
 ('3','Custos Indiretos','Custo Indireto'),
 ('4','Despesas Administrativas','Despesa Administrativa'),
 ('5','Despesas Comerciais','Despesa Comercial'),
 ('6','Imobilizado','Imobilizado'),
 ('7','Financeiro/Patrimonial','Financeiro/Patrimonial')
ON CONFLICT (codigo) DO NOTHING;

-- Subgrupos
INSERT INTO public.subgrupos_financeiros (grupo_id, codigo, nome)
SELECT g.id, v.codigo, v.nome FROM (VALUES
 ('1','1.1','Vendas de sistemas FV'),
 ('1','1.2','Manutenção / Pós-venda'),
 ('1','1.3','Liberações de financiamento'),
 ('2','2.1','Material aplicado em obra'),
 ('2','2.2','Mão de obra de instalação'),
 ('2','2.3','Frete / Logística obra'),
 ('2','2.4','Terceiros (empreitada)'),
 ('3','3.1','Engenharia / Projetos'),
 ('3','3.2','Frota / Combustível'),
 ('4','4.1','Folha administrativa'),
 ('4','4.2','Ocupação (aluguel, energia)'),
 ('4','4.3','Software / TI'),
 ('4','4.4','Serviços profissionais'),
 ('5','5.1','Marketing'),
 ('5','5.2','Comissões'),
 ('7','7.1','Impostos'),
 ('7','7.2','Despesas bancárias'),
 ('7','7.3','Financiamentos (parcelas)')
) AS v(grupo_codigo, codigo, nome)
JOIN public.grupos_financeiros g ON g.codigo = v.grupo_codigo
ON CONFLICT (codigo) DO NOTHING;

-- Meios de pagamento
INSERT INTO public.meios_pagamento (codigo,nome,tipo) VALUES
 ('MP-01','PIX','PIX'),
 ('MP-02','Boleto','Boleto'),
 ('MP-03','Cartão crédito','Cartão crédito'),
 ('MP-04','Cartão débito','Cartão débito'),
 ('MP-05','Transferência','Transferência'),
 ('MP-06','Dinheiro','Dinheiro'),
 ('MP-07','Reembolso','Reembolso')
ON CONFLICT (codigo) DO NOTHING;

-- Tipos de aplicação
INSERT INTO public.tipos_aplicacao (codigo,nome,pos_venda) VALUES
 ('TA-01','Instalação',false),
 ('TA-02','Manutenção',true),
 ('TA-03','Garantia',true),
 ('TA-04','Adequação',false),
 ('TA-05','Retorno técnico',true),
 ('TA-06','Uso interno',false),
 ('TA-07','Administrativo',false)
ON CONFLICT (codigo) DO NOTHING;
