
-- ===========================================================================
-- E.OS.1 — Schema (retry com tg_set_updated_at correto)
-- ===========================================================================

ALTER TABLE public.anexos DROP CONSTRAINT IF EXISTS anexos_entidade_tipo_check;
ALTER TABLE public.anexos ADD CONSTRAINT anexos_entidade_tipo_check CHECK (
  entidade_tipo = ANY (ARRAY[
    'clientes','fornecedores','contratos','aditivos','propostas','pedidos_venda',
    'projetos_contrato','obras','titulos_financeiros','parcelas_financeiras',
    'movimentacoes_financeiras','boletos','adiantamentos','rescisoes_contrato',
    'extrato_banco','workflow_aprovacoes','estoque_movimentos','estoque_reservas',
    'estoque_entregas','ordens_compra','cotacoes_compra','solicitacoes_material',
    'financiamentos','produtos','leads','tarefas','operacoes_financeiras',
    'operacoes_financeiras_parcelas',
    'os_ordens','os_tarefas','os_formularios_definicao','os_servicos_faturar',
    'os_requisicoes_equipamento'
  ])
);

CREATE OR REPLACE FUNCTION public.tg_os_bloqueia_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF coalesce(current_setting('app.via_os_rpc', true), '') <> 'true' THEN
      RAISE EXCEPTION 'Mudança direta de status proibida em %; use RPC oficial.', TG_TABLE_NAME
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Catálogo status -----------------------------------------------------------
CREATE TABLE public.os_status_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE, nome text NOT NULL,
  cor text NOT NULL DEFAULT '#6b7280',
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.os_status_catalogo TO authenticated;
GRANT ALL ON public.os_status_catalogo TO service_role;
ALTER TABLE public.os_status_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_status_sel ON public.os_status_catalogo FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_status_wr ON public.os_status_catalogo FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'os.cadastros.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.cadastros.editar'));
CREATE TRIGGER tg_os_status_upd BEFORE UPDATE ON public.os_status_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Pipelines -----------------------------------------------------------------
CREATE TABLE public.os_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE, descricao text,
  etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.os_pipelines TO authenticated;
GRANT ALL ON public.os_pipelines TO service_role;
ALTER TABLE public.os_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_pipe_sel ON public.os_pipelines FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_pipe_wr ON public.os_pipelines FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'os.cadastros.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.cadastros.editar'));
CREATE TRIGGER tg_os_pipe_upd BEFORE UPDATE ON public.os_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Cadastros auxiliares ------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'os_area_negocio','os_categorias_equipamento','os_equipamentos',
    'os_funcoes_tecnico','os_motoristas','os_ocorrencias','os_servicos',
    'os_tecnicos','os_veiculos'
  ] LOOP
    EXECUTE format($f$
      CREATE TABLE public.%I (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL, descricao text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        ativo boolean NOT NULL DEFAULT true,
        deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      GRANT SELECT ON public.%I TO authenticated;
      GRANT ALL ON public.%I TO service_role;
      ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
      CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
        USING (public.has_permission(auth.uid(), 'os.visualizar'));
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
        USING (public.has_permission(auth.uid(), 'os.cadastros.editar'))
        WITH CHECK (public.has_permission(auth.uid(), 'os.cadastros.editar'));
      CREATE TRIGGER %I BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
    $f$,
      t,t,t,t,
      t||'_sel', t,
      t||'_wr', t,
      'tg_'||t||'_upd', t
    );
  END LOOP;
END$$;

-- Modelos de tarefas --------------------------------------------------------
CREATE TABLE public.os_tarefa_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE, descricao text,
  tarefas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.os_tarefa_modelos TO authenticated;
GRANT ALL ON public.os_tarefa_modelos TO service_role;
ALTER TABLE public.os_tarefa_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_tmod_sel ON public.os_tarefa_modelos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_tmod_wr ON public.os_tarefa_modelos FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'os.modelo.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.modelo.editar'));
CREATE TRIGGER tg_os_tmod_upd BEFORE UPDATE ON public.os_tarefa_modelos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Formulários definição -----------------------------------------------------
CREATE TABLE public.os_formularios_definicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE, descricao text,
  obrigatorio boolean NOT NULL DEFAULT false,
  campos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.os_formularios_definicao TO authenticated;
GRANT ALL ON public.os_formularios_definicao TO service_role;
ALTER TABLE public.os_formularios_definicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_fdef_sel ON public.os_formularios_definicao FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_fdef_wr ON public.os_formularios_definicao FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'os.modelo.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.modelo.editar'));
CREATE TRIGGER tg_os_fdef_upd BEFORE UPDATE ON public.os_formularios_definicao
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Núcleo: Ordens de serviço -------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.os_ordens_numero_seq START 1;

CREATE TABLE public.os_ordens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint NOT NULL UNIQUE DEFAULT nextval('public.os_ordens_numero_seq'),
  codigo text GENERATED ALWAYS AS ('OS-'||lpad(numero::text, 6, '0')) STORED,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE RESTRICT,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  proposta_id uuid REFERENCES public.propostas(id) ON DELETE SET NULL,
  pedido_venda_id uuid REFERENCES public.pedidos_venda(id) ON DELETE SET NULL,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  status_codigo text NOT NULL REFERENCES public.os_status_catalogo(codigo),
  pipeline_id uuid REFERENCES public.os_pipelines(id),
  area_negocio_id uuid REFERENCES public.os_area_negocio(id),
  ocorrencia_id uuid REFERENCES public.os_ocorrencias(id),
  tecnico_responsavel_id uuid REFERENCES public.os_tecnicos(id),
  veiculo_id uuid REFERENCES public.os_veiculos(id),
  motorista_id uuid REFERENCES public.os_motoristas(id),
  valor_orcado numeric(14,2) NOT NULL DEFAULT 0,
  custo_orcado numeric(14,2) NOT NULL DEFAULT 0,
  custo_total numeric(14,2) NOT NULL DEFAULT 0,
  valor_em_pv numeric(14,2) NOT NULL DEFAULT 0,
  data_cadastro date NOT NULL DEFAULT CURRENT_DATE,
  data_prev_inicio date,
  data_prev_termino date,
  data_inicio date,
  data_fim date,
  endereco_logradouro text, endereco_numero text, endereco_bairro text,
  endereco_cidade text, endereco_uf text, endereco_cep text,
  latitude double precision, longitude double precision,
  observacoes text,
  centro_resultado_id uuid REFERENCES public.centros_resultado(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  natureza_id uuid REFERENCES public.naturezas_financeiras(id),
  competencia date,
  categoria_contabil text,
  codigo_externo text,
  sistema_destino text,
  status_integracao text DEFAULT 'PENDENTE'
    CHECK (status_integracao IN ('PENDENTE','EXPORTADO','INTEGRADO','ERRO','NAO_APLICAVEL')),
  hash_remessa text,
  lote_integracao_id uuid REFERENCES public.lotes_integracao_contabil(id),
  row_version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid,
  delete_motivo text
);
CREATE INDEX idx_os_ordens_status ON public.os_ordens(status_codigo) WHERE deleted_at IS NULL;
CREATE INDEX idx_os_ordens_cliente ON public.os_ordens(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_os_ordens_contrato ON public.os_ordens(contrato_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_os_ordens_obra ON public.os_ordens(obra_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_os_ordens_tecnico ON public.os_ordens(tecnico_responsavel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_os_ordens_prev_inicio ON public.os_ordens(data_prev_inicio) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.os_ordens TO authenticated;
GRANT ALL ON public.os_ordens TO service_role;
GRANT USAGE ON SEQUENCE public.os_ordens_numero_seq TO authenticated;
ALTER TABLE public.os_ordens ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_ord_sel ON public.os_ordens FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_ord_ins ON public.os_ordens FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'os.criar'));
CREATE POLICY os_ord_upd ON public.os_ordens FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'os.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.editar'));
CREATE TRIGGER tg_os_ord_upd BEFORE UPDATE ON public.os_ordens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_os_ord_rv BEFORE UPDATE ON public.os_ordens
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();
CREATE TRIGGER tg_os_ord_st BEFORE UPDATE ON public.os_ordens
  FOR EACH ROW EXECUTE FUNCTION public.tg_os_bloqueia_status();

-- Tarefas -------------------------------------------------------------------
CREATE TABLE public.os_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.os_ordens(id) ON DELETE CASCADE,
  modelo_id uuid REFERENCES public.os_tarefa_modelos(id),
  formulario_id uuid REFERENCES public.os_formularios_definicao(id),
  nome text NOT NULL, descricao text,
  ordem int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PLANEJAMENTO'
    CHECK (status IN ('PLANEJAMENTO','AGENDADA','EM_EXECUCAO','FINALIZADA','CANCELADA')),
  tecnico_id uuid REFERENCES public.os_tecnicos(id),
  funcao_tecnico_id uuid REFERENCES public.os_funcoes_tecnico(id),
  data_prevista date,
  data_inicio timestamptz,
  data_fim timestamptz,
  duracao_estimada_min int,
  obrigatorio boolean NOT NULL DEFAULT false,
  assinatura_url text,
  assinatura_em timestamptz,
  latitude double precision, longitude double precision,
  observacoes text,
  row_version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_os_tar_os ON public.os_tarefas(os_id, ordem) WHERE deleted_at IS NULL;
CREATE INDEX idx_os_tar_tec ON public.os_tarefas(tecnico_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_os_tar_status ON public.os_tarefas(status) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.os_tarefas TO authenticated;
GRANT ALL ON public.os_tarefas TO service_role;
ALTER TABLE public.os_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_tar_sel ON public.os_tarefas FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_tar_ins ON public.os_tarefas FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'os.tarefa.atribuir')
              OR public.has_permission(auth.uid(), 'os.editar'));
CREATE POLICY os_tar_upd ON public.os_tarefas FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'os.tarefa.executar')
         OR public.has_permission(auth.uid(), 'os.tarefa.atribuir')
         OR public.has_permission(auth.uid(), 'os.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.tarefa.executar')
              OR public.has_permission(auth.uid(), 'os.tarefa.atribuir')
              OR public.has_permission(auth.uid(), 'os.editar'));
CREATE TRIGGER tg_os_tar_upd BEFORE UPDATE ON public.os_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_os_tar_rv BEFORE UPDATE ON public.os_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_row_version();
CREATE TRIGGER tg_os_tar_st BEFORE UPDATE ON public.os_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.tg_os_bloqueia_status();

-- Respostas formulário ------------------------------------------------------
CREATE TABLE public.os_formulario_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.os_tarefas(id) ON DELETE CASCADE,
  formulario_id uuid NOT NULL REFERENCES public.os_formularios_definicao(id),
  respondido_por uuid REFERENCES auth.users(id),
  respondido_em timestamptz NOT NULL DEFAULT now(),
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_fresp_tar ON public.os_formulario_respostas(tarefa_id);
GRANT SELECT, INSERT, UPDATE ON public.os_formulario_respostas TO authenticated;
GRANT ALL ON public.os_formulario_respostas TO service_role;
ALTER TABLE public.os_formulario_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_fresp_sel ON public.os_formulario_respostas FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_fresp_ins ON public.os_formulario_respostas FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'os.formulario.responder'));
CREATE POLICY os_fresp_upd ON public.os_formulario_respostas FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'os.formulario.responder'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.formulario.responder'));
CREATE TRIGGER tg_os_fresp_upd BEFORE UPDATE ON public.os_formulario_respostas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Serviços a faturar --------------------------------------------------------
CREATE TABLE public.os_servicos_faturar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.os_ordens(id) ON DELETE CASCADE,
  servico_id uuid REFERENCES public.os_servicos(id),
  descricao text NOT NULL,
  quantidade numeric(14,4) NOT NULL DEFAULT 1,
  valor_unitario numeric(14,2) NOT NULL DEFAULT 0,
  valor_total numeric(14,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  oriundo_orcamento boolean NOT NULL DEFAULT false,
  recorrencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_svc_fat_os ON public.os_servicos_faturar(os_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_servicos_faturar TO authenticated;
GRANT ALL ON public.os_servicos_faturar TO service_role;
ALTER TABLE public.os_servicos_faturar ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_svc_fat_sel ON public.os_servicos_faturar FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_svc_fat_wr ON public.os_servicos_faturar FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'os.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.editar'));
CREATE TRIGGER tg_os_svc_fat_upd BEFORE UPDATE ON public.os_servicos_faturar
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Requisições equipamento ---------------------------------------------------
CREATE TABLE public.os_requisicoes_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.os_ordens(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.os_equipamentos(id),
  descricao text NOT NULL,
  quantidade numeric(14,4) NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','RESERVADO','ENTREGUE','DEVOLVIDO','CANCELADO')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_req_os ON public.os_requisicoes_equipamento(os_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.os_requisicoes_equipamento TO authenticated;
GRANT ALL ON public.os_requisicoes_equipamento TO service_role;
ALTER TABLE public.os_requisicoes_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_req_sel ON public.os_requisicoes_equipamento FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_req_wr ON public.os_requisicoes_equipamento FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'os.editar'))
  WITH CHECK (public.has_permission(auth.uid(), 'os.editar'));
CREATE TRIGGER tg_os_req_upd BEFORE UPDATE ON public.os_requisicoes_equipamento
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Histórico/eventos ---------------------------------------------------------
CREATE TABLE public.os_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.os_ordens(id) ON DELETE CASCADE,
  tarefa_id uuid REFERENCES public.os_tarefas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  ator_id uuid REFERENCES auth.users(id),
  descricao text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_ev_os ON public.os_eventos(os_id, created_at DESC);
CREATE INDEX idx_os_ev_tar ON public.os_eventos(tarefa_id) WHERE tarefa_id IS NOT NULL;
GRANT SELECT, INSERT ON public.os_eventos TO authenticated;
GRANT ALL ON public.os_eventos TO service_role;
ALTER TABLE public.os_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY os_ev_sel ON public.os_eventos FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'os.visualizar'));
CREATE POLICY os_ev_ins ON public.os_eventos FOR INSERT TO authenticated
  WITH CHECK (coalesce(current_setting('app.via_os_rpc', true), '') = 'true');

-- Seeds --------------------------------------------------------------------
INSERT INTO public.os_status_catalogo (codigo, nome, cor, ordem, is_final) VALUES
  ('VISTORIA_PRE_CONTRATO','Vistoria Pré-Contrato','#94a3b8',10,false),
  ('STAND_BY','Stand-by','#f59e0b',20,false),
  ('NOVO_PROJETO','Novo Projeto','#a855f7',30,false),
  ('ELABORACAO_PROJETO','Elaboração de Projeto','#3b82f6',40,false),
  ('PROJETO_ANALISE','Projeto em Análise','#ef4444',50,false),
  ('PROJETO_APROVADO','Projeto Aprovado','#22c55e',60,false),
  ('PARECER_ACESSO_ABERTO','Parecer de Acesso em Aberto','#06b6d4',70,false),
  ('EM_EXECUCAO','Em Execução','#0ea5e9',80,false),
  ('AGUARDANDO_VISTORIA','Aguardando Vistoria','#eab308',90,false),
  ('FINALIZADA','Finalizada','#16a34a',100,true),
  ('CANCELADA','Cancelada','#dc2626',110,true),
  ('MANUTENCAO','Manutenção','#f97316',120,false)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.os_pipelines (nome, descricao, etapas, is_default) VALUES
  ('Pipeline padrão Meta Sun',
   'Fluxo solar fotovoltaico residencial/comercial padrão.',
   '[
     {"ordem":1,"nome":"Vistoria","statuses":["VISTORIA_PRE_CONTRATO"]},
     {"ordem":2,"nome":"Documentação","statuses":["NOVO_PROJETO"]},
     {"ordem":3,"nome":"Projeto","statuses":["ELABORACAO_PROJETO","PROJETO_ANALISE","PROJETO_APROVADO"]},
     {"ordem":4,"nome":"Acesso","statuses":["PARECER_ACESSO_ABERTO"]},
     {"ordem":5,"nome":"Execução","statuses":["EM_EXECUCAO","AGUARDANDO_VISTORIA"]},
     {"ordem":6,"nome":"Encerramento","statuses":["FINALIZADA"]}
   ]'::jsonb,
   true)
ON CONFLICT (nome) DO NOTHING;
