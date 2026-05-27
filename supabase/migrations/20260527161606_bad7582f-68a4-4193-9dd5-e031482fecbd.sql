-- ============================================================================
-- D6.10.1 — Sistema de Flags Universal (record_flags)
-- Camada contextual operacional/humana. Não substitui status, workflow ou
-- aprovação. Suporta multi-entidade, auditoria, SLA, analytics, prioridade.
-- ============================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.flag_cor AS ENUM ('VERMELHO','AMARELO','VERDE','AZUL','ROXO','CINZA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.flag_escopo AS ENUM ('PESSOAL','EQUIPE','GLOBAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- TABELA PRINCIPAL ----------
CREATE TABLE IF NOT EXISTS public.record_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade      text NOT NULL CHECK (length(entidade) BETWEEN 2 AND 64),
  registro_id   uuid NOT NULL,
  cor           public.flag_cor NOT NULL,
  rotulo        text CHECK (rotulo IS NULL OR length(rotulo) <= 40),
  observacao    text CHECK (observacao IS NULL OR length(observacao) <= 500),
  prioridade    smallint NOT NULL DEFAULT 0 CHECK (prioridade BETWEEN 0 AND 9),
  escopo        public.flag_escopo NOT NULL DEFAULT 'PESSOAL',
  setor         text,
  sla_em        timestamptz,             -- prazo opcional p/ atenção
  resolvido_em  timestamptz,             -- preenchido quando vira VERDE/limpa
  user_id       uuid NOT NULL DEFAULT auth.uid(),
  user_email    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Unicidade: cada usuário marca um registro 1x (escopo PESSOAL).
-- Para escopo EQUIPE/GLOBAL não há duplicidade por usuário — usar índice parcial.
CREATE UNIQUE INDEX IF NOT EXISTS ux_record_flags_pessoal
  ON public.record_flags(entidade, registro_id, user_id)
  WHERE escopo = 'PESSOAL';

CREATE INDEX IF NOT EXISTS ix_record_flags_lookup
  ON public.record_flags(entidade, registro_id);
CREATE INDEX IF NOT EXISTS ix_record_flags_user
  ON public.record_flags(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_record_flags_cor
  ON public.record_flags(cor, entidade);
CREATE INDEX IF NOT EXISTS ix_record_flags_sla
  ON public.record_flags(sla_em) WHERE sla_em IS NOT NULL AND resolvido_em IS NULL;
CREATE INDEX IF NOT EXISTS ix_record_flags_setor
  ON public.record_flags(setor) WHERE setor IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_flags TO authenticated;
GRANT ALL ON public.record_flags TO service_role;

ALTER TABLE public.record_flags ENABLE ROW LEVEL SECURITY;

-- RLS: usuário vê suas próprias + as de escopo EQUIPE/GLOBAL; admin vê tudo.
CREATE POLICY "rf_select_own_or_shared" ON public.record_flags
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR user_id = auth.uid()
    OR escopo IN ('EQUIPE','GLOBAL')
  );

-- INSERT/UPDATE/DELETE: somente o dono ou admin (via RPC normalmente).
CREATE POLICY "rf_modify_own" ON public.record_flags
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "rf_update_own" ON public.record_flags
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "rf_delete_own" ON public.record_flags
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- updated_at
DROP TRIGGER IF EXISTS trg_record_flags_updated ON public.record_flags;
CREATE TRIGGER trg_record_flags_updated
  BEFORE UPDATE ON public.record_flags
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_generic();

-- ---------- HISTÓRICO (auditoria dedicada) ----------
CREATE TABLE IF NOT EXISTS public.record_flags_historico (
  id            bigserial PRIMARY KEY,
  flag_id       uuid,                    -- pode ser NULL após DELETE
  entidade      text NOT NULL,
  registro_id   uuid NOT NULL,
  acao          text NOT NULL CHECK (acao IN ('INSERT','UPDATE','DELETE','RESOLVE')),
  cor_anterior  public.flag_cor,
  cor_nova      public.flag_cor,
  snapshot_old  jsonb,
  snapshot_new  jsonb,
  user_id       uuid,
  user_email    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_rfh_entidade ON public.record_flags_historico(entidade, registro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_rfh_user ON public.record_flags_historico(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.record_flags_historico TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE record_flags_historico_id_seq TO authenticated;
GRANT ALL ON public.record_flags_historico TO service_role;
GRANT ALL ON SEQUENCE record_flags_historico_id_seq TO service_role;

ALTER TABLE public.record_flags_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfh_select_relevant" ON public.record_flags_historico
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "rfh_insert_system" ON public.record_flags_historico
  FOR INSERT TO authenticated WITH CHECK (true);  -- trigger preenche

-- Trigger de histórico
CREATE OR REPLACE FUNCTION public.tg_record_flags_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.record_flags_historico
      (flag_id, entidade, registro_id, acao, cor_nova, snapshot_new, user_id, user_email)
    VALUES (NEW.id, NEW.entidade, NEW.registro_id, 'INSERT', NEW.cor,
            row_to_json(NEW)::jsonb, v_user, v_email);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF row_to_json(OLD)::jsonb = row_to_json(NEW)::jsonb THEN RETURN NEW; END IF;
    INSERT INTO public.record_flags_historico
      (flag_id, entidade, registro_id, acao, cor_anterior, cor_nova,
       snapshot_old, snapshot_new, user_id, user_email)
    VALUES (NEW.id, NEW.entidade, NEW.registro_id,
            CASE WHEN NEW.resolvido_em IS NOT NULL AND OLD.resolvido_em IS NULL
                 THEN 'RESOLVE' ELSE 'UPDATE' END,
            OLD.cor, NEW.cor,
            row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, v_user, v_email);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.record_flags_historico
      (flag_id, entidade, registro_id, acao, cor_anterior, snapshot_old, user_id, user_email)
    VALUES (OLD.id, OLD.entidade, OLD.registro_id, 'DELETE', OLD.cor,
            row_to_json(OLD)::jsonb, v_user, v_email);
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_record_flags_hist ON public.record_flags;
CREATE TRIGGER trg_record_flags_hist
  AFTER INSERT OR UPDATE OR DELETE ON public.record_flags
  FOR EACH ROW EXECUTE FUNCTION public.tg_record_flags_historico();

-- ============================================================================
-- RPCs OFICIAIS
-- ============================================================================

-- flag_set: cria ou atualiza a flag do usuário corrente para um registro.
-- Idempotente sobre (entidade, registro_id, user_id) quando escopo=PESSOAL.
CREATE OR REPLACE FUNCTION public.flag_set(
  _entidade text,
  _registro_id uuid,
  _cor public.flag_cor,
  _rotulo text DEFAULT NULL,
  _observacao text DEFAULT NULL,
  _prioridade smallint DEFAULT 0,
  _escopo public.flag_escopo DEFAULT 'PESSOAL',
  _setor text DEFAULT NULL,
  _sla_em timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão requerida.' USING ERRCODE='42501';
  END IF;
  IF _entidade IS NULL OR length(trim(_entidade)) < 2 THEN
    RAISE EXCEPTION 'Entidade obrigatória.' USING ERRCODE='22023';
  END IF;
  IF _registro_id IS NULL THEN
    RAISE EXCEPTION 'registro_id obrigatório.' USING ERRCODE='22023';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  IF _escopo = 'PESSOAL' THEN
    INSERT INTO public.record_flags
      (entidade, registro_id, cor, rotulo, observacao, prioridade, escopo,
       setor, sla_em, user_id, user_email)
    VALUES
      (_entidade, _registro_id, _cor, _rotulo, _observacao, COALESCE(_prioridade,0),
       _escopo, _setor, _sla_em, v_user, v_email)
    ON CONFLICT (entidade, registro_id, user_id) WHERE escopo='PESSOAL'
    DO UPDATE SET
      cor = EXCLUDED.cor,
      rotulo = EXCLUDED.rotulo,
      observacao = EXCLUDED.observacao,
      prioridade = EXCLUDED.prioridade,
      setor = EXCLUDED.setor,
      sla_em = EXCLUDED.sla_em,
      resolvido_em = CASE WHEN EXCLUDED.cor = 'VERDE' THEN now() ELSE NULL END,
      updated_at = now()
    RETURNING id INTO v_id;
  ELSE
    -- EQUIPE/GLOBAL: cria nova (sem unique). Permite múltiplas anotações.
    INSERT INTO public.record_flags
      (entidade, registro_id, cor, rotulo, observacao, prioridade, escopo,
       setor, sla_em, user_id, user_email)
    VALUES
      (_entidade, _registro_id, _cor, _rotulo, _observacao, COALESCE(_prioridade,0),
       _escopo, _setor, _sla_em, v_user, v_email)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END $$;

-- flag_clear: remove a flag pessoal do usuário corrente para (entidade,registro).
CREATE OR REPLACE FUNCTION public.flag_clear(
  _entidade text,
  _registro_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão requerida.' USING ERRCODE='42501';
  END IF;
  DELETE FROM public.record_flags
    WHERE entidade = _entidade
      AND registro_id = _registro_id
      AND user_id = auth.uid()
      AND escopo = 'PESSOAL';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- flag_toggle: atalho do botão. Sem flag → cria; mesma cor → remove; outra cor → atualiza.
CREATE OR REPLACE FUNCTION public.flag_toggle(
  _entidade text,
  _registro_id uuid,
  _cor public.flag_cor,
  _rotulo text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_existing public.record_flags;
BEGIN
  SELECT * INTO v_existing
    FROM public.record_flags
    WHERE entidade = _entidade
      AND registro_id = _registro_id
      AND user_id = auth.uid()
      AND escopo = 'PESSOAL'
    LIMIT 1;

  IF v_existing.id IS NOT NULL AND v_existing.cor = _cor THEN
    PERFORM public.flag_clear(_entidade, _registro_id);
    RETURN NULL;
  END IF;

  RETURN public.flag_set(_entidade, _registro_id, _cor, _rotulo);
END $$;

-- flag_resolve: marca como resolvido (VERDE + resolvido_em).
CREATE OR REPLACE FUNCTION public.flag_resolve(_flag_id uuid, _observacao text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE f public.record_flags;
BEGIN
  SELECT * INTO f FROM public.record_flags WHERE id = _flag_id FOR UPDATE;
  IF f.id IS NULL THEN RAISE EXCEPTION 'Flag não encontrada.' USING ERRCODE='22023'; END IF;
  IF f.user_id <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para resolver esta flag.' USING ERRCODE='42501';
  END IF;
  UPDATE public.record_flags
     SET cor='VERDE',
         resolvido_em = now(),
         observacao = COALESCE(_observacao, observacao),
         updated_at = now()
   WHERE id = _flag_id;
  RETURN _flag_id;
END $$;

-- ============================================================================
-- VIEWS AGREGADAS (preparação D12 Analytics)
-- ============================================================================

-- Contagem por registro (para badge na grid)
CREATE OR REPLACE VIEW public.v_record_flags_count AS
SELECT
  entidade,
  registro_id,
  count(*)::int AS total,
  count(*) FILTER (WHERE cor='VERMELHO')::int AS qt_vermelho,
  count(*) FILTER (WHERE cor='AMARELO')::int  AS qt_amarelo,
  count(*) FILTER (WHERE cor='VERDE')::int    AS qt_verde,
  count(*) FILTER (WHERE cor='AZUL')::int     AS qt_azul,
  count(*) FILTER (WHERE cor='ROXO')::int     AS qt_roxo,
  count(*) FILTER (WHERE cor='CINZA')::int    AS qt_cinza,
  max(prioridade)::int AS prioridade_max,
  min(sla_em) FILTER (WHERE resolvido_em IS NULL) AS proximo_sla
FROM public.record_flags
GROUP BY entidade, registro_id;

GRANT SELECT ON public.v_record_flags_count TO authenticated;

-- Resumo por módulo/cor (dashboard executivo)
CREATE OR REPLACE VIEW public.v_record_flags_resumo_modulo AS
SELECT
  entidade,
  cor,
  count(*)::int AS total,
  count(*) FILTER (WHERE resolvido_em IS NULL)::int AS abertas,
  count(*) FILTER (WHERE resolvido_em IS NOT NULL)::int AS resolvidas,
  count(*) FILTER (WHERE sla_em IS NOT NULL AND resolvido_em IS NULL AND sla_em < now())::int AS sla_estourado
FROM public.record_flags
GROUP BY entidade, cor;

GRANT SELECT ON public.v_record_flags_resumo_modulo TO authenticated;

-- Por usuário (carga operacional)
CREATE OR REPLACE VIEW public.v_record_flags_por_usuario AS
SELECT
  user_id,
  user_email,
  entidade,
  cor,
  count(*)::int AS total,
  count(*) FILTER (WHERE resolvido_em IS NULL)::int AS abertas
FROM public.record_flags
GROUP BY user_id, user_email, entidade, cor;

GRANT SELECT ON public.v_record_flags_por_usuario TO authenticated;

-- Por setor (gestão setorial)
CREATE OR REPLACE VIEW public.v_record_flags_por_setor AS
SELECT
  COALESCE(setor,'(sem setor)') AS setor,
  entidade,
  cor,
  count(*)::int AS total,
  count(*) FILTER (WHERE resolvido_em IS NULL)::int AS abertas
FROM public.record_flags
WHERE escopo IN ('EQUIPE','GLOBAL')
GROUP BY setor, entidade, cor;

GRANT SELECT ON public.v_record_flags_por_setor TO authenticated;

-- SLA: flags com prazo, ainda abertas
CREATE OR REPLACE VIEW public.v_record_flags_sla AS
SELECT
  id, entidade, registro_id, cor, rotulo, prioridade, setor,
  user_id, user_email, sla_em, created_at,
  CASE
    WHEN sla_em < now() THEN 'ESTOURADO'
    WHEN sla_em < now() + interval '24 hours' THEN 'CRITICO'
    WHEN sla_em < now() + interval '72 hours' THEN 'ATENCAO'
    ELSE 'OK'
  END AS sla_status,
  extract(epoch FROM (sla_em - now()))/3600 AS horas_para_sla
FROM public.record_flags
WHERE sla_em IS NOT NULL AND resolvido_em IS NULL;

GRANT SELECT ON public.v_record_flags_sla TO authenticated;