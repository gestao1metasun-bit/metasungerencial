
-- =====================================================
-- C5.2 — Estrutura de assinatura
-- =====================================================

-- 1) Colunas semânticas em contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS assinado                        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assinado_em                     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assinado_por                    UUID,
  ADD COLUMN IF NOT EXISTS assinatura_evento_id            UUID,
  ADD COLUMN IF NOT EXISTS liberado_para_engenharia        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liberado_para_engenharia_em     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liberado_para_financeiro        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liberado_para_financeiro_em     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pendente_engenharia             BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pendente_financeiro             BOOLEAN     NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contratos_assinado
  ON public.contratos (assinado, assinado_em DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_pendente_eng
  ON public.contratos (pendente_engenharia)
  WHERE deleted_at IS NULL AND pendente_engenharia = true;

CREATE INDEX IF NOT EXISTS idx_contratos_pendente_fin
  ON public.contratos (pendente_financeiro)
  WHERE deleted_at IS NULL AND pendente_financeiro = true;

-- 2) Tabela append-only de eventos de assinatura
CREATE TABLE IF NOT EXISTS public.comercial_assinatura_eventos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  assinado_por        UUID NOT NULL,
  assinado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  permissao_usada     TEXT NOT NULL,
  observacao          TEXT,
  ip_origem           TEXT,
  user_agent          TEXT,
  hash_evento         TEXT,
  dispatched_eng      BOOLEAN NOT NULL DEFAULT false,
  dispatched_fin      BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.comercial_assinatura_eventos TO authenticated;
GRANT ALL    ON public.comercial_assinatura_eventos TO service_role;

ALTER TABLE public.comercial_assinatura_eventos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_assin_eventos_contrato
  ON public.comercial_assinatura_eventos (contrato_id, assinado_em DESC);

DROP POLICY IF EXISTS "assin_eventos_select_perm" ON public.comercial_assinatura_eventos;
CREATE POLICY "assin_eventos_select_perm"
ON public.comercial_assinatura_eventos
FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'comercial.contrato.ver_assinatura'::app_permission)
  OR has_permission(auth.uid(), 'comercial.contrato.assinar'::app_permission)
);

-- Append-only — sem INSERT/UPDATE/DELETE direto (apenas RPC SECURITY DEFINER ou service_role).

-- 3) Trigger anti-edição direta de assinatura
CREATE OR REPLACE FUNCTION public.tg_contratos_bloqueia_alteracao_assinatura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_via_rpc TEXT;
BEGIN
  -- Admin sempre passa
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_via_rpc := current_setting('app.via_assinatura_rpc', true);
  EXCEPTION WHEN OTHERS THEN
    v_via_rpc := NULL;
  END;

  IF v_via_rpc = 'true' THEN
    RETURN NEW;
  END IF;

  -- Bloqueia mudança direta dos campos sensíveis
  IF NEW.assinado IS DISTINCT FROM OLD.assinado
     OR NEW.assinado_em IS DISTINCT FROM OLD.assinado_em
     OR NEW.assinado_por IS DISTINCT FROM OLD.assinado_por
     OR NEW.assinatura_evento_id IS DISTINCT FROM OLD.assinatura_evento_id
     OR NEW.liberado_para_engenharia IS DISTINCT FROM OLD.liberado_para_engenharia
     OR NEW.liberado_para_engenharia_em IS DISTINCT FROM OLD.liberado_para_engenharia_em
     OR NEW.liberado_para_financeiro IS DISTINCT FROM OLD.liberado_para_financeiro
     OR NEW.liberado_para_financeiro_em IS DISTINCT FROM OLD.liberado_para_financeiro_em
     OR NEW.pendente_engenharia IS DISTINCT FROM OLD.pendente_engenharia
     OR NEW.pendente_financeiro IS DISTINCT FROM OLD.pendente_financeiro
  THEN
    RAISE EXCEPTION 'Alteração de campos de assinatura só é permitida via RPC oficial (rpc_contrato_assinar / rpc_contrato_marcar_*).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_bloqueia_assinatura ON public.contratos;
CREATE TRIGGER trg_contratos_bloqueia_assinatura
BEFORE UPDATE ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.tg_contratos_bloqueia_alteracao_assinatura();

-- 4) RPC OFICIAL DE ASSINATURA
CREATE OR REPLACE FUNCTION public.rpc_contrato_assinar(
  p_contrato_id      UUID,
  p_observacao       TEXT DEFAULT NULL,
  p_ip               TEXT DEFAULT NULL,
  p_user_agent       TEXT DEFAULT NULL,
  p_row_version      INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_contrato  public.contratos%ROWTYPE;
  v_evento_id UUID;
  v_hash      TEXT;
  v_perm_used TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  -- Permissão
  IF is_admin(v_user_id) THEN
    v_perm_used := 'admin';
  ELSIF has_permission(v_user_id, 'comercial.contrato.assinar'::app_permission) THEN
    v_perm_used := 'comercial.contrato.assinar';
  ELSIF has_permission(v_user_id, 'comercial.contrato.assinar_excecao'::app_permission) THEN
    v_perm_used := 'comercial.contrato.assinar_excecao';
  ELSE
    RAISE EXCEPTION 'Sem permissão para assinar contrato.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contrato
  FROM public.contratos
  WHERE id = p_contrato_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % não encontrado.', p_contrato_id USING ERRCODE = 'P0002';
  END IF;

  IF v_contrato.cancelado THEN
    RAISE EXCEPTION 'Contrato cancelado não pode ser assinado.' USING ERRCODE = '22023';
  END IF;

  IF v_contrato.assinado THEN
    RAISE EXCEPTION 'Contrato já está assinado (evento %).', v_contrato.assinatura_evento_id USING ERRCODE = '22023';
  END IF;

  -- Concorrência otimista (opcional)
  IF p_row_version IS NOT NULL AND v_contrato.row_version <> p_row_version THEN
    RAISE EXCEPTION 'Conflito de versão (esperado %, atual %).', p_row_version, v_contrato.row_version
      USING ERRCODE = '40001';
  END IF;

  -- Cria evento append-only
  v_hash := encode(
    digest(
      coalesce(p_contrato_id::text,'') || '|' || coalesce(v_user_id::text,'') || '|' || now()::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.comercial_assinatura_eventos
    (contrato_id, assinado_por, permissao_usada, observacao, ip_origem, user_agent, hash_evento,
     dispatched_eng, dispatched_fin, metadata)
  VALUES
    (p_contrato_id, v_user_id, v_perm_used, p_observacao, p_ip, p_user_agent, v_hash,
     true, true,
     jsonb_build_object(
       'valor_total', v_contrato.valor_total,
       'potencia_kwp', v_contrato.potencia_kwp,
       'cliente_id', v_contrato.cliente_id,
       'proposta_id', v_contrato.proposta_id
     ))
  RETURNING id INTO v_evento_id;

  -- Atualiza contrato via flag de sessão
  PERFORM set_config('app.via_assinatura_rpc', 'true', true);

  UPDATE public.contratos SET
    assinado                     = true,
    assinado_em                  = now(),
    assinado_por                 = v_user_id,
    assinatura_evento_id         = v_evento_id,
    data_assinatura              = COALESCE(data_assinatura, current_date),
    status                       = CASE WHEN status IN ('Rascunho','Em Análise','Aprovado','Em Negociação')
                                        THEN 'Assinado' ELSE status END,
    liberado_para_engenharia     = true,
    liberado_para_engenharia_em  = now(),
    liberado_para_financeiro     = true,
    liberado_para_financeiro_em  = now(),
    pendente_engenharia          = true,
    pendente_financeiro          = true,
    -- mantém compat com fluxo legado
    liberado_para_contrato       = true,
    liberado_em                  = COALESCE(liberado_em, now()),
    liberado_por                 = COALESCE(liberado_por, v_user_id),
    assinado_aprovado            = true,
    assinado_aprovado_em         = COALESCE(assinado_aprovado_em, now()),
    assinado_aprovado_por        = COALESCE(assinado_aprovado_por, v_user_id)
  WHERE id = p_contrato_id;

  PERFORM set_config('app.via_assinatura_rpc', 'false', true);

  RETURN v_evento_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_contrato_assinar(UUID, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_assinar(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;

-- 5) RPC: marcar engenharia pronta (consome pendente_engenharia)
CREATE OR REPLACE FUNCTION public.rpc_contrato_marcar_engenharia_liberada(
  p_contrato_id UUID,
  p_observacao  TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  IF NOT (is_admin(v_user_id)
       OR has_permission(v_user_id, 'engenharia.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para liberar engenharia.' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.via_assinatura_rpc', 'true', true);

  UPDATE public.contratos
     SET pendente_engenharia = false
   WHERE id = p_contrato_id
     AND assinado = true
     AND deleted_at IS NULL;

  PERFORM set_config('app.via_assinatura_rpc', 'false', true);

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_contrato_marcar_engenharia_liberada(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_marcar_engenharia_liberada(UUID, TEXT) TO authenticated;

-- 6) RPC: marcar financeiro pronto (consome pendente_financeiro)
CREATE OR REPLACE FUNCTION public.rpc_contrato_marcar_financeiro_liberado(
  p_contrato_id UUID,
  p_observacao  TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  IF NOT (is_admin(v_user_id)
       OR has_permission(v_user_id, 'financeiro.editar'::app_permission)) THEN
    RAISE EXCEPTION 'Sem permissão para liberar financeiro.' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.via_assinatura_rpc', 'true', true);

  UPDATE public.contratos
     SET pendente_financeiro = false
   WHERE id = p_contrato_id
     AND assinado = true
     AND deleted_at IS NULL;

  PERFORM set_config('app.via_assinatura_rpc', 'false', true);

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_contrato_marcar_financeiro_liberado(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_contrato_marcar_financeiro_liberado(UUID, TEXT) TO authenticated;
