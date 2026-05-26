
-- =====================================================================
-- D5.3 — Material ↔ Compra com desvio inteligente de estoque
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.solicitacao_material_status AS ENUM (
    'RASCUNHO','PENDENTE_APROVACAO_SETOR','NEGADA_SETOR','CANCELADA',
    'ATENDIDA_ESTOQUE','AGUARDANDO_COMPRA','CONCLUIDA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ordem_compra_status AS ENUM (
    'COTACAO','AGUARDANDO_APROVACAO_FIN','APROVADA','NEGADA','RECEBIDA','CANCELADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cotacao_status AS ENUM ('ATIVA','ESCOLHIDA','DESCARTADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TABELAS ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitacoes_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  solicitante_id uuid NOT NULL,
  solicitante_email text,
  setor text,
  obra_id uuid,
  pv_id uuid,
  motivo text,
  prioridade text NOT NULL DEFAULT 'NORMAL',
  status public.solicitacao_material_status NOT NULL DEFAULT 'RASCUNHO',
  valor_estimado numeric NOT NULL DEFAULT 0,
  workflow_setor_id uuid,
  aprovado_setor_em timestamptz,
  aprovado_setor_por uuid,
  motivo_negacao text,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  concluido_em timestamptz,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.solicitacoes_material TO authenticated;
GRANT ALL ON public.solicitacoes_material TO service_role;
ALTER TABLE public.solicitacoes_material ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sm_solicitante ON public.solicitacoes_material(solicitante_id, status);
CREATE INDEX IF NOT EXISTS idx_sm_status ON public.solicitacoes_material(status);
CREATE INDEX IF NOT EXISTS idx_sm_obra ON public.solicitacoes_material(obra_id);

CREATE TABLE IF NOT EXISTS public.solicitacao_material_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes_material(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade_solicitada numeric NOT NULL CHECK (quantidade_solicitada > 0),
  quantidade_reservada numeric NOT NULL DEFAULT 0,
  quantidade_a_comprar numeric NOT NULL DEFAULT 0,
  custo_unitario_estimado numeric NOT NULL DEFAULT 0,
  reserva_id uuid,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.solicitacao_material_itens TO authenticated;
GRANT ALL ON public.solicitacao_material_itens TO service_role;
ALTER TABLE public.solicitacao_material_itens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_smi_solicitacao ON public.solicitacao_material_itens(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_smi_produto ON public.solicitacao_material_itens(produto_id);

CREATE TABLE IF NOT EXISTS public.ordens_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  solicitacao_id uuid REFERENCES public.solicitacoes_material(id),
  status public.ordem_compra_status NOT NULL DEFAULT 'COTACAO',
  fornecedor_nome text,
  fornecedor_doc text,
  cotacao_escolhida_id uuid,
  valor_total numeric NOT NULL DEFAULT 0,
  prazo_entrega_dias integer,
  workflow_fin_id uuid,
  aprovado_em timestamptz,
  aprovado_por uuid,
  recebido_em timestamptz,
  recebido_por uuid,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  titulo_financeiro_id uuid,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ordens_compra TO authenticated;
GRANT ALL ON public.ordens_compra TO service_role;
ALTER TABLE public.ordens_compra ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_oc_status ON public.ordens_compra(status);
CREATE INDEX IF NOT EXISTS idx_oc_solicitacao ON public.ordens_compra(solicitacao_id);

CREATE TABLE IF NOT EXISTS public.ordem_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  custo_unitario numeric NOT NULL DEFAULT 0,
  quantidade_recebida numeric NOT NULL DEFAULT 0,
  solicitacao_item_id uuid REFERENCES public.solicitacao_material_itens(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ordem_compra_itens TO authenticated;
GRANT ALL ON public.ordem_compra_itens TO service_role;
ALTER TABLE public.ordem_compra_itens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_oci_ordem ON public.ordem_compra_itens(ordem_id);

CREATE TABLE IF NOT EXISTS public.cotacoes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL REFERENCES public.ordens_compra(id) ON DELETE CASCADE,
  fornecedor_nome text NOT NULL,
  fornecedor_doc text,
  valor_total numeric NOT NULL CHECK (valor_total >= 0),
  prazo_entrega_dias integer,
  validade_dias integer,
  observacoes text,
  anexo_url text,
  status public.cotacao_status NOT NULL DEFAULT 'ATIVA',
  registrado_por uuid,
  registrado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.cotacoes_compra TO authenticated;
GRANT ALL ON public.cotacoes_compra TO service_role;
ALTER TABLE public.cotacoes_compra ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cc_ordem ON public.cotacoes_compra(ordem_id);

-- RLS ---------------------------------------------------------------
CREATE POLICY sm_select ON public.solicitacoes_material FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR solicitante_id = auth.uid()
         OR has_permission(auth.uid(),'estoque.comprar'::app_permission)
         OR has_permission(auth.uid(),'workflow.aprovar.operacional'::app_permission));
CREATE POLICY sm_insert ON public.solicitacoes_material FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY sm_update_owner_or_admin ON public.solicitacoes_material FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR (solicitante_id = auth.uid() AND status = 'RASCUNHO'))
  WITH CHECK (is_admin(auth.uid()) OR (solicitante_id = auth.uid() AND status = 'RASCUNHO'));

CREATE POLICY smi_select ON public.solicitacao_material_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.solicitacoes_material s WHERE s.id = solicitacao_id
    AND (is_admin(auth.uid()) OR s.solicitante_id = auth.uid()
         OR has_permission(auth.uid(),'estoque.comprar'::app_permission)
         OR has_permission(auth.uid(),'workflow.aprovar.operacional'::app_permission))));
CREATE POLICY smi_insert ON public.solicitacao_material_itens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.solicitacoes_material s WHERE s.id = solicitacao_id
    AND (is_admin(auth.uid()) OR (s.solicitante_id = auth.uid() AND s.status = 'RASCUNHO'))));
CREATE POLICY smi_update ON public.solicitacao_material_itens FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.solicitacoes_material s WHERE s.id = solicitacao_id
    AND (is_admin(auth.uid()) OR (s.solicitante_id = auth.uid() AND s.status = 'RASCUNHO'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.solicitacoes_material s WHERE s.id = solicitacao_id
    AND (is_admin(auth.uid()) OR (s.solicitante_id = auth.uid() AND s.status = 'RASCUNHO'))));

CREATE POLICY oc_select ON public.ordens_compra FOR SELECT TO authenticated
  USING (is_admin(auth.uid())
         OR has_permission(auth.uid(),'estoque.comprar'::app_permission)
         OR has_permission(auth.uid(),'workflow.aprovar.financeiro'::app_permission)
         OR EXISTS (SELECT 1 FROM public.solicitacoes_material s WHERE s.id = solicitacao_id AND s.solicitante_id = auth.uid()));
CREATE POLICY oc_write_admin ON public.ordens_compra FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission))
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission));

CREATE POLICY oci_select ON public.ordem_compra_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ordens_compra o WHERE o.id = ordem_id));
CREATE POLICY oci_write_admin ON public.ordem_compra_itens FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission))
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission));

CREATE POLICY cc_select ON public.cotacoes_compra FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ordens_compra o WHERE o.id = ordem_id));
CREATE POLICY cc_write ON public.cotacoes_compra FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission))
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission));

-- TRIGGER de proteção de status ------------------------------------
CREATE OR REPLACE FUNCTION public.tg_sm_protege_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF current_setting('app.via_sm_rpc', true) <> 'true' AND NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Status da solicitação só pode ser alterado pelas RPCs oficiais.' USING ERRCODE='42501';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_sm_status_guard ON public.solicitacoes_material;
CREATE TRIGGER tg_sm_status_guard BEFORE UPDATE ON public.solicitacoes_material
FOR EACH ROW EXECUTE FUNCTION public.tg_sm_protege_status();

CREATE OR REPLACE FUNCTION public.tg_oc_protege_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF current_setting('app.via_sm_rpc', true) <> 'true' AND NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Status da ordem de compra só pode ser alterado pelas RPCs oficiais.' USING ERRCODE='42501';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_oc_status_guard ON public.ordens_compra;
CREATE TRIGGER tg_oc_status_guard BEFORE UPDATE ON public.ordens_compra
FOR EACH ROW EXECUTE FUNCTION public.tg_oc_protege_status();

-- Função saldo de estoque ------------------------------------------
CREATE OR REPLACE FUNCTION public.estoque_saldo_disponivel(_produto_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    COALESCE((SELECT SUM(CASE WHEN tipo='entrada' THEN quantidade
                              WHEN tipo IN ('saida','baixa') THEN -quantidade ELSE 0 END)
              FROM estoque_movimentos WHERE produto_id=_produto_id),0)
  - COALESCE((SELECT SUM(quantidade_reservada - quantidade_entregue)
              FROM estoque_reservas WHERE produto_id=_produto_id AND status='ATIVA'),0)
$$;

-- RPC criar solicitação --------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_solicitacao_material(
  _setor text, _motivo text, _obra_id uuid, _itens jsonb, _prioridade text DEFAULT 'NORMAL'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_id uuid;
  v_codigo text;
  v_total numeric := 0;
  it jsonb;
  v_custo numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
  IF jsonb_array_length(_itens) = 0 THEN RAISE EXCEPTION 'Informe ao menos um item.' USING ERRCODE='22023'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id=v_user;
  v_codigo := 'SM-'||to_char(now(),'YYYYMMDD')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,6);

  PERFORM set_config('app.via_sm_rpc','true',true);
  INSERT INTO solicitacoes_material(codigo, solicitante_id, solicitante_email, setor, motivo, obra_id, prioridade, status)
    VALUES (v_codigo, v_user, v_email, _setor, _motivo, _obra_id, COALESCE(_prioridade,'NORMAL'), 'RASCUNHO')
    RETURNING id INTO v_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    SELECT custo_unitario INTO v_custo FROM produtos WHERE id = (it->>'produto_id')::uuid;
    v_total := v_total + COALESCE(v_custo,0) * (it->>'quantidade')::numeric;
    INSERT INTO solicitacao_material_itens(solicitacao_id, produto_id, quantidade_solicitada, custo_unitario_estimado, observacao)
      VALUES (v_id, (it->>'produto_id')::uuid, (it->>'quantidade')::numeric, COALESCE(v_custo,0), it->>'observacao');
  END LOOP;

  UPDATE solicitacoes_material SET valor_estimado=v_total WHERE id=v_id;
  PERFORM set_config('app.via_sm_rpc','false',true);
  RETURN v_id;
END $$;

-- RPC enviar para aprovação setor ----------------------------------
CREATE OR REPLACE FUNCTION public.enviar_solicitacao_material(_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record; v_wf uuid;
BEGIN
  SELECT * INTO s FROM solicitacoes_material WHERE id=_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE='22023'; END IF;
  IF s.status <> 'RASCUNHO' THEN RAISE EXCEPTION 'Apenas rascunhos podem ser enviados.' USING ERRCODE='22023'; END IF;
  IF s.solicitante_id <> auth.uid() AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501'; END IF;

  v_wf := public.solicitar_aprovacao(
    'material'::text,
    'Solicitação de Material '||s.codigo,
    s.valor_estimado,
    jsonb_build_object('solicitacao_id', s.id, 'setor', s.setor),
    'solicitacao_material', s.id, s.setor, NULL, s.motivo,
    'Material — '||COALESCE(s.setor,'sem setor')
  );

  PERFORM set_config('app.via_sm_rpc','true',true);
  UPDATE solicitacoes_material SET status='PENDENTE_APROVACAO_SETOR', workflow_setor_id=v_wf WHERE id=_id;
  PERFORM set_config('app.via_sm_rpc','false',true);
  RETURN v_wf;
END $$;

-- Núcleo: desvio inteligente ---------------------------------------
CREATE OR REPLACE FUNCTION public.processar_aprovacao_material(_solicitacao_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  s record; it record; v_saldo numeric; v_reserva numeric; v_comprar numeric;
  v_ordem_id uuid; v_codigo text; v_total_compra numeric := 0; v_tem_compra boolean := false;
  v_reserva_id uuid; v_user uuid; v_email text;
BEGIN
  SELECT * INTO s FROM solicitacoes_material WHERE id=_solicitacao_id FOR UPDATE;
  IF s.id IS NULL THEN RETURN; END IF;
  IF s.status <> 'PENDENTE_APROVACAO_SETOR' THEN RETURN; END IF;

  v_user := s.solicitante_id;
  SELECT email INTO v_email FROM auth.users WHERE id=v_user;

  PERFORM set_config('app.via_sm_rpc','true',true);

  FOR it IN SELECT * FROM solicitacao_material_itens WHERE solicitacao_id=_solicitacao_id LOOP
    v_saldo := public.estoque_saldo_disponivel(it.produto_id);
    v_reserva := LEAST(GREATEST(v_saldo,0), it.quantidade_solicitada);
    v_comprar := it.quantidade_solicitada - v_reserva;

    IF v_reserva > 0 THEN
      INSERT INTO estoque_reservas(produto_id, obra_id, quantidade_reservada, motivo, created_by, status)
        VALUES (it.produto_id, s.obra_id, v_reserva, 'Solicitação '||s.codigo, v_user, 'ATIVA')
        RETURNING id INTO v_reserva_id;
      INSERT INTO estoque_movimentos(produto_id, tipo, quantidade, obra_id, reserva_id, origem_tipo, motivo, user_id, user_email)
        VALUES (it.produto_id, 'reserva', v_reserva, s.obra_id, v_reserva_id, 'solicitacao_material', s.codigo, v_user, v_email);
      UPDATE solicitacao_material_itens
        SET quantidade_reservada=v_reserva, quantidade_a_comprar=v_comprar, reserva_id=v_reserva_id
        WHERE id=it.id;
    ELSE
      UPDATE solicitacao_material_itens
        SET quantidade_a_comprar=v_comprar WHERE id=it.id;
    END IF;

    IF v_comprar > 0 THEN
      v_tem_compra := true;
      IF v_ordem_id IS NULL THEN
        v_codigo := 'OC-'||to_char(now(),'YYYYMMDD')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,6);
        INSERT INTO ordens_compra(codigo, solicitacao_id, status, valor_total)
          VALUES (v_codigo, s.id, 'COTACAO', 0) RETURNING id INTO v_ordem_id;
      END IF;
      INSERT INTO ordem_compra_itens(ordem_id, produto_id, quantidade, custo_unitario, solicitacao_item_id)
        VALUES (v_ordem_id, it.produto_id, v_comprar, it.custo_unitario_estimado, it.id);
      v_total_compra := v_total_compra + v_comprar * it.custo_unitario_estimado;
    END IF;
  END LOOP;

  IF v_tem_compra THEN
    UPDATE ordens_compra SET valor_total=v_total_compra WHERE id=v_ordem_id;
    UPDATE solicitacoes_material
      SET status='AGUARDANDO_COMPRA', aprovado_setor_em=now(), aprovado_setor_por=auth.uid()
      WHERE id=_solicitacao_id;
  ELSE
    UPDATE solicitacoes_material
      SET status='ATENDIDA_ESTOQUE', aprovado_setor_em=now(), aprovado_setor_por=auth.uid(), concluido_em=now()
      WHERE id=_solicitacao_id;
  END IF;

  PERFORM set_config('app.via_sm_rpc','false',true);
END $$;

-- Processar aprovação compra ---------------------------------------
CREATE OR REPLACE FUNCTION public.processar_aprovacao_compra(_ordem_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o record;
BEGIN
  SELECT * INTO o FROM ordens_compra WHERE id=_ordem_id FOR UPDATE;
  IF o.id IS NULL OR o.status <> 'AGUARDANDO_APROVACAO_FIN' THEN RETURN; END IF;
  PERFORM set_config('app.via_sm_rpc','true',true);
  UPDATE ordens_compra SET status='APROVADA', aprovado_em=now(), aprovado_por=auth.uid() WHERE id=_ordem_id;
  PERFORM set_config('app.via_sm_rpc','false',true);
END $$;

-- Trigger dispatch via workflow ------------------------------------
CREATE OR REPLACE FUNCTION public.tg_wf_material_dispatch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='APROVADA' AND OLD.status='PENDENTE' AND NEW.origem_tipo='solicitacao_material' THEN
    PERFORM public.processar_aprovacao_material(NEW.origem_id);
  ELSIF NEW.status='NEGADA' AND OLD.status='PENDENTE' AND NEW.origem_tipo='solicitacao_material' THEN
    PERFORM set_config('app.via_sm_rpc','true',true);
    UPDATE solicitacoes_material SET status='NEGADA_SETOR', motivo_negacao=NEW.motivo_decisao WHERE id=NEW.origem_id;
    PERFORM set_config('app.via_sm_rpc','false',true);
  ELSIF NEW.status='APROVADA' AND OLD.status='PENDENTE' AND NEW.origem_tipo='ordem_compra' THEN
    PERFORM public.processar_aprovacao_compra(NEW.origem_id);
  ELSIF NEW.status='NEGADA' AND OLD.status='PENDENTE' AND NEW.origem_tipo='ordem_compra' THEN
    PERFORM set_config('app.via_sm_rpc','true',true);
    UPDATE ordens_compra SET status='NEGADA', motivo_cancelamento=NEW.motivo_decisao WHERE id=NEW.origem_id;
    PERFORM set_config('app.via_sm_rpc','false',true);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_wf_dispatch_material ON public.workflow_aprovacoes;
CREATE TRIGGER tg_wf_dispatch_material AFTER UPDATE ON public.workflow_aprovacoes
FOR EACH ROW EXECUTE FUNCTION public.tg_wf_material_dispatch();

-- RPC registrar cotação --------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_cotacao(
  _ordem_id uuid, _fornecedor text, _doc text, _valor numeric,
  _prazo_dias integer, _validade_dias integer, _obs text, _anexo text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501'; END IF;
  INSERT INTO cotacoes_compra(ordem_id, fornecedor_nome, fornecedor_doc, valor_total, prazo_entrega_dias, validade_dias, observacoes, anexo_url, registrado_por)
    VALUES (_ordem_id, _fornecedor, _doc, _valor, _prazo_dias, _validade_dias, _obs, _anexo, auth.uid())
    RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- RPC escolher cotação → workflow financeiro -----------------------
CREATE OR REPLACE FUNCTION public.escolher_cotacao(_cotacao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; o record; v_wf uuid;
BEGIN
  IF NOT (is_admin(auth.uid()) OR has_permission(auth.uid(),'estoque.comprar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501'; END IF;

  SELECT * INTO c FROM cotacoes_compra WHERE id=_cotacao_id;
  SELECT * INTO o FROM ordens_compra WHERE id=c.ordem_id FOR UPDATE;
  IF o.status <> 'COTACAO' THEN RAISE EXCEPTION 'Ordem não está em cotação.' USING ERRCODE='22023'; END IF;

  UPDATE cotacoes_compra SET status='DESCARTADA' WHERE ordem_id=c.ordem_id AND id<>_cotacao_id;
  UPDATE cotacoes_compra SET status='ESCOLHIDA' WHERE id=_cotacao_id;

  v_wf := public.solicitar_aprovacao(
    'compra'::text,
    'Compra '||o.codigo||' — '||c.fornecedor_nome,
    c.valor_total,
    jsonb_build_object('ordem_id', o.id, 'cotacao_id', c.id),
    'ordem_compra', o.id, NULL, NULL,
    'Aprovação financeira da compra '||o.codigo,
    'Fornecedor '||c.fornecedor_nome||' — R$ '||c.valor_total::text
  );

  PERFORM set_config('app.via_sm_rpc','true',true);
  UPDATE ordens_compra
    SET status='AGUARDANDO_APROVACAO_FIN', cotacao_escolhida_id=_cotacao_id,
        fornecedor_nome=c.fornecedor_nome, fornecedor_doc=c.fornecedor_doc,
        valor_total=c.valor_total, prazo_entrega_dias=c.prazo_entrega_dias,
        workflow_fin_id=v_wf
    WHERE id=o.id;
  PERFORM set_config('app.via_sm_rpc','false',true);
  RETURN v_wf;
END $$;

-- RPC receber ordem ------------------------------------------------
CREATE OR REPLACE FUNCTION public.receber_ordem_compra(_ordem_id uuid, _recebimentos jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  o record; oi record; s record; v_qtd numeric;
  v_user uuid := auth.uid(); v_email text;
BEGIN
  IF NOT (is_admin(v_user) OR has_permission(v_user,'estoque.comprar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501'; END IF;

  SELECT * INTO o FROM ordens_compra WHERE id=_ordem_id FOR UPDATE;
  IF o.status <> 'APROVADA' THEN RAISE EXCEPTION 'Ordem deve estar APROVADA.' USING ERRCODE='22023'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id=v_user;
  SELECT * INTO s FROM solicitacoes_material WHERE id=o.solicitacao_id;

  FOR oi IN SELECT * FROM ordem_compra_itens WHERE ordem_id=_ordem_id LOOP
    v_qtd := oi.quantidade;
    IF _recebimentos IS NOT NULL THEN
      v_qtd := COALESCE((_recebimentos->>oi.id::text)::numeric, oi.quantidade);
    END IF;

    INSERT INTO estoque_movimentos(produto_id, tipo, quantidade, custo_unitario, custo_total,
        obra_id, origem_tipo, motivo, user_id, user_email)
      VALUES (oi.produto_id, 'entrada', v_qtd, oi.custo_unitario, v_qtd*oi.custo_unitario,
              s.obra_id, 'ordem_compra', o.codigo, v_user, v_email);

    UPDATE ordem_compra_itens SET quantidade_recebida=v_qtd WHERE id=oi.id;

    IF oi.solicitacao_item_id IS NOT NULL AND s.obra_id IS NOT NULL THEN
      INSERT INTO estoque_reservas(produto_id, obra_id, quantidade_reservada, motivo, created_by, status)
        VALUES (oi.produto_id, s.obra_id, v_qtd, 'Recebimento '||o.codigo, v_user, 'ATIVA');
    END IF;
  END LOOP;

  PERFORM set_config('app.via_sm_rpc','true',true);
  UPDATE ordens_compra SET status='RECEBIDA', recebido_em=now(), recebido_por=v_user WHERE id=_ordem_id;
  IF s.id IS NOT NULL THEN
    UPDATE solicitacoes_material SET status='CONCLUIDA', concluido_em=now() WHERE id=s.id;
  END IF;
  PERFORM set_config('app.via_sm_rpc','false',true);
END $$;

-- RPC cancelar solicitação -----------------------------------------
CREATE OR REPLACE FUNCTION public.cancelar_solicitacao_material(_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM solicitacoes_material WHERE id=_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Não encontrada.' USING ERRCODE='22023'; END IF;
  IF NOT (is_admin(auth.uid()) OR s.solicitante_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501'; END IF;
  IF s.status IN ('CONCLUIDA','ATENDIDA_ESTOQUE','CANCELADA','NEGADA_SETOR') THEN
    RAISE EXCEPTION 'Solicitação no status % não pode ser cancelada.', s.status USING ERRCODE='22023'; END IF;

  PERFORM set_config('app.via_sm_rpc','true',true);
  UPDATE solicitacoes_material SET status='CANCELADA', cancelado_em=now(), motivo_cancelamento=_motivo WHERE id=_id;
  PERFORM set_config('app.via_sm_rpc','false',true);
END $$;

-- Alçadas seed -----------------------------------------------------
INSERT INTO workflow_alcadas (nome, tipo_operacao, valor_min, valor_max, permissao_requerida, ordem, descricao)
SELECT 'Material — Operacional', 'material', 0, NULL, 'workflow.aprovar.operacional'::app_permission, 10, 'Chefe de setor aprova solicitação de material'
WHERE NOT EXISTS (SELECT 1 FROM workflow_alcadas WHERE tipo_operacao='material');

INSERT INTO workflow_alcadas (nome, tipo_operacao, valor_min, valor_max, permissao_requerida, ordem, descricao)
SELECT 'Compra até R$ 5k — Financeiro', 'compra', 0, 5000, 'workflow.aprovar.financeiro'::app_permission, 10, 'Compras até R$ 5.000'
WHERE NOT EXISTS (SELECT 1 FROM workflow_alcadas WHERE tipo_operacao='compra' AND valor_min=0 AND valor_max=5000);

INSERT INTO workflow_alcadas (nome, tipo_operacao, valor_min, valor_max, permissao_requerida, ordem, descricao)
SELECT 'Compra R$ 5k–20k — Diretoria', 'compra', 5000, 20000, 'workflow.aprovar.diretoria'::app_permission, 20, 'Compras entre R$ 5.000 e R$ 20.000'
WHERE NOT EXISTS (SELECT 1 FROM workflow_alcadas WHERE tipo_operacao='compra' AND valor_min=5000 AND valor_max=20000);

INSERT INTO workflow_alcadas (nome, tipo_operacao, valor_min, valor_max, aprovador_role, ordem, descricao)
SELECT 'Compra > R$ 20k — Admin', 'compra', 20000, NULL, 'admin_master'::app_role, 30, 'Compras acima de R$ 20.000'
WHERE NOT EXISTS (SELECT 1 FROM workflow_alcadas WHERE tipo_operacao='compra' AND valor_min=20000 AND valor_max IS NULL);

-- Auditoria nas novas tabelas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='tg_audit_row') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_sm ON public.solicitacoes_material';
    EXECUTE 'CREATE TRIGGER audit_sm AFTER INSERT OR UPDATE OR DELETE ON public.solicitacoes_material FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row()';
    EXECUTE 'DROP TRIGGER IF EXISTS audit_oc ON public.ordens_compra';
    EXECUTE 'CREATE TRIGGER audit_oc AFTER INSERT OR UPDATE OR DELETE ON public.ordens_compra FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row()';
    EXECUTE 'DROP TRIGGER IF EXISTS audit_cc ON public.cotacoes_compra';
    EXECUTE 'CREATE TRIGGER audit_cc AFTER INSERT OR UPDATE OR DELETE ON public.cotacoes_compra FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row()';
  END IF;
END $$;
