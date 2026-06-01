# E.OS.3 — UI Gestão de Serviços (Subwave 1/2)

**Aplicada 2026-06-01.** Subwave 1 entrega a lista oficial + painel da O.S.
com tarefas e histórico consumindo 100% as RPCs E.OS.2.

## Entregas

| Arquivo | Papel |
| --- | --- |
| `src/lib/repositories/os-repo.ts` | Repo + hooks (listar/obter/tarefas/eventos + 13 mutations RPC) |
| `src/routes/engenharia.gestao-servicos.index.tsx` | Lista RM com toolbar + filtro por status + busca + RowActions + diálogo de criação |
| `src/routes/engenharia.gestao-servicos.$osId.tsx` | Painel com abas Ordem/Tarefas/Histórico + Mudar status/Finalizar/Cancelar/Excluir |

## Regras respeitadas

- Toda transição de status passa por `rpc_os_mudar_status`/`rpc_os_finalizar`/
  `rpc_os_cancelar`/`rpc_os_excluir` ou `rpc_os_tarefa_*`.
- UPDATE direto em `status_codigo` continua bloqueado pelos triggers da E.OS.1.
- Motivo obrigatório (≥5 chars) em Cancelar/Excluir.
- Idempotência via `crypto.randomUUID()` em `rpc_os_criar`.
- Zero alteração de RLS, workflow, Comercial/Financeiro/Estoque/Engenharia.
- Padrão D17.UI: `EnterpriseRecordToolbar`, `RowActions`, vocabulário canônico
  (Novo/Visualizar/Excluir/Cancelar/Finalizar/Histórico/Atualizar).

## Reservado p/ E.OS.3.b (próxima subwave)

- Abas Produtos / Serviços a Faturar / Requisições / Formulários / Dashboard.
- Resolução visual de cliente/proposta/PV (hoje exibe UUID curto).
- AttachmentEngine universal (`ENTIDADES_ANEXAVEIS` precisa incluir `os_ordens`).
- Construtor de formulários dinâmicos + modelos de tarefas em lote.
- ColumnManager + ServerPagination na lista.

## URLs

- `/engenharia/gestao-servicos`
- `/engenharia/gestao-servicos/$osId`

Acesso direto por URL (link no shell de Engenharia será adicionado em E.OS.3.b
para não tocar `src/routes/engenharia.tsx` neste turno).
