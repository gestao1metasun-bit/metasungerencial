
CREATE OR REPLACE VIEW public.materiais_reservados_por_obra
WITH (security_invoker=on) AS
SELECT
  r.obra_id, r.produto_id, p.codigo, p.nome, p.unidade, p.custo_unitario,
  SUM(r.quantidade_reservada)::numeric AS qtd_reservada,
  SUM(r.quantidade_entregue)::numeric  AS qtd_entregue,
  GREATEST(SUM(r.quantidade_reservada) - SUM(r.quantidade_entregue), 0)::numeric AS qtd_pendente,
  SUM(r.quantidade_reservada * p.custo_unitario)::numeric AS custo_estimado
FROM public.estoque_reservas r
JOIN public.produtos p ON p.id = r.produto_id
WHERE r.obra_id IS NOT NULL
  AND r.status IN ('ATIVA','PARCIAL','ATENDIDA')
GROUP BY r.obra_id, r.produto_id, p.codigo, p.nome, p.unidade, p.custo_unitario;

CREATE OR REPLACE VIEW public.materiais_entregues_por_obra
WITH (security_invoker=on) AS
SELECT
  r.obra_id, r.produto_id, p.codigo, p.nome, p.unidade, p.custo_unitario,
  SUM(e.quantidade)::numeric AS qtd_entregue,
  SUM(e.quantidade * p.custo_unitario)::numeric AS custo_entregue
FROM public.estoque_entregas e
JOIN public.estoque_reservas r ON r.id = e.reserva_id
JOIN public.produtos p ON p.id = e.produto_id
WHERE r.obra_id IS NOT NULL
  AND e.status = 'BAIXADA'
GROUP BY r.obra_id, r.produto_id, p.codigo, p.nome, p.unidade, p.custo_unitario;

CREATE OR REPLACE VIEW public.materiais_pendentes_por_obra
WITH (security_invoker=on) AS
SELECT
  r.obra_id, r.produto_id, p.codigo, p.nome, p.unidade, p.custo_unitario,
  (SUM(r.quantidade_reservada) - SUM(r.quantidade_entregue))::numeric AS qtd_pendente,
  ((SUM(r.quantidade_reservada) - SUM(r.quantidade_entregue)) * p.custo_unitario)::numeric AS custo_pendente
FROM public.estoque_reservas r
JOIN public.produtos p ON p.id = r.produto_id
WHERE r.obra_id IS NOT NULL
  AND r.status IN ('ATIVA','PARCIAL')
GROUP BY r.obra_id, r.produto_id, p.codigo, p.nome, p.unidade, p.custo_unitario
HAVING (SUM(r.quantidade_reservada) - SUM(r.quantidade_entregue)) > 0;

CREATE OR REPLACE VIEW public.v_status_material_obra
WITH (security_invoker=on) AS
WITH agg AS (
  SELECT
    o.id AS obra_id,
    COALESCE(SUM(r.quantidade_reservada), 0)::numeric AS total_reservado,
    COALESCE(SUM(r.quantidade_entregue), 0)::numeric  AS total_entregue,
    COUNT(r.id) FILTER (WHERE r.status IN ('ATIVA','PARCIAL','ATENDIDA')) AS qtd_reservas
  FROM public.obras o
  LEFT JOIN public.estoque_reservas r
    ON r.obra_id = o.id AND r.status IN ('ATIVA','PARCIAL','ATENDIDA')
  GROUP BY o.id
)
SELECT obra_id, total_reservado, total_entregue,
  GREATEST(total_reservado - total_entregue, 0) AS total_pendente,
  qtd_reservas,
  CASE
    WHEN qtd_reservas = 0 THEN 'SEM_RESERVA'
    WHEN total_entregue = 0 THEN 'RESERVA_COMPLETA'
    WHEN total_entregue > 0 AND total_entregue < total_reservado THEN 'ENTREGA_PARCIAL'
    WHEN total_entregue >= total_reservado AND total_reservado > 0 THEN 'ENTREGA_COMPLETA'
    ELSE 'PENDENTE_MATERIAL'
  END AS status_material
FROM agg;

GRANT SELECT ON public.materiais_reservados_por_obra, public.materiais_entregues_por_obra, public.materiais_pendentes_por_obra, public.v_status_material_obra TO authenticated;
GRANT ALL ON public.materiais_reservados_por_obra, public.materiais_entregues_por_obra, public.materiais_pendentes_por_obra, public.v_status_material_obra TO service_role;
