
CREATE OR REPLACE VIEW public.v_aprovacoes_unificadas
WITH (security_invoker = on)
AS
SELECT
  ('wf:' || w.id::text)                                  AS chave,
  w.id                                                   AS origem_id,
  'WORKFLOW'::text                                       AS origem_modulo,
  w.tipo_operacao                                        AS origem_tipo,
  COALESCE(NULLIF(w.codigo,''), w.titulo)                AS titulo,
  w.descricao                                            AS descricao,
  w.status::text                                         AS status,
  CASE
    WHEN w.expira_em IS NOT NULL AND w.expira_em < now() THEN 'ALTA'
    WHEN w.expira_em IS NOT NULL AND w.expira_em < now() + interval '24 hours' THEN 'MEDIA'
    ELSE 'NORMAL'
  END                                                    AS prioridade,
  COALESCE(w.valor, 0)::numeric                          AS valor,
  w.solicitante_id,
  w.solicitante_email,
  w.aprovador_id                                         AS aprovador_atual_id,
  w.aprovador_email                                      AS aprovador_atual_email,
  w.alcada_id,
  w.centro_custo_id,
  NULL::uuid                                             AS centro_resultado_id,
  NULL::uuid                                             AS natureza_id,
  w.solicitado_em                                        AS data_solicitacao,
  w.expira_em                                            AS prazo_sla,
  (EXTRACT(epoch FROM (now() - w.solicitado_em))/86400)::int AS dias_pendente,
  TRUE                                                   AS acao_via_rpc,
  ('workflow:' || w.id::text)                            AS link_origem,
  jsonb_build_object('setor', w.setor, 'codigo', w.codigo, 'contexto', w.contexto) AS payload_resumo
FROM public.workflow_aprovacoes w
WHERE w.status = 'PENDENTE'

UNION ALL
SELECT
  ('req:' || r.id::text),
  r.id,
  'SUPRIMENTOS',
  'REQUISICAO',
  ('REQ #' || COALESCE(r.numero::text, r.id::text) || COALESCE(' — ' || NULLIF(r.justificativa,''), '')),
  r.justificativa,
  r.status::text,
  CASE
    WHEN r.data_necessidade IS NOT NULL AND r.data_necessidade < CURRENT_DATE THEN 'ALTA'
    WHEN r.data_necessidade IS NOT NULL AND r.data_necessidade < CURRENT_DATE + 3 THEN 'MEDIA'
    ELSE COALESCE(r.prioridade::text,'NORMAL')
  END,
  COALESCE(r.valor_estimado, (
    SELECT SUM(COALESCE(i.valor_estimado_total,0))
    FROM public.suprimentos_requisicao_itens i
    WHERE i.requisicao_id = r.id
  ), 0)::numeric,
  r.solicitante_id,
  NULL::text,
  r.aprovador_id,
  NULL::text,
  NULL::uuid,
  r.centro_custo_id,
  r.centro_resultado_id,
  r.natureza_id,
  r.criado_em,
  r.data_necessidade::timestamptz,
  (EXTRACT(epoch FROM (now() - r.criado_em))/86400)::int,
  FALSE,
  ('suprimentos:requisicao:' || r.id::text),
  jsonb_build_object('tipo', r.tipo, 'os_id', r.os_id, 'numero', r.numero)
FROM public.suprimentos_requisicoes r
WHERE r.status IN ('ENVIADA','EM_APROVACAO') AND r.deleted_at IS NULL

UNION ALL
SELECT
  ('cot:' || c.id::text),
  c.id,
  'SUPRIMENTOS',
  'COTACAO',
  ('COT #' || COALESCE(c.numero::text, c.id::text)),
  c.observacao,
  c.status::text,
  'NORMAL',
  COALESCE((
    SELECT SUM(COALESCE(ci.valor_total,0))
    FROM public.suprimentos_cotacao_itens ci
    WHERE ci.cotacao_id = c.id
  ),0)::numeric,
  c.criado_por,
  NULL::text,
  NULL::uuid,
  NULL::text,
  NULL::uuid,
  NULL::uuid,
  NULL::uuid,
  NULL::uuid,
  c.criado_em,
  NULL::timestamptz,
  (EXTRACT(epoch FROM (now() - c.criado_em))/86400)::int,
  FALSE,
  ('suprimentos:cotacao:' || c.id::text),
  jsonb_build_object('numero', c.numero, 'requisicao_id', c.requisicao_id)
FROM public.suprimentos_cotacoes c
WHERE c.status IN ('ENVIADA','EM_ANALISE') AND c.deleted_at IS NULL

UNION ALL
SELECT
  ('ped:' || p.id::text),
  p.id,
  'SUPRIMENTOS',
  'PEDIDO_COMPRA',
  ('PED #' || COALESCE(p.numero::text, p.id::text)),
  p.observacao,
  p.status::text,
  CASE WHEN COALESCE(p.valor_total,0) >= 20000 THEN 'ALTA'
       WHEN COALESCE(p.valor_total,0) >= 5000 THEN 'MEDIA'
       ELSE 'NORMAL' END,
  COALESCE(p.valor_total,0)::numeric,
  p.criado_por,
  NULL::text,
  NULL::uuid,
  NULL::text,
  NULL::uuid,
  p.centro_custo_id,
  p.centro_resultado_id,
  NULL::uuid,
  p.criado_em,
  NULL::timestamptz,
  (EXTRACT(epoch FROM (now() - p.criado_em))/86400)::int,
  FALSE,
  ('suprimentos:pedido:' || p.id::text),
  jsonb_build_object('numero', p.numero, 'fornecedor_id', p.fornecedor_id, 'cotacao_id', p.cotacao_id)
FROM public.suprimentos_pedidos_compra p
WHERE p.status = 'EMITIDO' AND p.deleted_at IS NULL;

GRANT SELECT ON public.v_aprovacoes_unificadas TO authenticated;
