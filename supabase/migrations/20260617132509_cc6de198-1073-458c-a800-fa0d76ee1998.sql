CREATE OR REPLACE FUNCTION public.tg_comissao_timeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_acao text;
  v_user uuid := auth.uid();
  v_titulo text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := CASE NEW.origem
                WHEN 'CONTRATO' THEN 'COMISSAO_PREVISTA'
                WHEN 'ADITIVO'  THEN 'COMISSAO_ADITIVO'
                WHEN 'AJUSTE'   THEN 'COMISSAO_SUBSTITUIDA_NOVA'
              END;
    v_titulo := COALESCE(NEW.codigo,'comissão') || ' — ' || NEW.status::text;
    INSERT INTO public.eventos_timeline (objeto_tipo, objeto_id, evento_tipo, titulo, descricao, payload, usuario_id)
    VALUES ('comissao', NEW.id, v_acao, v_titulo, NULLIF(btrim(NEW.motivo),''),
            jsonb_build_object('contrato_id',NEW.contrato_id,'aditivo_id',NEW.aditivo_id,
                               'projeto_id',NEW.projeto_id,'origem',NEW.origem,'percentual',NEW.percentual,'valor',NEW.valor_calculado),
            COALESCE(v_user, NEW.created_by));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_acao := 'COMISSAO_' || NEW.status::text;
    v_titulo := COALESCE(NEW.codigo,'comissão') || ' — ' || NEW.status::text;
    INSERT INTO public.eventos_timeline (objeto_tipo, objeto_id, evento_tipo, titulo, descricao, payload, usuario_id)
    VALUES ('comissao', NEW.id, v_acao, v_titulo,
            COALESCE(NEW.motivo_cancelamento, NEW.motivo, NEW.justificativa_aprovacao),
            jsonb_build_object('status_anterior',OLD.status,'status_novo',NEW.status,'percentual',NEW.percentual),
            COALESCE(v_user, NEW.created_by));
    RETURN NEW;
  END IF;
  RETURN NEW;
END$$;