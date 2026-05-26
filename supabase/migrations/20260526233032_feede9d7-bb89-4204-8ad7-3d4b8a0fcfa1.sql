
-- D7.7 — Antiduplicidade Transacional (diagnóstico + correções óbvias)

-- 1) Função de normalização de documento (CPF/CNPJ)
CREATE OR REPLACE FUNCTION public.normalize_doc(_doc text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$ SELECT NULLIF(regexp_replace(COALESCE(_doc,''), '[^0-9]', '', 'g'), '') $$;

-- 2) UNIQUE parciais (apenas registros vivos / ativos)
-- Clientes por documento normalizado
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_doc_norm
  ON public.clientes (public.normalize_doc(doc))
  WHERE deleted_at IS NULL AND public.normalize_doc(doc) IS NOT NULL;

-- Produtos por código (SKU) normalizado
CREATE UNIQUE INDEX IF NOT EXISTS uq_produtos_codigo
  ON public.produtos (lower(trim(codigo)))
  WHERE deleted_at IS NULL AND COALESCE(codigo,'') <> '';

-- Contratos por código
CREATE UNIQUE INDEX IF NOT EXISTS uq_contratos_codigo
  ON public.contratos (lower(trim(codigo)))
  WHERE deleted_at IS NULL AND COALESCE(codigo,'') <> '';

-- Título financeiro por origem ativa (evita gerar 2x o mesmo título da mesma origem)
CREATE UNIQUE INDEX IF NOT EXISTS uq_titulos_origem_ativa
  ON public.titulos_financeiros (origem_tipo, origem_id)
  WHERE deleted_at IS NULL
    AND status NOT IN ('CANCELADO','RENEGOCIADO')
    AND origem_id IS NOT NULL;

-- 3) View de diagnóstico de duplicidades (sem alterar dados)
CREATE OR REPLACE VIEW public.v_antiduplicidade_diagnostico AS
WITH
c AS (
  SELECT 'clientes'::text entidade, 'doc (CPF/CNPJ normalizado)'::text campo,
         COUNT(*) FILTER (WHERE c>1) grupos, COALESCE(SUM(c) FILTER (WHERE c>1),0)::int linhas
  FROM (SELECT public.normalize_doc(doc) k, COUNT(*) c
        FROM public.clientes WHERE deleted_at IS NULL AND public.normalize_doc(doc) IS NOT NULL
        GROUP BY 1) s
),
p AS (
  SELECT 'produtos', 'codigo (SKU)',
         COUNT(*) FILTER (WHERE c>1), COALESCE(SUM(c) FILTER (WHERE c>1),0)::int
  FROM (SELECT lower(trim(codigo)) k, COUNT(*) c
        FROM public.produtos WHERE deleted_at IS NULL AND COALESCE(codigo,'')<>''
        GROUP BY 1) s
),
ct AS (
  SELECT 'contratos', 'codigo',
         COUNT(*) FILTER (WHERE c>1), COALESCE(SUM(c) FILTER (WHERE c>1),0)::int
  FROM (SELECT lower(trim(codigo)) k, COUNT(*) c
        FROM public.contratos WHERE deleted_at IS NULL AND COALESCE(codigo,'')<>''
        GROUP BY 1) s
),
tf AS (
  SELECT 'titulos_financeiros', 'origem_tipo+origem_id (ativos)',
         COUNT(*) FILTER (WHERE c>1), COALESCE(SUM(c) FILTER (WHERE c>1),0)::int
  FROM (SELECT origem_tipo, origem_id, COUNT(*) c
        FROM public.titulos_financeiros
        WHERE deleted_at IS NULL AND origem_id IS NOT NULL
          AND status NOT IN ('CANCELADO','RENEGOCIADO')
        GROUP BY 1,2) s
),
pv AS (
  SELECT 'pedidos_venda', 'contrato_id+projeto_contrato_id (ativos)',
         COUNT(*) FILTER (WHERE c>1), COALESCE(SUM(c) FILTER (WHERE c>1),0)::int
  FROM (SELECT contrato_id, projeto_contrato_id, COUNT(*) c
        FROM public.pedidos_venda
        WHERE deleted_at IS NULL AND status<>'CANCELADO'
          AND contrato_id IS NOT NULL AND projeto_contrato_id IS NOT NULL
        GROUP BY 1,2) s
),
oc AS (
  SELECT 'ordens_compra', 'solicitacao_id+fornecedor_doc (ativas)',
         COUNT(*) FILTER (WHERE c>1), COALESCE(SUM(c) FILTER (WHERE c>1),0)::int
  FROM (SELECT solicitacao_id, fornecedor_doc, COUNT(*) c
        FROM public.ordens_compra
        WHERE status NOT IN ('CANCELADA')
          AND solicitacao_id IS NOT NULL AND COALESCE(fornecedor_doc,'')<>''
        GROUP BY 1,2) s
),
mf AS (
  SELECT 'movimentacoes_financeiras', 'titulo_id+parcela_id+tipo+valor+data (suspeitos)',
         COUNT(*) FILTER (WHERE c>1), COALESCE(SUM(c) FILTER (WHERE c>1),0)::int
  FROM (SELECT titulo_id, parcela_id, tipo, valor, date_trunc('minute', data) d, COUNT(*) c
        FROM public.movimentacoes_financeiras
        GROUP BY 1,2,3,4,5) s
),
all_rows AS (
  SELECT * FROM c UNION ALL SELECT * FROM p UNION ALL SELECT * FROM ct
  UNION ALL SELECT * FROM tf UNION ALL SELECT * FROM pv
  UNION ALL SELECT * FROM oc UNION ALL SELECT * FROM mf
)
SELECT
  entidade, campo,
  grupos AS quantidade_grupos_duplicados,
  linhas AS linhas_duplicadas,
  CASE
    WHEN grupos = 0 THEN 'OK'
    WHEN entidade IN ('pedidos_venda','movimentacoes_financeiras') THEN 'BAIXA'
    WHEN entidade IN ('ordens_compra') THEN 'MEDIA'
    ELSE 'ALTA'
  END AS severidade,
  CASE
    WHEN grupos = 0 THEN 'Nenhuma ação'
    WHEN entidade='clientes' THEN 'Merge manual dos clientes duplicados antes de novas inserções'
    WHEN entidade='produtos' THEN 'Renomear SKU duplicado ou inativar produto antigo'
    WHEN entidade='contratos' THEN 'Renumerar contrato duplicado'
    WHEN entidade='titulos_financeiros' THEN 'Cancelar título duplicado preservando o legítimo'
    WHEN entidade='pedidos_venda' THEN 'Revisar se é PV consolidado legítimo; caso contrário cancelar duplicata'
    WHEN entidade='ordens_compra' THEN 'Verificar se são compras distintas para o mesmo fornecedor'
    WHEN entidade='movimentacoes_financeiras' THEN 'Validar se são parcelas distintas ou estorno duplicado'
  END AS acao_recomendada
FROM all_rows
ORDER BY
  CASE WHEN grupos=0 THEN 1 ELSE 0 END,
  grupos DESC, entidade;

GRANT SELECT ON public.v_antiduplicidade_diagnostico TO authenticated;
