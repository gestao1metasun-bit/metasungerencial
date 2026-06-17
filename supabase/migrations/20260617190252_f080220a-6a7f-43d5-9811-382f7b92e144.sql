-- D18.4 PARTE 2 — Trava enterprise de proposta historica (CONTRATADA/SUBSTITUIDA/CANCELADA)
-- Reforca regra: status historico => UPDATE bloqueado pela camada de propostas,
-- a menos que o fluxo oficial de revisao seja usado (flag app.via_revisao_proposta='true').
-- CONTRATADA e SUBSTITUIDA passam a constar explicitamente na lista de status travados.

CREATE OR REPLACE FUNCTION public.tg_propostas_bloqueia_edicao_aprovada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_via_revisao text;
  v_status_locked text[] := ARRAY['APROVADA','ASSINADA','EM_REVISAO','VENCIDA','CANCELADA','CONTRATADA','SUBSTITUIDA','EXPIRADA'];
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = ANY (v_status_locked) THEN
    v_via_revisao := current_setting('app.via_revisao_proposta', true);
    IF v_via_revisao IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Proposta historica (%) nao pode ser editada diretamente. Gere nova proposta ou ajuste o cadastro no objeto correto (cliente/contrato).', OLD.status
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Correcao da unica proposta CONTRATADA com valor 0 dentro da massa fixa (HOMO-D18-PRP-100).
-- Usa a flag oficial de revisao para passar pelo proprio trigger atualizado.
DO $$
BEGIN
  PERFORM set_config('app.via_revisao_proposta', 'true', true);
  UPDATE public.propostas
     SET valor_final  = 57500.00,
         potencia_kwp = 18.60,
         modulos_qtd  = 30,
         updated_at   = now()
   WHERE numero = 'HOMO-D18-PRP-100'
     AND (valor_final IS NULL OR valor_final = 0);
END $$;