
-- ============================================================================
-- D15.3.b — Adiantamentos: RPC de estorno + view enriquecida
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_adiantamento_estornar(
  _adiantamento_id uuid,
  _motivo text,
  _request_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _ad RECORD;
  _abatidos integer;
  _exist jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.has_permission(_uid,'financeiro.movimentar') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'motivo obrigatorio (>=5 chars)';
  END IF;
  IF _request_id IS NOT NULL THEN
    SELECT resultado INTO _exist FROM public.rpc_idempotencia WHERE request_id=_request_id;
    IF _exist IS NOT NULL THEN RETURN _exist; END IF;
  END IF;
  SELECT * INTO _ad FROM public.adiantamentos WHERE id=_adiantamento_id FOR UPDATE;
  IF _ad.id IS NULL THEN RAISE EXCEPTION 'adiantamento inexistente'; END IF;
  IF _ad.status IN ('ESTORNADO','CANCELADO') THEN
    RAISE EXCEPTION 'adiantamento ja encerrado';
  END IF;
  SELECT count(*) INTO _abatidos FROM public.adiantamento_abatimentos
    WHERE adiantamento_id = _adiantamento_id;
  IF _abatidos > 0 THEN
    RAISE EXCEPTION 'adiantamento possui abatimentos — estorne os abatimentos antes';
  END IF;
  UPDATE public.adiantamentos
     SET status='ESTORNADO',
         observacao = COALESCE(observacao,'') || E'\n[ESTORNO] ' || _motivo,
         updated_at = now()
   WHERE id=_adiantamento_id;
  PERFORM public.fn_audit_lancamento('financeiro','adiantamento',_adiantamento_id,'ESTORNAR',
    jsonb_build_object('status_anterior',_ad.status,'valor',_ad.valor), _motivo);
  _exist := jsonb_build_object('adiantamento_id',_adiantamento_id,'status','ESTORNADO');
  IF _request_id IS NOT NULL THEN
    INSERT INTO public.rpc_idempotencia(request_id,rpc_nome,user_id,resultado)
    VALUES (_request_id,'rpc_adiantamento_estornar',_uid,_exist) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _exist;
END $$;

REVOKE ALL ON FUNCTION public.rpc_adiantamento_estornar(uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_adiantamento_estornar(uuid,text,uuid) TO authenticated;

-- View enriquecida (security_invoker = on respeita RLS do chamador)
CREATE OR REPLACE VIEW public.v_adiantamentos_enriquecido
WITH (security_invoker = on) AS
SELECT
  a.id,
  a.codigo,
  a.natureza,
  a.direcao,
  a.status,
  a.data_movimento,
  a.competencia,
  a.valor,
  a.valor_abatido,
  a.saldo,
  a.observacao,
  a.cliente_id,
  c.nome             AS cliente_nome,
  a.fornecedor_id,
  f.nome             AS fornecedor_nome,
  a.contrato_id,
  a.pv_id,
  a.conta_id,
  cf.nome            AS conta_nome,
  a.forma_pagamento,
  a.documento,
  a.created_at,
  a.created_by,
  (SELECT count(*) FROM public.adiantamento_abatimentos ab WHERE ab.adiantamento_id = a.id) AS abatimentos_count
FROM public.adiantamentos a
LEFT JOIN public.clientes c        ON c.id = a.cliente_id
LEFT JOIN public.fornecedores f    ON f.id = a.fornecedor_id
LEFT JOIN public.contas_financeiras cf ON cf.id = a.conta_id
WHERE a.deleted_at IS NULL;

GRANT SELECT ON public.v_adiantamentos_enriquecido TO authenticated;

COMMENT ON FUNCTION public.rpc_adiantamento_estornar(uuid,text,uuid) IS
  'D15.3.b — Estorno oficial de adiantamento em aberto. Exige motivo. Bloqueia se houver abatimentos.';
COMMENT ON VIEW public.v_adiantamentos_enriquecido IS
  'D15.3.b — Adiantamentos com nomes de cliente/fornecedor/conta resolvidos. RLS via security_invoker.';
