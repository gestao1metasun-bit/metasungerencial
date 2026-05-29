# D17.UI.4d — Dicionário Canônico Enterprise (RM/TOTVS)

> Fonte única de verdade para vocabulário visual do ERP Meta Sun.
> Implementação em `src/lib/enterprise-vocab.ts`.
> Restrição: sem alteração de banco, RLS, RPC, workflow, auditoria ou regra.

## 1. Ações canônicas

| Canônico | Ícone (lucide) | Cor | Sinônimos proibidos |
|---|---|---|---|
| Novo | `Plus` | azul | Criar, Adicionar, Cadastrar, Inserir |
| Visualizar | `Eye` | azul | Ver, Detalhes, Abrir, Consultar |
| Editar | `SquarePen` | âmbar | Alterar, Modificar |
| Excluir | `X` / `Trash2` | vermelho | Apagar, Remover, Deletar |
| Aprovar | `Check` / `CheckCircle2` | verde | Validar, OK |
| Reprovar | `X` | vermelho | Recusar, Negar |
| Liberar | `Unlock` / `Send` | verde | Disponibilizar, Soltar |
| Cancelar | `Ban` | vermelho | Anular, Invalidar |
| Estornar | `RotateCcw` | vermelho | Reverter, Desfazer |
| Assinar | `PenLine` | verde | Firmar |
| Baixar (financeiro) | `Download` / `CheckCircle2` | verde | Liquidar, Quitar |
| Histórico | `Clock` | índigo | Timeline, Auditoria, Log |
| Anexos | `Paperclip` | azul | Anexar, Arquivos, Documentos |
| Atualizar | `RefreshCw` | cinza | Recarregar, Refresh, Sincronizar |
| Exportar | `Download` | cinza | Baixar planilha, Exportação |
| Imprimir | `Printer` | cinza | Print, Imprimir relatório |
| Filtros | `Filter` | índigo | Pesquisar avançado |
| Filtros avançados | `SlidersHorizontal` | índigo | Filtro custom |
| Colunas | `Columns3` | índigo | Configurar grade, Personalizar tabela |
| Processos | `Workflow` | cinza | Macros, Ações em massa |
| Duplicar | `Copy` | cinza | Replicar, Clonar |
| Enviar | `Send` | verde | Despachar, Submeter |
| Renegociar | `RefreshCcw` | âmbar | Refazer condições |

Cores canônicas (D17.UI Enterprise RM): azul=criar/visualizar/anexos, verde=salvar/aprovar/liberar/baixar/assinar, vermelho=excluir/cancelar/reprovar/estornar, âmbar=editar/renegociar, índigo=histórico/filtros/colunas, cinza=neutro.

## 2. Status canônicos

| Canônico | Variante visual | Sinônimos proibidos |
|---|---|---|
| Ativo | verde sólido | Ativa, Habilitado |
| Inativo | cinza | Inativa, Desabilitado |
| Rascunho | cinza claro | Draft, Em edição |
| Pendente | âmbar | Aguardando, A fazer |
| Em análise | índigo | Sob análise, Avaliando |
| Aprovado | verde | OK, Validado |
| Reprovado | vermelho | Negado, Recusado |
| Liberado | verde | Disponível, Solto |
| Assinado | verde escuro | Firmado |
| Em andamento | azul | Executando, WIP |
| Finalizado | cinza escuro | Concluído, Encerrado, Done |
| Cancelado | vermelho | Anulado |
| Estornado | vermelho claro | Revertido |
| Vencido | vermelho âmbar | Atrasado, Expirado |
| Renegociado | âmbar | Refeito |

## 3. Entidades — nomenclatura única

Cada entidade tem uma forma singular e plural fixas (ver `ENTIDADE` em `enterprise-vocab.ts`). Proibido alternar entre, por exemplo:

- "Ordem de serviço" / "OS" / "Chamado técnico" → **Ordem de serviço**
- "Pedido" / "PV" / "Pedido de venda" → **Pedido de venda** (sigla PV só em badge denso)
- "Título" / "Conta" / "Lançamento" → **Título** (Lançamento é visão derivada, não entidade)
- "Operação financeira" / "Op. fin." → **Operação financeira** (Op. fin. só em colunas estreitas)
- "Chamado pós-venda" / "Atendimento" / "Ticket" → **Chamado de pós-venda**
- "Solicitação" / "Requisição" → **Solicitação de material**

## 4. Posicionamento na tela

| Elemento | Local fixo |
|---|---|
| Toolbar do registro (`EnterpriseRecordToolbar`) | Linha imediatamente abaixo do `PageHeader` |
| Ações em linha (`RowActions`) | Última coluna à direita, sempre alinhadas |
| Histórico universal (`ModuloHistoricoDrawer`) | Drawer lateral direito, acionado pelo ícone `Clock` da toolbar |
| Anexos (`AnexosButton`) | Toolbar do registro **e** linha (RowActions) |
| Filtros (`FilterPanel`) | Popover ancorado no botão `Filter` da toolbar |
| Colunas (`ColumnManager`) | Popover ancorado no botão `Columns3` da toolbar |
| Paginação (`ServerPaginationFooter`) | Rodapé da grade |

## 5. Mensagens canônicas

- Busca: `Buscar…` (não "Pesquisar...", "Procurar...", "Filtrar texto...")
- Seleção: `Selecionar…` (não "Escolher", "Selecione")
- Vazio: `Nenhum registro encontrado.`
- Carregando: `Carregando…`
- Confirmação de exclusão: `Confirma a exclusão deste registro?`
- Motivo: `Motivo é obrigatório (mínimo 5 caracteres).`
- Sucesso genérico: `Registro salvo com sucesso.`
- Erro genérico: `Ocorreu um erro. Tente novamente.`
- Sem permissão: `Você não tem permissão para esta ação.`

## 6. Regras de adoção

1. Toda string de ação/status nova **deve** vir de `ACAO`, `STATUS`, `ENTIDADE` ou `MSG`.
2. Code review rejeita PR que reintroduza sinônimo da tabela §1/§2.
3. Toolbar canônica é `EnterpriseRecordToolbar` — proibido construir toolbar custom.
4. Ações em linha canônicas são `RowActions` — proibido `<Button title="...">` solto em coluna.
5. Histórico canônico é `ModuloHistoricoDrawer` — proibido drawer/aba/dialog próprio para auditoria.
