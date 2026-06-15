-- Grants
INSERT INTO public.role_permissions(role, permission)
SELECT r, p FROM (VALUES
  ('admin_master'::app_role),
  ('admin_geral'::app_role),
  ('usuario'::app_role)
) AS t(r),
(VALUES
  ('comercial.proposta.visualizar'::app_permission),
  ('comercial.proposta.gerar_nova'::app_permission),
  ('comercial.proposta.gerar_contrato'::app_permission)
) AS u(p)
ON CONFLICT DO NOTHING;

-- RPC: criar proposta a partir de um lead
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
REVOKE EXECUTE ON FUNCTION public.rpc_proposta_criar_do_lead(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_criar_do_lead(uuid, text) TO authenticated;

-- Substitui RPC antigo para padronizar parâmetros (_id, _motivo) e retornar void
DROP FUNCTION IF EXISTS public.rpc_proposta_cancelar(uuid, text);

CREATE OR REPLACE FUNCTION public.rpc_proposta_cancelar(
  _id uuid,
  _motivo text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cur public.propostas%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF NOT (public.is_admin(v_uid)
          OR public.has_permission(v_uid, 'comercial.proposta.cancelar'::app_permission)) THEN
    RAISE EXCEPTION 'Permissão negada: comercial.proposta.cancelar' USING ERRCODE='42501';
  END IF;
  IF _motivo IS NULL OR length(btrim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo do cancelamento obrigatório (mínimo 5 caracteres).' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_cur FROM public.propostas
   WHERE id = _id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada.', _id USING ERRCODE='P0002';
  END IF;
  IF v_cur.status IN ('CANCELADA','ASSINADA') THEN
    RAISE EXCEPTION 'Proposta no status % não pode ser cancelada.', v_cur.status USING ERRCODE='22023';
  END IF;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE public.propostas
     SET status        = 'CANCELADA',
         motivo_status = _motivo
   WHERE id = v_cur.id;
  PERFORM set_config('app.via_revisao_proposta','false', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_proposta_cancelar(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_cancelar(uuid, text) TO authenticated;