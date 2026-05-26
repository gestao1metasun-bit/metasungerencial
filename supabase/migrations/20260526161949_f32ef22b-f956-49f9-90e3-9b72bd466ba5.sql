
-- ============================================================
-- ONDA D1 — NÚCLEO FINANCEIRO REAL
-- ============================================================

-- 1) CENTROS DE RESULTADO -------------------------------------
CREATE TABLE public.centros_resultado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('receita','despesa','ambos')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.centros_resultado TO authenticated;
GRANT ALL ON public.centros_resultado TO service_role;
ALTER TABLE public.centros_resultado ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_select_auth ON public.centros_resultado FOR SELECT TO authenticated USING (true);
CREATE POLICY cr_admin_write ON public.centros_resultado FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER cr_set_updated_at BEFORE UPDATE ON public.centros_resultado
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- 2) CONTAS FINANCEIRAS ---------------------------------------
CREATE TABLE public.contas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('caixa','banco','cartao','outro')),
  banco text,
  agencia text,
  conta text,
  saldo_inicial numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contas_financeiras TO authenticated;
GRANT ALL ON public.contas_financeiras TO service_role;
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY cf_select_auth ON public.contas_financeiras FOR SELECT TO authenticated USING (true);
CREATE POLICY cf_admin_write ON public.contas_financeiras FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER cf_set_updated_at BEFORE UPDATE ON public.contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- 3) TITULOS FINANCEIROS --------------------------------------
CREATE TABLE public.titulos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  tipo text NOT NULL CHECK (tipo IN ('receber','pagar')),
  origem_tipo text NOT NULL CHECK (origem_tipo IN
    ('contrato','projeto','pedido_venda','obra','cliente','fornecedor','aditivo','estoque','manual_controlado')),
  origem_id uuid NOT NULL,
  cliente_id uuid,
  consultor_id uuid,
  centro_id uuid REFERENCES public.centros_resultado(id),
  conta_id uuid REFERENCES public.contas_financeiras(id),
  valor_bruto numeric NOT NULL DEFAULT 0 CHECK (valor_bruto >= 0),
  desconto numeric NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  juros numeric NOT NULL DEFAULT 0 CHECK (juros >= 0),
  multa numeric NOT NULL DEFAULT 0 CHECK (multa >= 0),
  valor_liquido numeric NOT NULL DEFAULT 0,
  saldo numeric NOT NULL DEFAULT 0,
  competencia date,
  vencimento date,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','PARCIAL','RECEBIDO','ATRASADO','CANCELADO','RENEGOCIADO')),
  observacoes text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  motivo_cancelamento text,
  cancelado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_reason text,
  deleted_by uuid
);
CREATE INDEX idx_tf_origem ON public.titulos_financeiros(origem_tipo, origem_id);
CREATE INDEX idx_tf_consultor ON public.titulos_financeiros(consultor_id);
CREATE INDEX idx_tf_status ON public.titulos_financeiros(status);
CREATE INDEX idx_tf_vencimento ON public.titulos_financeiros(vencimento);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.titulos_financeiros TO authenticated;
GRANT ALL ON public.titulos_financeiros TO service_role;
ALTER TABLE public.titulos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY tf_select_own_or_admin ON public.titulos_financeiros FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY tf_insert_own_or_admin ON public.titulos_financeiros FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY tf_update_own_or_admin ON public.titulos_financeiros FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR consultor_id = auth.uid())
  WITH CHECK (is_admin(auth.uid()) OR consultor_id = auth.uid());
CREATE POLICY tf_delete_admin ON public.titulos_financeiros FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- 4) PARCELAS -------------------------------------------------
CREATE TABLE public.parcelas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id uuid NOT NULL REFERENCES public.titulos_financeiros(id) ON DELETE CASCADE,
  numero int NOT NULL,
  valor numeric NOT NULL CHECK (valor >= 0),
  saldo numeric NOT NULL DEFAULT 0,
  vencimento date NOT NULL,
  recebido_em timestamptz,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','PARCIAL','RECEBIDO','ATRASADO','CANCELADO')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (titulo_id, numero)
);
CREATE INDEX idx_pf_titulo ON public.parcelas_financeiras(titulo_id);
CREATE INDEX idx_pf_vencimento ON public.parcelas_financeiras(vencimento);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas_financeiras TO authenticated;
GRANT ALL ON public.parcelas_financeiras TO service_role;
ALTER TABLE public.parcelas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY pf_select_via_titulo ON public.parcelas_financeiras FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.titulos_financeiros t
    WHERE t.id = parcelas_financeiras.titulo_id AND t.consultor_id = auth.uid()));
CREATE POLICY pf_insert_via_titulo ON public.parcelas_financeiras FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.titulos_financeiros t
    WHERE t.id = parcelas_financeiras.titulo_id AND t.consultor_id = auth.uid()));
CREATE POLICY pf_update_via_titulo ON public.parcelas_financeiras FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.titulos_financeiros t
    WHERE t.id = parcelas_financeiras.titulo_id AND t.consultor_id = auth.uid()));
CREATE POLICY pf_delete_admin ON public.parcelas_financeiras FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- 5) MOVIMENTACOES (append-only) ------------------------------
CREATE TABLE public.movimentacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id uuid NOT NULL REFERENCES public.titulos_financeiros(id) ON DELETE RESTRICT,
  parcela_id uuid REFERENCES public.parcelas_financeiras(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('recebimento','baixa','estorno','juros','desconto','multa')),
  valor numeric NOT NULL CHECK (valor >= 0),
  data timestamptz NOT NULL DEFAULT now(),
  conta_id uuid REFERENCES public.contas_financeiras(id),
  forma_pagamento text,
  observacao text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mf_titulo ON public.movimentacoes_financeiras(titulo_id);
CREATE INDEX idx_mf_parcela ON public.movimentacoes_financeiras(parcela_id);
CREATE INDEX idx_mf_data ON public.movimentacoes_financeiras(data);

GRANT SELECT, INSERT ON public.movimentacoes_financeiras TO authenticated;
GRANT ALL ON public.movimentacoes_financeiras TO service_role;
ALTER TABLE public.movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY mf_select_via_titulo ON public.movimentacoes_financeiras FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.titulos_financeiros t
    WHERE t.id = movimentacoes_financeiras.titulo_id AND t.consultor_id = auth.uid()));
CREATE POLICY mf_insert_system ON public.movimentacoes_financeiras FOR INSERT TO authenticated
  WITH CHECK (true);
-- UPDATE/DELETE bloqueados (append-only)

-- 6) TRIGGERS DE VALIDACAO E SALDO ----------------------------

-- Código automático
CREATE OR REPLACE FUNCTION public.tg_tf_gera_codigo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo IS NULL OR length(trim(NEW.codigo)) = 0 THEN
    NEW.codigo := 'TF-' || to_char(now(),'YYYYMMDD') || '-' || substr(NEW.id::text,1,6);
  END IF;
  NEW.valor_liquido := NEW.valor_bruto - NEW.desconto + NEW.juros + NEW.multa;
  IF NEW.saldo = 0 AND NEW.valor_liquido > 0 THEN
    NEW.saldo := NEW.valor_liquido;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tf_gera_codigo BEFORE INSERT ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_tf_gera_codigo();

-- State machine
CREATE OR REPLACE FUNCTION public.tg_tf_valida_transicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_valid boolean;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF public.is_admin(v_user) THEN RETURN NEW; END IF;
  v_valid := CASE OLD.status
    WHEN 'PENDENTE'    THEN NEW.status IN ('PARCIAL','RECEBIDO','ATRASADO','CANCELADO','RENEGOCIADO')
    WHEN 'PARCIAL'     THEN NEW.status IN ('RECEBIDO','ATRASADO','CANCELADO','RENEGOCIADO')
    WHEN 'ATRASADO'    THEN NEW.status IN ('PARCIAL','RECEBIDO','CANCELADO','RENEGOCIADO')
    WHEN 'RECEBIDO'    THEN false
    WHEN 'CANCELADO'   THEN false
    WHEN 'RENEGOCIADO' THEN false
    ELSE false END;
  IF NOT v_valid THEN
    RAISE EXCEPTION 'Transição inválida de % para % no título financeiro.', OLD.status, NEW.status
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tf_valida_transicao BEFORE UPDATE OF status ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_tf_valida_transicao();

-- Recalcular saldo após movimentação
CREATE OR REPLACE FUNCTION public.tg_mf_aplica_movimento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tit record;
  v_par record;
  v_delta numeric := 0;
  v_novo_saldo numeric;
  v_user uuid := auth.uid();
  v_email text;
BEGIN
  SELECT * INTO v_tit FROM public.titulos_financeiros WHERE id = NEW.titulo_id FOR UPDATE;
  IF v_tit.id IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado.' USING ERRCODE='22023';
  END IF;
  IF v_tit.status IN ('CANCELADO','RENEGOCIADO','RECEBIDO') THEN
    RAISE EXCEPTION 'Título em status % não aceita movimentação.', v_tit.status USING ERRCODE='42501';
  END IF;

  -- delta no saldo
  v_delta := CASE NEW.tipo
    WHEN 'recebimento' THEN -NEW.valor
    WHEN 'baixa'       THEN -NEW.valor
    WHEN 'estorno'     THEN  NEW.valor
    WHEN 'juros'       THEN  NEW.valor
    WHEN 'multa'       THEN  NEW.valor
    WHEN 'desconto'    THEN -NEW.valor
    ELSE 0 END;

  v_novo_saldo := v_tit.saldo + v_delta;
  IF v_novo_saldo < -0.001 THEN
    RAISE EXCEPTION 'Movimentação excede o saldo do título (saldo=% delta=%).', v_tit.saldo, v_delta
      USING ERRCODE='22023';
  END IF;

  -- Atualiza parcela se informada
  IF NEW.parcela_id IS NOT NULL THEN
    SELECT * INTO v_par FROM public.parcelas_financeiras WHERE id = NEW.parcela_id FOR UPDATE;
    IF v_par.titulo_id <> NEW.titulo_id THEN
      RAISE EXCEPTION 'Parcela não pertence ao título.' USING ERRCODE='22023';
    END IF;
    IF NEW.tipo IN ('recebimento','baixa','desconto') THEN
      IF v_par.saldo + v_delta < -0.001 THEN
        RAISE EXCEPTION 'Movimentação excede o saldo da parcela.' USING ERRCODE='22023';
      END IF;
      UPDATE public.parcelas_financeiras
        SET saldo = saldo + v_delta,
            status = CASE
              WHEN saldo + v_delta <= 0.001 THEN 'RECEBIDO'
              WHEN saldo + v_delta < valor THEN 'PARCIAL'
              ELSE 'PENDENTE' END,
            recebido_em = CASE WHEN saldo + v_delta <= 0.001 THEN now() ELSE recebido_em END
        WHERE id = NEW.parcela_id;
    END IF;
  END IF;

  -- Atualiza título
  UPDATE public.titulos_financeiros
    SET saldo = v_novo_saldo,
        status = CASE
          WHEN v_novo_saldo <= 0.001 THEN 'RECEBIDO'
          WHEN v_novo_saldo < valor_liquido THEN 'PARCIAL'
          ELSE status END,
        juros = juros + CASE WHEN NEW.tipo='juros' THEN NEW.valor ELSE 0 END,
        multa = multa + CASE WHEN NEW.tipo='multa' THEN NEW.valor ELSE 0 END,
        desconto = desconto + CASE WHEN NEW.tipo='desconto' THEN NEW.valor ELSE 0 END
    WHERE id = NEW.titulo_id;

  -- preenche user na movimentação
  IF NEW.user_id IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
    NEW.user_id := v_user;
    NEW.user_email := v_email;
  END IF;

  RETURN NEW;
END $$;
CREATE TRIGGER mf_aplica_movimento BEFORE INSERT ON public.movimentacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_mf_aplica_movimento();

-- Bloqueio append-only
CREATE OR REPLACE FUNCTION public.tg_mf_bloqueia_update_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Movimentações financeiras são append-only.' USING ERRCODE='42501';
END $$;
CREATE TRIGGER mf_no_update BEFORE UPDATE ON public.movimentacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_mf_bloqueia_update_delete();
CREATE TRIGGER mf_no_delete BEFORE DELETE ON public.movimentacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_mf_bloqueia_update_delete();

-- updated_at + audit + snapshot em títulos e parcelas
CREATE TRIGGER tf_set_updated_at BEFORE UPDATE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
CREATE TRIGGER tf_audit AFTER INSERT OR UPDATE OR DELETE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','titulos_financeiros');
CREATE TRIGGER tf_snapshot AFTER INSERT OR UPDATE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

CREATE TRIGGER pf_set_updated_at BEFORE UPDATE ON public.parcelas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();
CREATE TRIGGER pf_audit AFTER INSERT OR UPDATE OR DELETE ON public.parcelas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','parcelas_financeiras');

CREATE TRIGGER mf_audit AFTER INSERT ON public.movimentacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','movimentacoes_financeiras');

-- Bloqueio por período fechado
CREATE OR REPLACE FUNCTION public.tg_tf_guard_periodo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF OLD.competencia IS NOT NULL AND public.is_period_closed('financeiro', OLD.competencia) THEN
    RAISE EXCEPTION 'Competência (%) fechada para o módulo financeiro.', OLD.competencia
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tf_guard_periodo BEFORE UPDATE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_tf_guard_periodo();

-- 7) RPCs OPERACIONAIS ----------------------------------------

-- Gerar títulos a partir de PV aprovado
CREATE OR REPLACE FUNCTION public.gerar_titulos_do_pv(_pv_id uuid, _parcelas jsonb DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  pv record;
  v_titulo_id uuid;
  v_parcela jsonb;
  v_n int := 0;
  v_valor_total numeric;
  v_qtde int;
  v_valor_parc numeric;
BEGIN
  SELECT * INTO pv FROM public.pedidos_venda WHERE id = _pv_id AND deleted_at IS NULL;
  IF pv.id IS NULL THEN RAISE EXCEPTION 'PV não encontrado.' USING ERRCODE='22023'; END IF;
  IF pv.status NOT IN ('APROVADO','EM_EXECUCAO','FATURADO') THEN
    RAISE EXCEPTION 'PV em status % não permite geração de títulos.', pv.status USING ERRCODE='22023';
  END IF;
  IF NOT (public.is_admin(v_user) OR pv.consultor_id = v_user) THEN
    RAISE EXCEPTION 'Sem permissão para gerar títulos deste PV.' USING ERRCODE='42501';
  END IF;

  -- idempotência: se já existe título não-cancelado com essa origem, retorna o primeiro
  SELECT id INTO v_titulo_id FROM public.titulos_financeiros
    WHERE origem_tipo='pedido_venda' AND origem_id=_pv_id
      AND status <> 'CANCELADO' AND deleted_at IS NULL
    ORDER BY created_at LIMIT 1;
  IF v_titulo_id IS NOT NULL THEN RETURN v_titulo_id; END IF;

  v_valor_total := COALESCE(pv.valor_total, 0);

  INSERT INTO public.titulos_financeiros
    (tipo, origem_tipo, origem_id, cliente_id, consultor_id, valor_bruto, valor_liquido, saldo,
     competencia, vencimento, forma_pagamento, status, observacoes)
  VALUES
    ('receber','pedido_venda',_pv_id, pv.cliente_id, pv.consultor_id,
     v_valor_total, v_valor_total, v_valor_total,
     CURRENT_DATE, CURRENT_DATE + 30, pv.forma_pagamento, 'PENDENTE',
     'Gerado automaticamente do PV ' || COALESCE(pv.codigo, _pv_id::text))
  RETURNING id INTO v_titulo_id;

  -- Parcelas: se _parcelas for array de {vencimento, valor}, usa; senão cria 1 parcela
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
END $$;

-- Receber parcela
CREATE OR REPLACE FUNCTION public.receber_parcela(
  _parcela_id uuid, _valor numeric, _conta_id uuid DEFAULT NULL,
  _data timestamptz DEFAULT now(), _forma_pagamento text DEFAULT NULL, _obs text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_par record; v_mov_id uuid;
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser positivo.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_par FROM public.parcelas_financeiras WHERE id = _parcela_id;
  IF v_par.id IS NULL THEN RAISE EXCEPTION 'Parcela não encontrada.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.movimentacoes_financeiras
    (titulo_id, parcela_id, tipo, valor, data, conta_id, forma_pagamento, observacao)
  VALUES (v_par.titulo_id, _parcela_id, 'recebimento', _valor, _data, _conta_id, _forma_pagamento, _obs)
  RETURNING id INTO v_mov_id;
  RETURN v_mov_id;
END $$;

-- Cancelar título
CREATE OR REPLACE FUNCTION public.cancelar_titulo(_titulo_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE='22023';
  END IF;
  SELECT * INTO t FROM public.titulos_financeiros WHERE id=_titulo_id AND deleted_at IS NULL;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Título não encontrado.' USING ERRCODE='22023'; END IF;
  IF t.status IN ('RECEBIDO','CANCELADO','RENEGOCIADO') THEN
    RAISE EXCEPTION 'Título em status % não pode ser cancelado.', t.status USING ERRCODE='22023';
  END IF;
  UPDATE public.titulos_financeiros
    SET status='CANCELADO', motivo_cancelamento=_motivo, cancelado_em=now()
    WHERE id=_titulo_id;
END $$;

-- Renegociar título (substitui parcelas pendentes)
CREATE OR REPLACE FUNCTION public.renegociar_titulo(_titulo_id uuid, _novas_parcelas jsonb, _motivo text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t record; v_novo_id uuid; v_saldo numeric; v_parcela jsonb; v_n int := 0;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 3 caracteres).' USING ERRCODE='22023';
  END IF;
  IF _novas_parcelas IS NULL OR jsonb_typeof(_novas_parcelas) <> 'array' OR jsonb_array_length(_novas_parcelas)=0 THEN
    RAISE EXCEPTION 'Parcelas obrigatórias.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO t FROM public.titulos_financeiros WHERE id=_titulo_id AND deleted_at IS NULL;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Título não encontrado.' USING ERRCODE='22023'; END IF;
  IF t.status NOT IN ('PENDENTE','PARCIAL','ATRASADO') THEN
    RAISE EXCEPTION 'Título em status % não pode ser renegociado.', t.status USING ERRCODE='22023';
  END IF;
  v_saldo := t.saldo;

  -- marca original como RENEGOCIADO
  UPDATE public.titulos_financeiros
    SET status='RENEGOCIADO',
        observacoes = COALESCE(observacoes,'') || E'\n[Renegociado] ' || _motivo
    WHERE id=_titulo_id;

  -- cria novo título com mesmo origem
  INSERT INTO public.titulos_financeiros
    (tipo, origem_tipo, origem_id, cliente_id, consultor_id, valor_bruto, valor_liquido, saldo,
     competencia, vencimento, forma_pagamento, status, observacoes)
  VALUES
    (t.tipo, t.origem_tipo, t.origem_id, t.cliente_id, t.consultor_id,
     v_saldo, v_saldo, v_saldo, CURRENT_DATE, CURRENT_DATE + 30,
     t.forma_pagamento, 'PENDENTE',
     'Renegociação do título ' || COALESCE(t.codigo, _titulo_id::text) || ' — ' || _motivo)
  RETURNING id INTO v_novo_id;

  FOR v_parcela IN SELECT * FROM jsonb_array_elements(_novas_parcelas) LOOP
    v_n := v_n + 1;
    INSERT INTO public.parcelas_financeiras (titulo_id, numero, valor, saldo, vencimento)
    VALUES (v_novo_id, v_n,
            (v_parcela->>'valor')::numeric,
            (v_parcela->>'valor')::numeric,
            (v_parcela->>'vencimento')::date);
  END LOOP;

  RETURN v_novo_id;
END $$;
