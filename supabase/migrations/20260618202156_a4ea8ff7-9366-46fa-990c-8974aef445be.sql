-- D18.13 — Alias canônico oficial: rpc_proposta_enviar_para_contratos
-- Encaminha para a RPC oficial existente (rpc_proposta_gerar_contrato), preservando
-- regras, auditoria, idempotência, transição APROVADA→CONTRATO_PENDENTE e criação
-- da minuta (status=MINUTA / etapa=PENDENTE_REDACAO em contratos.dados).
-- Não duplica lógica; apenas oficializa o nome semântico exigido pelo fluxo D18.13.

CREATE OR REPLACE FUNCTION public.rpc_proposta_enviar_para_contratos(p_proposta_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato_id uuid;
BEGIN
  v_contrato_id := public.rpc_proposta_gerar_contrato(p_proposta_id);
  RETURN v_contrato_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_proposta_enviar_para_contratos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_enviar_para_contratos(uuid) TO authenticated;

COMMENT ON FUNCTION public.rpc_proposta_enviar_para_contratos(uuid) IS
'D18.13 — Envia proposta APROVADA para a esteira de Contratos (cria minuta PENDENTE_REDACAO e marca a proposta como CONTRATO_PENDENTE). Wrapper oficial sobre rpc_proposta_gerar_contrato.';