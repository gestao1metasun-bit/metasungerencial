CREATE OR REPLACE FUNCTION public.rpc_proposta_gerar_contrato(p_proposta_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_proposta propostas%ROWTYPE;
  v_contrato_id uuid;
  v_codigo text;
  v_inversor text;
  v_cliente_id uuid;
  v_nome text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid, 'contrato.gerar'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para gerar contrato' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;

  IF v_proposta.contrato_id IS NOT NULL THEN
    RETURN v_proposta.contrato_id;
  END IF;

  IF v_proposta.status NOT IN ('GERADA','ENVIADA','APROVADA') THEN
    RAISE EXCEPTION 'Apenas propostas GERADA, ENVIADA ou APROVADA geram contrato (status atual: %)', v_proposta.status USING ERRCODE = 'P0001';
  END IF;

  -- Resolve cliente_id: usa o existente, busca por nome, ou cria
  v_cliente_id := v_proposta.cliente_id;
  IF v_cliente_id IS NULL THEN
    v_nome := COALESCE(NULLIF(trim(v_proposta.cliente_nome), ''), 'Cliente sem nome');
    SELECT id INTO v_cliente_id FROM clientes
      WHERE lower(nome) = lower(v_nome) AND COALESCE(deleted_at::text, '') = ''
      LIMIT 1;
    IF v_cliente_id IS NULL THEN
      INSERT INTO clientes (nome, tipo_pessoa, status)
      VALUES (v_nome, 'PF', 'ATIVO')
      RETURNING id INTO v_cliente_id;
    END IF;
    UPDATE propostas SET cliente_id = v_cliente_id WHERE id = p_proposta_id;
  END IF;

  v_codigo := 'CT-' || to_char(now(),'YYYYMMDD') || '-' || substring(p_proposta_id::text from 1 for 8);
  v_inversor := COALESCE(v_proposta.dados #>> '{inversores,0,label}', v_proposta.dados #>> '{inversores,0,inversorId}', v_proposta.dados ->> 'inversorMarca');

  INSERT INTO contratos (
    codigo, cliente_id, consultor_id, status,
    valor_total, potencia_kwp, modulos_qtde, inversor,
    proposta_id, lead_id, vendedor, possui_financiamento, financiamento_banco, financiamento_valor,
    dados, observacoes
  ) VALUES (
    v_codigo,
    v_cliente_id,
    v_proposta.consultor_id,
    CASE WHEN v_proposta.status = 'APROVADA' THEN 'Aprovado' ELSE 'Rascunho' END,
    COALESCE(v_proposta.valor_final, 0),
    v_proposta.potencia_kwp,
    v_proposta.modulos_qtd,
    v_inversor,
    p_proposta_id,
    v_proposta.lead_id,
    COALESCE(v_proposta.dados ->> 'consultor', v_proposta.cliente_nome),
    COALESCE((v_proposta.dados ->> 'possuiFinanciamento')::boolean, false),
    v_proposta.dados ->> 'financiamentoBanco',
    NULLIF(v_proposta.dados ->> 'valorFinanciado', '')::numeric,
    COALESCE(v_proposta.dados, '{}'::jsonb)
      || jsonb_build_object(
        'origem', 'proposta',
        'proposta_numero', v_proposta.numero,
        'cliente_nome', v_proposta.cliente_nome,
        'cidade', v_proposta.dados ->> 'cidade',
        'estado', v_proposta.dados ->> 'estado'
      ),
    NULL
  )
  RETURNING id INTO v_contrato_id;

  UPDATE propostas SET contrato_id = v_contrato_id WHERE id = p_proposta_id;

  RETURN v_contrato_id;
END;
$function$;