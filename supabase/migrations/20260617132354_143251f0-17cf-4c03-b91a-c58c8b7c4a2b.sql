-- C-ENT.10 — parte 2 (após commit dos novos enums/colunas)

-- 1. Grants das novas permissões ---------------------------------------
INSERT INTO public.role_permissions (role, permission)
SELECT r, p::public.app_permission
FROM (VALUES ('admin_master'::public.app_role),
             ('admin_geral'::public.app_role),
             ('usuario'::public.app_role)) AS roles(r)
CROSS JOIN (VALUES
  ('comercial.comissao.criar'),
  ('comercial.comissao.editar'),
  ('comercial.comissao.aprovar'),
  ('comercial.comissao.substituir')
) AS perms(p)
ON CONFLICT DO NOTHING;

-- pagar só admin
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin_master','comercial.comissao.pagar'),
  ('admin_geral','comercial.comissao.pagar')
ON CONFLICT DO NOTHING;

-- 2. Trigger de geração automática (atualiza p/ novos campos) ----------
CREATE OR REPLACE FUNCTION public.tg_assinatura_cria_comissao_prevista()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_c public.contratos%ROWTYPE;
  v_pct numeric; v_base numeric; v_valor numeric; v_id uuid;
  v_codigo text;
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
  v_codigo := 'COM-' || lpad(nextval('public.comissao_codigo_seq')::text, 6, '0');
  INSERT INTO public.comercial_comissoes (
    codigo, contrato_id, proposta_id, assinatura_evento_id,
    vendedor_id, vendedor_nome,
    beneficiario_id, beneficiario_nome, tipo_beneficiario,
    origem, percentual, valor_base, valor_calculado, valor_previsto,
    status, prevista_em, created_by
  ) VALUES (
    v_codigo, NEW.contrato_id, v_c.proposta_id, NEW.id,
    v_c.consultor_id, v_c.vendedor,
    v_c.consultor_id, v_c.vendedor, 'CONSULTOR',
    'CONTRATO', v_pct, v_base, v_valor, v_valor,
    'PREVISTA', now(), NEW.assinado_por
  ) RETURNING id INTO v_id;
  INSERT INTO public.comercial_comissao_eventos (
    comissao_id, acao, status_novo, valor_novo, percentual_novo,
    motivo, metadata, usuario_id, permissao_usada
  ) VALUES (
    v_id,'CRIADA','PREVISTA', v_valor, v_pct,
    'Gerada automaticamente da assinatura',
    jsonb_build_object('assinatura_evento_id', NEW.id, 'contrato_id', NEW.contrato_id,
                       'codigo', v_codigo, 'origem','CONTRATO'),
    NEW.assinado_por, NEW.permissao_usada
  );
  RETURN NEW;
END$function$;

-- 3. RPC: aprovar comissão prevista ------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_comissao_aprovar(
  p_comissao_id uuid,
  p_justificativa text DEFAULT NULL
) RETURNS public.comercial_comissoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v public.comercial_comissoes%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_permission(v_user, 'comercial.comissao.aprovar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: comercial.comissao.aprovar';
  END IF;
  SELECT * INTO v FROM public.comercial_comissoes
   WHERE id = p_comissao_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comissão não encontrada'; END IF;
  IF v.status <> 'PREVISTA' THEN
    RAISE EXCEPTION 'Só comissões PREVISTAS podem ser aprovadas (atual=%)', v.status;
  END IF;
  UPDATE public.comercial_comissoes
     SET status = 'APROVADA',
         aprovada_em = now(),
         aprovada_por = v_user,
         justificativa_aprovacao = NULLIF(btrim(p_justificativa),''),
         valor_aprovado = COALESCE(valor_aprovado, valor_calculado),
         updated_at = now()
   WHERE id = p_comissao_id
   RETURNING * INTO v;
  INSERT INTO public.comercial_comissao_eventos (
    comissao_id, acao, status_anterior, status_novo,
    motivo, metadata, usuario_id, permissao_usada
  ) VALUES (
    p_comissao_id, 'APROVADA', 'PREVISTA','APROVADA',
    NULLIF(btrim(p_justificativa),''),
    jsonb_build_object('valor_aprovado', v.valor_aprovado),
    v_user, 'comercial.comissao.aprovar'
  );
  RETURN v;
END$$;

REVOKE ALL ON FUNCTION public.rpc_comissao_aprovar(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_aprovar(uuid, text) TO authenticated;

-- 4. RPC: substituir comissão (gera nova, marca antiga SUBSTITUIDA) ----
CREATE OR REPLACE FUNCTION public.rpc_comissao_substituir(
  p_comissao_id uuid,
  p_novo_percentual numeric,
  p_motivo text
) RETURNS public.comercial_comissoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v public.comercial_comissoes%ROWTYPE;
  v_nova public.comercial_comissoes%ROWTYPE;
  v_user uuid := auth.uid();
  v_codigo text;
  v_novo_valor numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_permission(v_user,'comercial.comissao.substituir'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: comercial.comissao.substituir';
  END IF;
  IF coalesce(length(btrim(p_motivo)),0) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;
  IF p_novo_percentual IS NULL OR p_novo_percentual < 0 OR p_novo_percentual > 100 THEN
    RAISE EXCEPTION 'Percentual inválido';
  END IF;
  SELECT * INTO v FROM public.comercial_comissoes
   WHERE id = p_comissao_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comissão não encontrada'; END IF;
  IF v.status IN ('PAGA','CANCELADA','SUBSTITUIDA','ESTORNADA') THEN
    RAISE EXCEPTION 'Comissão % não pode ser substituída', v.status;
  END IF;
  v_novo_valor := ROUND(coalesce(v.valor_base,0) * p_novo_percentual / 100.0, 2);
  v_codigo := 'COM-' || lpad(nextval('public.comissao_codigo_seq')::text, 6, '0');

  INSERT INTO public.comercial_comissoes (
    codigo, contrato_id, projeto_id, proposta_id, aditivo_id,
    assinatura_evento_id, vendedor_id, vendedor_nome,
    beneficiario_id, beneficiario_nome, tipo_beneficiario,
    percentual, valor_base, valor_calculado, valor_previsto,
    status, prevista_em, origem, comissao_origem_id,
    motivo, created_by
  ) VALUES (
    v_codigo, v.contrato_id, v.projeto_id, v.proposta_id, v.aditivo_id,
    v.assinatura_evento_id, v.vendedor_id, v.vendedor_nome,
    v.beneficiario_id, v.beneficiario_nome, v.tipo_beneficiario,
    p_novo_percentual, v.valor_base, v_novo_valor, v_novo_valor,
    'PREVISTA', now(), 'AJUSTE', v.id,
    p_motivo, v_user
  ) RETURNING * INTO v_nova;

  UPDATE public.comercial_comissoes
     SET status = 'SUBSTITUIDA',
         substituida_em = now(),
         substituida_por = v_user,
         substituida_por_comissao_id = v_nova.id,
         motivo = COALESCE(motivo, p_motivo),
         updated_at = now()
   WHERE id = v.id;

  INSERT INTO public.comercial_comissao_eventos (comissao_id, acao, status_anterior, status_novo, motivo, metadata, usuario_id, permissao_usada)
  VALUES
    (v.id,'SUBSTITUIDA', v.status::text,'SUBSTITUIDA', p_motivo,
     jsonb_build_object('substituida_por_comissao_id', v_nova.id,'novo_codigo',v_codigo,'novo_percentual',p_novo_percentual),
     v_user,'comercial.comissao.substituir'),
    (v_nova.id,'CRIADA', NULL,'PREVISTA', p_motivo,
     jsonb_build_object('comissao_origem_id', v.id,'origem','AJUSTE','codigo',v_codigo),
     v_user,'comercial.comissao.substituir');
  RETURN v_nova;
END$$;

REVOKE ALL ON FUNCTION public.rpc_comissao_substituir(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_substituir(uuid, numeric, text) TO authenticated;

-- 5. RPC: gerar comissão complementar de aditivo -----------------------
CREATE OR REPLACE FUNCTION public.rpc_comissao_gerar_de_aditivo(
  p_aditivo_id uuid,
  p_percentual numeric DEFAULT NULL,
  p_observacao text DEFAULT NULL
) RETURNS public.comercial_comissoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ad public.aditivos%ROWTYPE;
  v_c  public.contratos%ROWTYPE;
  v_pct numeric; v_base numeric; v_valor numeric;
  v_codigo text; v_id uuid;
  v_user uuid := auth.uid();
  v_out public.comercial_comissoes%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_permission(v_user,'comercial.comissao.criar'::public.app_permission) THEN
    RAISE EXCEPTION 'Sem permissão: comercial.comissao.criar';
  END IF;
  SELECT * INTO v_ad FROM public.aditivos WHERE id = p_aditivo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aditivo não encontrado'; END IF;
  IF v_ad.status <> 'APLICADO' THEN
    RAISE EXCEPTION 'Aditivo deve estar APLICADO para gerar comissão (atual=%)', v_ad.status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.comercial_comissoes
              WHERE aditivo_id = p_aditivo_id AND deleted_at IS NULL
                AND status <> 'CANCELADA') THEN
    RAISE EXCEPTION 'Já existe comissão ativa para este aditivo';
  END IF;
  SELECT * INTO v_c FROM public.contratos WHERE id = v_ad.contrato_id;
  v_pct  := COALESCE(p_percentual, v_c.comissao_pct, 0);
  -- Base = delta de valor do aditivo
  v_base := COALESCE(v_ad.valor_novo,0) - COALESCE(v_ad.valor_anterior,0);
  v_valor := ROUND(v_base * v_pct / 100.0, 2);
  v_codigo := 'COM-' || lpad(nextval('public.comissao_codigo_seq')::text, 6, '0');

  INSERT INTO public.comercial_comissoes (
    codigo, contrato_id, projeto_id, proposta_id, aditivo_id,
    vendedor_id, vendedor_nome,
    beneficiario_id, beneficiario_nome, tipo_beneficiario,
    percentual, valor_base, valor_calculado, valor_previsto,
    status, prevista_em, origem,
    motivo, created_by
  ) VALUES (
    v_codigo, v_c.id, v_ad.projeto_id, v_c.proposta_id, v_ad.id,
    v_c.consultor_id, v_c.vendedor,
    v_c.consultor_id, v_c.vendedor, 'CONSULTOR',
    v_pct, v_base, v_valor, v_valor,
    'PREVISTA', now(), 'ADITIVO',
    NULLIF(btrim(p_observacao),''), v_user
  ) RETURNING * INTO v_out;

  INSERT INTO public.comercial_comissao_eventos (comissao_id, acao, status_novo, valor_novo, percentual_novo, motivo, metadata, usuario_id, permissao_usada)
  VALUES (v_out.id,'CRIADA','PREVISTA', v_valor, v_pct,
          NULLIF(btrim(p_observacao),''),
          jsonb_build_object('aditivo_id', v_ad.id,'origem','ADITIVO','codigo',v_codigo,'base_delta',v_base),
          v_user,'comercial.comissao.criar');
  RETURN v_out;
END$$;

REVOKE ALL ON FUNCTION public.rpc_comissao_gerar_de_aditivo(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_comissao_gerar_de_aditivo(uuid, numeric, text) TO authenticated;

-- 6. Trigger de timeline para comissões --------------------------------
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
    INSERT INTO public.eventos_timeline (objeto_tipo, objeto_id, tipo_evento, titulo, descricao, payload, usuario_id)
    VALUES ('comissao', NEW.id, v_acao, v_titulo, NULLIF(btrim(NEW.motivo),''),
            jsonb_build_object('contrato_id',NEW.contrato_id,'aditivo_id',NEW.aditivo_id,
                               'projeto_id',NEW.projeto_id,'origem',NEW.origem,'percentual',NEW.percentual,'valor',NEW.valor_calculado),
            COALESCE(v_user, NEW.created_by));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_acao := 'COMISSAO_' || NEW.status::text;
    v_titulo := COALESCE(NEW.codigo,'comissão') || ' — ' || NEW.status::text;
    INSERT INTO public.eventos_timeline (objeto_tipo, objeto_id, tipo_evento, titulo, descricao, payload, usuario_id)
    VALUES ('comissao', NEW.id, v_acao, v_titulo,
            COALESCE(NEW.motivo_cancelamento, NEW.motivo, NEW.justificativa_aprovacao),
            jsonb_build_object('status_anterior',OLD.status,'status_novo',NEW.status,'percentual',NEW.percentual),
            COALESCE(v_user, NEW.created_by));
    RETURN NEW;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_comissao_timeline_ins ON public.comercial_comissoes;
CREATE TRIGGER trg_comissao_timeline_ins
AFTER INSERT ON public.comercial_comissoes
FOR EACH ROW EXECUTE FUNCTION public.tg_comissao_timeline();

DROP TRIGGER IF EXISTS trg_comissao_timeline_upd ON public.comercial_comissoes;
CREATE TRIGGER trg_comissao_timeline_upd
AFTER UPDATE ON public.comercial_comissoes
FOR EACH ROW EXECUTE FUNCTION public.tg_comissao_timeline();