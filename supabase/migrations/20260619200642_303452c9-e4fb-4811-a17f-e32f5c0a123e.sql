CREATE OR REPLACE FUNCTION public.rpc_proposta_criar_do_lead(
  _lead_id uuid,
  _observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_lead public.leads%ROWTYPE;
  v_existing_id uuid;
  v_new_id uuid;
  v_numero text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF NOT (public.is_admin(v_uid)
          OR public.has_permission(v_uid, 'comercial.proposta.criar'::app_permission)) THEN
    RAISE EXCEPTION 'Permissão negada: comercial.proposta.criar' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_lead FROM public.leads
   WHERE id = _lead_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead % não encontrado.', _lead_id USING ERRCODE='P0002';
  END IF;
  IF v_lead.status = 'CANCELADO' THEN
    RAISE EXCEPTION 'Lead cancelado não pode gerar proposta.' USING ERRCODE='22023';
  END IF;
  IF v_lead.cliente_id IS NULL THEN
    RAISE EXCEPTION 'Lead sem cliente Supabase vinculado. Vincule/crie um cliente antes de gerar a proposta.'
      USING ERRCODE='22023';
  END IF;

  SELECT p.id INTO v_existing_id
    FROM public.propostas p
   WHERE p.lead_id = _lead_id
     AND p.deleted_at IS NULL
     AND p.status NOT IN ('CANCELADA')
   ORDER BY
     CASE WHEN p.contrato_id IS NOT NULL THEN 0 ELSE 1 END,
     p.created_at DESC
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  v_numero := 'PR-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

  INSERT INTO public.propostas(
    numero, status, consultor_id, cliente_id, lead_id,
    cliente_nome, cliente_doc,
    versao, dados
  ) VALUES (
    v_numero, 'RASCUNHO',
    COALESCE(v_lead.consultor_id, v_uid),
    v_lead.cliente_id,
    v_lead.id,
    v_lead.nome,
    v_lead.doc,
    'P01',
    jsonb_build_object(
      '_origem','LEAD',
      '_lead_numero', v_lead.numero,
      '_observacao', _observacao,
      '_criada_por', v_uid::text
    )
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_proposta_criar_do_lead(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_criar_do_lead(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_proposta_enviar_para_contratos(p_proposta_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato_id uuid;
BEGIN
  SELECT p.contrato_id INTO v_contrato_id
    FROM public.propostas p
   WHERE p.id = p_proposta_id
     AND p.deleted_at IS NULL;

  IF v_contrato_id IS NOT NULL THEN
    RETURN v_contrato_id;
  END IF;

  SELECT cp.contrato_id INTO v_contrato_id
    FROM public.contrato_propostas cp
    JOIN public.contratos c ON c.id = cp.contrato_id
   WHERE cp.proposta_id = p_proposta_id
     AND COALESCE(c.cancelado, false) = false
     AND c.deleted_at IS NULL
   ORDER BY cp.criado_em DESC NULLS LAST
   LIMIT 1;

  IF v_contrato_id IS NOT NULL THEN
    PERFORM set_config('app.via_revisao_proposta','true', true);
    UPDATE public.propostas
       SET contrato_id = v_contrato_id,
           status = CASE WHEN status = 'CONTRATO_PENDENTE' THEN status ELSE 'CONTRATO_PENDENTE' END,
           motivo_status = COALESCE(motivo_status, 'Contrato pendente já existente')
     WHERE id = p_proposta_id;
    PERFORM set_config('app.via_revisao_proposta','false', true);
    RETURN v_contrato_id;
  END IF;

  v_contrato_id := public.rpc_proposta_gerar_contrato(p_proposta_id);
  RETURN v_contrato_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_proposta_enviar_para_contratos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_enviar_para_contratos(uuid) TO authenticated;

COMMENT ON FUNCTION public.rpc_proposta_criar_do_lead(uuid, text) IS
'C-ENT — Idempotente: retorna proposta ativa existente do lead antes de criar nova, evitando duplicidade por clique repetido.';

COMMENT ON FUNCTION public.rpc_proposta_enviar_para_contratos(uuid) IS
'D18.13 — Idempotente: retorna contrato já vinculado quando existir; caso contrário cria minuta PENDENTE_REDACAO via rpc_proposta_gerar_contrato.';