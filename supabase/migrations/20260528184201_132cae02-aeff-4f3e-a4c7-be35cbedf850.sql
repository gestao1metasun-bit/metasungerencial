-- =====================================================================
-- D15 Onda 1.A.0 REV2 — Parte 2/2: estrutura financeira + integrabilidade
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. VÍNCULOS FALTANTES (titulos / parcelas)
-- ---------------------------------------------------------------------
ALTER TABLE public.titulos_financeiros
  ADD COLUMN IF NOT EXISTS natureza_id   uuid,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid,
  ADD COLUMN IF NOT EXISTS created_by    uuid;

ALTER TABLE public.parcelas_financeiras
  ADD COLUMN IF NOT EXISTS created_by    uuid;

COMMENT ON COLUMN public.titulos_financeiros.natureza_id   IS 'D15: FK naturezas_financeiras. Obrigatório nas RPCs oficiais (Onda 1.A).';
COMMENT ON COLUMN public.titulos_financeiros.fornecedor_id IS 'D15: FK fornecedores (AP). Convive com origem_tipo=fornecedor.';
COMMENT ON COLUMN public.titulos_financeiros.created_by    IS 'D15: auditoria direta (evita parse de dados jsonb).';

-- ---------------------------------------------------------------------
-- 2. CAMPOS UNIVERSAIS DE INTEGRABILIDADE (7 tabelas)
-- ---------------------------------------------------------------------
ALTER TABLE public.titulos_financeiros
  ADD COLUMN IF NOT EXISTS codigo_externo         text,
  ADD COLUMN IF NOT EXISTS sistema_origem         text,
  ADD COLUMN IF NOT EXISTS sistema_destino        text,
  ADD COLUMN IF NOT EXISTS status_integracao      text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_integracao        timestamptz,
  ADD COLUMN IF NOT EXISTS erro_integracao        text,
  ADD COLUMN IF NOT EXISTS hash_remessa           text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id     uuid,
  ADD COLUMN IF NOT EXISTS conta_contabil_externa text,
  ADD COLUMN IF NOT EXISTS tipo_documento         text,
  ADD COLUMN IF NOT EXISTS numero_documento       text,
  ADD COLUMN IF NOT EXISTS serie_documento        text,
  ADD COLUMN IF NOT EXISTS chave_documento        text;

ALTER TABLE public.parcelas_financeiras
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS erro_integracao    text,
  ADD COLUMN IF NOT EXISTS hash_remessa       text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id uuid;

ALTER TABLE public.movimentacoes_financeiras
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS erro_integracao    text,
  ADD COLUMN IF NOT EXISTS hash_remessa       text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id uuid;

ALTER TABLE public.adiantamentos
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS erro_integracao    text,
  ADD COLUMN IF NOT EXISTS hash_remessa       text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id uuid;

ALTER TABLE public.boletos
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS erro_integracao    text,
  ADD COLUMN IF NOT EXISTS hash_remessa       text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id uuid;

ALTER TABLE public.rescisoes_contrato
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS erro_integracao    text,
  ADD COLUMN IF NOT EXISTS hash_remessa       text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id uuid;

ALTER TABLE public.extrato_banco
  ADD COLUMN IF NOT EXISTS codigo_externo     text,
  ADD COLUMN IF NOT EXISTS sistema_destino    text,
  ADD COLUMN IF NOT EXISTS status_integracao  text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_integracao    timestamptz,
  ADD COLUMN IF NOT EXISTS erro_integracao    text,
  ADD COLUMN IF NOT EXISTS hash_remessa       text,
  ADD COLUMN IF NOT EXISTS lote_integracao_id uuid;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['titulos_financeiros','parcelas_financeiras',
                               'movimentacoes_financeiras','adiantamentos',
                               'boletos','rescisoes_contrato','extrato_banco']) LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS chk_%I_status_integracao;', t, t);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT chk_%I_status_integracao
         CHECK (status_integracao IN (''pendente'',''exportado'',''integrado'',''erro'',''reprocessar'',''ignorado''));',
      t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. FOREIGN KEYS — núcleo financeiro
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
  ADD CONSTRAINT fk_tf_cliente            FOREIGN KEY (cliente_id)           REFERENCES public.clientes(id)              ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_consultor          FOREIGN KEY (consultor_id)         REFERENCES auth.users(id)                   ON DELETE SET NULL,
  ADD CONSTRAINT fk_tf_centro             FOREIGN KEY (centro_id)            REFERENCES public.centros_resultado(id)     ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_conta              FOREIGN KEY (conta_id)             REFERENCES public.contas_financeiras(id)    ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_contrato           FOREIGN KEY (contrato_id)          REFERENCES public.contratos(id)             ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_titulo_substituto  FOREIGN KEY (titulo_substituto_id) REFERENCES public.titulos_financeiros(id)   ON DELETE SET NULL,
  ADD CONSTRAINT fk_tf_natureza           FOREIGN KEY (natureza_id)          REFERENCES public.naturezas_financeiras(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_fornecedor         FOREIGN KEY (fornecedor_id)        REFERENCES public.fornecedores(id)          ON DELETE RESTRICT,
  ADD CONSTRAINT fk_tf_created_by         FOREIGN KEY (created_by)           REFERENCES auth.users(id)                   ON DELETE SET NULL;

ALTER TABLE public.parcelas_financeiras
  DROP CONSTRAINT IF EXISTS fk_pf_titulo,
  DROP CONSTRAINT IF EXISTS fk_pf_created_by;

ALTER TABLE public.parcelas_financeiras
  ADD CONSTRAINT fk_pf_titulo     FOREIGN KEY (titulo_id)  REFERENCES public.titulos_financeiros(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_pf_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id)                 ON DELETE SET NULL;

ALTER TABLE public.movimentacoes_financeiras
  DROP CONSTRAINT IF EXISTS fk_mf_titulo,
  DROP CONSTRAINT IF EXISTS fk_mf_parcela,
  DROP CONSTRAINT IF EXISTS fk_mf_conta,
  DROP CONSTRAINT IF EXISTS fk_mf_user;

ALTER TABLE public.movimentacoes_financeiras
  ADD CONSTRAINT fk_mf_titulo  FOREIGN KEY (titulo_id)  REFERENCES public.titulos_financeiros(id)  ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mf_parcela FOREIGN KEY (parcela_id) REFERENCES public.parcelas_financeiras(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mf_conta   FOREIGN KEY (conta_id)   REFERENCES public.contas_financeiras(id)   ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mf_user    FOREIGN KEY (user_id)    REFERENCES auth.users(id)                  ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 4. ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tf_natureza    ON public.titulos_financeiros(natureza_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_centro      ON public.titulos_financeiros(centro_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_conta       ON public.titulos_financeiros(conta_id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_fornecedor  ON public.titulos_financeiros(fornecedor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_origem      ON public.titulos_financeiros(origem_tipo, origem_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tf_integracao  ON public.titulos_financeiros(status_integracao) WHERE status_integracao <> 'integrado';
CREATE INDEX IF NOT EXISTS idx_tf_lote        ON public.titulos_financeiros(lote_integracao_id) WHERE lote_integracao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pf_titulo      ON public.parcelas_financeiras(titulo_id);
CREATE INDEX IF NOT EXISTS idx_pf_integracao  ON public.parcelas_financeiras(status_integracao) WHERE status_integracao <> 'integrado';
CREATE INDEX IF NOT EXISTS idx_mf_titulo      ON public.movimentacoes_financeiras(titulo_id);
CREATE INDEX IF NOT EXISTS idx_mf_parcela     ON public.movimentacoes_financeiras(parcela_id);
CREATE INDEX IF NOT EXISTS idx_mf_integracao  ON public.movimentacoes_financeiras(status_integracao) WHERE status_integracao <> 'integrado';
CREATE INDEX IF NOT EXISTS idx_adi_integracao ON public.adiantamentos(status_integracao) WHERE status_integracao <> 'integrado';
CREATE INDEX IF NOT EXISTS idx_bol_integracao ON public.boletos(status_integracao) WHERE status_integracao <> 'integrado';
CREATE INDEX IF NOT EXISTS idx_res_integracao ON public.rescisoes_contrato(status_integracao) WHERE status_integracao <> 'integrado';
CREATE INDEX IF NOT EXISTS idx_ext_integracao ON public.extrato_banco(status_integracao) WHERE status_integracao <> 'integrado';

-- ---------------------------------------------------------------------
-- 5. TRIGGERS updated_at
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS tg_tf_updated_at ON public.titulos_financeiros;
CREATE TRIGGER tg_tf_updated_at BEFORE UPDATE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
DROP TRIGGER IF EXISTS tg_pf_updated_at ON public.parcelas_financeiras;
CREATE TRIGGER tg_pf_updated_at BEFORE UPDATE ON public.parcelas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ---------------------------------------------------------------------
-- 6. CAMADA DE INTEGRAÇÃO — 4 tabelas estruturais (vazias)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lotes_integracao (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            text NOT NULL,
  sistema_destino   text NOT NULL,
  competencia       date,
  tipo              text NOT NULL,
  status            text NOT NULL DEFAULT 'aberto'
                    CHECK (status IN ('aberto','fechado','exportado','integrado','erro','cancelado')),
  qtd_eventos       integer NOT NULL DEFAULT 0,
  valor_total       numeric(18,2) NOT NULL DEFAULT 0,
  hash_remessa      text,
  exportado_em      timestamptz,
  exportado_por     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  integrado_em      timestamptz,
  erro              text,
  observacoes       text,
  dados             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at        timestamptz,
  deleted_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_reason    text,
  UNIQUE (sistema_destino, codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes_integracao TO authenticated;
GRANT ALL ON public.lotes_integracao TO service_role;
ALTER TABLE public.lotes_integracao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pol_lotes_select ON public.lotes_integracao;
CREATE POLICY pol_lotes_select ON public.lotes_integracao FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.visualizar'::app_permission));
DROP POLICY IF EXISTS pol_lotes_write ON public.lotes_integracao;
CREATE POLICY pol_lotes_write ON public.lotes_integracao FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.mapear'::app_permission))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.mapear'::app_permission));
DROP TRIGGER IF EXISTS tg_lotes_updated_at ON public.lotes_integracao;
CREATE TRIGGER tg_lotes_updated_at BEFORE UPDATE ON public.lotes_integracao
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- FK tardia: *.lote_integracao_id → lotes_integracao
ALTER TABLE public.titulos_financeiros        DROP CONSTRAINT IF EXISTS fk_tf_lote;
ALTER TABLE public.titulos_financeiros        ADD  CONSTRAINT fk_tf_lote  FOREIGN KEY (lote_integracao_id) REFERENCES public.lotes_integracao(id) ON DELETE SET NULL;
ALTER TABLE public.parcelas_financeiras       DROP CONSTRAINT IF EXISTS fk_pf_lote;
ALTER TABLE public.parcelas_financeiras       ADD  CONSTRAINT fk_pf_lote  FOREIGN KEY (lote_integracao_id) REFERENCES public.lotes_integracao(id) ON DELETE SET NULL;
ALTER TABLE public.movimentacoes_financeiras  DROP CONSTRAINT IF EXISTS fk_mf_lote;
ALTER TABLE public.movimentacoes_financeiras  ADD  CONSTRAINT fk_mf_lote  FOREIGN KEY (lote_integracao_id) REFERENCES public.lotes_integracao(id) ON DELETE SET NULL;
ALTER TABLE public.adiantamentos              DROP CONSTRAINT IF EXISTS fk_adi_lote;
ALTER TABLE public.adiantamentos              ADD  CONSTRAINT fk_adi_lote FOREIGN KEY (lote_integracao_id) REFERENCES public.lotes_integracao(id) ON DELETE SET NULL;
ALTER TABLE public.boletos                    DROP CONSTRAINT IF EXISTS fk_bol_lote;
ALTER TABLE public.boletos                    ADD  CONSTRAINT fk_bol_lote FOREIGN KEY (lote_integracao_id) REFERENCES public.lotes_integracao(id) ON DELETE SET NULL;
ALTER TABLE public.rescisoes_contrato         DROP CONSTRAINT IF EXISTS fk_res_lote;
ALTER TABLE public.rescisoes_contrato         ADD  CONSTRAINT fk_res_lote FOREIGN KEY (lote_integracao_id) REFERENCES public.lotes_integracao(id) ON DELETE SET NULL;
ALTER TABLE public.extrato_banco              DROP CONSTRAINT IF EXISTS fk_ext_lote;
ALTER TABLE public.extrato_banco              ADD  CONSTRAINT fk_ext_lote FOREIGN KEY (lote_integracao_id) REFERENCES public.lotes_integracao(id) ON DELETE SET NULL;

-- 6.2 mapeamentos_externos
CREATE TABLE IF NOT EXISTS public.mapeamentos_externos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_destino   text NOT NULL,
  tipo_mapeamento   text NOT NULL,
  entidade_interna  text,
  chave_interna     text NOT NULL,
  chave_externa     text NOT NULL,
  descricao         text,
  ativo             boolean NOT NULL DEFAULT true,
  dados             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (sistema_destino, tipo_mapeamento, chave_interna)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapeamentos_externos TO authenticated;
GRANT ALL ON public.mapeamentos_externos TO service_role;
ALTER TABLE public.mapeamentos_externos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pol_map_select ON public.mapeamentos_externos;
CREATE POLICY pol_map_select ON public.mapeamentos_externos FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.visualizar'::app_permission));
DROP POLICY IF EXISTS pol_map_write ON public.mapeamentos_externos;
CREATE POLICY pol_map_write ON public.mapeamentos_externos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.mapear'::app_permission))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.mapear'::app_permission));
DROP TRIGGER IF EXISTS tg_map_updated_at ON public.mapeamentos_externos;
CREATE TRIGGER tg_map_updated_at BEFORE UPDATE ON public.mapeamentos_externos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
CREATE INDEX IF NOT EXISTS idx_map_sistema_tipo ON public.mapeamentos_externos(sistema_destino, tipo_mapeamento);

-- 6.3 eventos_pendentes_integracao
CREATE TABLE IF NOT EXISTS public.eventos_pendentes_integracao (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_destino   text NOT NULL,
  entidade          text NOT NULL,
  entidade_id       uuid NOT NULL,
  tipo_evento       text NOT NULL,
  status            text NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente','exportado','integrado','erro','reprocessar','ignorado')),
  tentativas        integer NOT NULL DEFAULT 0,
  lote_id           uuid REFERENCES public.lotes_integracao(id) ON DELETE SET NULL,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash_payload      text,
  erro              text,
  proxima_tentativa timestamptz,
  processado_em     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_pendentes_integracao TO authenticated;
GRANT ALL ON public.eventos_pendentes_integracao TO service_role;
ALTER TABLE public.eventos_pendentes_integracao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pol_eventos_select ON public.eventos_pendentes_integracao;
CREATE POLICY pol_eventos_select ON public.eventos_pendentes_integracao FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.visualizar'::app_permission));
DROP POLICY IF EXISTS pol_eventos_write ON public.eventos_pendentes_integracao;
CREATE POLICY pol_eventos_write ON public.eventos_pendentes_integracao FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.exportar'::app_permission))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.exportar'::app_permission));
DROP TRIGGER IF EXISTS tg_eventos_updated_at ON public.eventos_pendentes_integracao;
CREATE TRIGGER tg_eventos_updated_at BEFORE UPDATE ON public.eventos_pendentes_integracao
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
CREATE INDEX IF NOT EXISTS idx_eventos_status   ON public.eventos_pendentes_integracao(status) WHERE status IN ('pendente','reprocessar','erro');
CREATE INDEX IF NOT EXISTS idx_eventos_entidade ON public.eventos_pendentes_integracao(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_eventos_lote     ON public.eventos_pendentes_integracao(lote_id) WHERE lote_id IS NOT NULL;

-- 6.4 logs_integracao (append-only)
CREATE TABLE IF NOT EXISTS public.logs_integracao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_destino text NOT NULL,
  lote_id         uuid REFERENCES public.lotes_integracao(id) ON DELETE SET NULL,
  evento_id       uuid REFERENCES public.eventos_pendentes_integracao(id) ON DELETE SET NULL,
  entidade        text,
  entidade_id     uuid,
  acao            text NOT NULL,
  nivel           text NOT NULL DEFAULT 'info' CHECK (nivel IN ('info','warn','error')),
  mensagem        text,
  payload         jsonb,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.logs_integracao TO authenticated;
GRANT ALL ON public.logs_integracao TO service_role;
ALTER TABLE public.logs_integracao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pol_logs_select ON public.logs_integracao;
CREATE POLICY pol_logs_select ON public.logs_integracao FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.visualizar'::app_permission));
DROP POLICY IF EXISTS pol_logs_insert ON public.logs_integracao;
CREATE POLICY pol_logs_insert ON public.logs_integracao FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'integracao.exportar'::app_permission));
CREATE INDEX IF NOT EXISTS idx_logs_lote     ON public.logs_integracao(lote_id)   WHERE lote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_entidade ON public.logs_integracao(entidade, entidade_id);