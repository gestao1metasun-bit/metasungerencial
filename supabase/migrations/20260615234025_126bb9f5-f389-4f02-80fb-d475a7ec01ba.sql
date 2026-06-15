
-- 3a) Tabela de vínculo Contrato × Propostas (N:N, mas proposta única)
CREATE TABLE IF NOT EXISTS public.contrato_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE RESTRICT,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id),
  UNIQUE (proposta_id)
);

CREATE INDEX IF NOT EXISTS idx_contrato_propostas_contrato ON public.contrato_propostas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_propostas_proposta ON public.contrato_propostas(proposta_id);

GRANT SELECT, INSERT ON public.contrato_propostas TO authenticated;
GRANT ALL ON public.contrato_propostas TO service_role;

ALTER TABLE public.contrato_propostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contrato_propostas_select" ON public.contrato_propostas;
CREATE POLICY "contrato_propostas_select" ON public.contrato_propostas
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'comercial.contrato.visualizar'::app_permission)
         OR has_permission(auth.uid(), 'comercial.proposta.visualizar'::app_permission));

DROP POLICY IF EXISTS "contrato_propostas_insert" ON public.contrato_propostas;
CREATE POLICY "contrato_propostas_insert" ON public.contrato_propostas
  FOR INSERT TO authenticated
  WITH CHECK (false); -- só via RPC oficial

-- 3b) Sequência para código de contrato (idempotente)
CREATE SEQUENCE IF NOT EXISTS public.seq_contrato_codigo START 1000;

-- 3c) RPC: gerar contrato a partir de 1..N propostas do mesmo cliente
CREATE OR REPLACE FUNCTION public.rpc_contrato_gerar_de_propostas(
  p_proposta_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cliente_id uuid;
  v_count int;
  v_blocked int;
  v_valor numeric := 0;
  v_potencia numeric := 0;
  v_modulos int := 0;
  v_contrato_id uuid;
  v_codigo text;
  v_rec record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT has_permission(v_uid, 'comercial.contrato.criar'::app_permission) THEN
    RAISE EXCEPTION 'Sem permissão comercial.contrato.criar' USING ERRCODE = '42501';
  END IF;

  IF p_proposta_ids IS NULL OR array_length(p_proposta_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos uma proposta';
  END IF;

  -- Cliente único e elegibilidade
  SELECT count(DISTINCT cliente_id), max(cliente_id)
    INTO v_count, v_cliente_id
  FROM public.propostas
  WHERE id = ANY(p_proposta_ids)
    AND deleted_at IS NULL;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma proposta encontrada';
  END IF;
  IF v_count > 1 THEN
    RAISE EXCEPTION 'Todas as propostas devem pertencer ao mesmo cliente';
  END IF;
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Proposta sem cliente vinculado';
  END IF;

  -- Bloqueios: status terminal/indevido, já contratada
  SELECT count(*) INTO v_blocked
  FROM public.propostas p
  WHERE p.id = ANY(p_proposta_ids)
    AND (
      p.status NOT IN ('APROVADA','ASSINADA')
      OR p.contrato_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.contrato_propostas cp WHERE cp.proposta_id = p.id)
    );
  IF v_blocked > 0 THEN
    RAISE EXCEPTION 'Há propostas inválidas (não aprovadas/assinadas, canceladas, substituídas ou já contratadas)';
  END IF;

  -- Totais
  SELECT
    COALESCE(SUM(valor_final), 0),
    COALESCE(SUM(potencia_kwp), 0),
    COALESCE(SUM(modulos_qtd), 0)
  INTO v_valor, v_potencia, v_modulos
  FROM public.propostas
  WHERE id = ANY(p_proposta_ids);

  IF v_valor <= 0 THEN
    RAISE EXCEPTION 'Valor total do contrato deve ser maior que zero';
  END IF;

  v_codigo := 'CT-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.seq_contrato_codigo')::text, 5, '0');

  -- Cria contrato
  INSERT INTO public.contratos (
    codigo, cliente_id, status, valor_total, potencia_kwp, modulos_qtde,
    dados
  ) VALUES (
    v_codigo, v_cliente_id, 'ATIVO', v_valor, NULLIF(v_potencia,0), NULLIF(v_modulos,0),
    jsonb_build_object(
      'etapa','RASCUNHO',
      'origem','rpc_contrato_gerar_de_propostas',
      'propostas', to_jsonb(p_proposta_ids),
      'criado_por', v_uid
    )
  ) RETURNING id INTO v_contrato_id;

  -- Vínculo + projetos por proposta + atualização de status da proposta
  PERFORM set_config('app.via_revisao_proposta','true', true);

  FOR v_rec IN
    SELECT id, numero, valor_final, potencia_kwp, modulos_qtd, dados
    FROM public.propostas
    WHERE id = ANY(p_proposta_ids)
  LOOP
    INSERT INTO public.contrato_propostas (contrato_id, proposta_id, criado_por)
    VALUES (v_contrato_id, v_rec.id, v_uid);

    INSERT INTO public.projetos (
      codigo, cliente_id, contrato_id, tipo, status,
      potencia_kwp, modulos_qtde, valor_estimado, dados
    ) VALUES (
      v_codigo || '-' || COALESCE(v_rec.numero, substr(v_rec.id::text,1,8)),
      v_cliente_id,
      v_contrato_id,
      'Contrato',
      'Rascunho',
      v_rec.potencia_kwp,
      v_rec.modulos_qtd,
      v_rec.valor_final,
      jsonb_build_object(
        'proposta_id', v_rec.id,
        'origem','rpc_contrato_gerar_de_propostas',
        'endereco_instalacao', COALESCE(v_rec.dados->'endereco_instalacao', v_rec.dados->'endereco', 'null'::jsonb)
      )
    );

    UPDATE public.propostas
       SET status = 'CONTRATADA',
           contrato_id = v_contrato_id,
           motivo_status = 'Gerou contrato ' || v_codigo
     WHERE id = v_rec.id;
  END LOOP;

  PERFORM set_config('app.via_revisao_proposta','false', true);

  RETURN v_contrato_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_contrato_gerar_de_propostas(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_gerar_de_propostas(uuid[]) TO authenticated;
