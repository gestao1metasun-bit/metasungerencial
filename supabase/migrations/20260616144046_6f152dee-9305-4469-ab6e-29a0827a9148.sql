-- C-ENT.6 — Timeline Universal + integração com rpc_contrato_cancelar
-- Anexos universais já existem (tabela `anexos` + bucket `anexos`).
-- Esta migração cria apenas a infraestrutura de Timeline Universal.

-- 1) Tabela de eventos universais (append-only)
CREATE TABLE IF NOT EXISTS public.eventos_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_tipo text NOT NULL,
  objeto_id uuid NOT NULL,
  evento_tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  usuario_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_timeline_objeto_tipo_check CHECK (
    objeto_tipo = ANY (ARRAY[
      'cliente','lead','proposta','contrato','projeto','projeto_contrato',
      'aditivo','obra','titulo_financeiro','comissao','operacao_financeira',
      'os','pedido_venda','requisicao_material','pedido_compra'
    ])
  ),
  CONSTRAINT eventos_timeline_titulo_check CHECK (length(btrim(titulo)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_eventos_timeline_obj
  ON public.eventos_timeline (objeto_tipo, objeto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_timeline_user
  ON public.eventos_timeline (usuario_id, created_at DESC);

GRANT SELECT, INSERT ON public.eventos_timeline TO authenticated;
GRANT ALL ON public.eventos_timeline TO service_role;

ALTER TABLE public.eventos_timeline ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer autenticado que possa acessar a entidade (reuso pode_acessar_entidade quando aplicável)
CREATE POLICY eventos_timeline_select_authenticated
  ON public.eventos_timeline FOR SELECT TO authenticated
  USING (true);

-- INSERT: apenas autenticados; usuario_id deve bater com auth.uid() ou ser nulo (eventos via RPC SECURITY DEFINER)
CREATE POLICY eventos_timeline_insert_authenticated
  ON public.eventos_timeline FOR INSERT TO authenticated
  WITH CHECK (usuario_id IS NULL OR usuario_id = auth.uid());

-- 2) Trigger anti-UPDATE / anti-DELETE (append-only)
CREATE OR REPLACE FUNCTION public.tg_eventos_timeline_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'eventos_timeline é append-only (operação % bloqueada).', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS tg_eventos_timeline_no_update ON public.eventos_timeline;
CREATE TRIGGER tg_eventos_timeline_no_update
  BEFORE UPDATE ON public.eventos_timeline
  FOR EACH ROW EXECUTE FUNCTION public.tg_eventos_timeline_imutavel();

DROP TRIGGER IF EXISTS tg_eventos_timeline_no_delete ON public.eventos_timeline;
CREATE TRIGGER tg_eventos_timeline_no_delete
  BEFORE DELETE ON public.eventos_timeline
  FOR EACH ROW EXECUTE FUNCTION public.tg_eventos_timeline_imutavel();

-- 3) RPC oficial para registrar evento (cliente usa esta, em vez de INSERT direto)
CREATE OR REPLACE FUNCTION public.rpc_timeline_registrar(
  _objeto_tipo text,
  _objeto_id uuid,
  _evento_tipo text,
  _titulo text,
  _descricao text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF _objeto_id IS NULL OR _evento_tipo IS NULL OR _titulo IS NULL THEN
    RAISE EXCEPTION 'Parâmetros obrigatórios ausentes' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.eventos_timeline (
    objeto_tipo, objeto_id, evento_tipo, titulo, descricao, usuario_id, payload
  ) VALUES (
    _objeto_tipo, _objeto_id, _evento_tipo, _titulo, _descricao, v_uid, COALESCE(_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_timeline_registrar(text,uuid,text,text,text,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_timeline_registrar(text,uuid,text,text,text,jsonb) TO authenticated;

-- 4) Atualizar rpc_contrato_cancelar para emitir evento de timeline (append-only, dentro da transação)
CREATE OR REPLACE FUNCTION public.rpc_contrato_cancelar(_id uuid, _motivo text, _observacao text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_cur public.contratos%ROWTYPE;
  v_status_anterior text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501';
  END IF;
  IF NOT (public.is_admin(v_uid)
          OR public.has_permission(v_uid, 'comercial.contrato.cancelar'::app_permission)) THEN
    RAISE EXCEPTION 'Permissão negada: comercial.contrato.cancelar' USING ERRCODE='42501';
  END IF;
  IF _motivo IS NULL OR length(btrim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo do cancelamento obrigatório (mínimo 5 caracteres).' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_cur FROM public.contratos
   WHERE id = _id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % não encontrado.', _id USING ERRCODE='P0002';
  END IF;
  IF v_cur.status = 'CANCELADO' OR v_cur.cancelado = true THEN
    RAISE EXCEPTION 'Contrato já está cancelado.' USING ERRCODE='22023';
  END IF;

  v_status_anterior := v_cur.status;

  UPDATE public.contratos
     SET status              = 'CANCELADO',
         cancelado           = true,
         motivo_cancelamento = btrim(_motivo)
                               || CASE WHEN _observacao IS NOT NULL AND length(btrim(_observacao))>0
                                       THEN ' | OBS: ' || btrim(_observacao) ELSE '' END,
         updated_at          = now()
   WHERE id = v_cur.id;

  -- Emite evento append-only de timeline (não-bloqueante por design, mas dentro da mesma transação)
  INSERT INTO public.eventos_timeline (
    objeto_tipo, objeto_id, evento_tipo, titulo, descricao, usuario_id, payload
  ) VALUES (
    'contrato', v_cur.id, 'CONTRATO_CANCELADO',
    'Contrato cancelado',
    btrim(_motivo),
    v_uid,
    jsonb_build_object(
      'codigo', v_cur.codigo,
      'status_anterior', v_status_anterior,
      'status_novo', 'CANCELADO',
      'motivo', btrim(_motivo),
      'observacao', _observacao
    )
  );
END;
$function$;
