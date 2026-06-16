ALTER TABLE public.anexos DROP CONSTRAINT IF EXISTS anexos_entidade_tipo_check;
ALTER TABLE public.anexos ADD CONSTRAINT anexos_entidade_tipo_check CHECK (
  entidade_tipo = ANY (ARRAY[
    'clientes','fornecedores','contratos','aditivos','propostas','pedidos_venda',
    'projetos','projetos_contrato','obras','titulos_financeiros','parcelas_financeiras',
    'movimentacoes_financeiras','boletos','adiantamentos','rescisoes_contrato',
    'extrato_banco','workflow_aprovacoes','estoque_movimentos','estoque_reservas',
    'estoque_entregas','ordens_compra','cotacoes_compra','solicitacoes_material',
    'financiamentos','produtos','leads','tarefas','operacoes_financeiras',
    'operacoes_financeiras_parcelas',
    'os_ordens','os_tarefas','os_formularios_definicao','os_servicos_faturar',
    'os_requisicoes_equipamento'
  ])
);