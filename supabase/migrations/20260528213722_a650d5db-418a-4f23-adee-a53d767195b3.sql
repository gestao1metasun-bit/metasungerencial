
CREATE TABLE IF NOT EXISTS public.comercial_comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE RESTRICT,
  assinatura_evento_id uuid REFERENCES public.comercial_assinatura_eventos(id) ON DELETE SET NULL,
  vendedor_id uuid,
  vendedor_nome text,
  percentual numeric(7,4) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  valor_base numeric(14,2) NOT NULL CHECK (valor_base >= 0),
  valor_calculado numeric(14,2) NOT NULL CHECK (valor_calculado >= 0),
  status public.comercial_comissao_status NOT NULL DEFAULT 'PREVISTA',
  observacao text,
  prevista_em timestamptz NOT NULL DEFAULT now(),
  liberada_em timestamptz, liberada_por uuid,
  paga_em timestamptz, paga_por uuid,
  cancelada_em timestamptz, cancelada_por uuid, motivo_cancelamento text,
  estornada_em timestamptz, estornada_por uuid, motivo_estorno text,
  codigo_externo text,
  sistema_destino text,
  status_integracao text DEFAULT 'pendente'
    CHECK (status_integracao IN ('pendente','enviado','integrado','divergente','erro','ignorado')),
  hash_remessa text,
  lote_integracao_id uuid,
  natureza_id uuid,
  centro_resultado_id uuid,
  competencia date,
  conta_contabil_mapeavel text,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, deleted_by uuid, deleted_reason text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_comissoes TO authenticated;
GRANT ALL ON public.comercial_comissoes TO service_role;

CREATE INDEX IF NOT EXISTS idx_comissoes_contrato ON public.comercial_comissoes(contrato_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON public.comercial_comissoes(vendedor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON public.comercial_comissoes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comissoes_assinatura ON public.comercial_comissoes(assinatura_evento_id);

ALTER TABLE public.comercial_comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY comissoes_select ON public.comercial_comissoes
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(),'comercial.comissao.ver'::public.app_permission));

CREATE POLICY comissoes_admin_all ON public.comercial_comissoes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.comercial_comissao_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comissao_id uuid NOT NULL REFERENCES public.comercial_comissoes(id) ON DELETE CASCADE,
  acao text NOT NULL CHECK (acao IN ('CRIADA','LIBERADA','MARCADA_PAGA','CANCELADA','ESTORNADA','PERCENTUAL_ALTERADO','REABERTA')),
  status_anterior public.comercial_comissao_status,
  status_novo public.comercial_comissao_status,
  valor_anterior numeric(14,2), valor_novo numeric(14,2),
  percentual_anterior numeric(7,4), percentual_novo numeric(7,4),
  motivo text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  usuario_id uuid NOT NULL,
  permissao_usada text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.comercial_comissao_eventos TO authenticated;
GRANT ALL ON public.comercial_comissao_eventos TO service_role;

CREATE INDEX IF NOT EXISTS idx_comissao_eventos_comissao
  ON public.comercial_comissao_eventos(comissao_id, created_at DESC);

ALTER TABLE public.comercial_comissao_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY comissao_eventos_select ON public.comercial_comissao_eventos
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid())
         OR public.has_permission(auth.uid(),'comercial.comissao.ver'::public.app_permission));

CREATE POLICY comissao_eventos_block_update ON public.comercial_comissao_eventos
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY comissao_eventos_block_delete ON public.comercial_comissao_eventos
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER tg_comissoes_bump_rv
  BEFORE UPDATE ON public.comercial_comissoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

CREATE TRIGGER tg_comissoes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.comercial_comissoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

CREATE OR REPLACE FUNCTION public.tg_comissoes_bloqueia_edicao_direta()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v text;
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  BEGIN v := current_setting('app.via_comissao_rpc', true);
  EXCEPTION WHEN OTHERS THEN v := NULL; END;
  IF v = 'true' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Edição direta de comissão bloqueada. Use rpc_comissao_* oficial.' USING ERRCODE='42501';
END$$;

CREATE TRIGGER tg_comissoes_bloqueia_edicao
  BEFORE UPDATE ON public.comercial_comissoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_comissoes_bloqueia_edicao_direta();

CREATE OR REPLACE FUNCTION public.tg_assinatura_cria_comissao_prevista()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_c public.contratos%ROWTYPE;
  v_pct numeric; v_base numeric; v_valor numeric; v_id uuid;
BEGIN
  SELECT * INTO v_c FROM public.contratos WHERE id = NEW.contrato_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.comercial_comissoes
             WHERE assinatura_evento_id = NEW.id AND deleted_at IS NULL) THEN
    RETURN NEW;
  END IF;
  v_pct  := COALESCE(v_c.comissao_pct, 0);
  v_base := COALESCE(v_c.valor_total, 0);
  v_valor := ROUND(v_base * v_pct / 100.0, 2);
  INSERT INTO public.comercial_comissoes (
    contrato_id, assinatura_evento_id, vendedor_id, vendedor_nome,
    percentual, valor_base, valor_calculado, status, prevista_em, created_by
  ) VALUES (
    NEW.contrato_id, NEW.id, v_c.consultor_id, v_c.vendedor,
    v_pct, v_base, v_valor, 'PREVISTA', now(), NEW.assinado_por
  ) RETURNING id INTO v_id;
  INSERT INTO public.comercial_comissao_eventos (
    comissao_id, acao, status_novo, valor_novo, percentual_novo,
    motivo, metadata, usuario_id, permissao_usada
  ) VALUES (
    v_id,'CRIADA','PREVISTA', v_valor, v_pct,
    'Gerada automaticamente da assinatura',
    jsonb_build_object('assinatura_evento_id', NEW.id, 'contrato_id', NEW.contrato_id),
    NEW.assinado_por, NEW.permissao_usada
  );
  RETURN NEW;
END$$;

CREATE TRIGGER tg_assinatura_cria_comissao
  AFTER INSERT ON public.comercial_assinatura_eventos
  FOR EACH ROW EXECUTE FUNCTION public.tg_assinatura_cria_comissao_prevista();

CREATE OR REPLACE FUNCTION public._comissao_transicionar(
  p_comissao_id uuid, p_acao text,
  p_novo_status public.comercial_comissao_status,
  p_motivo text, p_permissao text,
  p_extra jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid(); v_cur public.comercial_comissoes%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_cur FROM public.comercial_comissoes
    WHERE id=p_comissao_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comissão % não encontrada', p_comissao_id USING ERRCODE='P0002'; END IF;
  PERFORM set_config('app.via_comissao_rpc','true',true);
  IF p_acao='LIBERADA' THEN
    UPDATE public.comercial_comissoes SET status='LIBERADA', liberada_em=now(), liberada_por=v_user WHERE id=p_comissao_id;
  ELSIF p_acao='MARCADA_PAGA' THEN
    UPDATE public.comercial_comissoes SET status='PAGA', paga_em=now(), paga_por=v_user WHERE id=p_comissao_id;
  ELSIF p_acao='CANCELADA' THEN
    UPDATE public.comercial_comissoes SET status='CANCELADA', cancelada_em=now(), cancelada_por=v_user, motivo_cancelamento=p_motivo WHERE id=p_comissao_id;
  ELSIF p_acao='ESTORNADA' THEN
    UPDATE public.comercial_comissoes SET status='ESTORNADA', estornada_em=now(), estornada_por=v_user, motivo_estorno=p_motivo WHERE id=p_comissao_id;
  ELSIF p_acao='REABERTA' THEN
    UPDATE public.comercial_comissoes SET status='PREVISTA' WHERE id=p_comissao_id;
  END IF;
  INSERT INTO public.comercial_comissao_eventos (
    comissao_id, acao, status_anterior, status_novo,
    valor_anterior, valor_novo, percentual_anterior, percentual_novo,
    motivo, metadata, usuario_id, permissao_usada
  ) VALUES (
    p_comissao_id, p_acao, v_cur.status, p_novo_status,
    v_cur.valor_calculado, v_cur.valor_calculado,
    v_cur.percentual, v_cur.percentual,
    p_motivo, p_extra, v_user, p_permissao
  );
  PERFORM set_config('app.via_comissao_rpc','false',true);
  RETURN p_comissao_id;
END$$;
REVOKE EXECUTE ON FUNCTION public._comissao_transicionar(uuid,text,public.comercial_comissao_status,text,text,jsonb) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.rpc_comissao_liberar(p_comissao_id uuid, p_motivo text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cur public.comercial_comissoes%ROWTYPE;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'comercial.comissao.liberar'::public.app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.comissao.liberar' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_cur FROM public.comercial_comissoes WHERE id=p_comissao_id;
  IF v_cur.status <> 'PREVISTA' THEN
    RAISE EXCEPTION 'Comissão não está PREVISTA (atual=%)', v_cur.status USING ERRCODE='22023';
  END IF;
  RETURN public._comissao_transicionar(p_comissao_id,'LIBERADA','LIBERADA',p_motivo,'comercial.comissao.liberar');
END$$;
REVOKE EXECUTE ON FUNCTION public.rpc_comissao_liberar(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_liberar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_comissao_marcar_paga(p_comissao_id uuid, p_motivo text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cur public.comercial_comissoes%ROWTYPE;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'comercial.comissao.marcar_paga'::public.app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.comissao.marcar_paga' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_cur FROM public.comercial_comissoes WHERE id=p_comissao_id;
  IF v_cur.status <> 'LIBERADA' THEN
    RAISE EXCEPTION 'Comissão precisa estar LIBERADA (atual=%)', v_cur.status USING ERRCODE='22023';
  END IF;
  RETURN public._comissao_transicionar(p_comissao_id,'MARCADA_PAGA','PAGA',p_motivo,'comercial.comissao.marcar_paga');
END$$;
REVOKE EXECUTE ON FUNCTION public.rpc_comissao_marcar_paga(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_marcar_paga(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_comissao_cancelar(p_comissao_id uuid, p_motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cur public.comercial_comissoes%ROWTYPE;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)' USING ERRCODE='22023';
  END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'comercial.comissao.cancelar'::public.app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.comissao.cancelar' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_cur FROM public.comercial_comissoes WHERE id=p_comissao_id;
  IF v_cur.status IN ('PAGA','ESTORNADA','CANCELADA') THEN
    RAISE EXCEPTION 'Comissão em status % não pode ser cancelada', v_cur.status USING ERRCODE='22023';
  END IF;
  RETURN public._comissao_transicionar(p_comissao_id,'CANCELADA','CANCELADA',p_motivo,'comercial.comissao.cancelar');
END$$;
REVOKE EXECUTE ON FUNCTION public.rpc_comissao_cancelar(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_cancelar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_comissao_estornar(p_comissao_id uuid, p_motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cur public.comercial_comissoes%ROWTYPE;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)' USING ERRCODE='22023';
  END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.has_permission(auth.uid(),'comercial.comissao.estornar'::public.app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.comissao.estornar' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_cur FROM public.comercial_comissoes WHERE id=p_comissao_id;
  IF v_cur.status <> 'PAGA' THEN
    RAISE EXCEPTION 'Apenas comissão PAGA pode ser estornada (atual=%)', v_cur.status USING ERRCODE='22023';
  END IF;
  RETURN public._comissao_transicionar(p_comissao_id,'ESTORNADA','ESTORNADA',p_motivo,'comercial.comissao.estornar');
END$$;
REVOKE EXECUTE ON FUNCTION public.rpc_comissao_estornar(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_estornar(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_comissao_alterar_percentual(p_comissao_id uuid, p_novo_percentual numeric, p_motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid := auth.uid(); v_cur public.comercial_comissoes%ROWTYPE; v_novo numeric;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)' USING ERRCODE='22023';
  END IF;
  IF p_novo_percentual IS NULL OR p_novo_percentual < 0 OR p_novo_percentual > 100 THEN
    RAISE EXCEPTION 'Percentual inválido' USING ERRCODE='22023';
  END IF;
  IF NOT (public.is_admin(v_user) OR public.has_permission(v_user,'comercial.comissao.alterar_percentual'::public.app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão comercial.comissao.alterar_percentual' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_cur FROM public.comercial_comissoes
    WHERE id=p_comissao_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comissão % não encontrada', p_comissao_id USING ERRCODE='P0002'; END IF;
  IF v_cur.status NOT IN ('PREVISTA','LIBERADA') THEN
    RAISE EXCEPTION 'Percentual só pode ser alterado em PREVISTA/LIBERADA (atual=%)', v_cur.status USING ERRCODE='22023';
  END IF;
  v_novo := ROUND(v_cur.valor_base * p_novo_percentual / 100.0, 2);
  PERFORM set_config('app.via_comissao_rpc','true',true);
  UPDATE public.comercial_comissoes
     SET percentual=p_novo_percentual, valor_calculado=v_novo
   WHERE id=p_comissao_id;
  PERFORM set_config('app.via_comissao_rpc','false',true);
  INSERT INTO public.comercial_comissao_eventos (
    comissao_id, acao, status_anterior, status_novo,
    valor_anterior, valor_novo, percentual_anterior, percentual_novo,
    motivo, usuario_id, permissao_usada
  ) VALUES (
    p_comissao_id,'PERCENTUAL_ALTERADO', v_cur.status, v_cur.status,
    v_cur.valor_calculado, v_novo, v_cur.percentual, p_novo_percentual,
    p_motivo, v_user, 'comercial.comissao.alterar_percentual'
  );
  RETURN p_comissao_id;
END$$;
REVOKE EXECUTE ON FUNCTION public.rpc_comissao_alterar_percentual(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_alterar_percentual(uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_comissao_reabrir(p_comissao_id uuid, p_motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cur public.comercial_comissoes%ROWTYPE;
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)' USING ERRCODE='22023';
  END IF;
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas admin pode reabrir comissão' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_cur FROM public.comercial_comissoes WHERE id=p_comissao_id;
  IF v_cur.status NOT IN ('CANCELADA','ESTORNADA') THEN
    RAISE EXCEPTION 'Apenas CANCELADA/ESTORNADA pode ser reaberta (atual=%)', v_cur.status USING ERRCODE='22023';
  END IF;
  RETURN public._comissao_transicionar(p_comissao_id,'REABERTA','PREVISTA',p_motivo,'admin');
END$$;
REVOKE EXECUTE ON FUNCTION public.rpc_comissao_reabrir(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_reabrir(uuid,text) TO authenticated;
