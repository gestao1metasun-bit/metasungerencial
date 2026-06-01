-- =====================================================================
-- E.OS.3.b+ — Controle Operacional de Obra (fundação DB)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Permissões novas
-- ---------------------------------------------------------------------
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'os.orcamento.editar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'os.custo.lancar';
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'os.formulario.editar';

COMMIT;

-- ---------------------------------------------------------------------
-- 2) Categorias canônicas de custo
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE os_categoria_custo AS ENUM (
    'MATERIAL','MAO_OBRA','HOSPEDAGEM','COMBUSTIVEL',
    'ALIMENTACAO','EQUIPAMENTO','TERCEIROS','OUTROS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 3) Tabela de orçamento (previsto) — uma linha por categoria por O.S.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.os_orcamento (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id        UUID NOT NULL REFERENCES public.os_ordens(id) ON DELETE CASCADE,
  categoria    os_categoria_custo NOT NULL,
  valor        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  observacao   TEXT,
  row_version  INTEGER NOT NULL DEFAULT 1,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (os_id, categoria)
);
CREATE INDEX IF NOT EXISTS idx_os_orc_os ON public.os_orcamento(os_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_orcamento TO authenticated;
GRANT ALL ON public.os_orcamento TO service_role;
ALTER TABLE public.os_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY os_orc_sel ON public.os_orcamento FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'os.visualizar'::app_permission));
CREATE POLICY os_orc_wr  ON public.os_orcamento FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'os.orcamento.editar'::app_permission))
  WITH CHECK (has_permission(auth.uid(),'os.orcamento.editar'::app_permission));

CREATE TRIGGER tg_os_orc_upd BEFORE UPDATE ON public.os_orcamento
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 4) Tabela de custos realizados (append-friendly, lançamentos)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.os_custos_realizados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id         UUID NOT NULL REFERENCES public.os_ordens(id) ON DELETE CASCADE,
  categoria     os_categoria_custo NOT NULL,
  valor         NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  data_custo    DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao     TEXT,
  origem_tipo   TEXT,                -- MANUAL | ESTOQUE_SAIDA | TITULO_PAGAR | COMPRA | ...
  origem_id     UUID,
  fornecedor_id UUID,
  row_version   INTEGER NOT NULL DEFAULT 1,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID,
  delete_motivo TEXT
);
CREATE INDEX IF NOT EXISTS idx_os_cr_os         ON public.os_custos_realizados(os_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_os_cr_categoria  ON public.os_custos_realizados(os_id, categoria) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_os_cr_origem     ON public.os_custos_realizados(origem_tipo, origem_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_custos_realizados TO authenticated;
GRANT ALL ON public.os_custos_realizados TO service_role;
ALTER TABLE public.os_custos_realizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY os_cr_sel ON public.os_custos_realizados FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'os.visualizar'::app_permission));
CREATE POLICY os_cr_wr  ON public.os_custos_realizados FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'os.custo.lancar'::app_permission))
  WITH CHECK (has_permission(auth.uid(),'os.custo.lancar'::app_permission));

CREATE TRIGGER tg_os_cr_upd BEFORE UPDATE ON public.os_custos_realizados
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 5) Extensão do construtor de formulários
-- ---------------------------------------------------------------------
ALTER TABLE public.os_formularios_definicao
  ADD COLUMN IF NOT EXISTS tipo  TEXT NOT NULL DEFAULT 'LIVRE'
    CHECK (tipo IN ('VISTORIA','INSTALACAO','MANUTENCAO','POS_VENDA',
                    'CHECKLIST_ADMIN','CHECKLIST_FIN','LIVRE')),
  ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------
-- 6) View: Orçado x Realizado (pivot por categoria)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_os_orcado_vs_realizado
WITH (security_invoker=on) AS
WITH cats AS (
  SELECT o.id AS os_id, unnest(enum_range(NULL::os_categoria_custo)) AS categoria
  FROM public.os_ordens o WHERE o.deleted_at IS NULL
),
orc AS (
  SELECT os_id, categoria, valor FROM public.os_orcamento
),
real AS (
  SELECT os_id, categoria, COALESCE(SUM(valor),0) AS valor
  FROM public.os_custos_realizados
  WHERE deleted_at IS NULL
  GROUP BY os_id, categoria
)
SELECT
  c.os_id,
  c.categoria,
  COALESCE(o.valor,0)::numeric(14,2) AS orcado,
  COALESCE(r.valor,0)::numeric(14,2) AS realizado,
  (COALESCE(r.valor,0) - COALESCE(o.valor,0))::numeric(14,2) AS variacao_rs,
  CASE WHEN COALESCE(o.valor,0) = 0 THEN NULL
       ELSE ROUND(((COALESCE(r.valor,0) - o.valor) / o.valor) * 100, 2)
  END AS variacao_pct,
  CASE
    WHEN COALESCE(o.valor,0) = 0 AND COALESCE(r.valor,0) = 0 THEN 'NEUTRO'
    WHEN COALESCE(r.valor,0) <= COALESCE(o.valor,0) * 0.9 THEN 'OK'
    WHEN COALESCE(r.valor,0) <= COALESCE(o.valor,0)        THEN 'ATENCAO'
    ELSE 'ESTOURO'
  END AS semaforo
FROM cats c
LEFT JOIN orc  o ON o.os_id = c.os_id AND o.categoria = c.categoria
LEFT JOIN real r ON r.os_id = c.os_id AND r.categoria = c.categoria;

GRANT SELECT ON public.v_os_orcado_vs_realizado TO authenticated;

-- ---------------------------------------------------------------------
-- 7) View: Produtividade
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_os_produtividade
WITH (security_invoker=on) AS
SELECT
  t.os_id,
  COUNT(*)                                              AS tarefas_total,
  COUNT(*) FILTER (WHERE t.status = 'FINALIZADA')       AS tarefas_concluidas,
  COUNT(*) FILTER (WHERE t.status NOT IN ('FINALIZADA','CANCELADA')) AS tarefas_pendentes,
  COALESCE(SUM(t.duracao_estimada_min),0)               AS minutos_previstos,
  COALESCE(SUM(
    CASE WHEN t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
         THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio))/60
         ELSE 0 END
  ),0)::numeric(12,2)                                   AS minutos_realizados,
  CASE
    WHEN COALESCE(SUM(t.duracao_estimada_min),0) = 0 THEN NULL
    ELSE ROUND( (COALESCE(SUM(
      CASE WHEN t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
           THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio))/60
           ELSE 0 END),0) / NULLIF(SUM(t.duracao_estimada_min),0)) * 100, 2)
  END AS aderencia_pct
FROM public.os_tarefas t
GROUP BY t.os_id;

GRANT SELECT ON public.v_os_produtividade TO authenticated;

-- ---------------------------------------------------------------------
-- 8) View: Dashboard consolidado
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_os_dashboard
WITH (security_invoker=on) AS
SELECT
  o.id                                                          AS os_id,
  o.codigo,
  o.status_codigo,
  o.cliente_id,
  o.contrato_id,
  o.projeto_id,
  o.obra_id,
  o.valor_orcado,
  o.valor_em_pv,
  COALESCE((SELECT SUM(valor) FROM public.os_orcamento oo WHERE oo.os_id = o.id),0)::numeric(14,2) AS custo_previsto,
  COALESCE((SELECT SUM(valor) FROM public.os_custos_realizados cr WHERE cr.os_id = o.id AND cr.deleted_at IS NULL),0)::numeric(14,2) AS custo_realizado,
  COALESCE(p.tarefas_total,0)        AS tarefas_total,
  COALESCE(p.tarefas_concluidas,0)   AS tarefas_concluidas,
  COALESCE(p.tarefas_pendentes,0)    AS tarefas_pendentes,
  COALESCE(p.aderencia_pct,0)        AS aderencia_pct,
  (SELECT COUNT(*) FROM public.os_formulario_respostas fr
     JOIN public.os_tarefas tt ON tt.id = fr.tarefa_id WHERE tt.os_id = o.id) AS formularios_respondidos,
  (SELECT COUNT(*) FROM public.anexos ax WHERE ax.entidade_tipo = 'os_ordens' AND ax.entidade_id = o.id AND ax.deleted_at IS NULL) AS anexos_total,
  (SELECT COUNT(*) FROM public.os_servicos_faturar sf WHERE sf.os_id = o.id) AS servicos_faturaveis
FROM public.os_ordens o
LEFT JOIN public.v_os_produtividade p ON p.os_id = o.id
WHERE o.deleted_at IS NULL;

GRANT SELECT ON public.v_os_dashboard TO authenticated;

-- ---------------------------------------------------------------------
-- 9) RPC: lançar/atualizar linha de orçamento
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_os_orcamento_lancar(
  p_os_id      UUID,
  p_categoria  os_categoria_custo,
  p_valor      NUMERIC,
  p_observacao TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_uid UUID := auth.uid();
BEGIN
  IF NOT has_permission(v_uid,'os.orcamento.editar'::app_permission) THEN
    RAISE EXCEPTION 'permissao negada: os.orcamento.editar';
  END IF;
  IF p_valor IS NULL OR p_valor < 0 THEN
    RAISE EXCEPTION 'valor invalido';
  END IF;

  INSERT INTO public.os_orcamento (os_id, categoria, valor, observacao, created_by)
  VALUES (p_os_id, p_categoria, p_valor, p_observacao, v_uid)
  ON CONFLICT (os_id, categoria) DO UPDATE
    SET valor = EXCLUDED.valor,
        observacao = EXCLUDED.observacao,
        row_version = public.os_orcamento.row_version + 1,
        updated_at = now()
  RETURNING id INTO v_id;

  PERFORM fn_os_log_evento(p_os_id, NULL, 'ORCAMENTO_LANCADO',
    jsonb_build_object('categoria',p_categoria,'valor',p_valor));
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.rpc_os_orcamento_lancar(UUID,os_categoria_custo,NUMERIC,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_orcamento_lancar(UUID,os_categoria_custo,NUMERIC,TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 10) RPC: lançar custo realizado
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_os_custo_lancar(
  p_os_id        UUID,
  p_categoria    os_categoria_custo,
  p_valor        NUMERIC,
  p_data_custo   DATE DEFAULT NULL,
  p_descricao    TEXT DEFAULT NULL,
  p_origem_tipo  TEXT DEFAULT 'MANUAL',
  p_origem_id    UUID DEFAULT NULL,
  p_fornecedor_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_uid UUID := auth.uid();
BEGIN
  IF NOT has_permission(v_uid,'os.custo.lancar'::app_permission) THEN
    RAISE EXCEPTION 'permissao negada: os.custo.lancar';
  END IF;
  IF p_valor IS NULL OR p_valor < 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;

  INSERT INTO public.os_custos_realizados
    (os_id, categoria, valor, data_custo, descricao, origem_tipo, origem_id, fornecedor_id, created_by)
  VALUES
    (p_os_id, p_categoria, p_valor, COALESCE(p_data_custo, CURRENT_DATE),
     p_descricao, COALESCE(p_origem_tipo,'MANUAL'), p_origem_id, p_fornecedor_id, v_uid)
  RETURNING id INTO v_id;

  PERFORM fn_os_log_evento(p_os_id, NULL, 'CUSTO_LANCADO',
    jsonb_build_object('categoria',p_categoria,'valor',p_valor,'origem',p_origem_tipo));
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.rpc_os_custo_lancar(UUID,os_categoria_custo,NUMERIC,DATE,TEXT,TEXT,UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_custo_lancar(UUID,os_categoria_custo,NUMERIC,DATE,TEXT,TEXT,UUID,UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- 11) RPC: salvar template de formulário (builder)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_os_formulario_template_salvar(
  p_id           UUID,
  p_nome         TEXT,
  p_tipo         TEXT,
  p_descricao    TEXT,
  p_campos       JSONB,
  p_obrigatorio  BOOLEAN DEFAULT FALSE,
  p_ativo        BOOLEAN DEFAULT TRUE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_uid UUID := auth.uid();
BEGIN
  IF NOT has_permission(v_uid,'os.formulario.editar'::app_permission) THEN
    RAISE EXCEPTION 'permissao negada: os.formulario.editar';
  END IF;
  IF p_nome IS NULL OR length(trim(p_nome)) < 2 THEN RAISE EXCEPTION 'nome invalido'; END IF;
  IF p_tipo NOT IN ('VISTORIA','INSTALACAO','MANUTENCAO','POS_VENDA','CHECKLIST_ADMIN','CHECKLIST_FIN','LIVRE') THEN
    RAISE EXCEPTION 'tipo invalido: %', p_tipo;
  END IF;
  IF jsonb_typeof(p_campos) <> 'array' THEN RAISE EXCEPTION 'campos deve ser array'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.os_formularios_definicao (nome, tipo, descricao, campos, obrigatorio, ativo)
    VALUES (p_nome, p_tipo, p_descricao, p_campos, p_obrigatorio, p_ativo)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.os_formularios_definicao
      SET nome = p_nome, tipo = p_tipo, descricao = p_descricao,
          campos = p_campos, obrigatorio = p_obrigatorio, ativo = p_ativo,
          versao = versao + 1, updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'template nao encontrado'; END IF;
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.rpc_os_formulario_template_salvar(UUID,TEXT,TEXT,TEXT,JSONB,BOOLEAN,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_formulario_template_salvar(UUID,TEXT,TEXT,TEXT,JSONB,BOOLEAN,BOOLEAN) TO authenticated;