
ALTER TABLE public.os_formularios_definicao
  ADD COLUMN IF NOT EXISTS versao_pai_id uuid REFERENCES public.os_formularios_definicao(id),
  ADD COLUMN IF NOT EXISTS publicado_em timestamptz,
  ADD COLUMN IF NOT EXISTS publicado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS requer_aprovacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS status_modelo text NOT NULL DEFAULT 'RASCUNHO',
  ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE public.os_formularios_definicao ADD CONSTRAINT os_fdef_status_chk
    CHECK (status_modelo IN ('RASCUNHO','PUBLICADO','APROVADO','ARQUIVADO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.os_formularios_definicao DROP CONSTRAINT IF EXISTS os_formularios_definicao_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_os_fdef_nome_versao ON public.os_formularios_definicao(nome, versao) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_os_fdef_status ON public.os_formularios_definicao(status_modelo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_os_fdef_pai ON public.os_formularios_definicao(versao_pai_id);

DO $$ BEGIN ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'os.modelo.aprovar';
EXCEPTION WHEN others THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.tg_os_fdef_bloqueia_edicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_via text;
BEGIN
  IF OLD.status_modelo IN ('PUBLICADO','APROVADO','ARQUIVADO') THEN
    BEGIN v_via := current_setting('app.via_os_modelo_rpc', true);
    EXCEPTION WHEN others THEN v_via := NULL; END;
    IF v_via IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Modelo % está % e não pode ser editado diretamente. Clone uma nova versão.', OLD.nome, OLD.status_modelo USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.row_version := COALESCE(OLD.row_version,1) + 1;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS tg_os_fdef_bloq ON public.os_formularios_definicao;
CREATE TRIGGER tg_os_fdef_bloq BEFORE UPDATE ON public.os_formularios_definicao
  FOR EACH ROW EXECUTE FUNCTION public.tg_os_fdef_bloqueia_edicao();

CREATE OR REPLACE FUNCTION public.rpc_os_modelo_clonar(p_modelo_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_origem public.os_formularios_definicao%ROWTYPE; v_nova_id uuid; v_nova_versao integer;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'os.modelo.editar') THEN
    RAISE EXCEPTION 'Sem permissão os.modelo.editar' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_origem FROM public.os_formularios_definicao WHERE id = p_modelo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo não encontrado' USING ERRCODE='P0002'; END IF;
  SELECT COALESCE(MAX(versao),0)+1 INTO v_nova_versao FROM public.os_formularios_definicao WHERE nome = v_origem.nome;
  INSERT INTO public.os_formularios_definicao
    (nome, descricao, tipo, campos, obrigatorio, ativo, versao, versao_pai_id, status_modelo, requer_aprovacao)
  VALUES (v_origem.nome, v_origem.descricao, v_origem.tipo, v_origem.campos, v_origem.obrigatorio,
     true, v_nova_versao, v_origem.id, 'RASCUNHO', v_origem.requer_aprovacao)
  RETURNING id INTO v_nova_id;
  RETURN v_nova_id;
END$$;
REVOKE ALL ON FUNCTION public.rpc_os_modelo_clonar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_modelo_clonar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_os_modelo_publicar(p_modelo_id uuid, p_row_version integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_rv integer;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'os.modelo.editar') THEN
    RAISE EXCEPTION 'Sem permissão os.modelo.editar' USING ERRCODE='42501'; END IF;
  SELECT status_modelo, row_version INTO v_status, v_rv FROM public.os_formularios_definicao WHERE id = p_modelo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo não encontrado' USING ERRCODE='P0002'; END IF;
  IF v_rv <> p_row_version THEN RAISE EXCEPTION 'Conflito de versão' USING ERRCODE='40001'; END IF;
  IF v_status <> 'RASCUNHO' THEN RAISE EXCEPTION 'Apenas RASCUNHO pode publicar' USING ERRCODE='42501'; END IF;
  PERFORM set_config('app.via_os_modelo_rpc','true', true);
  UPDATE public.os_formularios_definicao SET status_modelo='PUBLICADO', publicado_em=now(), publicado_por=auth.uid() WHERE id=p_modelo_id;
END$$;
REVOKE ALL ON FUNCTION public.rpc_os_modelo_publicar(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_modelo_publicar(uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_os_modelo_aprovar(p_modelo_id uuid, p_row_version integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_rv integer;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'os.modelo.aprovar') THEN
    RAISE EXCEPTION 'Sem permissão os.modelo.aprovar' USING ERRCODE='42501'; END IF;
  SELECT status_modelo, row_version INTO v_status, v_rv FROM public.os_formularios_definicao WHERE id = p_modelo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo não encontrado' USING ERRCODE='P0002'; END IF;
  IF v_rv <> p_row_version THEN RAISE EXCEPTION 'Conflito de versão' USING ERRCODE='40001'; END IF;
  IF v_status <> 'PUBLICADO' THEN RAISE EXCEPTION 'Apenas PUBLICADO pode aprovar' USING ERRCODE='42501'; END IF;
  PERFORM set_config('app.via_os_modelo_rpc','true', true);
  UPDATE public.os_formularios_definicao SET status_modelo='APROVADO', aprovado_em=now(), aprovado_por=auth.uid() WHERE id=p_modelo_id;
END$$;
REVOKE ALL ON FUNCTION public.rpc_os_modelo_aprovar(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_modelo_aprovar(uuid,integer) TO authenticated;

DROP VIEW IF EXISTS public.v_os_dashboard CASCADE;
DROP VIEW IF EXISTS public.v_os_orcado_vs_realizado CASCADE;
DROP VIEW IF EXISTS public.v_os_produtividade CASCADE;

CREATE VIEW public.v_os_orcado_realizado
WITH (security_invoker=on) AS
SELECT
  o.id AS os_id, o.numero, cat.categoria,
  COALESCE(orc.valor, 0)::numeric(14,2) AS orcado,
  COALESCE(cr.realizado, 0)::numeric(14,2) AS realizado,
  (COALESCE(cr.realizado,0) - COALESCE(orc.valor,0))::numeric(14,2) AS variacao_valor,
  CASE WHEN COALESCE(orc.valor,0) > 0
    THEN ROUND(((COALESCE(cr.realizado,0) - orc.valor) / orc.valor * 100)::numeric, 2)
    ELSE NULL END AS variacao_pct,
  CASE
    WHEN COALESCE(orc.valor,0) = 0 AND COALESCE(cr.realizado,0) = 0 THEN 'NEUTRO'
    WHEN COALESCE(cr.realizado,0) <= COALESCE(orc.valor,0) * 0.9 THEN 'VERDE'
    WHEN COALESCE(cr.realizado,0) <= COALESCE(orc.valor,0) * 1.05 THEN 'AMARELO'
    ELSE 'VERMELHO' END AS semaforo
FROM public.os_ordens o
CROSS JOIN (SELECT unnest(enum_range(NULL::os_categoria_custo)) AS categoria) cat
LEFT JOIN public.os_orcamento orc ON orc.os_id = o.id AND orc.categoria = cat.categoria
LEFT JOIN (
  SELECT os_id, categoria, SUM(valor) AS realizado FROM public.os_custos_realizados
  WHERE deleted_at IS NULL GROUP BY os_id, categoria
) cr ON cr.os_id = o.id AND cr.categoria = cat.categoria
WHERE o.deleted_at IS NULL;
GRANT SELECT ON public.v_os_orcado_realizado TO authenticated;

CREATE VIEW public.v_os_produtividade
WITH (security_invoker=on) AS
SELECT
  o.id AS os_id, o.numero,
  COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL) AS tarefas_total,
  COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status = 'FINALIZADA') AS tarefas_concluidas,
  COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status NOT IN ('FINALIZADA','CANCELADA')) AS tarefas_abertas,
  (COALESCE(SUM(t.duracao_estimada_min) FILTER (WHERE t.deleted_at IS NULL), 0)::numeric(14,2) / 60.0) AS horas_previstas,
  COALESCE(SUM(
    CASE WHEN t.deleted_at IS NULL AND t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
      THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio)) / 3600.0
      ELSE 0 END
  ), 0)::numeric(14,2) AS horas_realizadas,
  CASE
    WHEN COALESCE(SUM(
      CASE WHEN t.deleted_at IS NULL AND t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio)) / 3600.0 ELSE 0 END), 0) > 0
    THEN ROUND(
      ((COALESCE(SUM(t.duracao_estimada_min) FILTER (WHERE t.deleted_at IS NULL), 0) / 60.0)
       / NULLIF(SUM(CASE WHEN t.deleted_at IS NULL AND t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
            THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio)) / 3600.0 ELSE 0 END), 0) * 100)::numeric, 2)
    ELSE NULL END AS eficiencia_pct
FROM public.os_ordens o
LEFT JOIN public.os_tarefas t ON t.os_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.numero;
GRANT SELECT ON public.v_os_produtividade TO authenticated;

CREATE VIEW public.v_os_dashboard_kpis
WITH (security_invoker=on) AS
SELECT
  o.id AS os_id, o.numero, o.status_codigo, o.cliente_id, o.data_prev_inicio, o.data_prev_termino,
  COALESCE((SELECT SUM(valor) FROM public.os_orcamento WHERE os_id = o.id), 0)::numeric(14,2) AS custo_orcado,
  COALESCE((SELECT SUM(valor) FROM public.os_custos_realizados WHERE os_id = o.id AND deleted_at IS NULL), 0)::numeric(14,2) AS custo_realizado,
  COALESCE((SELECT SUM(valor_total) FROM public.os_servicos_faturar WHERE os_id = o.id), 0)::numeric(14,2) AS servicos_faturaveis,
  COALESCE((SELECT SUM(valor_total) FROM public.os_servicos_faturar WHERE os_id = o.id AND oriundo_orcamento = false), 0)::numeric(14,2) AS servicos_extras,
  prod.tarefas_total, prod.tarefas_concluidas, prod.tarefas_abertas,
  prod.horas_previstas, prod.horas_realizadas, prod.eficiencia_pct,
  (COALESCE((SELECT SUM(valor_total) FROM public.os_servicos_faturar WHERE os_id = o.id), 0)
   - COALESCE((SELECT SUM(valor) FROM public.os_custos_realizados WHERE os_id = o.id AND deleted_at IS NULL), 0)
  )::numeric(14,2) AS margem_valor,
  CASE
    WHEN COALESCE((SELECT SUM(valor) FROM public.os_orcamento WHERE os_id = o.id), 0) = 0 THEN 'NEUTRO'
    WHEN COALESCE((SELECT SUM(valor) FROM public.os_custos_realizados WHERE os_id = o.id AND deleted_at IS NULL), 0)
         <= COALESCE((SELECT SUM(valor) FROM public.os_orcamento WHERE os_id = o.id), 1) * 0.9 THEN 'VERDE'
    WHEN COALESCE((SELECT SUM(valor) FROM public.os_custos_realizados WHERE os_id = o.id AND deleted_at IS NULL), 0)
         <= COALESCE((SELECT SUM(valor) FROM public.os_orcamento WHERE os_id = o.id), 1) * 1.05 THEN 'AMARELO'
    ELSE 'VERMELHO' END AS semaforo_geral
FROM public.os_ordens o
LEFT JOIN public.v_os_produtividade prod ON prod.os_id = o.id
WHERE o.deleted_at IS NULL;
GRANT SELECT ON public.v_os_dashboard_kpis TO authenticated;

CREATE VIEW public.v_os_produtividade_tecnico
WITH (security_invoker=on) AS
SELECT
  t.tecnico_id,
  COUNT(DISTINCT t.os_id) AS os_atendidas,
  COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL) AS tarefas_total,
  COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status = 'FINALIZADA') AS tarefas_concluidas,
  (COALESCE(SUM(t.duracao_estimada_min) FILTER (WHERE t.deleted_at IS NULL), 0)::numeric(14,2) / 60.0) AS horas_previstas,
  COALESCE(SUM(
    CASE WHEN t.deleted_at IS NULL AND t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
      THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio)) / 3600.0 ELSE 0 END
  ), 0)::numeric(14,2) AS horas_realizadas,
  CASE
    WHEN COALESCE(SUM(
      CASE WHEN t.deleted_at IS NULL AND t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio)) / 3600.0 ELSE 0 END), 0) > 0
    THEN ROUND(
      ((COALESCE(SUM(t.duracao_estimada_min) FILTER (WHERE t.deleted_at IS NULL), 0) / 60.0)
       / NULLIF(SUM(CASE WHEN t.deleted_at IS NULL AND t.data_inicio IS NOT NULL AND t.data_fim IS NOT NULL
            THEN EXTRACT(EPOCH FROM (t.data_fim - t.data_inicio)) / 3600.0 ELSE 0 END), 0) * 100)::numeric, 2)
    ELSE NULL END AS eficiencia_pct
FROM public.os_tarefas t
WHERE t.tecnico_id IS NOT NULL
GROUP BY t.tecnico_id;
GRANT SELECT ON public.v_os_produtividade_tecnico TO authenticated;
