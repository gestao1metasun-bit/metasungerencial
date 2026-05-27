
ALTER TABLE public.titulos_taxas
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS percentual numeric(8,4),
  ADD COLUMN IF NOT EXISTS natureza_id uuid REFERENCES public.naturezas_financeiras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_resultado_id uuid,
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS legacy_id text,
  ADD COLUMN IF NOT EXISTS legacy_source text;

-- Padronizar categorias
ALTER TABLE public.titulos_taxas DROP CONSTRAINT IF EXISTS chk_titulos_taxas_categoria;
ALTER TABLE public.titulos_taxas ADD CONSTRAINT chk_titulos_taxas_categoria
  CHECK (categoria IS NULL OR categoria IN (
    'ENCARGO','DESCONTO','TARIFA','IMPOSTO','CUSTO_FINANCEIRO','OUTRO'
  ));

-- Padronizar tipo
ALTER TABLE public.titulos_taxas DROP CONSTRAINT IF EXISTS chk_titulos_taxas_tipo;
ALTER TABLE public.titulos_taxas ADD CONSTRAINT chk_titulos_taxas_tipo
  CHECK (tipo IN ('juros','multa','desconto','tarifa','iof','encargo','imposto','outro'));

-- Valor positivo
ALTER TABLE public.titulos_taxas DROP CONSTRAINT IF EXISTS chk_titulos_taxas_valor;
ALTER TABLE public.titulos_taxas ADD CONSTRAINT chk_titulos_taxas_valor
  CHECK (valor > 0);

-- Índices novos
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_titulo_ativos
  ON public.titulos_taxas(titulo_id, data_aplicacao DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_parcela
  ON public.titulos_taxas(parcela_id) WHERE parcela_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_categoria
  ON public.titulos_taxas(categoria) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_tipo
  ON public.titulos_taxas(tipo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_natureza
  ON public.titulos_taxas(natureza_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_cresultado
  ON public.titulos_taxas(centro_resultado_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_origem
  ON public.titulos_taxas(origem) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titulos_taxas_legacy
  ON public.titulos_taxas(legacy_id, legacy_source) WHERE legacy_id IS NOT NULL;
