
-- =============================================================================
-- D15 Ondas 4 + 5 + 6 — Anexos universais, Auditoria forward-only, Concorrência
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ONDA 4 — Anexos universais (ampliar entidades suportadas)
-- -----------------------------------------------------------------------------
ALTER TABLE public.anexos DROP CONSTRAINT IF EXISTS anexos_entidade_tipo_check;
ALTER TABLE public.anexos ADD CONSTRAINT anexos_entidade_tipo_check CHECK (
  entidade_tipo = ANY (ARRAY[
    'clientes','fornecedores','contratos','aditivos','propostas','pedidos_venda',
    'projetos_contrato','obras','titulos_financeiros','parcelas_financeiras',
    'movimentacoes_financeiras','boletos','adiantamentos','rescisoes_contrato',
    'extrato_banco','workflow_aprovacoes','estoque_movimentos','estoque_reservas',
    'estoque_entregas','ordens_compra','cotacoes_compra','solicitacoes_material',
    'financiamentos','produtos','leads','tarefas'
  ])
);

-- Trigger de auditoria na própria tabela de anexos
DROP TRIGGER IF EXISTS tg_anexos_audit ON public.anexos;
CREATE TRIGGER tg_anexos_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.anexos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('anexos','anexos');

-- -----------------------------------------------------------------------------
-- ONDA 5 — Auditoria forward-only (cobrir tabelas órfãs)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tg_audit_fornecedores ON public.fornecedores;
CREATE TRIGGER tg_audit_fornecedores AFTER INSERT OR UPDATE OR DELETE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('cadastros','fornecedores');

DROP TRIGGER IF EXISTS tg_audit_boletos ON public.boletos;
CREATE TRIGGER tg_audit_boletos AFTER INSERT OR UPDATE OR DELETE ON public.boletos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','boletos');

DROP TRIGGER IF EXISTS tg_audit_rescisoes_contrato ON public.rescisoes_contrato;
CREATE TRIGGER tg_audit_rescisoes_contrato AFTER INSERT OR UPDATE OR DELETE ON public.rescisoes_contrato
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','rescisoes_contrato');

DROP TRIGGER IF EXISTS tg_audit_adiantamentos ON public.adiantamentos;
CREATE TRIGGER tg_audit_adiantamentos AFTER INSERT OR UPDATE OR DELETE ON public.adiantamentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','adiantamentos');

DROP TRIGGER IF EXISTS tg_audit_extrato_banco ON public.extrato_banco;
CREATE TRIGGER tg_audit_extrato_banco AFTER INSERT OR UPDATE OR DELETE ON public.extrato_banco
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','extrato_banco');

DROP TRIGGER IF EXISTS tg_audit_titulos_taxas ON public.titulos_taxas;
CREATE TRIGGER tg_audit_titulos_taxas AFTER INSERT OR UPDATE OR DELETE ON public.titulos_taxas
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('financeiro','titulos_taxas');

DROP TRIGGER IF EXISTS tg_audit_naturezas_financeiras ON public.naturezas_financeiras;
CREATE TRIGGER tg_audit_naturezas_financeiras AFTER INSERT OR UPDATE OR DELETE ON public.naturezas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('cadastros','naturezas_financeiras');

DROP TRIGGER IF EXISTS tg_audit_grupos_financeiros ON public.grupos_financeiros;
CREATE TRIGGER tg_audit_grupos_financeiros AFTER INSERT OR UPDATE OR DELETE ON public.grupos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('cadastros','grupos_financeiros');

DROP TRIGGER IF EXISTS tg_audit_subgrupos_financeiros ON public.subgrupos_financeiros;
CREATE TRIGGER tg_audit_subgrupos_financeiros AFTER INSERT OR UPDATE OR DELETE ON public.subgrupos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('cadastros','subgrupos_financeiros');

DROP TRIGGER IF EXISTS tg_audit_meios_pagamento ON public.meios_pagamento;
CREATE TRIGGER tg_audit_meios_pagamento AFTER INSERT OR UPDATE OR DELETE ON public.meios_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('cadastros','meios_pagamento');

DROP TRIGGER IF EXISTS tg_audit_tipos_aplicacao ON public.tipos_aplicacao;
CREATE TRIGGER tg_audit_tipos_aplicacao AFTER INSERT OR UPDATE OR DELETE ON public.tipos_aplicacao
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('cadastros','tipos_aplicacao');

-- -----------------------------------------------------------------------------
-- ONDA 6 — Concorrência / versionamento / idempotência
-- -----------------------------------------------------------------------------

-- 6.1 Função genérica para incrementar row_version em qualquer UPDATE
CREATE OR REPLACE FUNCTION public.tg_bump_row_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.row_version := COALESCE(NEW.row_version, 1);
  END IF;
  RETURN NEW;
END $$;

-- 6.2 Adicionar row_version + trigger em entidades críticas
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'titulos_financeiros','parcelas_financeiras','movimentacoes_financeiras',
    'contratos','clientes','fornecedores','pedidos_venda','obras',
    'workflow_aprovacoes','naturezas_financeiras','centros_resultado',
    'contas_financeiras','grupos_financeiros','subgrupos_financeiros',
    'meios_pagamento','tipos_aplicacao','boletos','adiantamentos',
    'rescisoes_contrato','ordens_compra','cotacoes_compra','solicitacoes_material'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS row_version int NOT NULL DEFAULT 1', t);
    EXECUTE format('DROP TRIGGER IF EXISTS tg_bump_row_version ON public.%I', t);
    EXECUTE format('CREATE TRIGGER tg_bump_row_version BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version()', t);
  END LOOP;
END $$;

-- 6.3 Função de guarda de optimistic locking — chame antes de UPDATE manual
CREATE OR REPLACE FUNCTION public.check_row_version(_tabela regclass, _id uuid, _expected_version int)
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_actual int;
BEGIN
  EXECUTE format('SELECT row_version FROM %s WHERE id = $1', _tabela)
    INTO v_actual USING _id;
  IF v_actual IS NULL THEN
    RAISE EXCEPTION 'Registro % não encontrado em %.', _id, _tabela USING ERRCODE='22023';
  END IF;
  IF v_actual <> _expected_version THEN
    RAISE EXCEPTION 'Conflito de concorrência: registro foi alterado por outro usuário (esperado v%, atual v%). Recarregue e tente novamente.',
      _expected_version, v_actual USING ERRCODE='40001';
  END IF;
END $$;

-- 6.4 Idempotência: helper que registra ou retorna resultado anterior
CREATE OR REPLACE FUNCTION public.rpc_idempotente_check(_request_id uuid, _rpc_nome text, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing jsonb;
  v_hash text := md5(coalesce(_payload::text,''));
BEGIN
  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'request_id obrigatório para idempotência.' USING ERRCODE='22023';
  END IF;
  SELECT resultado INTO v_existing FROM public.rpc_idempotencia WHERE request_id = _request_id;
  IF FOUND THEN
    RETURN jsonb_build_object('cached', true, 'resultado', v_existing);
  END IF;
  INSERT INTO public.rpc_idempotencia(request_id, rpc_nome, user_id, payload_hash, resultado)
    VALUES (_request_id, _rpc_nome, v_user, v_hash, NULL)
    ON CONFLICT (request_id) DO NOTHING;
  RETURN jsonb_build_object('cached', false);
END $$;

CREATE OR REPLACE FUNCTION public.rpc_idempotente_commit(_request_id uuid, _resultado jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.rpc_idempotencia SET resultado = _resultado WHERE request_id = _request_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.check_row_version(regclass, uuid, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_idempotente_check(uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_idempotente_commit(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_bump_row_version() FROM anon, authenticated;
