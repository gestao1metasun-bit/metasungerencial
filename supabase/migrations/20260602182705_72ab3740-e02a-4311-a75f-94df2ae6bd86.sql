-- D20.SUP.6 — Cadastro unificado de itens e serviços (extensão de produtos)
-- + trigger de consistência tipo/estoque
-- + trigger validação item da requisição
-- + RPC criar agora insere itens

-- 1) Extensão de produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS subcategoria text,
  ADD COLUMN IF NOT EXISTS controla_estoque boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exige_fornecedor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_referencia numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS natureza_padrao_id uuid REFERENCES public.naturezas_financeiras(id),
  ADD COLUMN IF NOT EXISTS centro_custo_padrao_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN IF NOT EXISTS centro_resultado_padrao_id uuid REFERENCES public.centros_resultado(id),
  ADD COLUMN IF NOT EXISTS observacao text;

UPDATE public.produtos SET tipo_item='MATERIAL' WHERE tipo_item IS NULL;
ALTER TABLE public.produtos
  ALTER COLUMN tipo_item SET DEFAULT 'MATERIAL',
  ALTER COLUMN tipo_item SET NOT NULL;
UPDATE public.produtos SET controla_estoque=false WHERE tipo_item='SERVICO';

-- 2) Consistência tipo_item ↔ controla_estoque
CREATE OR REPLACE FUNCTION public.tg_produto_consistencia_tipo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.tipo_item = 'SERVICO' AND NEW.controla_estoque = true THEN
    NEW.controla_estoque := false;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_produto_consistencia_tipo ON public.produtos;
CREATE TRIGGER trg_produto_consistencia_tipo
BEFORE INSERT OR UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.tg_produto_consistencia_tipo();

-- 3) Validação do item da requisição contra o catálogo
CREATE OR REPLACE FUNCTION public.tg_sup_req_item_validar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_req record;
  v_prod record;
BEGIN
  SELECT tipo, destino_almoxarifado
    INTO v_req
    FROM public.suprimentos_requisicoes
   WHERE id = NEW.requisicao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requisição inexistente' USING ERRCODE='22023';
  END IF;

  IF NEW.item_estoque_id IS NOT NULL THEN
    SELECT tipo_item, ativo, unidade
      INTO v_prod
      FROM public.produtos
     WHERE id = NEW.item_estoque_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item de catálogo inexistente' USING ERRCODE='22023';
    END IF;
    IF NOT COALESCE(v_prod.ativo,false) THEN
      RAISE EXCEPTION 'Item % está inativo', NEW.item_estoque_id USING ERRCODE='22023';
    END IF;
    IF v_req.tipo = 'MATERIAL' AND v_prod.tipo_item <> 'MATERIAL' THEN
      RAISE EXCEPTION 'Item de SERVIÇO não pode entrar em requisição de MATERIAL' USING ERRCODE='22023';
    END IF;
    IF v_req.tipo = 'SERVICO' AND v_prod.tipo_item <> 'SERVICO' THEN
      RAISE EXCEPTION 'Item de MATERIAL não pode entrar em requisição de SERVIÇO' USING ERRCODE='22023';
    END IF;
    IF COALESCE(v_req.destino_almoxarifado,false) AND v_prod.tipo_item <> 'MATERIAL' THEN
      RAISE EXCEPTION 'Almoxarifado aceita apenas MATERIAL' USING ERRCODE='22023';
    END IF;
    IF NEW.unidade IS NULL OR length(trim(NEW.unidade))=0 THEN
      NEW.unidade := v_prod.unidade;
    END IF;
  END IF;

  IF NEW.tipo_item IS NULL THEN
    NEW.tipo_item := v_req.tipo;
  END IF;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_sup_req_item_validar ON public.suprimentos_requisicao_itens;
CREATE TRIGGER trg_sup_req_item_validar
BEFORE INSERT OR UPDATE ON public.suprimentos_requisicao_itens
FOR EACH ROW EXECUTE FUNCTION public.tg_sup_req_item_validar();

-- 4) rpc_sup_requisicao_criar agora insere itens (transacional)
CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_criar(p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_id uuid; v_uid uuid := auth.uid();
  v_tipo public.sup_req_tipo; v_setor text; v_natureza uuid;
  v_destino_almox boolean := COALESCE((p_payload->>'destino_almoxarifado')::boolean,false);
  v_projeto uuid := NULLIF(p_payload->>'projeto_id','')::uuid;
  v_obra uuid := NULLIF(p_payload->>'obra_id','')::uuid;
  v_os uuid := NULLIF(p_payload->>'os_id','')::uuid;
  v_cc uuid := NULLIF(p_payload->>'centro_custo_id','')::uuid;
  v_cr uuid := NULLIF(p_payload->>'centro_resultado_id','')::uuid;
  v_cc_almox uuid; v_cr_almox uuid;
  v_item jsonb; v_ordem int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid,'suprimentos.requisicao.criar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: suprimentos.requisicao.criar' USING ERRCODE='42501';
  END IF;
  v_tipo := (p_payload->>'tipo')::public.sup_req_tipo;
  v_setor := NULLIF(trim(p_payload->>'setor'),'');
  v_natureza := NULLIF(p_payload->>'natureza_id','')::uuid;

  IF v_natureza IS NULL THEN RAISE EXCEPTION 'Natureza é obrigatória' USING ERRCODE='22023'; END IF;
  IF v_setor IS NULL THEN RAISE EXCEPTION 'Setor é obrigatório' USING ERRCODE='22023'; END IF;
  IF v_destino_almox AND v_tipo = 'SERVICO' THEN
    RAISE EXCEPTION 'Almoxarifado é destino apenas para MATERIAL. Serviço deve ser vinculado a Projeto/Obra/O.S.' USING ERRCODE='22023';
  END IF;

  IF v_destino_almox THEN
    v_projeto := NULL; v_obra := NULL; v_os := NULL;
    SELECT id INTO v_cc_almox FROM public.centros_custo      WHERE codigo='ALMOXARIFADO' LIMIT 1;
    SELECT id INTO v_cr_almox FROM public.centros_resultado  WHERE codigo='ALMOXARIFADO' LIMIT 1;
    v_cc := COALESCE(v_cc, v_cc_almox);
    v_cr := COALESCE(v_cr, v_cr_almox);
  ELSE
    IF v_projeto IS NULL AND v_obra IS NULL AND v_os IS NULL THEN
      RAISE EXCEPTION 'Vincule Projeto, Obra ou O.S. — ou marque destino Almoxarifado' USING ERRCODE='22023';
    END IF;
  END IF;

  IF v_cc IS NULL THEN RAISE EXCEPTION 'Centro de Custo é obrigatório' USING ERRCODE='22023'; END IF;
  IF v_cr IS NULL THEN RAISE EXCEPTION 'Centro de Resultado é obrigatório' USING ERRCODE='22023'; END IF;

  INSERT INTO public.suprimentos_requisicoes (
    tipo, solicitante_id, setor, prioridade, data_necessidade, justificativa,
    os_id, tarefa_id, obra_id, projeto_id, cliente_id,
    centro_custo_id, centro_resultado_id, natureza_id, competencia,
    valor_estimado, destino_almoxarifado, criado_por
  ) VALUES (
    v_tipo, COALESCE((p_payload->>'solicitante_id')::uuid,v_uid), v_setor,
    COALESCE(p_payload->>'prioridade','NORMAL'),
    NULLIF(p_payload->>'data_necessidade','')::date, p_payload->>'justificativa',
    v_os, NULLIF(p_payload->>'tarefa_id','')::uuid, v_obra, v_projeto,
    NULLIF(p_payload->>'cliente_id','')::uuid,
    v_cc, v_cr, v_natureza, NULLIF(p_payload->>'competencia','')::date,
    COALESCE((p_payload->>'valor_estimado')::numeric,0), v_destino_almox, v_uid
  ) RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'itens','[]'::jsonb))
  LOOP
    v_ordem := v_ordem + 1;
    INSERT INTO public.suprimentos_requisicao_itens (
      requisicao_id, ordem, tipo_item, item_estoque_id, descricao,
      unidade, quantidade_solicitada, valor_estimado_unitario,
      fornecedor_sugerido_id, observacao
    ) VALUES (
      v_id, v_ordem, v_tipo,
      NULLIF(v_item->>'item_estoque_id','')::uuid,
      COALESCE(NULLIF(v_item->>'descricao',''),'(sem descrição)'),
      NULLIF(v_item->>'unidade',''),
      COALESCE((v_item->>'quantidade_solicitada')::numeric,0),
      COALESCE((v_item->>'valor_estimado_unitario')::numeric,0),
      NULLIF(v_item->>'fornecedor_sugerido_id','')::uuid,
      NULLIF(v_item->>'observacao','')
    );
  END LOOP;

  PERFORM public.fn_sup_req_log_evento(v_id,'CRIADA',NULL,'RASCUNHO',p_payload,NULL);
  RETURN v_id;
END$$;

REVOKE EXECUTE ON FUNCTION public.rpc_sup_requisicao_criar(jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_sup_requisicao_criar(jsonb) TO authenticated;