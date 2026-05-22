
-- ============================================================
-- FASE 4 — Integridade referencial (guarda de dependências)
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_guard_dependencias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count int;
  v_is_soft_delete boolean := false;
BEGIN
  -- Admin pode tudo (modo exceção)
  IF public.is_admin(v_user) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Detectar se é soft-delete (UPDATE setando deleted_at) ou DELETE físico
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_is_soft_delete := true;
    ELSE
      -- update normal, não bloquear
      RETURN NEW;
    END IF;
  END IF;

  -- ---------- CLIENTES ----------
  IF TG_TABLE_NAME = 'clientes' THEN
    SELECT count(*) INTO v_count FROM public.contratos
      WHERE cliente_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Cliente possui % contrato(s) ativo(s); arquive os contratos primeiro.', v_count
        USING ERRCODE = '23503';
    END IF;
    SELECT count(*) INTO v_count FROM public.obras
      WHERE cliente_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Cliente possui % obra(s) ativa(s); arquive as obras primeiro.', v_count
        USING ERRCODE = '23503';
    END IF;
    SELECT count(*) INTO v_count FROM public.projetos
      WHERE cliente_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Cliente possui % projeto(s) ativo(s); arquive os projetos primeiro.', v_count
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- ---------- CONTRATOS ----------
  IF TG_TABLE_NAME = 'contratos' THEN
    SELECT count(*) INTO v_count FROM public.obras
      WHERE contrato_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Contrato possui % obra(s) vinculada(s); arquive as obras primeiro.', v_count
        USING ERRCODE = '23503';
    END IF;
    SELECT count(*) INTO v_count FROM public.aditivos
      WHERE contrato_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Contrato possui % aditivo(s) vinculado(s); arquive os aditivos primeiro.', v_count
        USING ERRCODE = '23503';
    END IF;
    SELECT count(*) INTO v_count FROM public.projetos
      WHERE contrato_id = OLD.id AND deleted_at IS NULL;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Contrato possui % projeto(s) vinculado(s); arquive os projetos primeiro.', v_count
        USING ERRCODE = '23503';
    END IF;
  END IF;

  -- ---------- OBRAS ----------
  IF TG_TABLE_NAME = 'obras' THEN
    IF OLD.status = 'Finalizada' THEN
      RAISE EXCEPTION 'Obra finalizada só pode ser arquivada por administrador.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ---------- PROJETOS ----------
  IF TG_TABLE_NAME = 'projetos' THEN
    IF OLD.contrato_id IS NOT NULL AND OLD.status IN ('Em produção', 'Executado') THEN
      RAISE EXCEPTION 'Projeto em produção/executado vinculado a contrato; apenas administrador pode arquivar.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

-- Triggers em todas as tabelas críticas
DROP TRIGGER IF EXISTS tg_clientes_guard_dep ON public.clientes;
CREATE TRIGGER tg_clientes_guard_dep
  BEFORE UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_dependencias();

DROP TRIGGER IF EXISTS tg_contratos_guard_dep ON public.contratos;
CREATE TRIGGER tg_contratos_guard_dep
  BEFORE UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_dependencias();

DROP TRIGGER IF EXISTS tg_obras_guard_dep ON public.obras;
CREATE TRIGGER tg_obras_guard_dep
  BEFORE UPDATE OR DELETE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_dependencias();

DROP TRIGGER IF EXISTS tg_projetos_guard_dep ON public.projetos;
CREATE TRIGGER tg_projetos_guard_dep
  BEFORE UPDATE OR DELETE ON public.projetos
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_dependencias();
