
-- =====================================================================
-- D6.11.2 — Renegociação consolidada de títulos (bulk)
-- =====================================================================

-- 1. Nova permissão
ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'financeiro.renegociar';

-- 2. origem_tipo aceita 'renegociacao'
ALTER TABLE public.titulos_financeiros
  DROP CONSTRAINT IF EXISTS titulos_financeiros_origem_tipo_check;
ALTER TABLE public.titulos_financeiros
  ADD CONSTRAINT titulos_financeiros_origem_tipo_check
  CHECK (origem_tipo = ANY (ARRAY[
    'contrato','projeto','pedido_venda','obra','cliente',
    'fornecedor','aditivo','estoque','manual_controlado','renegociacao'
  ]));

-- 3. Colunas de rastreabilidade
ALTER TABLE public.titulos_financeiros
  ADD COLUMN IF NOT EXISTS titulo_substituto_id uuid REFERENCES public.titulos_financeiros(id),
  ADD COLUMN IF NOT EXISTS renegociado_em timestamptz,
  ADD COLUMN IF NOT EXISTS renegociado_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_renegociacao text;

CREATE INDEX IF NOT EXISTS idx_tf_substituto ON public.titulos_financeiros(titulo_substituto_id);

-- 4. Cabeçalho do acordo
CREATE TABLE IF NOT EXISTS public.titulos_renegociacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('receber','pagar')),
  titulo_novo_id uuid NOT NULL REFERENCES public.titulos_financeiros(id),
  motivo text NOT NULL,
  juros_aplicado numeric NOT NULL DEFAULT 0,
  multa_aplicada numeric NOT NULL DEFAULT 0,
  desconto_aplicado numeric NOT NULL DEFAULT 0,
  valor_original_total numeric NOT NULL DEFAULT 0,
  valor_renegociado_total numeric NOT NULL DEFAULT 0,
  qtd_titulos_consolidados int NOT NULL DEFAULT 0,
  observacao text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.titulos_renegociacoes TO authenticated;
GRANT ALL ON public.titulos_renegociacoes TO service_role;
ALTER TABLE public.titulos_renegociacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_select ON public.titulos_renegociacoes
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
    OR EXISTS (
      SELECT 1 FROM public.titulos_financeiros t
      WHERE t.id = titulos_renegociacoes.titulo_novo_id
        AND t.consultor_id = auth.uid()
    )
  );

-- 5. Vínculo título antigo ↔ acordo
CREATE TABLE IF NOT EXISTS public.titulos_renegociacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renegociacao_id uuid NOT NULL REFERENCES public.titulos_renegociacoes(id) ON DELETE CASCADE,
  titulo_antigo_id uuid NOT NULL REFERENCES public.titulos_financeiros(id),
  saldo_consolidado numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(renegociacao_id, titulo_antigo_id)
);

GRANT SELECT ON public.titulos_renegociacao_itens TO authenticated;
GRANT ALL ON public.titulos_renegociacao_itens TO service_role;
ALTER TABLE public.titulos_renegociacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tri_select ON public.titulos_renegociacao_itens
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'financeiro.visualizar'::app_permission)
    OR EXISTS (
      SELECT 1 FROM public.titulos_renegociacoes r
      JOIN public.titulos_financeiros t ON t.id = r.titulo_novo_id
      WHERE r.id = titulos_renegociacao_itens.renegociacao_id
        AND (t.consultor_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_tri_antigo ON public.titulos_renegociacao_itens(titulo_antigo_id);
CREATE INDEX IF NOT EXISTS idx_tri_reneg ON public.titulos_renegociacao_itens(renegociacao_id);

-- 6. RPC principal
CREATE OR REPLACE FUNCTION public.renegociar_titulos_lote(
  _titulo_ids uuid[],
  _motivo text,
  _condicoes jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_pode boolean;
  v_clientes int;
  v_tipos int;
  v_invalido int;
  v_cliente uuid;
  v_tipo text;
  v_consultor uuid;
  v_centro uuid;
  v_conta uuid;
  v_total_saldo numeric := 0;
  v_juros numeric := COALESCE((_condicoes->>'juros')::numeric, 0);
  v_multa numeric := COALESCE((_condicoes->>'multa')::numeric, 0);
  v_desconto numeric := COALESCE((_condicoes->>'desconto')::numeric, 0);
  v_observacao text := _condicoes->>'observacao';
  v_parcelas jsonb := _condicoes->'parcelas';
  v_total_parcelas numeric := 0;
  v_total_renegociado numeric;
  v_novo_id uuid;
  v_reneg_id uuid;
  v_codigo text;
  v_qtd int := array_length(_titulo_ids, 1);
  it jsonb;
  i int := 1;
  v_min_venc date;
  r record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão requerida.' USING ERRCODE='42501';
  END IF;

  v_pode := is_admin(v_user)
         OR has_permission(v_user, 'financeiro.renegociar'::app_permission);
  IF NOT v_pode THEN
    RAISE EXCEPTION 'Sem permissão para renegociar títulos (financeiro.renegociar).'
      USING ERRCODE='42501';
  END IF;

  IF v_qtd IS NULL OR v_qtd < 1 THEN
    RAISE EXCEPTION 'Informe ao menos um título.' USING ERRCODE='22023';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mín. 3 caracteres).' USING ERRCODE='22023';
  END IF;
  IF v_parcelas IS NULL OR jsonb_typeof(v_parcelas) <> 'array' OR jsonb_array_length(v_parcelas) < 1 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela para o novo acordo.' USING ERRCODE='22023';
  END IF;

  -- Lock + validações dos títulos
  SELECT count(DISTINCT cliente_id), count(DISTINCT tipo),
         count(*) FILTER (WHERE status NOT IN ('PENDENTE','PARCIAL','ATRASADO')
                              OR deleted_at IS NOT NULL),
         MIN(cliente_id), MIN(tipo),
         MIN(consultor_id), MIN(centro_id), MIN(conta_id),
         COALESCE(SUM(saldo), 0)
    INTO v_clientes, v_tipos, v_invalido,
         v_cliente, v_tipo,
         v_consultor, v_centro, v_conta,
         v_total_saldo
  FROM public.titulos_financeiros
  WHERE id = ANY(_titulo_ids)
  FOR UPDATE;

  IF v_clientes IS NULL THEN
    RAISE EXCEPTION 'Títulos não encontrados.' USING ERRCODE='22023';
  END IF;
  IF v_clientes > 1 THEN
    RAISE EXCEPTION 'Todos os títulos devem ser do mesmo cliente.' USING ERRCODE='22023';
  END IF;
  IF v_tipos > 1 THEN
    RAISE EXCEPTION 'Não é possível renegociar contas a receber e a pagar juntas.' USING ERRCODE='22023';
  END IF;
  IF v_invalido > 0 THEN
    RAISE EXCEPTION 'Há % título(s) em status não renegociável (deve ser PENDENTE/PARCIAL/ATRASADO).', v_invalido
      USING ERRCODE='22023';
  END IF;
  IF v_total_saldo <= 0 THEN
    RAISE EXCEPTION 'Saldo total a renegociar deve ser positivo.' USING ERRCODE='22023';
  END IF;
  IF v_juros < 0 OR v_multa < 0 OR v_desconto < 0 THEN
    RAISE EXCEPTION 'Juros, multa e desconto não podem ser negativos.' USING ERRCODE='22023';
  END IF;

  v_total_renegociado := v_total_saldo + v_juros + v_multa - v_desconto;
  IF v_total_renegociado <= 0 THEN
    RAISE EXCEPTION 'Valor renegociado deve ser positivo (desconto excede saldo).' USING ERRCODE='22023';
  END IF;

  -- Soma das parcelas
  FOR it IN SELECT * FROM jsonb_array_elements(v_parcelas) LOOP
    IF (it->>'valor')::numeric IS NULL OR (it->>'valor')::numeric <= 0 THEN
      RAISE EXCEPTION 'Parcela com valor inválido.' USING ERRCODE='22023';
    END IF;
    IF (it->>'vencimento') IS NULL THEN
      RAISE EXCEPTION 'Parcela sem vencimento.' USING ERRCODE='22023';
    END IF;
    v_total_parcelas := v_total_parcelas + (it->>'valor')::numeric;
  END LOOP;

  IF abs(v_total_parcelas - v_total_renegociado) > 0.01 THEN
    RAISE EXCEPTION 'Soma das parcelas (R$ %) difere do valor renegociado (R$ %).',
      v_total_parcelas, v_total_renegociado USING ERRCODE='22023';
  END IF;

  SELECT MIN((p->>'vencimento')::date) INTO v_min_venc
  FROM jsonb_array_elements(v_parcelas) p;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  -- Código do novo título
  v_codigo := 'TF-REN-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

  -- Cabeçalho da renegociação (id antecipado para ligar ao novo título via dados)
  v_reneg_id := gen_random_uuid();

  -- 1) Cria novo título consolidado
  INSERT INTO public.titulos_financeiros(
    codigo, tipo, origem_tipo, origem_id,
    cliente_id, consultor_id, centro_id, conta_id,
    valor_bruto, desconto, juros, multa, valor_liquido, saldo,
    vencimento, status, observacoes, dados
  ) VALUES (
    v_codigo, v_tipo, 'renegociacao', v_reneg_id,
    v_cliente, v_consultor, v_centro, v_conta,
    v_total_renegociado, 0, 0, 0, v_total_renegociado, v_total_renegociado,
    v_min_venc, 'PENDENTE',
    COALESCE(v_observacao, 'Renegociação de ' || v_qtd || ' título(s) — motivo: ' || _motivo),
    jsonb_build_object(
      'renegociacao_id', v_reneg_id,
      'titulos_antigos', to_jsonb(_titulo_ids),
      'juros', v_juros, 'multa', v_multa, 'desconto', v_desconto,
      'motivo', _motivo
    )
  ) RETURNING id INTO v_novo_id;

  -- 2) Cria parcelas do novo título
  i := 1;
  FOR it IN SELECT * FROM jsonb_array_elements(v_parcelas) LOOP
    INSERT INTO public.parcelas_financeiras(
      titulo_id, numero, valor, saldo, vencimento, status, observacoes
    ) VALUES (
      v_novo_id, i, (it->>'valor')::numeric, (it->>'valor')::numeric,
      (it->>'vencimento')::date, 'PENDENTE', it->>'observacao'
    );
    i := i + 1;
  END LOOP;

  -- 3) Cabeçalho do acordo
  INSERT INTO public.titulos_renegociacoes(
    id, cliente_id, tipo, titulo_novo_id, motivo,
    juros_aplicado, multa_aplicada, desconto_aplicado,
    valor_original_total, valor_renegociado_total, qtd_titulos_consolidados,
    observacao, user_id, user_email
  ) VALUES (
    v_reneg_id, v_cliente, v_tipo, v_novo_id, _motivo,
    v_juros, v_multa, v_desconto,
    v_total_saldo, v_total_renegociado, v_qtd,
    v_observacao, v_user, v_email
  );

  -- 4) Marca títulos antigos como RENEGOCIADO + vincula + zera parcelas
  PERFORM set_config('app.via_movimentacao', 'true', true);

  FOR r IN
    SELECT id, saldo FROM public.titulos_financeiros WHERE id = ANY(_titulo_ids) FOR UPDATE
  LOOP
    -- vínculo
    INSERT INTO public.titulos_renegociacao_itens(
      renegociacao_id, titulo_antigo_id, saldo_consolidado
    ) VALUES (v_reneg_id, r.id, r.saldo);

    -- cancela parcelas em aberto
    UPDATE public.parcelas_financeiras
       SET status = 'RENEGOCIADA', saldo = 0, updated_at = now()
     WHERE titulo_id = r.id
       AND status NOT IN ('RECEBIDO','CANCELADA','RENEGOCIADA');

    -- atualiza título
    UPDATE public.titulos_financeiros
       SET status = 'RENEGOCIADO',
           saldo = 0,
           titulo_substituto_id = v_novo_id,
           renegociado_em = now(),
           renegociado_por = v_user,
           motivo_renegociacao = _motivo,
           updated_at = now()
     WHERE id = r.id;
  END LOOP;

  PERFORM set_config('app.via_movimentacao', 'false', true);

  -- 5) Audit log resumo
  INSERT INTO public.audit_log(
    modulo, entidade, entidade_id, acao, motivo,
    valor_novo, user_id, user_email
  ) VALUES (
    'financeiro', 'titulos_renegociacoes', v_reneg_id, 'RENEGOCIAR_LOTE', _motivo,
    jsonb_build_object(
      'titulo_novo_id', v_novo_id,
      'titulos_antigos', to_jsonb(_titulo_ids),
      'valor_original', v_total_saldo,
      'valor_renegociado', v_total_renegociado,
      'juros', v_juros, 'multa', v_multa, 'desconto', v_desconto,
      'qtd_parcelas', jsonb_array_length(v_parcelas)
    ),
    v_user, v_email
  );

  RETURN jsonb_build_object(
    'ok', true,
    'titulo_novo_id', v_novo_id,
    'renegociacao_id', v_reneg_id,
    'valor_renegociado', v_total_renegociado,
    'qtd_consolidados', v_qtd
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.renegociar_titulos_lote(uuid[], text, jsonb) TO authenticated;
