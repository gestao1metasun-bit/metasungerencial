
-- D20.SUP.3 — Workflow estoque (reserva/entrega/devolução) acoplado a Requisições

-- 1) Vínculo de item ↔ reserva/movimento
ALTER TABLE public.suprimentos_requisicao_itens
  ADD COLUMN IF NOT EXISTS reserva_id uuid REFERENCES public.estoque_reservas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS movimento_baixa_id uuid REFERENCES public.estoque_movimentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sup_req_itens_reserva ON public.suprimentos_requisicao_itens(reserva_id) WHERE reserva_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sup_req_itens_mov ON public.suprimentos_requisicao_itens(movimento_baixa_id) WHERE movimento_baixa_id IS NOT NULL;

-- 2) verificar_estoque enriquecido (saldo / disponível / status)
CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_verificar_estoque(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.visualizar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'item_id', i.id,
    'descricao', i.descricao,
    'unidade', i.unidade,
    'item_estoque_id', i.item_estoque_id,
    'qtd_solicitada', i.quantidade_solicitada,
    'qtd_aprovada', i.quantidade_aprovada,
    'qtd_reservada', i.quantidade_reservada,
    'qtd_entregue', i.quantidade_entregue,
    'qtd_devolvida', i.quantidade_devolvida,
    'reserva_id', i.reserva_id,
    'movimento_baixa_id', i.movimento_baixa_id,
    'saldo_fisico', COALESCE(s.saldo_fisico, 0),
    'saldo_reservado_total', COALESCE(s.saldo_reservado, 0),
    'saldo_disponivel', GREATEST(COALESCE(s.saldo_fisico,0) - COALESCE(s.saldo_reservado,0), 0),
    'falta', GREATEST(COALESCE(i.quantidade_aprovada,0) - COALESCE(i.quantidade_reservada,0), 0),
    'status_atendimento', CASE
      WHEN i.item_estoque_id IS NULL THEN 'SEM_VINCULO'
      WHEN COALESCE(i.quantidade_aprovada,0) = 0 THEN 'NAO_APROVADO'
      WHEN COALESCE(i.quantidade_reservada,0) >= COALESCE(i.quantidade_aprovada,0) THEN 'RESERVADO'
      WHEN GREATEST(COALESCE(s.saldo_fisico,0)-COALESCE(s.saldo_reservado,0),0) >= (COALESCE(i.quantidade_aprovada,0)-COALESCE(i.quantidade_reservada,0)) THEN 'DISPONIVEL'
      WHEN GREATEST(COALESCE(s.saldo_fisico,0)-COALESCE(s.saldo_reservado,0),0) > 0 THEN 'PARCIAL'
      ELSE 'INDISPONIVEL'
    END
  ) ORDER BY i.ordem) INTO v_result
  FROM public.suprimentos_requisicao_itens i
  LEFT JOIN public.v_estoque_saldos s ON s.produto_id = i.item_estoque_id
  WHERE i.requisicao_id = p_id;

  -- Marca verificação no evento (sem mudar status)
  INSERT INTO public.suprimentos_requisicao_eventos(requisicao_id, tipo_evento, observacao, payload, user_id)
  VALUES (p_id, 'ESTOQUE_VERIFICADO', 'Verificação automática de saldo', COALESCE(v_result, '[]'::jsonb), v_uid);

  RETURN COALESCE(v_result, '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.rpc_sup_requisicao_verificar_estoque(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_verificar_estoque(uuid) TO authenticated;

-- 3) Reservar (bulk) — exige OS vinculada, percorre itens com item_estoque_id
CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_reservar(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_item record;
  v_falta numeric;
  v_disp numeric;
  v_reservar numeric;
  v_reserva uuid;
  v_count int := 0;
  v_resumo jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.atender'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: suprimentos.requisicao.atender' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_req FROM public.suprimentos_requisicoes WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisição não encontrada' USING ERRCODE='P0002'; END IF;
  IF v_req.status NOT IN ('APROVADA','AGUARDANDO_ESTOQUE','EM_SEPARACAO','PARCIALMENTE_ATENDIDA') THEN
    RAISE EXCEPTION 'Requisição em status % não pode reservar', v_req.status USING ERRCODE='22023';
  END IF;
  IF v_req.os_id IS NULL THEN
    RAISE EXCEPTION 'Requisição sem O.S. vinculada — reserva exige O.S.' USING ERRCODE='22023';
  END IF;

  FOR v_item IN
    SELECT * FROM public.suprimentos_requisicao_itens
     WHERE requisicao_id=p_id AND item_estoque_id IS NOT NULL
     ORDER BY ordem
  LOOP
    v_falta := GREATEST(COALESCE(v_item.quantidade_aprovada,0) - COALESCE(v_item.quantidade_reservada,0), 0);
    IF v_falta <= 0 THEN CONTINUE; END IF;

    SELECT GREATEST(COALESCE(saldo_fisico,0) - COALESCE(saldo_reservado,0), 0)
      INTO v_disp FROM public.v_estoque_saldos WHERE produto_id = v_item.item_estoque_id;
    v_disp := COALESCE(v_disp, 0);

    v_reservar := LEAST(v_falta, v_disp);
    IF v_reservar <= 0 THEN
      v_resumo := v_resumo || jsonb_build_object('item_id', v_item.id, 'reservado', 0, 'motivo', 'Sem saldo disponível');
      CONTINUE;
    END IF;

    -- Reaproveita reserva existente se já houver
    IF v_item.reserva_id IS NOT NULL THEN
      PERFORM set_config('app.via_os_material_rpc','true',true);
      UPDATE public.estoque_reservas
         SET quantidade_reservada = quantidade_reservada + v_reservar,
             status = CASE WHEN status='ENTREGUE' THEN 'PARCIAL' ELSE status END,
             updated_at = now()
       WHERE id = v_item.reserva_id;
      v_reserva := v_item.reserva_id;
    ELSE
      v_reserva := public.rpc_os_reservar_material(
        v_req.os_id, v_item.item_estoque_id, v_reservar,
        'Requisição #' || v_req.numero::text, NULL
      );
    END IF;

    UPDATE public.suprimentos_requisicao_itens
       SET quantidade_reservada = COALESCE(quantidade_reservada,0) + v_reservar,
           reserva_id = COALESCE(reserva_id, v_reserva),
           atualizado_em = now()
     WHERE id = v_item.id;

    v_count := v_count + 1;
    v_resumo := v_resumo || jsonb_build_object('item_id', v_item.id, 'reservado', v_reservar, 'reserva_id', v_reserva);
  END LOOP;

  IF v_count > 0 AND v_req.status <> 'EM_SEPARACAO' THEN
    PERFORM set_config('app.via_sup_req_rpc','true',true);
    UPDATE public.suprimentos_requisicoes
       SET status='EM_SEPARACAO', atualizado_em=now(), row_version=row_version+1
     WHERE id=p_id;
  END IF;

  INSERT INTO public.suprimentos_requisicao_eventos(requisicao_id, tipo_evento, observacao, payload, user_id)
  VALUES (p_id, 'RESERVA_REALIZADA', v_count || ' item(ns) reservado(s)', v_resumo, v_uid);

  RETURN jsonb_build_object('itens_reservados', v_count, 'detalhe', v_resumo);
END $$;

REVOKE ALL ON FUNCTION public.rpc_sup_requisicao_reservar(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_reservar(uuid) TO authenticated;

-- 4) Entregar/baixar (bulk) — usa rpc_os_baixar_material por item reservado
CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_entregar(
  p_id uuid,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_item record;
  v_qtd numeric;
  v_mov uuid;
  v_count int := 0;
  v_resumo jsonb := '[]'::jsonb;
  v_total_aprov numeric; v_total_entreg numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.atender'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: suprimentos.requisicao.atender' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_req FROM public.suprimentos_requisicoes WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisição não encontrada' USING ERRCODE='P0002'; END IF;
  IF v_req.status NOT IN ('EM_SEPARACAO','APROVADA','PARCIALMENTE_ATENDIDA') THEN
    RAISE EXCEPTION 'Requisição em status % não pode entregar', v_req.status USING ERRCODE='22023';
  END IF;
  IF v_req.os_id IS NULL THEN
    RAISE EXCEPTION 'Requisição sem O.S. vinculada — baixa exige O.S.' USING ERRCODE='22023';
  END IF;

  FOR v_item IN
    SELECT * FROM public.suprimentos_requisicao_itens
     WHERE requisicao_id=p_id AND reserva_id IS NOT NULL
     ORDER BY ordem
  LOOP
    v_qtd := GREATEST(COALESCE(v_item.quantidade_reservada,0) - COALESCE(v_item.quantidade_entregue,0), 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    v_mov := public.rpc_os_baixar_material(
      v_item.reserva_id, v_qtd, NULL,
      COALESCE(p_observacao, 'Entrega Requisição #' || v_req.numero::text)
    );

    UPDATE public.suprimentos_requisicao_itens
       SET quantidade_entregue = COALESCE(quantidade_entregue,0) + v_qtd,
           movimento_baixa_id = COALESCE(movimento_baixa_id, v_mov),
           atualizado_em = now()
     WHERE id = v_item.id;

    v_count := v_count + 1;
    v_resumo := v_resumo || jsonb_build_object('item_id', v_item.id, 'entregue', v_qtd, 'movimento_id', v_mov);
  END LOOP;

  -- recompute totals
  SELECT COALESCE(SUM(quantidade_aprovada),0), COALESCE(SUM(quantidade_entregue),0)
    INTO v_total_aprov, v_total_entreg
    FROM public.suprimentos_requisicao_itens WHERE requisicao_id=p_id;

  IF v_count > 0 THEN
    PERFORM set_config('app.via_sup_req_rpc','true',true);
    UPDATE public.suprimentos_requisicoes
       SET status = CASE
              WHEN v_total_aprov > 0 AND v_total_entreg >= v_total_aprov THEN 'ATENDIDA'
              ELSE 'PARCIALMENTE_ATENDIDA'
            END,
           atualizado_em=now(), row_version=row_version+1
     WHERE id=p_id;
  END IF;

  INSERT INTO public.suprimentos_requisicao_eventos(requisicao_id, tipo_evento, observacao, payload, user_id)
  VALUES (p_id, 'ENTREGA_REALIZADA', v_count || ' item(ns) entregue(s)', v_resumo, v_uid);

  RETURN jsonb_build_object('itens_entregues', v_count, 'detalhe', v_resumo);
END $$;

REVOKE ALL ON FUNCTION public.rpc_sup_requisicao_entregar(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_entregar(uuid,text) TO authenticated;

-- 5) Devolver item — vincula a movimento_baixa_id do item
CREATE OR REPLACE FUNCTION public.rpc_sup_requisicao_devolver_item(
  p_item_id uuid,
  p_quantidade numeric,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item record;
  v_req record;
  v_disp numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_uid, 'suprimentos.requisicao.atender'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: suprimentos.requisicao.atender' USING ERRCODE='42501';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida' USING ERRCODE='22023';
  END IF;
  IF COALESCE(length(trim(p_motivo)),0) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_item FROM public.suprimentos_requisicao_itens WHERE id=p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado' USING ERRCODE='P0002'; END IF;
  IF v_item.movimento_baixa_id IS NULL THEN
    RAISE EXCEPTION 'Item não foi entregue — nada a devolver' USING ERRCODE='22023';
  END IF;

  v_disp := COALESCE(v_item.quantidade_entregue,0) - COALESCE(v_item.quantidade_devolvida,0);
  IF p_quantidade > v_disp THEN
    RAISE EXCEPTION 'Quantidade % excede saldo entregue % do item', p_quantidade, v_disp USING ERRCODE='22023';
  END IF;

  PERFORM public.rpc_os_devolver_material(v_item.movimento_baixa_id, p_quantidade, p_motivo);

  UPDATE public.suprimentos_requisicao_itens
     SET quantidade_devolvida = COALESCE(quantidade_devolvida,0) + p_quantidade,
         atualizado_em = now()
   WHERE id = p_item_id;

  SELECT * INTO v_req FROM public.suprimentos_requisicoes WHERE id=v_item.requisicao_id;

  INSERT INTO public.suprimentos_requisicao_eventos(requisicao_id, tipo_evento, observacao, payload, user_id)
  VALUES (v_item.requisicao_id, 'DEVOLUCAO',
          'Devolução de ' || p_quantidade::text || ' un. — ' || p_motivo,
          jsonb_build_object('item_id', p_item_id, 'qtd', p_quantidade, 'motivo', p_motivo, 'movimento_baixa_id', v_item.movimento_baixa_id),
          v_uid);

  RETURN jsonb_build_object('ok', true, 'item_id', p_item_id, 'devolvido', p_quantidade);
END $$;

REVOKE ALL ON FUNCTION public.rpc_sup_requisicao_devolver_item(uuid,numeric,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_sup_requisicao_devolver_item(uuid,numeric,text) TO authenticated;

-- 6) View consolidada Requisições x OS (para aba de Materiais da O.S.)
CREATE OR REPLACE VIEW public.v_os_requisicoes_resumo
WITH (security_invoker=on) AS
SELECT
  r.id AS requisicao_id,
  r.numero,
  r.tipo,
  r.status,
  r.prioridade,
  r.os_id,
  r.criado_em,
  COUNT(i.id)::int AS qtd_itens,
  COALESCE(SUM(i.quantidade_solicitada),0) AS total_solicitado,
  COALESCE(SUM(i.quantidade_aprovada),0)   AS total_aprovado,
  COALESCE(SUM(i.quantidade_reservada),0)  AS total_reservado,
  COALESCE(SUM(i.quantidade_entregue),0)   AS total_entregue,
  COALESCE(SUM(i.quantidade_devolvida),0)  AS total_devolvido,
  COALESCE(SUM(m.custo_total),0)           AS custo_material_total
FROM public.suprimentos_requisicoes r
LEFT JOIN public.suprimentos_requisicao_itens i ON i.requisicao_id = r.id
LEFT JOIN public.estoque_movimentos m ON m.id = i.movimento_baixa_id
WHERE r.os_id IS NOT NULL
GROUP BY r.id;

GRANT SELECT ON public.v_os_requisicoes_resumo TO authenticated;
