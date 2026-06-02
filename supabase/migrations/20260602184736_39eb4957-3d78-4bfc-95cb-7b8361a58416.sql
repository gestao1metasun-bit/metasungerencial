-- D20.SUP.7 (4/4 corrigido) — Views de Dashboard + Alertas, com os valores reais dos enums.

CREATE OR REPLACE VIEW public.v_suprimentos_dashboard_kpis
WITH (security_invoker = on) AS
WITH req AS (
  SELECT
    COUNT(*) FILTER (WHERE status IN ('RASCUNHO','ENVIADA','EM_APROVACAO','RETORNADA',
                                       'AGUARDANDO_ESTOQUE','EM_SEPARACAO','AGUARDANDO_COMPRA','EM_COMPRA')) AS abertas,
    COUNT(*) FILTER (WHERE status = 'APROVADA') AS aprovadas,
    COUNT(*) FILTER (WHERE status IN ('REPROVADA','CANCELADA')) AS rejeitadas,
    COUNT(*) FILTER (WHERE data_necessidade IS NOT NULL AND data_necessidade < CURRENT_DATE
                       AND status NOT IN ('ATENDIDA','CANCELADA','REPROVADA')) AS atrasadas,
    COALESCE(SUM(valor_aprovado) FILTER (WHERE status = 'APROVADA'),0) AS valor_aprovado
  FROM public.suprimentos_requisicoes
), itens AS (
  SELECT COALESCE(SUM(i.quantidade_solicitada * COALESCE(i.valor_estimado_unitario,0)),0) AS valor_solicitado
    FROM public.suprimentos_requisicao_itens i
    JOIN public.suprimentos_requisicoes r ON r.id = i.requisicao_id
   WHERE r.status NOT IN ('CANCELADA','REPROVADA')
), ped AS (
  SELECT
    COALESCE(SUM(valor_total) FILTER (WHERE status IN ('EMITIDO','APROVADO','ENVIADO_FORNECEDOR','PARCIALMENTE_RECEBIDO')),0) AS valor_em_compra,
    COALESCE(SUM(valor_total) FILTER (WHERE status = 'RECEBIDO'),0) AS valor_recebido
  FROM public.suprimentos_pedidos_compra
  WHERE deleted_at IS NULL
), reservas AS (
  SELECT COALESCE(SUM(GREATEST(quantidade_reservada - COALESCE(quantidade_entregue,0),0)),0) AS estoque_reservado
    FROM public.estoque_reservas
   WHERE status IN ('ATIVA','PARCIAL')
)
SELECT
  req.abertas, req.aprovadas, req.rejeitadas, req.atrasadas,
  itens.valor_solicitado, req.valor_aprovado, ped.valor_em_compra, ped.valor_recebido,
  reservas.estoque_reservado,
  0::bigint AS itens_criticos
FROM req, itens, ped, reservas;

GRANT SELECT ON public.v_suprimentos_dashboard_kpis TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_dashboard_por_fornecedor
WITH (security_invoker = on) AS
SELECT p.fornecedor_id, f.nome AS fornecedor_nome,
       COUNT(*) AS pedidos, COALESCE(SUM(p.valor_total),0) AS valor_total
  FROM public.suprimentos_pedidos_compra p
  LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
 WHERE p.deleted_at IS NULL AND p.status <> 'CANCELADO'
 GROUP BY p.fornecedor_id, f.nome
 ORDER BY valor_total DESC;
GRANT SELECT ON public.v_suprimentos_dashboard_por_fornecedor TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_dashboard_por_natureza
WITH (security_invoker = on) AS
SELECT r.natureza_id, n.codigo AS natureza_codigo, n.nome AS natureza_nome,
       COUNT(DISTINCT p.id) AS pedidos, COALESCE(SUM(p.valor_total),0) AS valor_total
  FROM public.suprimentos_pedidos_compra p
  LEFT JOIN public.suprimentos_requisicoes r ON r.id = p.requisicao_id
  LEFT JOIN public.naturezas_financeiras n ON n.id = r.natureza_id
 WHERE p.deleted_at IS NULL AND p.status <> 'CANCELADO'
 GROUP BY r.natureza_id, n.codigo, n.nome
 ORDER BY valor_total DESC;
GRANT SELECT ON public.v_suprimentos_dashboard_por_natureza TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_dashboard_por_cc
WITH (security_invoker = on) AS
SELECT p.centro_custo_id, cc.codigo AS cc_codigo, cc.nome AS cc_nome,
       COUNT(*) AS pedidos, COALESCE(SUM(p.valor_total),0) AS valor_total
  FROM public.suprimentos_pedidos_compra p
  LEFT JOIN public.centros_custo cc ON cc.id = p.centro_custo_id
 WHERE p.deleted_at IS NULL AND p.status <> 'CANCELADO'
 GROUP BY p.centro_custo_id, cc.codigo, cc.nome
 ORDER BY valor_total DESC;
GRANT SELECT ON public.v_suprimentos_dashboard_por_cc TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_dashboard_por_os
WITH (security_invoker = on) AS
SELECT p.os_id, COUNT(*) AS pedidos, COALESCE(SUM(p.valor_total),0) AS valor_total
  FROM public.suprimentos_pedidos_compra p
 WHERE p.deleted_at IS NULL AND p.os_id IS NOT NULL AND p.status <> 'CANCELADO'
 GROUP BY p.os_id
 ORDER BY valor_total DESC;
GRANT SELECT ON public.v_suprimentos_dashboard_por_os TO authenticated;

CREATE OR REPLACE VIEW public.v_suprimentos_alertas
WITH (security_invoker = on) AS
SELECT 'REQ_AGUARDANDO_APROVACAO'::text AS tipo_alerta, 'REQUISICAO'::text AS entidade_tipo,
       r.id AS entidade_id, r.numero::text AS entidade_ref,
       'WARN'::text AS severidade,
       ('Requisição #' || r.numero || ' aguardando aprovação') AS mensagem,
       r.criado_em AS criado_em
  FROM public.suprimentos_requisicoes r
 WHERE r.status IN ('ENVIADA','EM_APROVACAO','RETORNADA')
UNION ALL
SELECT 'COT_SEM_FORNECEDOR','COTACAO', c.id, NULL::text, 'INFO',
       'Cotação aguardando escolha de fornecedor', c.criado_em
  FROM public.suprimentos_cotacoes c
 WHERE c.status IN ('RASCUNHO','ENVIADA','EM_ANALISE')
UNION ALL
SELECT 'PED_AGUARDANDO_APROVACAO','PEDIDO', p.id, p.numero::text, 'WARN',
       ('Pedido #' || p.numero || ' aguardando aprovação'), p.criado_em
  FROM public.suprimentos_pedidos_compra p
 WHERE p.deleted_at IS NULL AND p.status = 'EMITIDO'
UNION ALL
SELECT 'PED_SEM_CC','PEDIDO', p.id, p.numero::text, 'WARN',
       ('Pedido #' || p.numero || ' sem Centro de Custo'), p.criado_em
  FROM public.suprimentos_pedidos_compra p
 WHERE p.deleted_at IS NULL AND p.centro_custo_id IS NULL AND p.status <> 'CANCELADO'
UNION ALL
SELECT 'REQ_URGENTE','REQUISICAO', r.id, r.numero::text, 'HIGH',
       ('Requisição #' || r.numero || ' marcada como URGENTE'), r.criado_em
  FROM public.suprimentos_requisicoes r
 WHERE r.prioridade = 'URGENTE'
   AND r.status NOT IN ('ATENDIDA','CANCELADA','REPROVADA')
UNION ALL
SELECT 'REQ_ATRASADA','REQUISICAO', r.id, r.numero::text, 'HIGH',
       ('Requisição #' || r.numero || ' vencida em ' || to_char(r.data_necessidade,'DD/MM/YYYY')),
       r.criado_em
  FROM public.suprimentos_requisicoes r
 WHERE r.data_necessidade IS NOT NULL AND r.data_necessidade < CURRENT_DATE
   AND r.status NOT IN ('ATENDIDA','CANCELADA','REPROVADA')
UNION ALL
SELECT 'REC_ATRASADO','PEDIDO', p.id, p.numero::text, 'WARN',
       ('Pedido #' || p.numero || ' sem recebimento há mais de 14 dias'), p.criado_em
  FROM public.suprimentos_pedidos_compra p
 WHERE p.deleted_at IS NULL AND p.status IN ('APROVADO','ENVIADO_FORNECEDOR')
   AND p.criado_em < now() - interval '14 days'
UNION ALL
SELECT 'SVC_SEM_CONFIRMACAO','REQUISICAO', r.id, r.numero::text, 'INFO',
       ('Requisição de serviço #' || r.numero || ' aprovada sem confirmação'), r.criado_em
  FROM public.suprimentos_requisicoes r
 WHERE r.tipo = 'SERVICO' AND r.status = 'APROVADA'
   AND r.criado_em < now() - interval '7 days'
UNION ALL
SELECT CASE WHEN p.status_financeiro = 'BLOQUEADO' THEN 'PED_FIN_BLOQUEADO' ELSE 'PED_PRONTO_FINANCEIRO' END,
       'PEDIDO', p.id, p.numero::text,
       CASE WHEN p.status_financeiro = 'BLOQUEADO' THEN 'HIGH' ELSE 'INFO' END,
       CASE WHEN p.status_financeiro = 'BLOQUEADO'
            THEN ('Pedido #' || p.numero || ' bloqueado no financeiro')
            ELSE ('Pedido #' || p.numero || ' pronto para o financeiro') END,
       COALESCE(p.atualizado_em, p.criado_em)
  FROM public.suprimentos_pedidos_compra p
 WHERE p.deleted_at IS NULL
   AND p.status_financeiro IN ('PRONTO_PARA_FINANCEIRO','BLOQUEADO');

GRANT SELECT ON public.v_suprimentos_alertas TO authenticated;