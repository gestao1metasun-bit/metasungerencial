-- =====================================================================
-- D15 — Onda 1.A.0 — Alinhamento Estrutural Financeiro (DDL puro)
-- Modo: estrutura apenas. Nenhum dado. Nenhuma flag. UI intacta.
-- Pré-requisito da Onda 1.A reescrita.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. NOVAS COLUNAS DE VÍNCULO
-- ---------------------------------------------------------------------

ALTER TABLE public.titulos_financeiros
  ADD COLUMN IF NOT EXISTS natureza_id   uuid,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid,
  ADD COLUMN IF NOT EXISTS created_by    uuid;

ALTER TABLE public.parcelas_financeiras
  ADD COLUMN IF NOT EXISTS created_by    uuid;

COMMENT ON COLUMN public.titulos_financeiros.natureza_id   IS 'D15 Onda 1.A.0 — FK para naturezas_financeiras. Obrigatório a partir das RPCs oficiais.';
COMMENT ON COLUMN public.titulos_financeiros.fornecedor_id IS 'D15 Onda 1.A.0 — FK opcional para fornecedores (AP). Convive com origem_tipo=fornecedor.';
COMMENT ON COLUMN public.titulos_financeiros.created_by    IS 'D15 Onda 1.A.0 — auditoria barata (sem parse de dados jsonb).';

-- ---------------------------------------------------------------------
-- 2. FOREIGN KEYS — titulos_financeiros
-- ---------------------------------------------------------------------

ALTER TABLE public.titulos_financeiros
  DROP CONSTRAINT IF EXISTS fk_tf_cliente,
  DROP CONSTRAINT IF EXISTS fk_tf_consultor,
  DROP CONSTRAINT IF EXISTS fk_tf_centro,
  DROP CONSTRAINT IF EXISTS fk_tf_conta,
  DROP CONSTRAINT IF EXISTS fk_tf_contrato,
  DROP CONSTRAINT IF EXISTS fk_tf_titulo_substituto,
  DROP CONSTRAINT IF EXISTS fk_tf_natureza,
  DROP CONSTRAINT IF EXISTS fk_tf_fornecedor,
  DROP CONSTRAINT IF EXISTS fk_tf_created_by;

ALTER TABLE public.titulos_financeiros
  ADD CONSTRAINT fk_tf_cliente
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_consultor
    FOREIGN KEY (consultor_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tf_centro
    FOREIGN KEY (centro_id) REFERENCES public.centros_resultado(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_conta
    FOREIGN KEY (conta_id) REFERENCES public.contas_financeiras(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_contrato
    FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_titulo_substituto
    FOREIGN KEY (titulo_substituto_id) REFERENCES public.titulos_financeiros(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tf_natureza
    FOREIGN KEY (natureza_id) REFERENCES public.naturezas_financeiras(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_fornecedor
    FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 3. FOREIGN KEYS — parcelas_financeiras
-- ---------------------------------------------------------------------

ALTER TABLE public.parcelas_financeiras
  DROP CONSTRAINT IF EXISTS fk_pf_titulo,
  DROP CONSTRAINT IF EXISTS fk_pf_created_by;

ALTER TABLE public.parcelas_financeiras
  ADD CONSTRAINT fk_pf_titulo
    FOREIGN KEY (titulo_id) REFERENCES public.titulos_financeiros(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_pf_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 4. FOREIGN KEYS — movimentacoes_financeiras
-- ---------------------------------------------------------------------

ALTER TABLE public.movimentacoes_financeiras
  DROP CONSTRAINT IF EXISTS fk_mf_titulo,
  DROP CONSTRAINT IF EXISTS fk_mf_parcela,
  DROP CONSTRAINT IF EXISTS fk_mf_conta,
  DROP CONSTRAINT IF EXISTS fk_mf_user;

ALTER TABLE public.movimentacoes_financeiras
  ADD CONSTRAINT fk_mf_titulo
    FOREIGN KEY (titulo_id) REFERENCES public.titulos_financeiros(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mf_parcela
    FOREIGN KEY (parcela_id) REFERENCES public.parcelas_financeiras(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mf_conta
    FOREIGN KEY (conta_id) REFERENCES public.contas_financeiras(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mf_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 5. ÍNDICES DE LEITURA
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tf_natureza   ON public.titulos_financeiros(natureza_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_centro     ON public.titulos_financeiros(centro_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_conta      ON public.titulos_financeiros(conta_id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_fornecedor ON public.titulos_financeiros(fornecedor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_origem     ON public.titulos_financeiros(origem_tipo, origem_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pf_titulo     ON public.parcelas_financeiras(titulo_id);
CREATE INDEX IF NOT EXISTS idx_mf_titulo     ON public.movimentacoes_financeiras(titulo_id);
CREATE INDEX IF NOT EXISTS idx_mf_parcela    ON public.movimentacoes_financeiras(parcela_id);

-- ---------------------------------------------------------------------
-- 6. TRIGGERS updated_at (idempotente)
-- ---------------------------------------------------------------------

DROP TRIGGER IF EXISTS tg_tf_updated_at ON public.titulos_financeiros;
CREATE TRIGGER tg_tf_updated_at
  BEFORE UPDATE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

DROP TRIGGER IF EXISTS tg_pf_updated_at ON public.parcelas_financeiras;
CREATE TRIGGER tg_pf_updated_at
  BEFORE UPDATE ON public.parcelas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ---------------------------------------------------------------------
-- 7. SEM RPC. SEM VIEW. SEM DADOS.
-- Onda 1.A reescrita assume este schema como base.
-- ---------------------------------------------------------------------
