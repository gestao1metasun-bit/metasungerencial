
-- D20.SUP.4 — Re-aplicação corrigida
CREATE TABLE IF NOT EXISTS public.suprimentos_cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigserial NOT NULL,
  requisicao_id uuid NOT NULL REFERENCES public.suprimentos_requisicoes(id) ON DELETE RESTRICT,
  status public.sup_cot_status NOT NULL DEFAULT 'RASCUNHO',
  fornecedor_aprovado_id uuid REFERENCES public.fornecedores(id),
  observacao text, motivo_reprovacao text, motivo_cancelamento text,
  criado_por uuid NOT NULL DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  row_version bigint NOT NULL DEFAULT 1,
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.suprimentos_cotacoes TO authenticated;
GRANT ALL ON public.suprimentos_cotacoes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.suprimentos_cotacoes_numero_seq TO authenticated;
ALTER TABLE public.suprimentos_cotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_cot_sel ON public.suprimentos_cotacoes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.cotacao.visualizar'::public.app_permission));
CREATE POLICY sup_cot_ins ON public.suprimentos_cotacoes FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.cotacao.criar'::public.app_permission));
CREATE POLICY sup_cot_upd ON public.suprimentos_cotacoes FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.cotacao.editar'::public.app_permission));

CREATE TABLE IF NOT EXISTS public.suprimentos_cotacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.suprimentos_cotacoes(id) ON DELETE CASCADE,
  requisicao_item_id uuid NOT NULL REFERENCES public.suprimentos_requisicao_itens(id) ON DELETE RESTRICT,
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  descricao text NOT NULL, unidade text,
  quantidade numeric(14,4) NOT NULL CHECK (quantidade > 0),
  valor_unitario numeric(14,4) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
  valor_total numeric(14,2) GENERATED ALWAYS AS (round(quantidade * valor_unitario, 2)) STORED,
  prazo_entrega_dias int, condicao_pagamento text, frete numeric(14,2) DEFAULT 0,
  observacao text, criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suprimentos_cotacao_itens TO authenticated;
GRANT ALL ON public.suprimentos_cotacao_itens TO service_role;
ALTER TABLE public.suprimentos_cotacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_cot_item_sel ON public.suprimentos_cotacao_itens FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.cotacao.visualizar'::public.app_permission));
CREATE POLICY sup_cot_item_wr ON public.suprimentos_cotacao_itens FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.cotacao.editar'::public.app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.cotacao.editar'::public.app_permission));
CREATE INDEX IF NOT EXISTS ix_sup_cot_itens_cot ON public.suprimentos_cotacao_itens(cotacao_id);
CREATE INDEX IF NOT EXISTS ix_sup_cot_itens_req_item ON public.suprimentos_cotacao_itens(requisicao_item_id);

CREATE TABLE IF NOT EXISTS public.suprimentos_cotacao_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.suprimentos_cotacoes(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL, observacao text, payload jsonb DEFAULT '{}'::jsonb,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  data_hora timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suprimentos_cotacao_eventos TO authenticated;
GRANT ALL ON public.suprimentos_cotacao_eventos TO service_role;
ALTER TABLE public.suprimentos_cotacao_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_cot_ev_sel ON public.suprimentos_cotacao_eventos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.cotacao.visualizar'::public.app_permission));
CREATE POLICY sup_cot_ev_ins ON public.suprimentos_cotacao_eventos FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.cotacao.visualizar'::public.app_permission));
CREATE INDEX IF NOT EXISTS ix_sup_cot_ev_cot ON public.suprimentos_cotacao_eventos(cotacao_id, data_hora DESC);

CREATE TABLE IF NOT EXISTS public.suprimentos_pedidos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigserial NOT NULL,
  cotacao_id uuid REFERENCES public.suprimentos_cotacoes(id) ON DELETE RESTRICT,
  requisicao_id uuid NOT NULL REFERENCES public.suprimentos_requisicoes(id) ON DELETE RESTRICT,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  status public.sup_ped_status NOT NULL DEFAULT 'EMITIDO',
  valor_total numeric(14,2) NOT NULL DEFAULT 0,
  prazo_entrega_dias int, observacao text, motivo_cancelamento text,
  os_id uuid, obra_id uuid, projeto_id uuid,
  centro_custo_id uuid, centro_resultado_id uuid,
  criado_por uuid NOT NULL DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  row_version bigint NOT NULL DEFAULT 1, deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.suprimentos_pedidos_compra TO authenticated;
GRANT ALL ON public.suprimentos_pedidos_compra TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.suprimentos_pedidos_compra_numero_seq TO authenticated;
ALTER TABLE public.suprimentos_pedidos_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_ped_sel ON public.suprimentos_pedidos_compra FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.pedido.visualizar'::public.app_permission));
CREATE POLICY sup_ped_ins ON public.suprimentos_pedidos_compra FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.pedido.criar'::public.app_permission));
CREATE POLICY sup_ped_upd ON public.suprimentos_pedidos_compra FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.pedido.criar'::public.app_permission));

CREATE TABLE IF NOT EXISTS public.suprimentos_pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.suprimentos_pedidos_compra(id) ON DELETE CASCADE,
  cotacao_item_id uuid REFERENCES public.suprimentos_cotacao_itens(id),
  requisicao_item_id uuid NOT NULL REFERENCES public.suprimentos_requisicao_itens(id) ON DELETE RESTRICT,
  descricao text NOT NULL, unidade text,
  item_estoque_id uuid,
  quantidade numeric(14,4) NOT NULL CHECK (quantidade > 0),
  valor_unitario numeric(14,4) NOT NULL DEFAULT 0,
  valor_total numeric(14,2) GENERATED ALWAYS AS (round(quantidade * valor_unitario, 2)) STORED,
  quantidade_recebida numeric(14,4) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.suprimentos_pedido_itens TO authenticated;
GRANT ALL ON public.suprimentos_pedido_itens TO service_role;
ALTER TABLE public.suprimentos_pedido_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_ped_item_sel ON public.suprimentos_pedido_itens FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.pedido.visualizar'::public.app_permission));
CREATE POLICY sup_ped_item_wr ON public.suprimentos_pedido_itens FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.pedido.criar'::public.app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.pedido.criar'::public.app_permission));
CREATE INDEX IF NOT EXISTS ix_sup_ped_itens_ped ON public.suprimentos_pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS ix_sup_ped_itens_req_item ON public.suprimentos_pedido_itens(requisicao_item_id);

CREATE TABLE IF NOT EXISTS public.suprimentos_pedido_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.suprimentos_pedidos_compra(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL, observacao text, payload jsonb DEFAULT '{}'::jsonb,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  data_hora timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suprimentos_pedido_eventos TO authenticated;
GRANT ALL ON public.suprimentos_pedido_eventos TO service_role;
ALTER TABLE public.suprimentos_pedido_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_ped_ev_sel ON public.suprimentos_pedido_eventos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.pedido.visualizar'::public.app_permission));
CREATE POLICY sup_ped_ev_ins ON public.suprimentos_pedido_eventos FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.pedido.visualizar'::public.app_permission));
CREATE INDEX IF NOT EXISTS ix_sup_ped_ev_ped ON public.suprimentos_pedido_eventos(pedido_id, data_hora DESC);

CREATE TABLE IF NOT EXISTS public.suprimentos_recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigserial NOT NULL,
  pedido_id uuid NOT NULL REFERENCES public.suprimentos_pedidos_compra(id) ON DELETE RESTRICT,
  status public.sup_rec_status NOT NULL DEFAULT 'RASCUNHO',
  documento text, data_recebimento date NOT NULL DEFAULT current_date,
  responsavel_id uuid NOT NULL DEFAULT auth.uid(),
  anexo_url text, observacao text, motivo_cancelamento text,
  criado_por uuid NOT NULL DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  row_version bigint NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE ON public.suprimentos_recebimentos TO authenticated;
GRANT ALL ON public.suprimentos_recebimentos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.suprimentos_recebimentos_numero_seq TO authenticated;
ALTER TABLE public.suprimentos_recebimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_rec_sel ON public.suprimentos_recebimentos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.recebimento.visualizar'::public.app_permission));
CREATE POLICY sup_rec_ins ON public.suprimentos_recebimentos FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.recebimento.criar'::public.app_permission));
CREATE POLICY sup_rec_upd ON public.suprimentos_recebimentos FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.recebimento.criar'::public.app_permission));

CREATE TABLE IF NOT EXISTS public.suprimentos_recebimento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id uuid NOT NULL REFERENCES public.suprimentos_recebimentos(id) ON DELETE CASCADE,
  pedido_item_id uuid NOT NULL REFERENCES public.suprimentos_pedido_itens(id) ON DELETE RESTRICT,
  quantidade_recebida numeric(14,4) NOT NULL CHECK (quantidade_recebida > 0),
  observacao text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suprimentos_recebimento_itens TO authenticated;
GRANT ALL ON public.suprimentos_recebimento_itens TO service_role;
ALTER TABLE public.suprimentos_recebimento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_rec_item_sel ON public.suprimentos_recebimento_itens FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.recebimento.visualizar'::public.app_permission));
CREATE POLICY sup_rec_item_wr ON public.suprimentos_recebimento_itens FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.recebimento.criar'::public.app_permission))
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.recebimento.criar'::public.app_permission));
CREATE INDEX IF NOT EXISTS ix_sup_rec_itens_rec ON public.suprimentos_recebimento_itens(recebimento_id);
CREATE INDEX IF NOT EXISTS ix_sup_rec_itens_ped ON public.suprimentos_recebimento_itens(pedido_item_id);

CREATE TABLE IF NOT EXISTS public.suprimentos_recebimento_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id uuid NOT NULL REFERENCES public.suprimentos_recebimentos(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL, observacao text, payload jsonb DEFAULT '{}'::jsonb,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  data_hora timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suprimentos_recebimento_eventos TO authenticated;
GRANT ALL ON public.suprimentos_recebimento_eventos TO service_role;
ALTER TABLE public.suprimentos_recebimento_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY sup_rec_ev_sel ON public.suprimentos_recebimento_eventos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'suprimentos.recebimento.visualizar'::public.app_permission));
CREATE POLICY sup_rec_ev_ins ON public.suprimentos_recebimento_eventos FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'suprimentos.recebimento.visualizar'::public.app_permission));

-- append-only guards
CREATE OR REPLACE FUNCTION public.fn_sup_evento_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Eventos de Suprimentos são append-only.'; END $$;

DROP TRIGGER IF EXISTS tg_sup_cot_ev_no_upd ON public.suprimentos_cotacao_eventos;
CREATE TRIGGER tg_sup_cot_ev_no_upd BEFORE UPDATE OR DELETE ON public.suprimentos_cotacao_eventos
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_evento_append_only();
DROP TRIGGER IF EXISTS tg_sup_ped_ev_no_upd ON public.suprimentos_pedido_eventos;
CREATE TRIGGER tg_sup_ped_ev_no_upd BEFORE UPDATE OR DELETE ON public.suprimentos_pedido_eventos
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_evento_append_only();
DROP TRIGGER IF EXISTS tg_sup_rec_ev_no_upd ON public.suprimentos_recebimento_eventos;
CREATE TRIGGER tg_sup_rec_ev_no_upd BEFORE UPDATE OR DELETE ON public.suprimentos_recebimento_eventos
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_evento_append_only();

-- ligar requisição ↔ pedido_item
ALTER TABLE public.suprimentos_requisicao_itens
  ADD COLUMN IF NOT EXISTS pedido_item_id uuid REFERENCES public.suprimentos_pedido_itens(id);
CREATE INDEX IF NOT EXISTS ix_sup_req_itens_pedido_item
  ON public.suprimentos_requisicao_itens(pedido_item_id) WHERE pedido_item_id IS NOT NULL;

-- guards de status
CREATE OR REPLACE FUNCTION public.fn_sup_cot_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND coalesce(current_setting('app.via_sup_compras_rpc', true),'') <> 'true' THEN
    RAISE EXCEPTION 'Status de cotação só muda via RPC oficial.' USING ERRCODE='42501'; END IF;
  NEW.atualizado_em := now(); NEW.row_version := OLD.row_version + 1; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_sup_cot_guard ON public.suprimentos_cotacoes;
CREATE TRIGGER tg_sup_cot_guard BEFORE UPDATE ON public.suprimentos_cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_cot_guard();

CREATE OR REPLACE FUNCTION public.fn_sup_ped_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND coalesce(current_setting('app.via_sup_compras_rpc', true),'') <> 'true' THEN
    RAISE EXCEPTION 'Status de pedido só muda via RPC oficial.' USING ERRCODE='42501'; END IF;
  NEW.atualizado_em := now(); NEW.row_version := OLD.row_version + 1; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_sup_ped_guard ON public.suprimentos_pedidos_compra;
CREATE TRIGGER tg_sup_ped_guard BEFORE UPDATE ON public.suprimentos_pedidos_compra
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_ped_guard();

CREATE OR REPLACE FUNCTION public.fn_sup_rec_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND coalesce(current_setting('app.via_sup_compras_rpc', true),'') <> 'true' THEN
    RAISE EXCEPTION 'Status de recebimento só muda via RPC oficial.' USING ERRCODE='42501'; END IF;
  NEW.atualizado_em := now(); NEW.row_version := OLD.row_version + 1; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_sup_rec_guard ON public.suprimentos_recebimentos;
CREATE TRIGGER tg_sup_rec_guard BEFORE UPDATE ON public.suprimentos_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_sup_rec_guard();

-- helpers de evento
CREATE OR REPLACE FUNCTION public.fn_sup_cot_evento(_id uuid, _tipo text, _obs text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.suprimentos_cotacao_eventos(cotacao_id, tipo_evento, observacao, payload)
  VALUES(_id, _tipo, _obs, coalesce(_payload, '{}'::jsonb));
$$;
CREATE OR REPLACE FUNCTION public.fn_sup_ped_evento(_id uuid, _tipo text, _obs text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.suprimentos_pedido_eventos(pedido_id, tipo_evento, observacao, payload)
  VALUES(_id, _tipo, _obs, coalesce(_payload, '{}'::jsonb));
$$;
CREATE OR REPLACE FUNCTION public.fn_sup_rec_evento(_id uuid, _tipo text, _obs text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.suprimentos_recebimento_eventos(recebimento_id, tipo_evento, observacao, payload)
  VALUES(_id, _tipo, _obs, coalesce(_payload, '{}'::jsonb));
$$;
REVOKE EXECUTE ON FUNCTION public.fn_sup_cot_evento(uuid,text,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_sup_ped_evento(uuid,text,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_sup_rec_evento(uuid,text,text,jsonb) FROM anon;

-- RPC: criar cotação
CREATE OR REPLACE FUNCTION public.rpc_sup_cotacao_criar(p_requisicao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_status sup_req_status; r record;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.cotacao.criar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão suprimentos.cotacao.criar' USING ERRCODE='42501'; END IF;
  SELECT status INTO v_status FROM public.suprimentos_requisicoes WHERE id = p_requisicao_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Requisição não encontrada'; END IF;
  IF v_status NOT IN ('APROVADA','AGUARDANDO_COMPRA','EM_COMPRA','AGUARDANDO_ESTOQUE','PARCIALMENTE_ATENDIDA') THEN
    RAISE EXCEPTION 'Requisição precisa estar aprovada para gerar cotação (status atual: %)', v_status;
  END IF;
  INSERT INTO public.suprimentos_cotacoes(requisicao_id) VALUES(p_requisicao_id) RETURNING id INTO v_id;
  FOR r IN
    SELECT i.id, i.descricao, i.unidade,
           greatest(coalesce(i.quantidade_aprovada, i.quantidade_solicitada,0)
                    - coalesce(i.quantidade_reservada,0)
                    - coalesce(i.quantidade_entregue,0), 0) AS falta,
           i.valor_estimado_unitario
    FROM public.suprimentos_requisicao_itens i
    WHERE i.requisicao_id = p_requisicao_id
  LOOP
    IF r.falta > 0 THEN
      INSERT INTO public.suprimentos_cotacao_itens(
        cotacao_id, requisicao_item_id, descricao, unidade, quantidade, valor_unitario
      ) VALUES (v_id, r.id, r.descricao, r.unidade, r.falta, coalesce(r.valor_estimado_unitario,0));
    END IF;
  END LOOP;
  PERFORM public.fn_sup_cot_evento(v_id,'COTACAO_CRIADA','Cotação criada a partir da requisição');
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_cotacao_criar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_cotacao_criar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_cotacao_enviar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status sup_cot_status;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.cotacao.editar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  SELECT status INTO v_status FROM public.suprimentos_cotacoes WHERE id = p_id;
  IF v_status <> 'RASCUNHO' THEN RAISE EXCEPTION 'Cotação não está em rascunho (%)', v_status; END IF;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_cotacoes SET status='ENVIADA' WHERE id = p_id;
  PERFORM public.fn_sup_cot_evento(p_id,'COTACAO_ENVIADA','Cotação enviada a fornecedores');
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_cotacao_enviar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_cotacao_enviar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_cotacao_aprovar(p_id uuid, p_fornecedor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status sup_cot_status; v_count int;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.cotacao.aprovar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  IF p_fornecedor_id IS NULL THEN RAISE EXCEPTION 'Fornecedor obrigatório'; END IF;
  SELECT status INTO v_status FROM public.suprimentos_cotacoes WHERE id = p_id;
  IF v_status NOT IN ('ENVIADA','EM_ANALISE','RASCUNHO') THEN RAISE EXCEPTION 'Status inválido (%)', v_status; END IF;
  SELECT count(*) INTO v_count FROM public.suprimentos_cotacao_itens
    WHERE cotacao_id = p_id AND fornecedor_id = p_fornecedor_id;
  IF v_count = 0 THEN RAISE EXCEPTION 'Nenhum item do fornecedor escolhido'; END IF;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_cotacoes SET status='APROVADA', fornecedor_aprovado_id=p_fornecedor_id WHERE id=p_id;
  PERFORM public.fn_sup_cot_evento(p_id,'COTACAO_APROVADA','Cotação aprovada', jsonb_build_object('fornecedor_id',p_fornecedor_id));
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_cotacao_aprovar(uuid,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_cotacao_aprovar(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_cotacao_reprovar(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.cotacao.aprovar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  IF length(coalesce(p_motivo,'')) < 5 THEN RAISE EXCEPTION 'Motivo obrigatório (≥5)'; END IF;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_cotacoes SET status='REPROVADA', motivo_reprovacao=p_motivo WHERE id=p_id;
  PERFORM public.fn_sup_cot_evento(p_id,'COTACAO_REPROVADA',p_motivo);
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_cotacao_reprovar(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_cotacao_reprovar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_cotacao_cancelar(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.cotacao.cancelar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  IF length(coalesce(p_motivo,'')) < 5 THEN RAISE EXCEPTION 'Motivo obrigatório (≥5)'; END IF;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_cotacoes SET status='CANCELADA', motivo_cancelamento=p_motivo WHERE id=p_id;
  PERFORM public.fn_sup_cot_evento(p_id,'COTACAO_CANCELADA',p_motivo);
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_cotacao_cancelar(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_cotacao_cancelar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_cotacao_item_upsert(
  p_id uuid, p_cotacao_id uuid, p_requisicao_item_id uuid,
  p_fornecedor_id uuid, p_descricao text, p_unidade text,
  p_quantidade numeric, p_valor_unitario numeric,
  p_prazo_entrega_dias int DEFAULT NULL, p_condicao_pagamento text DEFAULT NULL,
  p_frete numeric DEFAULT 0, p_observacao text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.cotacao.editar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.suprimentos_cotacao_itens(
      cotacao_id, requisicao_item_id, fornecedor_id, descricao, unidade,
      quantidade, valor_unitario, prazo_entrega_dias, condicao_pagamento, frete, observacao
    ) VALUES (
      p_cotacao_id, p_requisicao_item_id, p_fornecedor_id, p_descricao, p_unidade,
      p_quantidade, p_valor_unitario, p_prazo_entrega_dias, p_condicao_pagamento, coalesce(p_frete,0), p_observacao
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.suprimentos_cotacao_itens SET
      fornecedor_id=p_fornecedor_id, descricao=p_descricao, unidade=p_unidade,
      quantidade=p_quantidade, valor_unitario=p_valor_unitario,
      prazo_entrega_dias=p_prazo_entrega_dias, condicao_pagamento=p_condicao_pagamento,
      frete=coalesce(p_frete,0), observacao=p_observacao
    WHERE id=p_id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_cotacao_item_upsert(uuid,uuid,uuid,uuid,text,text,numeric,numeric,int,text,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_cotacao_item_upsert(uuid,uuid,uuid,uuid,text,text,numeric,numeric,int,text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_gerar(p_cotacao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; cot record; v_total numeric(14,2);
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.pedido.criar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  SELECT c.id, c.status, c.requisicao_id, c.fornecedor_aprovado_id,
         r.os_id, r.obra_id, r.projeto_id, r.centro_custo_id, r.centro_resultado_id
    INTO cot
    FROM public.suprimentos_cotacoes c
    JOIN public.suprimentos_requisicoes r ON r.id = c.requisicao_id
   WHERE c.id = p_cotacao_id;
  IF cot.id IS NULL THEN RAISE EXCEPTION 'Cotação não encontrada'; END IF;
  IF cot.status <> 'APROVADA' THEN RAISE EXCEPTION 'Cotação precisa estar APROVADA'; END IF;
  IF cot.fornecedor_aprovado_id IS NULL THEN RAISE EXCEPTION 'Fornecedor aprovado ausente'; END IF;

  SELECT coalesce(sum(quantidade*valor_unitario),0) INTO v_total
    FROM public.suprimentos_cotacao_itens
   WHERE cotacao_id = p_cotacao_id AND fornecedor_id = cot.fornecedor_aprovado_id;

  INSERT INTO public.suprimentos_pedidos_compra(
    cotacao_id, requisicao_id, fornecedor_id, valor_total,
    os_id, obra_id, projeto_id, centro_custo_id, centro_resultado_id
  ) VALUES (
    p_cotacao_id, cot.requisicao_id, cot.fornecedor_aprovado_id, v_total,
    cot.os_id, cot.obra_id, cot.projeto_id, cot.centro_custo_id, cot.centro_resultado_id
  ) RETURNING id INTO v_id;

  INSERT INTO public.suprimentos_pedido_itens(
    pedido_id, cotacao_item_id, requisicao_item_id, descricao, unidade,
    item_estoque_id, quantidade, valor_unitario
  )
  SELECT v_id, ci.id, ci.requisicao_item_id, ci.descricao, ci.unidade,
         ri.item_estoque_id, ci.quantidade, ci.valor_unitario
  FROM public.suprimentos_cotacao_itens ci
  JOIN public.suprimentos_requisicao_itens ri ON ri.id = ci.requisicao_item_id
  WHERE ci.cotacao_id = p_cotacao_id AND ci.fornecedor_id = cot.fornecedor_aprovado_id;

  UPDATE public.suprimentos_requisicao_itens ri
     SET pedido_item_id = pi.id
    FROM public.suprimentos_pedido_itens pi
   WHERE pi.pedido_id = v_id AND pi.requisicao_item_id = ri.id;

  PERFORM public.fn_sup_ped_evento(v_id,'PEDIDO_EMITIDO','Pedido emitido a partir da cotação',
    jsonb_build_object('cotacao_id', p_cotacao_id, 'fornecedor_id', cot.fornecedor_aprovado_id, 'total', v_total));
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_pedido_gerar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_gerar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_aprovar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status sup_ped_status;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.pedido.aprovar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  SELECT status INTO v_status FROM public.suprimentos_pedidos_compra WHERE id=p_id;
  IF v_status <> 'EMITIDO' THEN RAISE EXCEPTION 'Status inválido (%)', v_status; END IF;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_pedidos_compra SET status='APROVADO' WHERE id=p_id;
  PERFORM public.fn_sup_ped_evento(p_id,'PEDIDO_APROVADO','Pedido aprovado');
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_pedido_aprovar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_aprovar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_enviar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status sup_ped_status;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.pedido.enviar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  SELECT status INTO v_status FROM public.suprimentos_pedidos_compra WHERE id=p_id;
  IF v_status NOT IN ('APROVADO','EMITIDO') THEN RAISE EXCEPTION 'Status inválido (%)', v_status; END IF;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_pedidos_compra SET status='ENVIADO_FORNECEDOR' WHERE id=p_id;
  PERFORM public.fn_sup_ped_evento(p_id,'PEDIDO_ENVIADO','Pedido enviado ao fornecedor');
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_pedido_enviar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_enviar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_pedido_cancelar(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status sup_ped_status;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.pedido.cancelar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  IF length(coalesce(p_motivo,'')) < 5 THEN RAISE EXCEPTION 'Motivo obrigatório (≥5)'; END IF;
  SELECT status INTO v_status FROM public.suprimentos_pedidos_compra WHERE id=p_id;
  IF v_status IN ('RECEBIDO','CANCELADO') THEN RAISE EXCEPTION 'Pedido já finalizado (%)', v_status; END IF;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_pedidos_compra SET status='CANCELADO', motivo_cancelamento=p_motivo WHERE id=p_id;
  PERFORM public.fn_sup_ped_evento(p_id,'PEDIDO_CANCELADO',p_motivo);
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_pedido_cancelar(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_pedido_cancelar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_recebimento_criar(
  p_pedido_id uuid, p_documento text DEFAULT NULL,
  p_data date DEFAULT current_date, p_observacao text DEFAULT NULL,
  p_anexo_url text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.recebimento.criar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  INSERT INTO public.suprimentos_recebimentos(pedido_id, documento, data_recebimento, observacao, anexo_url)
  VALUES(p_pedido_id, p_documento, p_data, p_observacao, p_anexo_url) RETURNING id INTO v_id;
  PERFORM public.fn_sup_rec_evento(v_id,'RECEBIMENTO_CRIADO','Recebimento criado');
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_recebimento_criar(uuid,text,date,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_recebimento_criar(uuid,text,date,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_sup_recebimento_confirmar(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status sup_rec_status; v_pedido uuid; r record;
  v_total_ped numeric; v_total_rec numeric; v_status_ped sup_ped_status;
  v_qtde_itens int := 0;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'suprimentos.recebimento.confirmar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  SELECT status, pedido_id INTO v_status, v_pedido FROM public.suprimentos_recebimentos WHERE id=p_id;
  IF v_status <> 'RASCUNHO' THEN RAISE EXCEPTION 'Recebimento não está em rascunho'; END IF;
  FOR r IN
    SELECT ri.id AS rec_item_id, ri.pedido_item_id, ri.quantidade_recebida,
           pi.quantidade AS qtd_pedida, pi.quantidade_recebida AS ja_rec,
           pi.requisicao_item_id, pi.item_estoque_id, pi.valor_unitario
    FROM public.suprimentos_recebimento_itens ri
    JOIN public.suprimentos_pedido_itens pi ON pi.id = ri.pedido_item_id
    WHERE ri.recebimento_id = p_id
  LOOP
    IF (r.ja_rec + r.quantidade_recebida) > r.qtd_pedida THEN
      RAISE EXCEPTION 'Item % excede a quantidade pedida', r.pedido_item_id;
    END IF;
    UPDATE public.suprimentos_pedido_itens
       SET quantidade_recebida = quantidade_recebida + r.quantidade_recebida
     WHERE id = r.pedido_item_id;
    UPDATE public.suprimentos_requisicao_itens
       SET valor_estimado_unitario = coalesce(valor_estimado_unitario, r.valor_unitario)
     WHERE id = r.requisicao_item_id;
    v_qtde_itens := v_qtde_itens + 1;
  END LOOP;
  PERFORM set_config('app.via_sup_compras_rpc','true', true);
  UPDATE public.suprimentos_recebimentos SET status='CONFIRMADO' WHERE id = p_id;
  SELECT sum(quantidade), sum(quantidade_recebida) INTO v_total_ped, v_total_rec
    FROM public.suprimentos_pedido_itens WHERE pedido_id = v_pedido;
  IF v_total_rec >= v_total_ped THEN v_status_ped := 'RECEBIDO';
  ELSIF v_total_rec > 0 THEN v_status_ped := 'PARCIALMENTE_RECEBIDO';
  ELSE v_status_ped := 'ENVIADO_FORNECEDOR'; END IF;
  UPDATE public.suprimentos_pedidos_compra SET status = v_status_ped WHERE id = v_pedido;
  PERFORM public.fn_sup_rec_evento(p_id,'RECEBIMENTO_CONFIRMADO','Recebimento confirmado',
    jsonb_build_object('itens', v_qtde_itens, 'pedido_status', v_status_ped));
  PERFORM public.fn_sup_ped_evento(v_pedido,'PEDIDO_RECEBIMENTO','Recebimento aplicado ao pedido',
    jsonb_build_object('recebimento_id', p_id, 'novo_status', v_status_ped));
  RETURN jsonb_build_object('recebimento_id', p_id, 'pedido_status', v_status_ped, 'itens_aplicados', v_qtde_itens);
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_sup_recebimento_confirmar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_recebimento_confirmar(uuid) TO authenticated;

-- views
CREATE OR REPLACE VIEW public.v_suprimentos_compras_resumo
WITH (security_invoker = on) AS
SELECT r.id AS requisicao_id, r.numero AS requisicao_numero, r.status AS requisicao_status,
  (SELECT count(*) FROM public.suprimentos_cotacoes c WHERE c.requisicao_id = r.id) AS qtd_cotacoes,
  (SELECT count(*) FROM public.suprimentos_pedidos_compra p WHERE p.requisicao_id = r.id) AS qtd_pedidos,
  (SELECT coalesce(sum(p.valor_total),0) FROM public.suprimentos_pedidos_compra p
    WHERE p.requisicao_id = r.id AND p.status <> 'CANCELADO') AS valor_pedidos
FROM public.suprimentos_requisicoes r;
GRANT SELECT ON public.v_suprimentos_compras_resumo TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_cotacoes_lista
WITH (security_invoker = on) AS
SELECT c.id, c.numero, c.status, c.requisicao_id, r.numero AS requisicao_numero,
  c.fornecedor_aprovado_id, f.nome AS fornecedor_aprovado_nome,
  (SELECT coalesce(sum(quantidade*valor_unitario),0)
     FROM public.suprimentos_cotacao_itens ci WHERE ci.cotacao_id = c.id) AS valor_total,
  (SELECT count(distinct fornecedor_id)
     FROM public.suprimentos_cotacao_itens ci WHERE ci.cotacao_id = c.id) AS qtd_fornecedores,
  c.criado_em, c.atualizado_em
  FROM public.suprimentos_cotacoes c
  JOIN public.suprimentos_requisicoes r ON r.id = c.requisicao_id
  LEFT JOIN public.fornecedores f ON f.id = c.fornecedor_aprovado_id
 WHERE c.deleted_at IS NULL;
GRANT SELECT ON public.v_suprimentos_cotacoes_lista TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_pedidos_lista
WITH (security_invoker = on) AS
SELECT p.id, p.numero, p.status, p.requisicao_id, r.numero AS requisicao_numero,
  p.fornecedor_id, f.nome AS fornecedor_nome, p.valor_total,
  p.criado_em, p.atualizado_em
  FROM public.suprimentos_pedidos_compra p
  JOIN public.suprimentos_requisicoes r ON r.id = p.requisicao_id
  JOIN public.fornecedores f ON f.id = p.fornecedor_id
 WHERE p.deleted_at IS NULL;
GRANT SELECT ON public.v_suprimentos_pedidos_lista TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_recebimentos_lista
WITH (security_invoker = on) AS
SELECT rc.id, rc.numero, rc.status, rc.pedido_id, p.numero AS pedido_numero,
  rc.documento, rc.data_recebimento, rc.criado_em
  FROM public.suprimentos_recebimentos rc
  JOIN public.suprimentos_pedidos_compra p ON p.id = rc.pedido_id;
GRANT SELECT ON public.v_suprimentos_recebimentos_lista TO authenticated;
