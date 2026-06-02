
-- D23 — Central de Notificações Unificada (Foundation)
-- Tabela notificacoes + RLS + RPCs oficiais + 3 emitters iniciais

-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.notif_status AS ENUM ('NAO_LIDA','LIDA','ARQUIVADA','EXPIRADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notif_prioridade AS ENUM ('BAIXA','NORMAL','ALTA','CRITICA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TABLE
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_destino_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_destino   text,
  modulo          text NOT NULL,
  tipo            text NOT NULL,
  titulo          text NOT NULL,
  mensagem        text,
  prioridade      public.notif_prioridade NOT NULL DEFAULT 'NORMAL',
  status          public.notif_status NOT NULL DEFAULT 'NAO_LIDA',
  origem_tipo     text,
  origem_id       uuid,
  link_origem     text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key      text,
  lida_em         timestamptz,
  arquivada_em    timestamptz,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  expira_em       timestamptz,
  criada_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_notif_destino CHECK (usuario_destino_id IS NOT NULL OR grupo_destino IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_notif_destino_status ON public.notificacoes(usuario_destino_id, status) WHERE status = 'NAO_LIDA';
CREATE INDEX IF NOT EXISTS idx_notif_destino_criada ON public.notificacoes(usuario_destino_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_notif_grupo ON public.notificacoes(grupo_destino) WHERE grupo_destino IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notif_origem ON public.notificacoes(origem_tipo, origem_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_dedupe ON public.notificacoes(usuario_destino_id, dedupe_key) WHERE dedupe_key IS NOT NULL AND usuario_destino_id IS NOT NULL;

-- GRANTS (auth-only: política filtra por auth.uid())
GRANT SELECT, UPDATE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

-- RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_proprias_ou_admin"
ON public.notificacoes FOR SELECT TO authenticated
USING (usuario_destino_id = auth.uid() OR public.is_admin(auth.uid()));

-- Sem INSERT/DELETE direto: tudo via RPCs SECURITY DEFINER
CREATE POLICY "notif_update_proprias"
ON public.notificacoes FOR UPDATE TO authenticated
USING (usuario_destino_id = auth.uid())
WITH CHECK (usuario_destino_id = auth.uid());

-- ============================================================
-- RPCs
-- ============================================================

-- Emite notificação (genérica). Pode ser chamada por outras RPCs/triggers.
CREATE OR REPLACE FUNCTION public.rpc_notificacao_emitir(
  p_usuario_destino uuid,
  p_modulo text,
  p_tipo text,
  p_titulo text,
  p_mensagem text DEFAULT NULL,
  p_prioridade public.notif_prioridade DEFAULT 'NORMAL',
  p_origem_tipo text DEFAULT NULL,
  p_origem_id uuid DEFAULT NULL,
  p_link_origem text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL,
  p_expira_em timestamptz DEFAULT NULL,
  p_grupo_destino text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_usuario_destino IS NULL AND p_grupo_destino IS NULL THEN
    RAISE EXCEPTION 'Notificação exige destino (usuario_destino_id ou grupo_destino)';
  END IF;
  IF p_modulo IS NULL OR p_tipo IS NULL OR p_titulo IS NULL THEN
    RAISE EXCEPTION 'modulo, tipo e titulo são obrigatórios';
  END IF;

  -- Idempotência por dedupe_key + usuário
  IF p_dedupe_key IS NOT NULL AND p_usuario_destino IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.notificacoes
    WHERE usuario_destino_id = p_usuario_destino
      AND dedupe_key = p_dedupe_key
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO public.notificacoes(
    usuario_destino_id, grupo_destino, modulo, tipo, titulo, mensagem,
    prioridade, origem_tipo, origem_id, link_origem, payload, dedupe_key,
    expira_em, criada_por
  ) VALUES (
    p_usuario_destino, p_grupo_destino, p_modulo, p_tipo, p_titulo, p_mensagem,
    p_prioridade, p_origem_tipo, p_origem_id, p_link_origem, COALESCE(p_payload, '{}'::jsonb),
    p_dedupe_key, p_expira_em, auth.uid()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_notificacao_emitir(uuid,text,text,text,text,public.notif_prioridade,text,uuid,text,jsonb,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_notificacao_emitir(uuid,text,text,text,text,public.notif_prioridade,text,uuid,text,jsonb,text,timestamptz,text) TO authenticated;

-- Marcar 1 como lida
CREATE OR REPLACE FUNCTION public.rpc_notificacao_marcar_lida(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notificacoes
  SET status = 'LIDA', lida_em = COALESCE(lida_em, now())
  WHERE id = p_id
    AND usuario_destino_id = auth.uid()
    AND status = 'NAO_LIDA';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_notificacao_marcar_lida(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_notificacao_marcar_lida(uuid) TO authenticated;

-- Marcar todas as minhas como lidas
CREATE OR REPLACE FUNCTION public.rpc_notificacao_marcar_todas_lidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.notificacoes
  SET status = 'LIDA', lida_em = now()
  WHERE usuario_destino_id = auth.uid()
    AND status = 'NAO_LIDA';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_notificacao_marcar_todas_lidas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_notificacao_marcar_todas_lidas() TO authenticated;

-- Arquivar
CREATE OR REPLACE FUNCTION public.rpc_notificacao_arquivar(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notificacoes
  SET status = 'ARQUIVADA', arquivada_em = now()
  WHERE id = p_id
    AND usuario_destino_id = auth.uid()
    AND status <> 'ARQUIVADA';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rpc_notificacao_arquivar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_notificacao_arquivar(uuid) TO authenticated;

-- ============================================================
-- View canônica: minhas notificações
-- ============================================================
CREATE OR REPLACE VIEW public.v_notificacoes_minhas
WITH (security_invoker=on) AS
SELECT
  n.id, n.usuario_destino_id, n.modulo, n.tipo, n.titulo, n.mensagem,
  n.prioridade, n.status, n.origem_tipo, n.origem_id, n.link_origem,
  n.payload, n.dedupe_key, n.lida_em, n.arquivada_em, n.criada_em, n.expira_em,
  CASE
    WHEN n.expira_em IS NOT NULL AND n.expira_em < now() THEN true
    ELSE false
  END AS vencida
FROM public.notificacoes n
WHERE n.usuario_destino_id = auth.uid()
   OR public.is_admin(auth.uid());

GRANT SELECT ON public.v_notificacoes_minhas TO authenticated;

-- ============================================================
-- Trigger 1: workflow_aprovacoes — nova pendente
-- Notifica todos os usuários com permissão da alçada (via alcadas_aprovadores se existir)
-- Implementação simples: notifica solicitante quando decidido; aprovadores via grupo
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notif_workflow_aprovacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
BEGIN
  v_link := '/aprovacoes';

  IF TG_OP = 'INSERT' AND NEW.status = 'PENDENTE' THEN
    -- Notifica grupo "aprovadores_<setor>" (placeholder de roteamento futuro)
    PERFORM public.rpc_notificacao_emitir(
      NULL,
      'aprovacoes',
      'APROVACAO_PENDENTE',
      'Nova aprovação pendente: ' || COALESCE(NEW.titulo, NEW.codigo),
      'Setor: ' || COALESCE(NEW.setor, '-') || ' · Valor: ' || COALESCE(NEW.valor::text, '0'),
      CASE WHEN NEW.valor >= 20000 THEN 'ALTA'::public.notif_prioridade ELSE 'NORMAL'::public.notif_prioridade END,
      'workflow_aprovacao',
      NEW.id,
      v_link,
      jsonb_build_object('codigo', NEW.codigo, 'tipo', NEW.tipo_operacao, 'valor', NEW.valor),
      'wf-pend-' || NEW.id::text,
      NEW.expira_em,
      COALESCE('aprovadores_' || NEW.setor, 'aprovadores')
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'PENDENTE' AND NEW.status IN ('APROVADA','NEGADA','EXPIRADA','CANCELADA') THEN
    -- Notifica solicitante do desfecho
    PERFORM public.rpc_notificacao_emitir(
      NEW.solicitante_id,
      'aprovacoes',
      'APROVACAO_' || NEW.status::text,
      'Sua solicitação foi ' || lower(NEW.status::text) || ': ' || COALESCE(NEW.titulo, NEW.codigo),
      NEW.motivo_decisao,
      CASE WHEN NEW.status = 'NEGADA' THEN 'ALTA'::public.notif_prioridade ELSE 'NORMAL'::public.notif_prioridade END,
      'workflow_aprovacao',
      NEW.id,
      v_link,
      jsonb_build_object('codigo', NEW.codigo, 'status', NEW.status),
      'wf-dec-' || NEW.id::text,
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notif_workflow_aprovacao ON public.workflow_aprovacoes;
CREATE TRIGGER tg_notif_workflow_aprovacao
AFTER INSERT OR UPDATE OF status ON public.workflow_aprovacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_notif_workflow_aprovacao();

-- ============================================================
-- Trigger 2: suprimentos_pedidos_compra — PRONTO_PARA_FINANCEIRO
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_notif_pedido_pronto_financeiro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status_financeiro = 'PRONTO_PARA_FINANCEIRO'
     AND (TG_OP = 'INSERT' OR OLD.status_financeiro IS DISTINCT FROM NEW.status_financeiro) THEN
    PERFORM public.rpc_notificacao_emitir(
      NULL,
      'financeiro',
      'PEDIDO_PRONTO_AP',
      'Pedido pronto para gerar Conta a Pagar: ' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
      'Valor total: ' || COALESCE(NEW.valor_total::text, '0'),
      'ALTA'::public.notif_prioridade,
      'suprimentos_pedido_compra',
      NEW.id,
      '/financeiro#tab=a-pagar',
      jsonb_build_object('numero', NEW.numero_pedido, 'valor', NEW.valor_total),
      'pedido-pronto-fin-' || NEW.id::text,
      NULL,
      'financeiro'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notif_pedido_pronto_financeiro ON public.suprimentos_pedidos_compra;
CREATE TRIGGER tg_notif_pedido_pronto_financeiro
AFTER INSERT OR UPDATE OF status_financeiro ON public.suprimentos_pedidos_compra
FOR EACH ROW EXECUTE FUNCTION public.fn_notif_pedido_pronto_financeiro();
