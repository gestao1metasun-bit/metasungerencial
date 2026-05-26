
-- 1) Schema
ALTER TABLE public.titulos_financeiros
  ADD COLUMN IF NOT EXISTS contrato_id uuid;

CREATE INDEX IF NOT EXISTS idx_tf_contrato_id
  ON public.titulos_financeiros (contrato_id);

CREATE INDEX IF NOT EXISTS idx_tf_origem
  ON public.titulos_financeiros (origem_tipo, origem_id);

-- 2) Backfill (idempotente)
UPDATE public.titulos_financeiros tf
   SET contrato_id = pv.contrato_id
  FROM public.pedidos_venda pv
 WHERE tf.contrato_id IS NULL
   AND tf.origem_tipo = 'pedido_venda'
   AND tf.origem_id = pv.id;

-- 3) RPC atualizada (mantém assinatura)
CREATE OR REPLACE FUNCTION public.gerar_titulos_do_pv(_pv_id uuid, _parcelas jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  pv record;
  v_titulo_id uuid;
  v_parcela jsonb;
  v_n int := 0;
  v_valor_total numeric;
BEGIN
  SELECT * INTO pv FROM public.pedidos_venda WHERE id = _pv_id AND deleted_at IS NULL;
  IF pv.id IS NULL THEN RAISE EXCEPTION 'PV não encontrado.' USING ERRCODE='22023'; END IF;
  IF pv.status NOT IN ('APROVADO','EM_EXECUCAO','FATURADO') THEN
    RAISE EXCEPTION 'PV em status % não permite geração de títulos.', pv.status USING ERRCODE='22023';
  END IF;
  IF NOT (public.is_admin(v_user) OR pv.consultor_id = v_user) THEN
    RAISE EXCEPTION 'Sem permissão para gerar títulos deste PV.' USING ERRCODE='42501';
  END IF;

  -- idempotência
  SELECT id INTO v_titulo_id FROM public.titulos_financeiros
    WHERE origem_tipo='pedido_venda' AND origem_id=_pv_id
      AND status <> 'CANCELADO' AND deleted_at IS NULL
    ORDER BY created_at LIMIT 1;
  IF v_titulo_id IS NOT NULL THEN RETURN v_titulo_id; END IF;

  v_valor_total := COALESCE(pv.valor_total, 0);

  INSERT INTO public.titulos_financeiros
    (tipo, origem_tipo, origem_id, contrato_id, cliente_id, consultor_id,
     valor_bruto, valor_liquido, saldo,
     competencia, vencimento, forma_pagamento, status, observacoes)
  VALUES
    ('receber','pedido_venda',_pv_id, pv.contrato_id, pv.cliente_id, pv.consultor_id,
     v_valor_total, v_valor_total, v_valor_total,
     CURRENT_DATE, CURRENT_DATE + 30, pv.forma_pagamento, 'PENDENTE',
     'Gerado automaticamente do PV ' || COALESCE(pv.codigo, _pv_id::text))
  RETURNING id INTO v_titulo_id;

  IF _parcelas IS NOT NULL AND jsonb_typeof(_parcelas) = 'array' AND jsonb_array_length(_parcelas) > 0 THEN
    FOR v_parcela IN SELECT * FROM jsonb_array_elements(_parcelas) LOOP
      v_n := v_n + 1;
      INSERT INTO public.parcelas_financeiras (titulo_id, numero, valor, saldo, vencimento)
      VALUES (
        v_titulo_id, v_n,
        (v_parcela->>'valor')::numeric,
        (v_parcela->>'valor')::numeric,
        (v_parcela->>'vencimento')::date
      );
    END LOOP;
  ELSE
    INSERT INTO public.parcelas_financeiras (titulo_id, numero, valor, saldo, vencimento)
    VALUES (v_titulo_id, 1, v_valor_total, v_valor_total, CURRENT_DATE + 30);
  END IF;

  RETURN v_titulo_id;
END $function$;
