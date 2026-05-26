
-- D10.6: Painéis de Pendências Estoque

-- 1) Estoque baixo (saldo disponível < mínimo)
CREATE OR REPLACE VIEW public.v_pend_estoque_baixo AS
SELECT
  p.id AS produto_id,
  p.codigo,
  p.nome,
  p.unidade,
  p.estoque_minimo,
  s.saldo_fisico,
  s.saldo_reservado,
  (s.saldo_fisico - s.saldo_reservado) AS saldo_disponivel,
  GREATEST(p.estoque_minimo - (s.saldo_fisico - s.saldo_reservado), 0) AS deficit
FROM public.produtos p
JOIN public.v_estoque_saldos s ON s.produto_id = p.id
WHERE p.ativo = true
  AND p.deleted_at IS NULL
  AND p.estoque_minimo > 0
  AND (s.saldo_fisico - s.saldo_reservado) < p.estoque_minimo;

-- 2) Reservas atrasadas (>7 dias e entrega incompleta)
CREATE OR REPLACE VIEW public.v_pend_reservas_atrasadas AS
SELECT
  r.id AS reserva_id,
  r.produto_id,
  p.codigo AS produto_codigo,
  p.nome AS produto_nome,
  r.obra_id,
  r.pv_id,
  r.quantidade_reservada,
  r.quantidade_entregue,
  (r.quantidade_reservada - r.quantidade_entregue) AS quantidade_pendente,
  r.status,
  r.created_at,
  EXTRACT(DAY FROM now() - r.created_at)::int AS dias_aberta
FROM public.estoque_reservas r
JOIN public.produtos p ON p.id = r.produto_id
WHERE r.status IN ('ATIVA', 'PARCIAL')
  AND r.quantidade_entregue < r.quantidade_reservada
  AND r.created_at < now() - interval '7 days';

-- 3) Entregas pendentes (>3 dias)
CREATE OR REPLACE VIEW public.v_pend_entregas_pendentes AS
SELECT
  e.id AS entrega_id,
  e.reserva_id,
  e.produto_id,
  p.codigo AS produto_codigo,
  p.nome AS produto_nome,
  e.quantidade,
  e.status,
  e.created_at,
  EXTRACT(DAY FROM now() - e.created_at)::int AS dias_pendente
FROM public.estoque_entregas e
JOIN public.produtos p ON p.id = e.produto_id
WHERE e.status = 'PENDENTE'
  AND e.created_at < now() - interval '3 days';

-- 4) Ordens de compra atrasadas (aprovadas + prazo vencido)
CREATE OR REPLACE VIEW public.v_pend_oc_atrasada AS
SELECT
  o.id AS ordem_id,
  o.codigo,
  o.fornecedor_nome,
  o.status,
  o.valor_total,
  o.aprovado_em,
  o.prazo_entrega_dias,
  (o.aprovado_em + (COALESCE(o.prazo_entrega_dias, 0) || ' days')::interval)::date AS data_prevista,
  EXTRACT(DAY FROM now() - (o.aprovado_em + (COALESCE(o.prazo_entrega_dias, 0) || ' days')::interval))::int AS dias_atraso
FROM public.ordens_compra o
WHERE o.status = 'APROVADA'
  AND o.aprovado_em IS NOT NULL
  AND o.prazo_entrega_dias IS NOT NULL
  AND (o.aprovado_em + (o.prazo_entrega_dias || ' days')::interval) < now();

-- 5) Material parado (saldo > 0, sem movimento há 90+ dias)
CREATE OR REPLACE VIEW public.v_pend_material_parado AS
SELECT
  p.id AS produto_id,
  p.codigo,
  p.nome,
  p.unidade,
  p.custo_unitario,
  s.saldo_fisico,
  (s.saldo_fisico * p.custo_unitario) AS valor_parado,
  (SELECT MAX(em.created_at) FROM public.estoque_movimentos em WHERE em.produto_id = p.id) AS ultimo_movimento,
  EXTRACT(DAY FROM now() - COALESCE(
    (SELECT MAX(em.created_at) FROM public.estoque_movimentos em WHERE em.produto_id = p.id),
    p.created_at
  ))::int AS dias_parado
FROM public.produtos p
JOIN public.v_estoque_saldos s ON s.produto_id = p.id
WHERE p.ativo = true
  AND p.deleted_at IS NULL
  AND s.saldo_fisico > 0
  AND COALESCE(
    (SELECT MAX(em.created_at) FROM public.estoque_movimentos em WHERE em.produto_id = p.id),
    p.created_at
  ) < now() - interval '90 days';

-- 6) Obras ativas sem reserva
CREATE OR REPLACE VIEW public.v_pend_obra_sem_reserva AS
SELECT
  o.id AS obra_id,
  o.codigo,
  o.cliente_id,
  o.consultor_id,
  o.status,
  o.data_inicio,
  o.created_at,
  EXTRACT(DAY FROM now() - o.created_at)::int AS dias_desde_criacao
FROM public.obras o
WHERE o.deleted_at IS NULL
  AND o.status NOT IN ('Finalizada', 'Cancelada', 'Concluida', 'Concluída')
  AND NOT EXISTS (
    SELECT 1 FROM public.estoque_reservas r
    WHERE r.obra_id = o.id AND r.status IN ('ATIVA', 'PARCIAL')
  );

-- 7) Resumo agregado
CREATE OR REPLACE VIEW public.v_estoque_pendencias_resumo AS
SELECT
  (SELECT count(*) FROM public.v_pend_estoque_baixo) AS estoque_baixo,
  (SELECT count(*) FROM public.v_pend_reservas_atrasadas) AS reservas_atrasadas,
  (SELECT count(*) FROM public.v_pend_entregas_pendentes) AS entregas_pendentes,
  (SELECT count(*) FROM public.v_pend_oc_atrasada) AS oc_atrasada,
  (SELECT count(*) FROM public.v_pend_material_parado) AS material_parado,
  (SELECT COALESCE(SUM(valor_parado), 0) FROM public.v_pend_material_parado) AS valor_parado_total,
  (SELECT count(*) FROM public.v_pend_obra_sem_reserva) AS obra_sem_reserva;

-- Permissões
GRANT SELECT ON public.v_pend_estoque_baixo TO authenticated;
GRANT SELECT ON public.v_pend_reservas_atrasadas TO authenticated;
GRANT SELECT ON public.v_pend_entregas_pendentes TO authenticated;
GRANT SELECT ON public.v_pend_oc_atrasada TO authenticated;
GRANT SELECT ON public.v_pend_material_parado TO authenticated;
GRANT SELECT ON public.v_pend_obra_sem_reserva TO authenticated;
GRANT SELECT ON public.v_estoque_pendencias_resumo TO authenticated;
