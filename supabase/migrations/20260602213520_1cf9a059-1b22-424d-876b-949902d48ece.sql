-- D24 — Auditoria Enterprise Unificada
-- View consolidada read-only sobre fontes auditáveis já existentes.
-- security_invoker=on → respeita RLS de cada tabela origem. Sem motor novo.

CREATE OR REPLACE VIEW public.v_auditoria_unificada
WITH (security_invoker = on)
AS
-- 1) audit_log (universal)
SELECT
  ('audit:'||a.id::text)            AS id,
  a.modulo                          AS modulo,
  a.entidade                        AS entidade_tipo,
  a.entidade_id::text               AS entidade_id,
  a.acao                            AS acao,
  a.user_id                         AS usuario_id,
  a.user_email                      AS usuario_email,
  a.created_at                      AS data_hora,
  'audit_log'::text                 AS origem,
  a.valor_anterior                  AS antes,
  a.valor_novo                      AS depois,
  a.motivo                          AS observacao,
  jsonb_build_object('campo', a.campo, 'ip', a.ip) AS payload,
  CASE
    WHEN a.acao ILIKE '%EXCLU%' OR a.acao ILIKE '%DELET%' OR a.acao ILIKE '%CANCEL%' THEN 'CRITICA'
    WHEN a.acao ILIKE '%APROV%' OR a.acao ILIKE '%REPROV%' OR a.acao ILIKE '%ESTORN%' OR a.acao ILIKE '%LIBER%' THEN 'ALTA'
    WHEN a.acao ILIKE '%UPDATE%' OR a.acao ILIKE '%EDIT%' THEN 'NORMAL'
    ELSE 'BAIXA'
  END                               AS criticidade,
  ('audit:'||a.entidade||':'||a.entidade_id::text) AS link_origem
FROM public.audit_log a

UNION ALL
-- 2) workflow_aprovacoes_historico
SELECT
  ('wfh:'||h.id::text),
  'aprovacoes',
  'workflow_aprovacao',
  h.aprovacao_id::text,
  COALESCE(h.status_novo::text, 'TRANSICAO'),
  h.user_id, h.user_email,
  h.created_at,
  'workflow_aprovacoes_historico',
  CASE WHEN h.status_anterior IS NULL THEN NULL ELSE jsonb_build_object('status', h.status_anterior) END,
  jsonb_build_object('status', h.status_novo),
  h.motivo,
  COALESCE(h.snapshot, '{}'::jsonb),
  CASE
    WHEN h.status_novo::text IN ('APROVADA','NEGADA','CANCELADA') THEN 'CRITICA'
    ELSE 'ALTA'
  END,
  ('workflow:'||h.aprovacao_id::text)
FROM public.workflow_aprovacoes_historico h

UNION ALL
-- 3) suprimentos_requisicao_eventos
SELECT
  ('sup-req-ev:'||e.id::text),
  'suprimentos','requisicao',e.requisicao_id::text,
  e.tipo_evento, e.usuario_id, NULL,
  e.data_hora, 'suprimentos_requisicao_eventos',
  CASE WHEN e.status_anterior IS NULL THEN NULL ELSE jsonb_build_object('status', e.status_anterior) END,
  CASE WHEN e.status_novo IS NULL THEN NULL ELSE jsonb_build_object('status', e.status_novo) END,
  e.observacao, COALESCE(e.payload,'{}'::jsonb),
  CASE WHEN e.tipo_evento ILIKE '%CANCEL%' OR e.tipo_evento ILIKE '%REPROV%' THEN 'CRITICA'
       WHEN e.tipo_evento ILIKE '%APROV%' OR e.tipo_evento ILIKE '%ATEND%' OR e.tipo_evento ILIKE '%RESERV%' THEN 'ALTA'
       ELSE 'NORMAL' END,
  ('suprimentos:requisicao:'||e.requisicao_id::text)
FROM public.suprimentos_requisicao_eventos e

UNION ALL
-- 4) suprimentos_pedido_eventos
SELECT
  ('sup-ped-ev:'||e.id::text),
  'suprimentos','pedido_compra',e.pedido_id::text,
  e.tipo_evento, e.usuario_id, NULL,
  e.data_hora, 'suprimentos_pedido_eventos',
  NULL, COALESCE(e.payload,'{}'::jsonb), e.observacao, COALESCE(e.payload,'{}'::jsonb),
  CASE WHEN e.tipo_evento ILIKE '%CANCEL%' OR e.tipo_evento ILIKE '%TITULO_AP%' THEN 'CRITICA'
       WHEN e.tipo_evento ILIKE '%APROV%' OR e.tipo_evento ILIKE '%ENVIO%' OR e.tipo_evento ILIKE '%BLOQ%' THEN 'ALTA'
       ELSE 'NORMAL' END,
  ('suprimentos:pedido:'||e.pedido_id::text)
FROM public.suprimentos_pedido_eventos e

UNION ALL
-- 5) suprimentos_cotacao_eventos
SELECT
  ('sup-cot-ev:'||e.id::text),
  'suprimentos','cotacao',e.cotacao_id::text,
  e.tipo_evento, e.usuario_id, NULL,
  e.data_hora, 'suprimentos_cotacao_eventos',
  NULL, COALESCE(e.payload,'{}'::jsonb), e.observacao, COALESCE(e.payload,'{}'::jsonb),
  CASE WHEN e.tipo_evento ILIKE '%CANCEL%' OR e.tipo_evento ILIKE '%REPROV%' THEN 'CRITICA'
       WHEN e.tipo_evento ILIKE '%APROV%' THEN 'ALTA' ELSE 'NORMAL' END,
  ('suprimentos:cotacao:'||e.cotacao_id::text)
FROM public.suprimentos_cotacao_eventos e

UNION ALL
-- 6) suprimentos_recebimento_eventos
SELECT
  ('sup-rec-ev:'||e.id::text),
  'suprimentos','recebimento',e.recebimento_id::text,
  e.tipo_evento, e.usuario_id, NULL,
  e.data_hora, 'suprimentos_recebimento_eventos',
  NULL, COALESCE(e.payload,'{}'::jsonb), e.observacao, COALESCE(e.payload,'{}'::jsonb),
  CASE WHEN e.tipo_evento ILIKE '%CANCEL%' THEN 'CRITICA'
       WHEN e.tipo_evento ILIKE '%CONFIRM%' THEN 'ALTA' ELSE 'NORMAL' END,
  ('suprimentos:recebimento:'||e.recebimento_id::text)
FROM public.suprimentos_recebimento_eventos e

UNION ALL
-- 7) os_eventos
SELECT
  ('os-ev:'||e.id::text),
  'os','ordem_servico',e.os_id::text,
  e.tipo, e.ator_id, NULL,
  e.created_at, 'os_eventos',
  NULL, COALESCE(e.payload,'{}'::jsonb), e.descricao,
  COALESCE(e.payload,'{}'::jsonb)
    || jsonb_build_object('tarefa_id', e.tarefa_id),
  CASE WHEN e.tipo ILIKE '%CANCEL%' OR e.tipo ILIKE '%EXCLU%' THEN 'CRITICA'
       WHEN e.tipo ILIKE '%APROV%' OR e.tipo ILIKE '%DEVOL%' OR e.tipo ILIKE '%BAIX%' OR e.tipo ILIKE '%RESERV%' THEN 'ALTA'
       ELSE 'NORMAL' END,
  ('os:'||e.os_id::text)
FROM public.os_eventos e

UNION ALL
-- 8) comercial_assinatura_eventos
SELECT
  ('com-assin-ev:'||e.id::text),
  'comercial','contrato',e.contrato_id::text,
  'ASSINATURA', e.assinado_por, NULL,
  e.assinado_em, 'comercial_assinatura_eventos',
  NULL,
  jsonb_build_object(
    'permissao_usada', e.permissao_usada,
    'dispatched_eng', e.dispatched_eng,
    'dispatched_fin', e.dispatched_fin
  ),
  e.observacao,
  COALESCE(e.metadata,'{}'::jsonb)
    || jsonb_build_object('ip_origem', e.ip_origem, 'hash_evento', e.hash_evento),
  'CRITICA',
  ('comercial:contrato:'||e.contrato_id::text)
FROM public.comercial_assinatura_eventos e

UNION ALL
-- 9) comercial_comissao_eventos
SELECT
  ('com-comis-ev:'||e.id::text),
  'comercial','comissao',e.comissao_id::text,
  e.acao, e.usuario_id, NULL,
  e.created_at, 'comercial_comissao_eventos',
  jsonb_build_object(
    'status', e.status_anterior,
    'valor', e.valor_anterior,
    'percentual', e.percentual_anterior
  ),
  jsonb_build_object(
    'status', e.status_novo,
    'valor', e.valor_novo,
    'percentual', e.percentual_novo
  ),
  e.motivo,
  COALESCE(e.metadata,'{}'::jsonb)
    || jsonb_build_object('permissao_usada', e.permissao_usada),
  CASE WHEN e.acao IN ('CANCELADA','ESTORNADA','MARCADA_PAGA') THEN 'CRITICA'
       WHEN e.acao IN ('LIBERADA','PERCENTUAL_ALTERADO','REABERTA') THEN 'ALTA'
       ELSE 'NORMAL' END,
  ('comercial:comissao:'||e.comissao_id::text)
FROM public.comercial_comissao_eventos e

UNION ALL
-- 10) operacoes_financeiras_eventos
SELECT
  ('opfin-ev:'||e.id::text),
  'financeiro','operacao_financeira',e.operacao_id::text,
  e.evento, e.ator, NULL,
  e.criado_em, 'operacoes_financeiras_eventos',
  NULL, COALESCE(e.detalhes,'{}'::jsonb), e.motivo, COALESCE(e.detalhes,'{}'::jsonb),
  CASE WHEN e.evento IN ('CANCELADA','ESTORNADA','RENEGOCIADA') THEN 'CRITICA'
       WHEN e.evento IN ('APROVADA','LIBERADA','QUITADA','BAIXA_PARCIAL') THEN 'ALTA'
       ELSE 'NORMAL' END,
  ('financeiro:op:'||e.operacao_id::text)
FROM public.operacoes_financeiras_eventos e

UNION ALL
-- 11) notificacoes ALTA/CRITICA (visão auditável)
SELECT
  ('notif:'||n.id::text),
  COALESCE(n.modulo,'sistema'),
  COALESCE(n.origem_tipo,'notificacao'),
  COALESCE(n.origem_id::text, n.id::text),
  COALESCE(n.tipo,'NOTIFICACAO'),
  n.usuario_destino_id, NULL,
  n.criada_em, 'notificacoes',
  NULL,
  jsonb_build_object('titulo', n.titulo, 'mensagem', n.mensagem),
  n.mensagem,
  COALESCE(n.payload,'{}'::jsonb)
    || jsonb_build_object('prioridade', n.prioridade, 'status', n.status),
  CASE n.prioridade
    WHEN 'CRITICA' THEN 'CRITICA'
    WHEN 'ALTA'    THEN 'ALTA'
    WHEN 'NORMAL'  THEN 'NORMAL'
    ELSE 'BAIXA'
  END,
  COALESCE(n.link_origem, ('notificacao:'||n.id::text))
FROM public.notificacoes n
WHERE n.prioridade IN ('ALTA','CRITICA');

COMMENT ON VIEW public.v_auditoria_unificada IS
'D24 — Auditoria unificada (read-only, security_invoker). Consolida audit_log, workflow_aprovacoes_historico e *_eventos de OS/Suprimentos/Comercial/Financeiro + notificações ALTA/CRITICA. Sem motor novo, sem gravação.';

REVOKE ALL ON public.v_auditoria_unificada FROM PUBLIC, anon;
GRANT SELECT ON public.v_auditoria_unificada TO authenticated;