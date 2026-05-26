
-- ============================================================
-- ONDA D3 — ESTOQUE FUNDAÇÃO
-- ============================================================

-- 1) PRODUTOS
CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  categoria text,
  unidade text NOT NULL DEFAULT 'UN',
  custo_unitario numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY produtos_select_auth ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY produtos_insert_admin ON public.produtos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY produtos_update_admin ON public.produtos FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY produtos_delete_admin ON public.produtos FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2) ESTOQUE_MOVIMENTOS (append-only)
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste_pos','ajuste_neg','reserva','liberacao_reserva','entrega','baixa_entrega')),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  custo_unitario numeric NOT NULL DEFAULT 0,
  custo_total numeric NOT NULL DEFAULT 0,
  obra_id uuid,
  pv_id uuid,
  projeto_id uuid,
  reserva_id uuid,
  entrega_id uuid,
  origem_tipo text,
  motivo text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_em_produto ON public.estoque_movimentos(produto_id);
CREATE INDEX idx_em_obra ON public.estoque_movimentos(obra_id);
CREATE INDEX idx_em_pv ON public.estoque_movimentos(pv_id);
CREATE INDEX idx_em_reserva ON public.estoque_movimentos(reserva_id);
CREATE INDEX idx_em_entrega ON public.estoque_movimentos(entrega_id);

GRANT SELECT, INSERT ON public.estoque_movimentos TO authenticated;
GRANT ALL ON public.estoque_movimentos TO service_role;
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY em_select_auth ON public.estoque_movimentos FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (obra_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.obras o WHERE o.id = estoque_movimentos.obra_id AND (o.consultor_id = auth.uid() OR public.is_admin(auth.uid()))))
    OR (pv_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.pedidos_venda pv WHERE pv.id = estoque_movimentos.pv_id AND pv.consultor_id = auth.uid()))
  );
CREATE POLICY em_insert_system ON public.estoque_movimentos FOR INSERT TO authenticated WITH CHECK (true);

-- bloqueio update/delete (append-only)
CREATE OR REPLACE FUNCTION public.tg_em_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Movimentos de estoque são append-only.' USING ERRCODE='42501';
END $$;

CREATE TRIGGER tg_em_block_update BEFORE UPDATE ON public.estoque_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_em_append_only();
CREATE TRIGGER tg_em_block_delete BEFORE DELETE ON public.estoque_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_em_append_only();

-- 3) ESTOQUE_RESERVAS
CREATE TABLE IF NOT EXISTS public.estoque_reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  obra_id uuid,
  pv_id uuid,
  projeto_id uuid,
  quantidade_reservada numeric NOT NULL CHECK (quantidade_reservada > 0),
  quantidade_entregue numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','PARCIAL','ATENDIDA','CANCELADA')),
  motivo text,
  observacoes text,
  created_by uuid,
  cancelada_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_reserva_origem CHECK (obra_id IS NOT NULL OR pv_id IS NOT NULL OR projeto_id IS NOT NULL)
);

CREATE UNIQUE INDEX uq_reserva_obra_produto ON public.estoque_reservas(obra_id, produto_id)
  WHERE obra_id IS NOT NULL AND status <> 'CANCELADA';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_reservas TO authenticated;
GRANT ALL ON public.estoque_reservas TO service_role;
ALTER TABLE public.estoque_reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY er_select ON public.estoque_reservas FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR (obra_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.obras o WHERE o.id = estoque_reservas.obra_id AND o.consultor_id = auth.uid()))
  OR (pv_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.pedidos_venda pv WHERE pv.id = estoque_reservas.pv_id AND pv.consultor_id = auth.uid()))
);
CREATE POLICY er_insert ON public.estoque_reservas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY er_update_admin ON public.estoque_reservas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY er_delete_admin ON public.estoque_reservas FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4) ESTOQUE_ENTREGAS
CREATE TABLE IF NOT EXISTS public.estoque_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL REFERENCES public.estoque_reservas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','BAIXADA','CANCELADA')),
  recebido_por text,
  observacoes text,
  baixado_em timestamptz,
  baixado_por uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ee_reserva ON public.estoque_entregas(reserva_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_entregas TO authenticated;
GRANT ALL ON public.estoque_entregas TO service_role;
ALTER TABLE public.estoque_entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY ee_select ON public.estoque_entregas FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.estoque_reservas r
    LEFT JOIN public.obras o ON o.id = r.obra_id
    LEFT JOIN public.pedidos_venda pv ON pv.id = r.pv_id
    WHERE r.id = estoque_entregas.reserva_id
      AND (o.consultor_id = auth.uid() OR pv.consultor_id = auth.uid()))
);
CREATE POLICY ee_insert ON public.estoque_entregas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ee_update_admin ON public.estoque_entregas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY ee_delete_admin ON public.estoque_entregas FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- timestamps
CREATE TRIGGER tg_prod_upd BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
CREATE TRIGGER tg_er_upd BEFORE UPDATE ON public.estoque_reservas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
CREATE TRIGGER tg_ee_upd BEFORE UPDATE ON public.estoque_entregas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- auditoria
CREATE TRIGGER tg_prod_audit AFTER INSERT OR UPDATE OR DELETE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('estoque','produtos');
CREATE TRIGGER tg_er_audit AFTER INSERT OR UPDATE OR DELETE ON public.estoque_reservas
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('estoque','estoque_reservas');
CREATE TRIGGER tg_ee_audit AFTER INSERT OR UPDATE OR DELETE ON public.estoque_entregas
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('estoque','estoque_entregas');
CREATE TRIGGER tg_em_audit AFTER INSERT ON public.estoque_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('estoque','estoque_movimentos');

-- snapshots (versionamento)
CREATE TRIGGER tg_prod_ver AFTER INSERT OR UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();
CREATE TRIGGER tg_er_ver AFTER INSERT OR UPDATE ON public.estoque_reservas
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();
CREATE TRIGGER tg_ee_ver AFTER INSERT OR UPDATE ON public.estoque_entregas
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

-- ============================================================
-- VIEW de saldos
-- ============================================================
CREATE OR REPLACE VIEW public.v_estoque_saldos AS
SELECT
  p.id AS produto_id,
  p.codigo,
  p.nome,
  p.unidade,
  p.custo_unitario,
  COALESCE(SUM(CASE WHEN em.tipo='entrada' THEN em.quantidade
                    WHEN em.tipo='ajuste_pos' THEN em.quantidade
                    WHEN em.tipo='baixa_entrega' THEN -em.quantidade
                    WHEN em.tipo='ajuste_neg' THEN -em.quantidade
                    WHEN em.tipo='saida' THEN -em.quantidade
                    ELSE 0 END), 0) AS saldo_fisico,
  COALESCE((SELECT SUM(r.quantidade_reservada - r.quantidade_entregue)
            FROM public.estoque_reservas r
            WHERE r.produto_id = p.id AND r.status IN ('ATIVA','PARCIAL')), 0) AS saldo_reservado
FROM public.produtos p
LEFT JOIN public.estoque_movimentos em ON em.produto_id = p.id
GROUP BY p.id;

GRANT SELECT ON public.v_estoque_saldos TO authenticated;

-- ============================================================
-- RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.reservar_material_para_obra(
  _produto_id uuid, _obra_id uuid, _quantidade numeric, _motivo text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_obra record;
  v_existing uuid;
  v_reserva_id uuid;
BEGIN
  IF _quantidade IS NULL OR _quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser positiva.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_obra FROM public.obras WHERE id=_obra_id AND deleted_at IS NULL;
  IF v_obra.id IS NULL THEN RAISE EXCEPTION 'Obra não encontrada.' USING ERRCODE='22023'; END IF;
  IF NOT (public.is_admin(v_user) OR v_obra.consultor_id = v_user) THEN
    RAISE EXCEPTION 'Sem permissão para reservar nesta obra.' USING ERRCODE='42501';
  END IF;

  -- idempotência
  SELECT id INTO v_existing FROM public.estoque_reservas
    WHERE obra_id=_obra_id AND produto_id=_produto_id AND status <> 'CANCELADA'
    LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id=v_user;

  INSERT INTO public.estoque_reservas(produto_id, obra_id, pv_id, projeto_id, quantidade_reservada, motivo, created_by)
  VALUES (_produto_id, _obra_id, NULL,
          (SELECT (dados->>'projeto_contrato_id')::uuid FROM public.obras WHERE id=_obra_id),
          _quantidade, _motivo, v_user)
  RETURNING id INTO v_reserva_id;

  INSERT INTO public.estoque_movimentos(produto_id, tipo, quantidade, obra_id, reserva_id, origem_tipo, motivo, user_id, user_email)
  VALUES (_produto_id, 'reserva', _quantidade, _obra_id, v_reserva_id, 'reserva_obra', _motivo, v_user, v_email);

  RETURN v_reserva_id;
END $$;

CREATE OR REPLACE FUNCTION public.registrar_entrega_material(
  _reserva_id uuid, _quantidade numeric, _recebido_por text DEFAULT NULL, _obs text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  r record;
  v_entrega_id uuid;
  v_pendente numeric;
BEGIN
  IF _quantidade IS NULL OR _quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser positiva.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO r FROM public.estoque_reservas WHERE id=_reserva_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada.' USING ERRCODE='22023'; END IF;
  IF r.status IN ('ATENDIDA','CANCELADA') THEN
    RAISE EXCEPTION 'Reserva em status % não aceita entrega.', r.status USING ERRCODE='22023';
  END IF;
  v_pendente := r.quantidade_reservada - r.quantidade_entregue;
  IF _quantidade > v_pendente + 0.0001 THEN
    RAISE EXCEPTION 'Quantidade (%) excede pendente (%) da reserva.', _quantidade, v_pendente USING ERRCODE='22023';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id=v_user;

  INSERT INTO public.estoque_entregas(reserva_id, produto_id, quantidade, recebido_por, observacoes, created_by)
  VALUES (_reserva_id, r.produto_id, _quantidade, _recebido_por, _obs, v_user)
  RETURNING id INTO v_entrega_id;

  UPDATE public.estoque_reservas
    SET quantidade_entregue = quantidade_entregue + _quantidade,
        status = CASE
          WHEN quantidade_entregue + _quantidade >= quantidade_reservada - 0.0001 THEN 'ATENDIDA'
          ELSE 'PARCIAL' END
    WHERE id=_reserva_id;

  INSERT INTO public.estoque_movimentos(produto_id, tipo, quantidade, obra_id, pv_id, reserva_id, entrega_id, origem_tipo, motivo, user_id, user_email)
  VALUES (r.produto_id, 'entrega', _quantidade, r.obra_id, r.pv_id, _reserva_id, v_entrega_id, 'entrega', _obs, v_user, v_email);

  RETURN v_entrega_id;
END $$;

CREATE OR REPLACE FUNCTION public.baixar_estoque_por_entrega(_entrega_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  e record;
  r record;
  v_saldo numeric;
  v_custo numeric;
BEGIN
  SELECT * INTO e FROM public.estoque_entregas WHERE id=_entrega_id FOR UPDATE;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Entrega não encontrada.' USING ERRCODE='22023'; END IF;
  IF e.status = 'BAIXADA' THEN
    RAISE EXCEPTION 'Entrega já baixada.' USING ERRCODE='22023';
  END IF;
  IF e.status = 'CANCELADA' THEN
    RAISE EXCEPTION 'Entrega cancelada não pode ser baixada.' USING ERRCODE='22023';
  END IF;

  SELECT * INTO r FROM public.estoque_reservas WHERE id=e.reserva_id;
  SELECT saldo_fisico INTO v_saldo FROM public.v_estoque_saldos WHERE produto_id=e.produto_id;
  IF v_saldo < e.quantidade - 0.0001 AND NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'Estoque insuficiente (saldo=%, baixa=%).', v_saldo, e.quantidade USING ERRCODE='22023';
  END IF;

  SELECT custo_unitario INTO v_custo FROM public.produtos WHERE id=e.produto_id;
  SELECT email INTO v_email FROM auth.users WHERE id=v_user;

  INSERT INTO public.estoque_movimentos(produto_id, tipo, quantidade, custo_unitario, custo_total,
    obra_id, pv_id, reserva_id, entrega_id, origem_tipo, user_id, user_email)
  VALUES (e.produto_id, 'baixa_entrega', e.quantidade, v_custo, v_custo * e.quantidade,
    r.obra_id, r.pv_id, r.id, e.id, 'baixa_entrega', v_user, v_email);

  UPDATE public.estoque_entregas
    SET status='BAIXADA', baixado_em=now(), baixado_por=v_user
    WHERE id=_entrega_id;
END $$;

CREATE OR REPLACE FUNCTION public.ajustar_estoque_manual_controlado(
  _produto_id uuid, _delta numeric, _motivo text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_mov_id uuid;
  v_tipo text;
BEGIN
  IF NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'Apenas administradores podem ajustar estoque manualmente.' USING ERRCODE='42501';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE='22023';
  END IF;
  IF _delta = 0 THEN
    RAISE EXCEPTION 'Delta não pode ser zero.' USING ERRCODE='22023';
  END IF;
  v_tipo := CASE WHEN _delta > 0 THEN 'ajuste_pos' ELSE 'ajuste_neg' END;
  SELECT email INTO v_email FROM auth.users WHERE id=v_user;

  INSERT INTO public.estoque_movimentos(produto_id, tipo, quantidade, motivo, origem_tipo, user_id, user_email)
  VALUES (_produto_id, v_tipo, abs(_delta), _motivo, 'ajuste_manual', v_user, v_email)
  RETURNING id INTO v_mov_id;
  RETURN v_mov_id;
END $$;
