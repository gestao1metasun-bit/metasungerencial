
-- 3) Cabeçalho
CREATE TABLE IF NOT EXISTS public.operacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  tipo public.op_fin_tipo NOT NULL,
  status public.op_fin_status NOT NULL DEFAULT 'RASCUNHO',
  natureza_caixa public.op_fin_natureza_caixa NOT NULL,

  cliente_id uuid REFERENCES public.clientes(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  colaborador_user_id uuid,
  colaborador_nome text,
  socio_nome text,
  terceiro_nome text,
  terceiro_documento text,

  valor_total numeric(14,2) NOT NULL CHECK (valor_total > 0),
  data_operacao date NOT NULL DEFAULT current_date,
  finalidade text,
  observacoes text,

  qtd_parcelas integer NOT NULL DEFAULT 1 CHECK (qtd_parcelas >= 1),
  forma_baixa public.op_fin_forma_baixa,

  natureza_id uuid REFERENCES public.naturezas_financeiras(id),
  centro_resultado_id uuid REFERENCES public.centros_resultado(id),
  conta_id uuid,
  banco_contrato text,
  juros_pct numeric(6,3),
  instituicao text,

  renegociacao_de uuid REFERENCES public.operacoes_financeiras(id),

  row_version integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  codigo_externo text,
  sistema_destino text,
  status_integracao text DEFAULT 'PENDENTE'
    CHECK (status_integracao IN ('PENDENTE','EM_FILA','ENVIADO','CONFIRMADO','ERRO','IGNORADO')),
  hash_remessa text,
  lote text,
  competencia date,
  conta_contabil_mapeavel text,

  CHECK (
    (tipo IN ('APORTE_CAPITAL','EMPRESTIMO_SOCIO_EMPRESA') AND qtd_parcelas = 1)
    OR tipo NOT IN ('APORTE_CAPITAL','EMPRESTIMO_SOCIO_EMPRESA')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operacoes_financeiras TO authenticated;
GRANT ALL ON public.operacoes_financeiras TO service_role;
ALTER TABLE public.operacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_fin sel" ON public.operacoes_financeiras FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'operacao_financeira.visualizar'::app_permission));
CREATE POLICY "op_fin ins" ON public.operacoes_financeiras FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'operacao_financeira.criar'::app_permission));
CREATE POLICY "op_fin upd" ON public.operacoes_financeiras FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'operacao_financeira.criar'::app_permission));
CREATE POLICY "op_fin del" ON public.operacoes_financeiras FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'operacao_financeira.cancelar'::app_permission));

-- 4) Parcelas
CREATE TABLE IF NOT EXISTS public.operacoes_financeiras_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_financeiras(id) ON DELETE CASCADE,
  numero integer NOT NULL CHECK (numero >= 1),
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  vencimento date NOT NULL,
  titulo_id uuid REFERENCES public.titulos_financeiros(id),
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operacao_id, numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operacoes_financeiras_parcelas TO authenticated;
GRANT ALL ON public.operacoes_financeiras_parcelas TO service_role;
ALTER TABLE public.operacoes_financeiras_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_fin_parc sel" ON public.operacoes_financeiras_parcelas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'operacao_financeira.visualizar'::app_permission));
CREATE POLICY "op_fin_parc ins" ON public.operacoes_financeiras_parcelas FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'operacao_financeira.criar'::app_permission));
CREATE POLICY "op_fin_parc upd" ON public.operacoes_financeiras_parcelas FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'operacao_financeira.criar'::app_permission));
CREATE POLICY "op_fin_parc del" ON public.operacoes_financeiras_parcelas FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'operacao_financeira.cancelar'::app_permission));

-- 5) Eventos append-only
CREATE TABLE IF NOT EXISTS public.operacoes_financeiras_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_financeiras(id) ON DELETE CASCADE,
  evento text NOT NULL CHECK (evento IN (
    'CRIADA','APROVADA','LIBERADA','QUITADA','RENEGOCIADA',
    'CANCELADA','ESTORNADA','EDITADA','PARCELAS_GERADAS','BAIXA_PARCIAL'
  )),
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  motivo text,
  ator uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.operacoes_financeiras_eventos TO authenticated;
GRANT ALL ON public.operacoes_financeiras_eventos TO service_role;
ALTER TABLE public.operacoes_financeiras_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_fin_ev sel" ON public.operacoes_financeiras_eventos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'operacao_financeira.visualizar'::app_permission));
CREATE POLICY "op_fin_ev ins" ON public.operacoes_financeiras_eventos FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6) Trigger anti-edição direta de status
CREATE OR REPLACE FUNCTION public.tg_op_fin_bloqueia_edicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.via_op_fin_rpc', true) = 'true' THEN RETURN NEW; END IF;
  IF OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'Status de operação financeira só pode ser alterado via RPC oficial (app.via_op_fin_rpc).';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_op_fin_bloqueia_edicao
BEFORE UPDATE ON public.operacoes_financeiras
FOR EACH ROW EXECUTE FUNCTION public.tg_op_fin_bloqueia_edicao();

-- 7) Trigger row_version + updated_at
CREATE OR REPLACE FUNCTION public.tg_op_fin_bump_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER tg_op_fin_bump
BEFORE UPDATE ON public.operacoes_financeiras
FOR EACH ROW EXECUTE FUNCTION public.tg_op_fin_bump_version();

CREATE TRIGGER tg_op_fin_parc_bump
BEFORE UPDATE ON public.operacoes_financeiras_parcelas
FOR EACH ROW EXECUTE FUNCTION public.tg_op_fin_bump_version();

-- 8) Trigger valida contraparte por tipo
CREATE OR REPLACE FUNCTION public.tg_op_fin_valida_contraparte()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'EMPRESTIMO_CLIENTE' AND NEW.cliente_id IS NULL THEN
    RAISE EXCEPTION 'EMPRESTIMO_CLIENTE exige cliente_id';
  ELSIF NEW.tipo = 'EMPRESTIMO_FORNECEDOR' AND NEW.fornecedor_id IS NULL THEN
    RAISE EXCEPTION 'EMPRESTIMO_FORNECEDOR exige fornecedor_id';
  ELSIF NEW.tipo = 'EMPRESTIMO_COLABORADOR' AND NEW.colaborador_user_id IS NULL AND NEW.colaborador_nome IS NULL THEN
    RAISE EXCEPTION 'EMPRESTIMO_COLABORADOR exige colaborador';
  ELSIF NEW.tipo IN ('EMPRESTIMO_SOCIO_EMPRESA','APORTE_CAPITAL') AND NEW.socio_nome IS NULL THEN
    RAISE EXCEPTION '% exige socio_nome', NEW.tipo;
  ELSIF NEW.tipo = 'EMPRESTIMO_EMPRESA_TERCEIRO' AND NEW.terceiro_nome IS NULL THEN
    RAISE EXCEPTION 'EMPRESTIMO_EMPRESA_TERCEIRO exige terceiro_nome';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_op_fin_valida_contraparte
BEFORE INSERT OR UPDATE ON public.operacoes_financeiras
FOR EACH ROW EXECUTE FUNCTION public.tg_op_fin_valida_contraparte();

-- 9) Índices
CREATE INDEX IF NOT EXISTS idx_op_fin_tipo_status ON public.operacoes_financeiras (tipo, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_op_fin_data ON public.operacoes_financeiras (data_operacao DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_op_fin_cliente ON public.operacoes_financeiras (cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_op_fin_fornecedor ON public.operacoes_financeiras (fornecedor_id) WHERE fornecedor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_op_fin_parc_op ON public.operacoes_financeiras_parcelas (operacao_id, numero);
CREATE INDEX IF NOT EXISTS idx_op_fin_parc_titulo ON public.operacoes_financeiras_parcelas (titulo_id) WHERE titulo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_op_fin_ev_op ON public.operacoes_financeiras_eventos (operacao_id, criado_em DESC);
