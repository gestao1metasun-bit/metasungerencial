
ALTER TABLE public.estoque_reservas
  DROP CONSTRAINT IF EXISTS er_origem_obrigatoria;
ALTER TABLE public.estoque_reservas
  ADD CONSTRAINT er_origem_obrigatoria
  CHECK (obra_id IS NOT NULL OR pv_id IS NOT NULL OR projeto_id IS NOT NULL);

ALTER TABLE public.estoque_movimentos
  DROP CONSTRAINT IF EXISTS em_origem_obrigatoria;
ALTER TABLE public.estoque_movimentos
  ADD CONSTRAINT em_origem_obrigatoria
  CHECK (
    obra_id IS NOT NULL
    OR pv_id IS NOT NULL
    OR projeto_id IS NOT NULL
    OR reserva_id IS NOT NULL
    OR entrega_id IS NOT NULL
    OR origem_tipo IN ('ajuste_manual','ajuste_pos','ajuste_neg','estoque_inicial','entrada_inicial','compra','reserva_obra','entrega','baixa_entrega')
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.tg_em_valida_origem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.origem_tipo IN ('ajuste_manual','ajuste_pos','ajuste_neg')
     AND (NEW.motivo IS NULL OR length(trim(NEW.motivo)) < 3) THEN
    RAISE EXCEPTION 'Ajuste manual de estoque exige motivo (>= 3 chars).' USING ERRCODE='22023';
  END IF;
  IF NEW.tipo IN ('entrega','baixa_entrega') AND NEW.reserva_id IS NULL THEN
    RAISE EXCEPTION 'Movimento % exige reserva_id vinculada.', NEW.tipo USING ERRCODE='22023';
  END IF;
  IF NEW.tipo = 'reserva' AND NEW.obra_id IS NULL AND NEW.pv_id IS NULL AND NEW.projeto_id IS NULL THEN
    RAISE EXCEPTION 'Reserva exige obra/pv/projeto.' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_em_valida_origem ON public.estoque_movimentos;
CREATE TRIGGER tg_em_valida_origem
  BEFORE INSERT ON public.estoque_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_em_valida_origem();

DROP VIEW IF EXISTS public.v_origem_financeira_completa CASCADE;
CREATE VIEW public.v_origem_financeira_completa
WITH (security_invoker=on) AS
SELECT
  t.id AS titulo_id, t.codigo AS titulo_codigo, t.tipo AS titulo_tipo,
  t.status AS titulo_status, t.valor_liquido, t.saldo,
  t.origem_tipo, t.origem_id,
  t.contrato_id, c.codigo AS contrato_codigo,
  pv.id AS pv_id, pv.codigo AS pv_codigo,
  pv.projeto_contrato_id, pv.obra_id, o.codigo AS obra_codigo,
  t.cliente_id, cli.nome AS cliente_nome,
  t.consultor_id, t.created_at
FROM public.titulos_financeiros t
LEFT JOIN public.pedidos_venda pv ON t.origem_tipo='pedido_venda' AND pv.id = t.origem_id
LEFT JOIN public.contratos c ON c.id = COALESCE(t.contrato_id, pv.contrato_id)
LEFT JOIN public.obras o ON o.id = pv.obra_id
LEFT JOIN public.clientes cli ON cli.id = t.cliente_id
WHERE t.deleted_at IS NULL;

GRANT SELECT ON public.v_origem_financeira_completa TO authenticated;
GRANT ALL ON public.v_origem_financeira_completa TO service_role;

DROP VIEW IF EXISTS public.v_origem_estoque_completa CASCADE;
CREATE VIEW public.v_origem_estoque_completa
WITH (security_invoker=on) AS
SELECT
  m.id AS movimento_id, m.tipo AS movimento_tipo, m.origem_tipo,
  m.quantidade, m.custo_total, m.created_at,
  p.id AS produto_id, p.codigo AS produto_codigo, p.nome AS produto_nome,
  m.reserva_id, r.status AS reserva_status,
  m.entrega_id, e.status AS entrega_status,
  COALESCE(m.obra_id, r.obra_id) AS obra_id, o.codigo AS obra_codigo,
  COALESCE(m.pv_id, r.pv_id) AS pv_id, pv.codigo AS pv_codigo,
  COALESCE(m.projeto_id, r.projeto_id) AS projeto_id,
  m.user_id, m.user_email, m.motivo
FROM public.estoque_movimentos m
LEFT JOIN public.produtos p ON p.id = m.produto_id
LEFT JOIN public.estoque_reservas r ON r.id = m.reserva_id
LEFT JOIN public.estoque_entregas e ON e.id = m.entrega_id
LEFT JOIN public.obras o ON o.id = COALESCE(m.obra_id, r.obra_id)
LEFT JOIN public.pedidos_venda pv ON pv.id = COALESCE(m.pv_id, r.pv_id);

GRANT SELECT ON public.v_origem_estoque_completa TO authenticated;
GRANT ALL ON public.v_origem_estoque_completa TO service_role;

DROP VIEW IF EXISTS public.v_origem_obra_completa CASCADE;
CREATE VIEW public.v_origem_obra_completa
WITH (security_invoker=on) AS
SELECT
  o.id AS obra_id, o.codigo AS obra_codigo, o.status AS obra_status,
  o.custo_previsto, o.contrato_id, c.codigo AS contrato_codigo, c.valor_total AS contrato_valor,
  (o.dados->>'projeto_contrato_id')::uuid AS projeto_contrato_id,
  pc.descricao AS projeto_descricao,
  pv.id AS pv_id, pv.codigo AS pv_codigo, pv.status AS pv_status,
  o.cliente_id, cli.nome AS cliente_nome,
  o.consultor_id, prof.nome AS consultor_nome, o.created_at
FROM public.obras o
LEFT JOIN public.contratos c ON c.id = o.contrato_id
LEFT JOIN public.projetos_contrato pc ON pc.id = (o.dados->>'projeto_contrato_id')::uuid
LEFT JOIN public.pedidos_venda pv ON pv.obra_id = o.id AND pv.deleted_at IS NULL
LEFT JOIN public.clientes cli ON cli.id = o.cliente_id
LEFT JOIN public.profiles prof ON prof.user_id = o.consultor_id
WHERE o.deleted_at IS NULL;

GRANT SELECT ON public.v_origem_obra_completa TO authenticated;
GRANT ALL ON public.v_origem_obra_completa TO service_role;

DROP VIEW IF EXISTS public.v_rastreabilidade_operacional CASCADE;
CREATE VIEW public.v_rastreabilidade_operacional
WITH (security_invoker=on) AS
SELECT
  o.id AS obra_id, o.codigo AS obra_codigo, o.status AS obra_status,
  o.contrato_id, c.codigo AS contrato_codigo,
  (o.dados->>'projeto_contrato_id')::uuid AS projeto_id,
  (SELECT count(*) FROM public.pedidos_venda pv WHERE pv.obra_id = o.id AND pv.deleted_at IS NULL) AS qtd_pvs,
  (SELECT count(*) FROM public.estoque_reservas r WHERE r.obra_id = o.id) AS qtd_reservas,
  (SELECT count(*) FROM public.estoque_entregas e JOIN public.estoque_reservas r ON r.id=e.reserva_id WHERE r.obra_id = o.id) AS qtd_entregas,
  (SELECT count(*) FROM public.titulos_financeiros t
     WHERE t.deleted_at IS NULL AND (
       (t.origem_tipo='pedido_venda' AND t.origem_id IN (SELECT id FROM public.pedidos_venda WHERE obra_id=o.id))
       OR t.contrato_id = o.contrato_id
     )) AS qtd_titulos,
  o.custo_previsto,
  COALESCE((SELECT custo_realizado FROM public.v_saldo_operacional_obra WHERE obra_id=o.id), 0) AS custo_realizado
FROM public.obras o
LEFT JOIN public.contratos c ON c.id = o.contrato_id
WHERE o.deleted_at IS NULL;

GRANT SELECT ON public.v_rastreabilidade_operacional TO authenticated;
GRANT ALL ON public.v_rastreabilidade_operacional TO service_role;
