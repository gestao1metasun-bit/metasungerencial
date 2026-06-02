-- ============================================================
-- D20.1 — Fundação Integração O.S. ↔ Estoque
-- Foco: vincular reservas/movimentos à O.S., RPCs oficiais de
-- reservar/baixar/devolver e custo realizado automático.
-- Sem UI. Sem financeiro automático.
-- ============================================================

-- 1) Vincular Estoque à O.S. (mantém vínculos legados intactos)
ALTER TABLE public.estoque_reservas
  ADD COLUMN IF NOT EXISTS os_id uuid REFERENCES public.os_ordens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tarefa_id uuid REFERENCES public.os_tarefas(id) ON DELETE SET NULL;

ALTER TABLE public.estoque_movimentos
  ADD COLUMN IF NOT EXISTS os_id uuid REFERENCES public.os_ordens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tarefa_id uuid REFERENCES public.os_tarefas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_reservas_os ON public.estoque_reservas(os_id) WHERE os_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estoque_movimentos_os ON public.estoque_movimentos(os_id) WHERE os_id IS NOT NULL;

-- 2) Custo realizado: permitir estorno (valor negativo) e marcar origens canônicas
ALTER TABLE public.os_custos_realizados
  DROP CONSTRAINT IF EXISTS os_custos_realizados_valor_check;

ALTER TABLE public.os_custos_realizados
  ADD CONSTRAINT os_custos_realizados_valor_check CHECK (valor <> 0);

-- Catálogo de origem do custo (string-CHECK, MANUAL é default histórico)
ALTER TABLE public.os_custos_realizados
  ALTER COLUMN origem_tipo SET DEFAULT 'MANUAL';

UPDATE public.os_custos_realizados SET origem_tipo='MANUAL' WHERE origem_tipo IS NULL;

ALTER TABLE public.os_custos_realizados
  ALTER COLUMN origem_tipo SET NOT NULL;

ALTER TABLE public.os_custos_realizados
  DROP CONSTRAINT IF EXISTS os_custos_realizados_origem_tipo_check;

ALTER TABLE public.os_custos_realizados
  ADD CONSTRAINT os_custos_realizados_origem_tipo_check
  CHECK (origem_tipo IN ('MANUAL','ESTOQUE','ESTOQUE_DEVOLUCAO','COMPRA','FINANCEIRO_FUTURO'));

CREATE INDEX IF NOT EXISTS idx_os_custos_origem ON public.os_custos_realizados(origem_tipo, origem_id);

-- 3) Permissões novas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='os.material.reservar' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='app_permission')) THEN
    ALTER TYPE public.app_permission ADD VALUE 'os.material.reservar';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='os.material.baixar' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='app_permission')) THEN
    ALTER TYPE public.app_permission ADD VALUE 'os.material.baixar';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='os.material.devolver' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='app_permission')) THEN
    ALTER TYPE public.app_permission ADD VALUE 'os.material.devolver';
  END IF;
END $$;

-- 4) RPC: reservar material para uma O.S.
CREATE OR REPLACE FUNCTION public.rpc_os_reservar_material(
  p_os_id uuid,
  p_produto_id uuid,
  p_quantidade numeric,
  p_motivo text DEFAULT NULL,
  p_tarefa_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_obra uuid; v_pv uuid; v_proj uuid; v_reserva uuid; v_uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_uid,'admin'::app_role)
     AND NOT EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id=v_uid AND permission='os.material.reservar') THEN
    RAISE EXCEPTION 'Sem permissão: os.material.reservar' USING ERRCODE='42501';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida' USING ERRCODE='22023';
  END IF;
  SELECT obra_id, pv_id, projeto_id INTO v_obra, v_pv, v_proj
    FROM public.os_ordens WHERE id=p_os_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'O.S. não encontrada' USING ERRCODE='P0002'; END IF;

  INSERT INTO public.estoque_reservas(
    produto_id, obra_id, pv_id, projeto_id, os_id, tarefa_id,
    quantidade_reservada, quantidade_entregue, status, motivo, created_by
  ) VALUES (
    p_produto_id, v_obra, v_pv, v_proj, p_os_id, p_tarefa_id,
    p_quantidade, 0, 'RESERVADA', p_motivo, v_uid
  ) RETURNING id INTO v_reserva;

  INSERT INTO public.os_eventos(os_id, tipo, payload, user_id)
  VALUES (p_os_id, 'MATERIAL_RESERVADO',
          jsonb_build_object('reserva_id', v_reserva, 'produto_id', p_produto_id, 'qtd', p_quantidade, 'motivo', p_motivo),
          v_uid);

  RETURN v_reserva;
END $$;
REVOKE ALL ON FUNCTION public.rpc_os_reservar_material(uuid,uuid,numeric,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_reservar_material(uuid,uuid,numeric,text,uuid) TO authenticated;

-- 5) RPC: baixar material (saída) — gera movimento + custo realizado automático
CREATE OR REPLACE FUNCTION public.rpc_os_baixar_material(
  p_reserva_id uuid,
  p_quantidade numeric,
  p_custo_unitario numeric DEFAULT NULL,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_r record; v_mov uuid; v_uid uuid := auth.uid(); v_unit numeric; v_total numeric;
BEGIN
  IF NOT public.has_role(v_uid,'admin'::app_role)
     AND NOT EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id=v_uid AND permission='os.material.baixar') THEN
    RAISE EXCEPTION 'Sem permissão: os.material.baixar' USING ERRCODE='42501';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_r FROM public.estoque_reservas WHERE id=p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada' USING ERRCODE='P0002'; END IF;
  IF v_r.status NOT IN ('RESERVADA','PARCIAL') THEN
    RAISE EXCEPTION 'Reserva % está em status % e não pode ser baixada', v_r.id, v_r.status USING ERRCODE='22023';
  END IF;
  IF v_r.os_id IS NULL THEN
    RAISE EXCEPTION 'Reserva sem vínculo de O.S.' USING ERRCODE='22023';
  END IF;
  IF p_quantidade > (v_r.quantidade_reservada - v_r.quantidade_entregue) THEN
    RAISE EXCEPTION 'Quantidade % excede saldo reservado %', p_quantidade, (v_r.quantidade_reservada - v_r.quantidade_entregue) USING ERRCODE='22023';
  END IF;

  v_unit := COALESCE(p_custo_unitario, (SELECT preco_custo FROM public.produtos WHERE id=v_r.produto_id), 0);
  v_total := v_unit * p_quantidade;

  PERFORM set_config('app.via_os_material_rpc','true',true);

  INSERT INTO public.estoque_movimentos(
    produto_id, tipo, quantidade, custo_unitario, custo_total,
    obra_id, pv_id, projeto_id, reserva_id, os_id, tarefa_id,
    origem_tipo, motivo, user_id, user_email
  ) VALUES (
    v_r.produto_id, 'SAIDA', p_quantidade, v_unit, v_total,
    v_r.obra_id, v_r.pv_id, v_r.projeto_id, v_r.id, v_r.os_id, v_r.tarefa_id,
    'OS_BAIXA', COALESCE(p_observacao,'Baixa para O.S.'), v_uid,
    (SELECT email FROM auth.users WHERE id=v_uid)
  ) RETURNING id INTO v_mov;

  UPDATE public.estoque_reservas
     SET quantidade_entregue = quantidade_entregue + p_quantidade,
         status = CASE WHEN (quantidade_entregue + p_quantidade) >= quantidade_reservada
                       THEN 'ENTREGUE' ELSE 'PARCIAL' END,
         updated_at = now()
   WHERE id = v_r.id;

  -- Custo realizado automático
  INSERT INTO public.os_custos_realizados(
    os_id, categoria, valor, data_custo, descricao,
    origem_tipo, origem_id, created_by
  ) VALUES (
    v_r.os_id, 'MATERIAL', v_total, CURRENT_DATE,
    COALESCE(p_observacao, 'Baixa de estoque: ' || p_quantidade::text || ' x ' || v_unit::text),
    'ESTOQUE', v_mov, v_uid
  );

  INSERT INTO public.os_eventos(os_id, tipo, payload, user_id)
  VALUES (v_r.os_id, 'MATERIAL_BAIXADO',
          jsonb_build_object('reserva_id', v_r.id, 'movimento_id', v_mov, 'qtd', p_quantidade, 'custo_total', v_total),
          v_uid);

  RETURN v_mov;
END $$;
REVOKE ALL ON FUNCTION public.rpc_os_baixar_material(uuid,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_baixar_material(uuid,numeric,numeric,text) TO authenticated;

-- 6) RPC: devolver material (estorno de baixa)
CREATE OR REPLACE FUNCTION public.rpc_os_devolver_material(
  p_movimento_id uuid,
  p_quantidade numeric,
  p_motivo text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_m record; v_new_mov uuid; v_uid uuid := auth.uid(); v_unit numeric; v_total numeric;
BEGIN
  IF NOT public.has_role(v_uid,'admin'::app_role)
     AND NOT EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id=v_uid AND permission='os.material.devolver') THEN
    RAISE EXCEPTION 'Sem permissão: os.material.devolver' USING ERRCODE='42501';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 chars)' USING ERRCODE='22023';
  END IF;
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_m FROM public.estoque_movimentos WHERE id=p_movimento_id FOR UPDATE;
  IF NOT FOUND OR v_m.tipo <> 'SAIDA' OR v_m.os_id IS NULL THEN
    RAISE EXCEPTION 'Movimento de saída de O.S. não encontrado' USING ERRCODE='P0002';
  END IF;
  IF p_quantidade > v_m.quantidade THEN
    RAISE EXCEPTION 'Quantidade devolvida % excede a saída original %', p_quantidade, v_m.quantidade USING ERRCODE='22023';
  END IF;

  v_unit := v_m.custo_unitario;
  v_total := v_unit * p_quantidade;

  PERFORM set_config('app.via_os_material_rpc','true',true);

  INSERT INTO public.estoque_movimentos(
    produto_id, tipo, quantidade, custo_unitario, custo_total,
    obra_id, pv_id, projeto_id, reserva_id, os_id, tarefa_id,
    origem_tipo, motivo, user_id, user_email
  ) VALUES (
    v_m.produto_id, 'ENTRADA', p_quantidade, v_unit, v_total,
    v_m.obra_id, v_m.pv_id, v_m.projeto_id, v_m.reserva_id, v_m.os_id, v_m.tarefa_id,
    'OS_DEVOLUCAO', p_motivo, v_uid,
    (SELECT email FROM auth.users WHERE id=v_uid)
  ) RETURNING id INTO v_new_mov;

  IF v_m.reserva_id IS NOT NULL THEN
    UPDATE public.estoque_reservas
       SET quantidade_entregue = GREATEST(quantidade_entregue - p_quantidade, 0),
           status = CASE WHEN GREATEST(quantidade_entregue - p_quantidade, 0) = 0
                         THEN 'RESERVADA'
                         WHEN GREATEST(quantidade_entregue - p_quantidade, 0) < quantidade_reservada
                         THEN 'PARCIAL' ELSE status END,
           updated_at = now()
     WHERE id = v_m.reserva_id;
  END IF;

  -- Custo realizado: insere estorno (valor negativo)
  INSERT INTO public.os_custos_realizados(
    os_id, categoria, valor, data_custo, descricao,
    origem_tipo, origem_id, created_by
  ) VALUES (
    v_m.os_id, 'MATERIAL', -v_total, CURRENT_DATE,
    'Devolução: ' || p_motivo,
    'ESTOQUE_DEVOLUCAO', v_new_mov, v_uid
  );

  INSERT INTO public.os_eventos(os_id, tipo, payload, user_id)
  VALUES (v_m.os_id, 'MATERIAL_DEVOLVIDO',
          jsonb_build_object('movimento_origem', p_movimento_id, 'movimento_devolucao', v_new_mov, 'qtd', p_quantidade, 'motivo', p_motivo),
          v_uid);

  RETURN v_new_mov;
END $$;
REVOKE ALL ON FUNCTION public.rpc_os_devolver_material(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_devolver_material(uuid,numeric,text) TO authenticated;

-- 7) RPC: cancelar reserva (sem baixa)
CREATE OR REPLACE FUNCTION public.rpc_os_cancelar_reserva(
  p_reserva_id uuid,
  p_motivo text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_r record; v_uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_uid,'admin'::app_role)
     AND NOT EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id=v_uid AND permission='os.material.reservar') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 chars)' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_r FROM public.estoque_reservas WHERE id=p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada' USING ERRCODE='P0002'; END IF;
  IF v_r.status NOT IN ('RESERVADA','PARCIAL') THEN
    RAISE EXCEPTION 'Reserva não pode ser cancelada no status %', v_r.status USING ERRCODE='22023';
  END IF;
  UPDATE public.estoque_reservas
    SET status='CANCELADA', cancelada_em=now(), motivo_cancelamento=p_motivo, updated_at=now()
    WHERE id=p_reserva_id;
  IF v_r.os_id IS NOT NULL THEN
    INSERT INTO public.os_eventos(os_id, tipo, payload, user_id)
    VALUES (v_r.os_id, 'MATERIAL_RESERVA_CANCELADA',
            jsonb_build_object('reserva_id', v_r.id, 'motivo', p_motivo), v_uid);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.rpc_os_cancelar_reserva(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_os_cancelar_reserva(uuid,text) TO authenticated;

-- 8) View resumo de material por O.S.
CREATE OR REPLACE VIEW public.v_os_material_resumo
WITH (security_invoker=on) AS
SELECT
  o.id AS os_id,
  o.codigo AS os_codigo,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status<>'CANCELADA') AS reservas_ativas,
  COALESCE(SUM(r.quantidade_reservada) FILTER (WHERE r.status<>'CANCELADA'), 0) AS qtd_reservada_total,
  COALESCE(SUM(r.quantidade_entregue) FILTER (WHERE r.status<>'CANCELADA'), 0) AS qtd_entregue_total,
  COALESCE(SUM(m.custo_total) FILTER (WHERE m.tipo='SAIDA' AND m.origem_tipo='OS_BAIXA'), 0) AS custo_baixado,
  COALESCE(SUM(m.custo_total) FILTER (WHERE m.tipo='ENTRADA' AND m.origem_tipo='OS_DEVOLUCAO'), 0) AS custo_devolvido,
  COALESCE(SUM(m.custo_total) FILTER (WHERE m.tipo='SAIDA' AND m.origem_tipo='OS_BAIXA'), 0)
    - COALESCE(SUM(m.custo_total) FILTER (WHERE m.tipo='ENTRADA' AND m.origem_tipo='OS_DEVOLUCAO'), 0) AS custo_realizado_estoque_liquido
FROM public.os_ordens o
LEFT JOIN public.estoque_reservas r ON r.os_id = o.id
LEFT JOIN public.estoque_movimentos m ON m.os_id = o.id
GROUP BY o.id, o.codigo;

GRANT SELECT ON public.v_os_material_resumo TO authenticated;