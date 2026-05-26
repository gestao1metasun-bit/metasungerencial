-- Trigger guard: bloqueia mudança manual de status para PARCIAL/RECEBIDO
CREATE OR REPLACE FUNCTION public.tg_tf_bloqueia_baixa_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_via_mov text;
BEGIN
  -- Admin pode tudo (exceção controlada)
  IF public.is_admin(v_user) THEN RETURN NEW; END IF;

  -- Sem mudança de status, nada a fazer
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  -- Lê flag setada por tg_mf_aplica_movimento
  BEGIN
    v_via_mov := current_setting('app.via_movimentacao', true);
  EXCEPTION WHEN others THEN v_via_mov := NULL;
  END;

  -- Se a transição vai para PARCIAL/RECEBIDO, exige movimentação financeira
  IF NEW.status IN ('PARCIAL','RECEBIDO') AND COALESCE(v_via_mov,'') <> 'true' THEN
    RAISE EXCEPTION 'Mudança para % só é permitida via movimentação financeira (receber_parcela / movimentacoes_financeiras). UPDATE direto bloqueado.', NEW.status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_tf_bloqueia_baixa_manual ON public.titulos_financeiros;
CREATE TRIGGER tg_tf_bloqueia_baixa_manual
BEFORE UPDATE ON public.titulos_financeiros
FOR EACH ROW
EXECUTE FUNCTION public.tg_tf_bloqueia_baixa_manual();

-- Atualiza tg_mf_aplica_movimento para setar a flag antes do UPDATE no título
CREATE OR REPLACE FUNCTION public.tg_mf_aplica_movimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tit record;
  v_par record;
  v_delta numeric := 0;
  v_novo_saldo numeric;
  v_user uuid := auth.uid();
  v_email text;
BEGIN
  -- Lock pessimista no título para evitar race em recebimentos concorrentes
  SELECT * INTO v_tit FROM public.titulos_financeiros
    WHERE id = NEW.titulo_id FOR UPDATE;
  IF v_tit.id IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado.' USING ERRCODE='22023';
  END IF;
  IF v_tit.status IN ('CANCELADO','RENEGOCIADO','RECEBIDO') THEN
    RAISE EXCEPTION 'Título em status % não aceita movimentação.', v_tit.status USING ERRCODE='42501';
  END IF;

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

  -- Sinaliza ao guard que o UPDATE seguinte é legítimo (vindo da movimentação)
  PERFORM set_config('app.via_movimentacao', 'true', true);

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

  -- Reseta a flag
  PERFORM set_config('app.via_movimentacao', 'false', true);

  IF NEW.user_id IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
    NEW.user_id := v_user;
    NEW.user_email := v_email;
  END IF;

  RETURN NEW;
END $$;