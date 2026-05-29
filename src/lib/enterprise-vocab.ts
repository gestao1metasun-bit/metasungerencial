/**
 * D17.UI.4d — Vocabulário Canônico Universal Enterprise (RM/TOTVS)
 *
 * Fonte única de verdade para rótulos, títulos, status e mensagens.
 * Importar destas constantes em vez de digitar strings soltas.
 *
 * Restrição: não altera banco/RLS/RPC/workflow/auditoria/regras.
 * É camada puramente de apresentação (i18n interno pt-BR canônico).
 */

// ─── AÇÕES CANÔNICAS ────────────────────────────────────────────────
export const ACAO = {
  novo: "Novo",
  visualizar: "Visualizar",
  editar: "Editar",
  excluir: "Excluir",
  aprovar: "Aprovar",
  reprovar: "Reprovar",
  liberar: "Liberar",
  cancelar: "Cancelar",
  estornar: "Estornar",
  assinar: "Assinar",
  baixar: "Baixar",
  historico: "Histórico",
  anexos: "Anexos",
  atualizar: "Atualizar",
  exportar: "Exportar",
  imprimir: "Imprimir",
  filtrar: "Filtros",
  filtroAvancado: "Filtros avançados",
  colunas: "Colunas",
  processos: "Processos",
  duplicar: "Duplicar",
  enviar: "Enviar",
  renegociar: "Renegociar",
} as const;

// ─── STATUS CANÔNICOS ───────────────────────────────────────────────
export const STATUS = {
  ativo: "Ativo",
  inativo: "Inativo",
  rascunho: "Rascunho",
  pendente: "Pendente",
  emAnalise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  liberado: "Liberado",
  assinado: "Assinado",
  emAndamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  estornado: "Estornado",
  vencido: "Vencido",
  renegociado: "Renegociado",
} as const;

// ─── TÍTULOS DE ENTIDADES (singular / plural) ───────────────────────
export const ENTIDADE = {
  lead: { sg: "Lead", pl: "Leads" },
  proposta: { sg: "Proposta", pl: "Propostas" },
  contrato: { sg: "Contrato", pl: "Contratos" },
  aditivo: { sg: "Aditivo", pl: "Aditivos" },
  vendedor: { sg: "Vendedor", pl: "Vendedores" },
  comissao: { sg: "Comissão", pl: "Comissões" },
  pedidoVenda: { sg: "Pedido de venda", pl: "Pedidos de venda" },
  obra: { sg: "Obra", pl: "Obras" },
  projeto: { sg: "Projeto", pl: "Projetos" },
  ordemServico: { sg: "Ordem de serviço", pl: "Ordens de serviço" },
  solicitacaoMaterial: { sg: "Solicitação de material", pl: "Solicitações de material" },
  cotacao: { sg: "Cotação", pl: "Cotações" },
  pedidoCompra: { sg: "Pedido de compra", pl: "Pedidos de compra" },
  produto: { sg: "Produto", pl: "Produtos" },
  movimentacaoEstoque: { sg: "Movimentação de estoque", pl: "Movimentações de estoque" },
  titulo: { sg: "Título", pl: "Títulos" },
  parcela: { sg: "Parcela", pl: "Parcelas" },
  adiantamento: { sg: "Adiantamento", pl: "Adiantamentos" },
  rescisao: { sg: "Rescisão", pl: "Rescisões" },
  financiamento: { sg: "Financiamento", pl: "Financiamentos" },
  operacaoFinanceira: { sg: "Operação financeira", pl: "Operações financeiras" },
  chamadoPosVenda: { sg: "Chamado de pós-venda", pl: "Chamados de pós-venda" },
  cliente: { sg: "Cliente", pl: "Clientes" },
  fornecedor: { sg: "Fornecedor", pl: "Fornecedores" },
  aprovacao: { sg: "Aprovação", pl: "Aprovações" },
} as const;

// ─── PLACEHOLDERS / MENSAGENS PADRÃO ────────────────────────────────
export const MSG = {
  buscar: "Buscar…",
  selecionar: "Selecionar…",
  semRegistros: "Nenhum registro encontrado.",
  carregando: "Carregando…",
  confirmExcluir: "Confirma a exclusão deste registro?",
  motivoObrigatorio: "Motivo é obrigatório (mínimo 5 caracteres).",
  salvoSucesso: "Registro salvo com sucesso.",
  erroGenerico: "Ocorreu um erro. Tente novamente.",
  semPermissao: "Você não tem permissão para esta ação.",
} as const;

// ─── SINÔNIMOS PROIBIDOS → CANÔNICO ─────────────────────────────────
// Mapa de referência usado em revisão de código (não em runtime).
export const SINONIMOS_PROIBIDOS: Record<string, string> = {
  Criar: ACAO.novo,
  Adicionar: ACAO.novo,
  Cadastrar: ACAO.novo,
  Ver: ACAO.visualizar,
  Detalhes: ACAO.visualizar,
  Abrir: ACAO.visualizar,
  Apagar: ACAO.excluir,
  Remover: ACAO.excluir,
  Deletar: ACAO.excluir,
  Recarregar: ACAO.atualizar,
  Refresh: ACAO.atualizar,
  Anexar: ACAO.anexos,
  Timeline: ACAO.historico,
  Auditoria: ACAO.historico,
  Concluido: STATUS.finalizado,
  Concluída: STATUS.finalizado,
  Encerrado: STATUS.finalizado,
  Ativa: STATUS.ativo,
  Inativa: STATUS.inativo,
};

export type AcaoCanonica = keyof typeof ACAO;
export type StatusCanonico = keyof typeof STATUS;
