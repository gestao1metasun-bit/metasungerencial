-- C-ENT.5 — RPC oficial de cancelamento de Contrato Supabase
-- Não exclui contrato, propostas nem projetos. Status vira CANCELADO.

CREATE OR REPLACE FUNCTION public.rpc_contrato_cancelar(
  _id uuid,
  _motivo text,
  _observacao text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cur public.contratos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF NOT (public.is_admin(v_uid)
          OR public.has_permission(v_uid, 'comercial.contrato.cancelar'::app_permission)) THEN
    RAISE EXCEPTION 'Permissão negada: comercial.contrato.cancelar' USING ERRCODE='42501';
  END IF;
  IF _motivo IS NULL OR length(btrim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo do cancelamento obrigatório (mínimo 5 caracteres).' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_cur FROM public.contratos
   WHERE id = _id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % não encontrado.', _id USING ERRCODE='P0002';
  END IF;
  IF v_cur.status = 'CANCELADO' OR v_cur.cancelado = true THEN
    RAISE EXCEPTION 'Contrato já está cancelado.' USING ERRCODE='22023';
  END IF;

  UPDATE public.contratos
     SET status              = 'CANCELADO',
         cancelado           = true,
         motivo_cancelamento = btrim(_motivo)
                               || CASE WHEN _observacao IS NOT NULL AND length(btrim(_observacao))>0
                                       THEN ' | OBS: ' || btrim(_observacao) ELSE '' END,
         updated_at          = now()
   WHERE id = v_cur.id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_contrato_cancelar(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_cancelar(uuid, text, text) TO authenticated;