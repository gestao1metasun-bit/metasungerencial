-- GRANTs para as novas permissões
INSERT INTO role_permissions (role, permission) VALUES
  ('admin_master','comercial.contrato.aprovar_minuta'),
  ('admin_geral','comercial.contrato.aprovar_minuta'),
  ('usuario','comercial.contrato.aprovar_minuta'),
  ('admin_master','comercial.contrato.editar_minuta'),
  ('admin_geral','comercial.contrato.editar_minuta'),
  ('usuario','comercial.contrato.editar_minuta')
ON CONFLICT DO NOTHING;

-- Reescreve rpc_proposta_gerar_contrato: contrato nasce como MINUTA, proposta vira CONTRATO_PENDENTE
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
  IF NOT (has_permission(v_uid, 'contrato.gerar'::app_permission) OR has_permission(v_uid,'comercial.contrato.criar'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para gerar contrato' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposta FROM propostas WHERE id = p_proposta_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;

  IF v_proposta.contrato_id IS NOT NULL THEN
    RETURN v_proposta.contrato_id;
  END IF;

  IF v_proposta.status NOT IN ('GERADA','ENVIADA','APROVADA','ATIVA') THEN
    RAISE EXCEPTION 'Apenas propostas GERADA/ENVIADA/APROVADA/ATIVA geram contrato (status atual: %)', v_proposta.status USING ERRCODE = 'P0001';
  END IF;

  -- Validações mínimas
  IF COALESCE(v_proposta.valor_final,0) <= 0 THEN
    RAISE EXCEPTION 'Proposta sem valor — não pode gerar contrato';
  END IF;

  -- Resolve cliente
  v_cliente_id := v_proposta.cliente_id;
  IF v_cliente_id IS NULL THEN
    v_nome := COALESCE(NULLIF(trim(v_proposta.cliente_nome), ''), 'Cliente sem nome');
    SELECT id INTO v_cliente_id FROM clientes
      WHERE lower(nome) = lower(v_nome) AND deleted_at IS NULL
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
    'MINUTA',
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
        'etapa','CONTRATO_PENDENTE',
        'proposta_numero', v_proposta.numero,
        'cliente_nome', v_proposta.cliente_nome,
        'cidade', v_proposta.dados ->> 'cidade',
        'estado', v_proposta.dados ->> 'estado',
        'criado_por', v_uid,
        'criado_em', now()
      ),
    NULL
  )
  RETURNING id INTO v_contrato_id;

  -- Atualiza proposta para CONTRATO_PENDENTE (trava edição), via flag de bypass do trigger de proposta
  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE propostas
     SET status = 'CONTRATO_PENDENTE',
         contrato_id = v_contrato_id,
         motivo_status = 'Contrato pendente ' || v_codigo
   WHERE id = p_proposta_id;
  PERFORM set_config('app.via_revisao_proposta','false', true);

  RETURN v_contrato_id;
END;
$function$;

-- Aprovar minuta: MINUTA → ATIVO, proposta → CONTRATADA
CREATE OR REPLACE FUNCTION public.rpc_contrato_aprovar_minuta(p_contrato_id uuid, p_observacao text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_c contratos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid,'comercial.contrato.aprovar_minuta'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.contrato.aprovar_minuta' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_c FROM contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF upper(v_c.status) NOT IN ('MINUTA','PENDENTE_REVISAO','RASCUNHO','PENDENTE') THEN
    RAISE EXCEPTION 'Contrato não está em minuta (status atual: %)', v_c.status USING ERRCODE = 'P0001';
  END IF;
  IF v_c.cancelado THEN
    RAISE EXCEPTION 'Contrato cancelado não pode ser aprovado';
  END IF;
  IF v_c.cliente_id IS NULL THEN
    RAISE EXCEPTION 'Contrato sem cliente — preencha o cadastro antes de aprovar';
  END IF;
  IF v_c.proposta_id IS NULL THEN
    RAISE EXCEPTION 'Contrato sem proposta origem';
  END IF;
  IF COALESCE(v_c.valor_total,0) <= 0 THEN
    RAISE EXCEPTION 'Contrato sem valor — preencha o valor antes de aprovar';
  END IF;

  UPDATE contratos
     SET status = 'ATIVO',
         data_assinatura = COALESCE(data_assinatura, now()::date),
         dados = COALESCE(dados,'{}'::jsonb) || jsonb_build_object(
           'etapa','APROVADO',
           'aprovado_em', now(),
           'aprovado_por', v_uid,
           'aprovacao_observacao', p_observacao
         )
   WHERE id = p_contrato_id;

  -- Marca proposta origem como CONTRATADA
  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE propostas
     SET status = 'CONTRATADA',
         motivo_status = 'Contrato ' || COALESCE(v_c.codigo,'') || ' aprovado'
   WHERE id = v_c.proposta_id;
  PERFORM set_config('app.via_revisao_proposta','false', true);

  RETURN p_contrato_id;
END;
$function$;

-- Cancelar minuta: MINUTA → CANCELADO, proposta volta para APROVADA
CREATE OR REPLACE FUNCTION public.rpc_contrato_cancelar_minuta(p_contrato_id uuid, p_motivo text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_c contratos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF NOT (has_permission(v_uid,'comercial.contrato.cancelar'::app_permission) OR is_admin(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar contrato' USING ERRCODE = '42501';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Informe um motivo com pelo menos 5 caracteres';
  END IF;

  SELECT * INTO v_c FROM contratos WHERE id = p_contrato_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF upper(v_c.status) NOT IN ('MINUTA','PENDENTE_REVISAO','RASCUNHO','PENDENTE') THEN
    RAISE EXCEPTION 'Apenas minutas podem ser canceladas por esta rota (status atual: %)', v_c.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE contratos
     SET status = 'CANCELADO',
         cancelado = true,
         motivo_cancelamento = p_motivo,
         dados = COALESCE(dados,'{}'::jsonb) || jsonb_build_object(
           'etapa','CANCELADO_MINUTA',
           'cancelado_em', now(),
           'cancelado_por', v_uid
         )
   WHERE id = p_contrato_id;

  IF v_c.proposta_id IS NOT NULL THEN
    PERFORM set_config('app.via_revisao_proposta','true', true);
    UPDATE propostas
       SET status = 'APROVADA',
           contrato_id = NULL,
           motivo_status = 'Minuta cancelada: ' || p_motivo
     WHERE id = v_c.proposta_id;
    PERFORM set_config('app.via_revisao_proposta','false', true);
  END IF;

  RETURN p_contrato_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_contrato_aprovar_minuta(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_contrato_cancelar_minuta(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_aprovar_minuta(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_cancelar_minuta(uuid, text) TO authenticated;