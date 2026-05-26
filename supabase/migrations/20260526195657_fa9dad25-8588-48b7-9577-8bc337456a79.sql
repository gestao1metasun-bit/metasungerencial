
-- =========================================================================
-- D4.6.1 — Automações financeiras (atualização automática de status)
-- =========================================================================

-- Recalcula status de uma parcela com base em saldo/vencimento
CREATE OR REPLACE FUNCTION public.tg_pf_auto_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('CANCELADA','RENEGOCIADA') THEN
    IF NEW.saldo <= 0 THEN
      NEW.status := 'RECEBIDO';
      IF NEW.recebido_em IS NULL THEN NEW.recebido_em := now(); END IF;
    ELSIF NEW.saldo < NEW.valor THEN
      NEW.status := 'PARCIAL';
    ELSIF NEW.vencimento < CURRENT_DATE THEN
      NEW.status := 'ATRASADO';
    ELSE
      NEW.status := 'PENDENTE';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_pf_auto_status ON public.parcelas_financeiras;
CREATE TRIGGER tg_pf_auto_status
BEFORE INSERT OR UPDATE OF saldo, vencimento ON public.parcelas_financeiras
FOR EACH ROW EXECUTE FUNCTION public.tg_pf_auto_status();

-- Recalcula status do título a partir das parcelas (após mudança em parcela)
CREATE OR REPLACE FUNCTION public.tg_tf_recalc_from_parcelas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo uuid := COALESCE(NEW.titulo_id, OLD.titulo_id);
  v_saldo numeric;
  v_valor numeric;
  v_min_venc date;
  v_status text;
BEGIN
  SELECT COALESCE(SUM(saldo),0), COALESCE(SUM(valor),0), MIN(vencimento)
    INTO v_saldo, v_valor, v_min_venc
  FROM public.parcelas_financeiras
  WHERE titulo_id = v_titulo AND status NOT IN ('CANCELADA','RENEGOCIADA');

  IF v_saldo <= 0 AND v_valor > 0 THEN
    v_status := 'RECEBIDO';
  ELSIF v_saldo < v_valor THEN
    v_status := 'PARCIAL';
  ELSIF v_min_venc IS NOT NULL AND v_min_venc < CURRENT_DATE THEN
    v_status := 'ATRASADO';
  ELSE
    v_status := 'PENDENTE';
  END IF;

  -- Marca flag para passar pelo guarda tg_tf_bloqueia_baixa_manual
  PERFORM set_config('app.via_movimentacao', 'true', true);
  UPDATE public.titulos_financeiros
     SET status = v_status, saldo = v_saldo, updated_at = now()
   WHERE id = v_titulo
     AND status NOT IN ('CANCELADO','RENEGOCIADO')
     AND status IS DISTINCT FROM v_status;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_tf_recalc_from_parcelas ON public.parcelas_financeiras;
CREATE TRIGGER tg_tf_recalc_from_parcelas
AFTER INSERT OR UPDATE OR DELETE ON public.parcelas_financeiras
FOR EACH ROW EXECUTE FUNCTION public.tg_tf_recalc_from_parcelas();

-- RPC para reprocessar atrasos (chamar via scheduler/cron externo ou manual)
CREATE OR REPLACE FUNCTION public.recalcular_status_vencidos()
RETURNS TABLE(parcelas_atualizadas int, titulos_atualizados int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pf int := 0;
  v_tf int := 0;
BEGIN
  UPDATE public.parcelas_financeiras
     SET status = 'ATRASADO', updated_at = now()
   WHERE saldo > 0
     AND vencimento < CURRENT_DATE
     AND status = 'PENDENTE';
  GET DIAGNOSTICS v_pf = ROW_COUNT;

  PERFORM set_config('app.via_movimentacao', 'true', true);
  UPDATE public.titulos_financeiros t
     SET status = 'ATRASADO', updated_at = now()
   WHERE t.saldo > 0
     AND t.vencimento < CURRENT_DATE
     AND t.status = 'PENDENTE';
  GET DIAGNOSTICS v_tf = ROW_COUNT;

  RETURN QUERY SELECT v_pf, v_tf;
END $$;

GRANT EXECUTE ON FUNCTION public.recalcular_status_vencidos() TO authenticated;

-- =========================================================================
-- D4.6.2 — Estoque: bloqueio de saldo negativo
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tg_em_bloqueia_saldo_negativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo numeric;
  v_qtd numeric;
BEGIN
  IF NEW.tipo NOT IN ('saida','baixa_entrega','ajuste_neg','entrega') THEN
    RETURN NEW;
  END IF;
  -- Admin pode forçar (exceção controlada com motivo já validado em outro trigger)
  IF public.is_admin(NEW.user_id) THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(CASE
            WHEN tipo IN ('entrada','ajuste_pos','devolucao') THEN quantidade
            WHEN tipo IN ('saida','baixa_entrega','ajuste_neg','entrega') THEN -quantidade
            ELSE 0 END), 0)
    INTO v_saldo
  FROM public.estoque_movimentos
  WHERE produto_id = NEW.produto_id;

  v_qtd := COALESCE(NEW.quantidade, 0);
  IF v_saldo - v_qtd < 0 THEN
    RAISE EXCEPTION 'Movimento bloqueado: saldo físico ficaria negativo (% - % < 0) para produto %.',
      v_saldo, v_qtd, NEW.produto_id USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_em_bloqueia_saldo_negativo ON public.estoque_movimentos;
CREATE TRIGGER tg_em_bloqueia_saldo_negativo
BEFORE INSERT ON public.estoque_movimentos
FOR EACH ROW EXECUTE FUNCTION public.tg_em_bloqueia_saldo_negativo();

-- =========================================================================
-- D4.6.3 — PV cancelado bloqueia novos vínculos financeiro/estoque
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tg_tf_bloqueia_pv_cancelado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  IF NEW.origem_tipo = 'pedido_venda' AND NEW.origem_id IS NOT NULL THEN
    SELECT status INTO v_status FROM public.pedidos_venda WHERE id = NEW.origem_id;
    IF v_status = 'CANCELADO' THEN
      RAISE EXCEPTION 'Título não pode ser vinculado a PV cancelado (%).', NEW.origem_id
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_tf_bloqueia_pv_cancelado ON public.titulos_financeiros;
CREATE TRIGGER tg_tf_bloqueia_pv_cancelado
BEFORE INSERT OR UPDATE OF origem_tipo, origem_id ON public.titulos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.tg_tf_bloqueia_pv_cancelado();

CREATE OR REPLACE FUNCTION public.tg_er_bloqueia_pv_cancelado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  IF NEW.pv_id IS NOT NULL THEN
    SELECT status INTO v_status FROM public.pedidos_venda WHERE id = NEW.pv_id;
    IF v_status = 'CANCELADO' THEN
      RAISE EXCEPTION 'Reserva não pode ser vinculada a PV cancelado (%).', NEW.pv_id
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_er_bloqueia_pv_cancelado ON public.estoque_reservas;
CREATE TRIGGER tg_er_bloqueia_pv_cancelado
BEFORE INSERT ON public.estoque_reservas
FOR EACH ROW EXECUTE FUNCTION public.tg_er_bloqueia_pv_cancelado();

-- =========================================================================
-- D4.6.4 — View de hardening / diagnóstico residual
-- =========================================================================
CREATE OR REPLACE VIEW public.v_hardening_report
WITH (security_invoker=on) AS
SELECT 'TITULOS_SEM_PARCELA' AS categoria, 'medio' AS severidade,
       COUNT(*)::int AS qtd,
       'Títulos sem parcelas associadas' AS descricao
  FROM public.titulos_financeiros t
 WHERE t.deleted_at IS NULL
   AND t.status NOT IN ('CANCELADO','RENEGOCIADO')
   AND NOT EXISTS (SELECT 1 FROM public.parcelas_financeiras p WHERE p.titulo_id = t.id)
UNION ALL
SELECT 'TITULOS_STATUS_INCONSISTENTE', 'alto', COUNT(*)::int,
       'Títulos com saldo=0 mas status != RECEBIDO/CANCELADO'
  FROM public.titulos_financeiros
 WHERE deleted_at IS NULL AND saldo <= 0
   AND status NOT IN ('RECEBIDO','CANCELADO','RENEGOCIADO')
UNION ALL
SELECT 'PARCELAS_VENCIDAS_NAO_MARCADAS', 'medio', COUNT(*)::int,
       'Parcelas vencidas ainda como PENDENTE'
  FROM public.parcelas_financeiras
 WHERE saldo > 0 AND vencimento < CURRENT_DATE AND status = 'PENDENTE'
UNION ALL
SELECT 'RESERVAS_PV_CANCELADO', 'alto', COUNT(*)::int,
       'Reservas ativas em PVs cancelados'
  FROM public.estoque_reservas r
  JOIN public.pedidos_venda pv ON pv.id = r.pv_id
 WHERE r.status = 'ATIVA' AND pv.status = 'CANCELADO'
UNION ALL
SELECT 'OBRAS_SEM_CONTRATO', 'baixo', COUNT(*)::int,
       'Obras sem contrato vinculado'
  FROM public.obras WHERE contrato_id IS NULL AND deleted_at IS NULL
UNION ALL
SELECT 'MOV_ESTOQUE_SEM_ORIGEM', 'medio', COUNT(*)::int,
       'Movimentos de estoque sem rastreabilidade'
  FROM public.estoque_movimentos
 WHERE origem_tipo IS NULL AND obra_id IS NULL AND pv_id IS NULL AND projeto_id IS NULL;

GRANT SELECT ON public.v_hardening_report TO authenticated;

-- =========================================================================
-- D4.6.5 — Alertas operacionais (engenharia + estoque)
-- =========================================================================
CREATE OR REPLACE VIEW public.v_alertas_operacionais
WITH (security_invoker=on) AS
SELECT 'OBRA_SEM_MATERIAL' AS tipo, 'aviso' AS severidade,
       o.id AS entidade_id, o.codigo AS referencia,
       'Obra ativa sem reserva de material' AS mensagem,
       o.consultor_id
  FROM public.obras o
 WHERE o.deleted_at IS NULL
   AND o.status IN ('Planejada','Em andamento')
   AND NOT EXISTS (SELECT 1 FROM public.estoque_reservas r
                    WHERE r.obra_id = o.id AND r.status = 'ATIVA')
UNION ALL
SELECT 'ESTOQUE_BAIXO', 'aviso',
       p.id, p.codigo,
       'Estoque abaixo do mínimo (' || p.estoque_minimo || ')',
       NULL::uuid
  FROM public.produtos p
 WHERE p.ativo AND p.estoque_minimo > 0
   AND COALESCE((
     SELECT SUM(CASE WHEN tipo IN ('entrada','ajuste_pos','devolucao') THEN quantidade
                     WHEN tipo IN ('saida','baixa_entrega','ajuste_neg','entrega') THEN -quantidade
                     ELSE 0 END)
       FROM public.estoque_movimentos WHERE produto_id = p.id
   ), 0) < p.estoque_minimo;

GRANT SELECT ON public.v_alertas_operacionais TO authenticated;
