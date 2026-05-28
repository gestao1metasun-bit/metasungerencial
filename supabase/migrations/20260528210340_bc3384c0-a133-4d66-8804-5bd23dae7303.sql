-- ==========================================================================
-- D15 / Comercial — Onda C2
-- Bloqueio + Revisão formal + Validade automática de 45 dias para Propostas
-- ==========================================================================

-- 1) Colunas novas em propostas
ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS row_version    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS versao_num     integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS versao_pai_id  uuid NULL REFERENCES public.propostas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revisao_motivo text NULL,
  ADD COLUMN IF NOT EXISTS revisada_em    timestamptz NULL,
  ADD COLUMN IF NOT EXISTS renovada_em    timestamptz NULL,
  ADD COLUMN IF NOT EXISTS renovacao_motivo text NULL;

CREATE INDEX IF NOT EXISTS idx_propostas_versao_pai ON public.propostas(versao_pai_id);
CREATE INDEX IF NOT EXISTS idx_propostas_validade  ON public.propostas(validade) WHERE deleted_at IS NULL;

-- 2) Trigger de bump de row_version (helper já existe)
DROP TRIGGER IF EXISTS tg_propostas_row_version ON public.propostas;
CREATE TRIGGER tg_propostas_row_version
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();

-- 3) Trigger: validade automática de 45 dias se não informada
CREATE OR REPLACE FUNCTION public.tg_propostas_default_validade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.validade IS NULL THEN
    NEW.validade := (CURRENT_DATE + INTERVAL '45 days')::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_propostas_default_validade ON public.propostas;
CREATE TRIGGER tg_propostas_default_validade
  BEFORE INSERT ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.tg_propostas_default_validade();

-- 4) Trigger: bloqueio de edição direta quando aprovada/assinada
-- Só permite UPDATE se a sessão setou app.via_revisao_proposta='true' (RPCs oficiais).
-- Soft-delete (deleted_at) e mudança apenas para 'CANCELADA' permanecem bloqueadas (devem usar RPC).
CREATE OR REPLACE FUNCTION public.tg_propostas_bloqueia_edicao_aprovada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_via_revisao text;
  v_status_locked text[] := ARRAY['APROVADA','ASSINADA','EM_REVISAO','VENCIDA','CANCELADA'];
BEGIN
  -- admin sempre passa
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = ANY (v_status_locked) THEN
    v_via_revisao := current_setting('app.via_revisao_proposta', true);
    IF v_via_revisao IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Proposta em status % não pode ser editada diretamente. Use o fluxo de revisão oficial (rpc_proposta_solicitar_revisao).', OLD.status
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_propostas_bloqueia_edicao ON public.propostas;
CREATE TRIGGER tg_propostas_bloqueia_edicao
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.tg_propostas_bloqueia_edicao_aprovada();

-- 5) RPC: solicitar revisão de proposta aprovada/assinada
-- Clona a versão anterior em uma nova proposta (status RASCUNHO, versao_num+1, versao_pai_id=OLD).
-- A proposta original recebe status='EM_REVISAO' + motivo (via flag interna).
CREATE OR REPLACE FUNCTION public.rpc_proposta_solicitar_revisao(
  _id uuid,
  _motivo text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.propostas%ROWTYPE;
  v_new_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_admin(v_uid) OR public.has_permission(v_uid, 'comercial.proposta.revisar'::app_permission)) THEN
    RAISE EXCEPTION 'Permissão negada: comercial.proposta.revisar' USING ERRCODE = '42501';
  END IF;
  IF _motivo IS NULL OR length(btrim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo da revisão obrigatório (mínimo 5 caracteres).' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_old FROM public.propostas WHERE id = _id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada.', _id USING ERRCODE = 'P0002';
  END IF;
  IF v_old.status NOT IN ('APROVADA','ASSINADA','VENCIDA') THEN
    RAISE EXCEPTION 'Só é possível solicitar revisão de propostas APROVADA, ASSINADA ou VENCIDA (status atual: %).', v_old.status
      USING ERRCODE = '22023';
  END IF;

  -- 1) Marca original como EM_REVISAO via flag de sessão
  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE public.propostas
     SET status         = 'EM_REVISAO',
         motivo_status  = _motivo,
         revisada_em    = now(),
         revisao_motivo = _motivo
   WHERE id = v_old.id;
  PERFORM set_config('app.via_revisao_proposta','false', true);

  -- 2) Cria nova versão (clone) em RASCUNHO
  INSERT INTO public.propostas (
    numero, status, consultor_id, cliente_id, lead_id,
    cliente_nome, cliente_doc, valor_final, potencia_kwp, modulos_qtd,
    validade, versao, motivo_status, dados,
    versao_num, versao_pai_id
  ) VALUES (
    v_old.numero, 'RASCUNHO', v_uid, v_old.cliente_id, v_old.lead_id,
    v_old.cliente_nome, v_old.cliente_doc, v_old.valor_final, v_old.potencia_kwp, v_old.modulos_qtd,
    (CURRENT_DATE + INTERVAL '45 days')::date, NULL, 'Revisão de ' || v_old.id::text,
    COALESCE(v_old.dados,'{}'::jsonb) || jsonb_build_object('_revisao_de', v_old.id::text, '_revisao_motivo', _motivo),
    COALESCE(v_old.versao_num,1) + 1, v_old.id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_proposta_solicitar_revisao(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_solicitar_revisao(uuid, text) TO authenticated;

-- 6) RPC: marcar propostas vencidas (job-ready, idempotente)
CREATE OR REPLACE FUNCTION public.rpc_proposta_marcar_vencidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  PERFORM set_config('app.via_revisao_proposta','true', true);
  WITH upd AS (
    UPDATE public.propostas
       SET status = 'VENCIDA',
           motivo_status = COALESCE(motivo_status, '') || ' [auto: vencida em ' || to_char(now(),'YYYY-MM-DD') || ']'
     WHERE deleted_at IS NULL
       AND validade IS NOT NULL
       AND validade < CURRENT_DATE
       AND status IN ('RASCUNHO','ENVIADA','EM_NEGOCIACAO','APROVADA')
     RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  PERFORM set_config('app.via_revisao_proposta','false', true);
  RETURN COALESCE(v_count,0);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_proposta_marcar_vencidas() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_marcar_vencidas() TO authenticated;

-- 7) RPC: renovar validade de proposta vencida (exige permissão de exceção)
CREATE OR REPLACE FUNCTION public.rpc_proposta_renovar_validade(
  _id uuid,
  _motivo text,
  _dias integer DEFAULT 45
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_admin(v_uid) OR public.has_permission(v_uid, 'comercial.proposta.aprovar_excecao'::app_permission)) THEN
    RAISE EXCEPTION 'Permissão negada: comercial.proposta.aprovar_excecao' USING ERRCODE = '42501';
  END IF;
  IF _motivo IS NULL OR length(btrim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo da renovação obrigatório (mínimo 5 caracteres).' USING ERRCODE = '22023';
  END IF;
  IF _dias IS NULL OR _dias <= 0 OR _dias > 180 THEN
    RAISE EXCEPTION 'Dias de renovação inválidos (1..180).' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_status FROM public.propostas WHERE id = _id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta % não encontrada.', _id USING ERRCODE = 'P0002';
  END IF;
  IF v_status NOT IN ('VENCIDA','APROVADA','ENVIADA','EM_NEGOCIACAO') THEN
    RAISE EXCEPTION 'Renovação não permitida para status %.', v_status USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.via_revisao_proposta','true', true);
  UPDATE public.propostas
     SET validade          = (CURRENT_DATE + (_dias || ' days')::interval)::date,
         status            = CASE WHEN v_status='VENCIDA' THEN 'ENVIADA' ELSE v_status END,
         renovada_em       = now(),
         renovacao_motivo  = _motivo,
         motivo_status     = _motivo
   WHERE id = _id;
  PERFORM set_config('app.via_revisao_proposta','false', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_proposta_renovar_validade(uuid, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rpc_proposta_renovar_validade(uuid, text, integer) TO authenticated;

COMMENT ON COLUMN public.propostas.row_version IS 'D15 C2 — controle de concorrência otimista (bump automático).';
COMMENT ON COLUMN public.propostas.versao_num IS 'D15 C2 — número da versão na cadeia de revisão.';
COMMENT ON COLUMN public.propostas.versao_pai_id IS 'D15 C2 — proposta-pai (versão anterior) na cadeia de revisão.';
COMMENT ON FUNCTION public.rpc_proposta_solicitar_revisao(uuid, text) IS 'D15 C2 — abre revisão formal: marca original EM_REVISAO e clona nova versão em RASCUNHO.';
COMMENT ON FUNCTION public.rpc_proposta_marcar_vencidas() IS 'D15 C2 — varredura idempotente: marca como VENCIDA propostas com validade < hoje.';
COMMENT ON FUNCTION public.rpc_proposta_renovar_validade(uuid, text, integer) IS 'D15 C2 — renova validade de proposta vencida/ativa; exige comercial.proposta.aprovar_excecao.';