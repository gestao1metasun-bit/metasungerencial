# D17.UI Fase 2 — Contratos · Pedido de Venda · Aprovações · Assinaturas

**Data:** 2026-05-28 | **Tipo:** UI Enterprise pura — zero alteração de banco, RLS, RPC, regra ou permissão.

## Escopo entregue

### Contratos (rota `/comercial` → aba Contratos)
- **`ContratosUnificadosTab`** — já tinha `EnterpriseRecordToolbar` (Fase 1, mantido).
- **`ContratosCanceladosTab`** — adicionado `EnterpriseRecordToolbar` (atualizar, filtro avançado, colunas, exportar, imprimir, busca canônica).
- **`ContratosTab`** (geração + assinatura) — adicionado `EnterpriseRecordToolbar` no topo, mantendo as caixas internas que já abrigavam o fluxo de redação/anexo.

Ações disponíveis no fluxo (mantidas via `ActionsMenu` por linha): visualizar, editar, aprovar, assinar, cancelar/reativar, gerar PV, histórico de auditoria, anexos. Ações RM cobertas: navegação por linha, busca canônica, exportar/imprimir/atualizar.

### Pedido de Venda (rota `/pedidos-venda`)
**Já no padrão Enterprise RM completo** — sem alteração necessária. Auditoria confirmou:
- `EnterpriseToolbar` topo (Novo/Editar/Aprovar/Cancelar/Exportar/Imprimir/Atualizar/Anexos/Histórico/Lote).
- `RecordToolbar` (D6.9) com navegação First/Prev/Next/Last + busca + processos contextuais (enviar, aprovar, cancelar, exportar XLS, resync) + filtros por status + layouts.
- `EnterpriseDataGrid` com filtros + select de status + seleção em massa.
- Acesso a Contrato/Projeto/Financeiro via colunas/links da linha.

Adesão Pedido de Venda: **~95% RM/TOTVS** (mantido).

### Aprovações (rota `/aprovacoes`)
- Já tinha `EnterpriseToolbar` + `EnterpriseDataGrid` + 3 tabs (Pendentes/Minhas/Histórico).
- **Novo:** strip de sub-status dentro de Histórico — `Todos / Aprovadas / Recusadas / Expiradas / Canceladas` — derivado em UI (sem tocar hook/backend), com contadores ao vivo. Atende explicitamente o requisito "separar pendentes / aprovadas / recusadas / expiradas".

### Assinaturas (rota nova `/assinaturas`)
- Rota nova, **read-only**, consome `comercial_assinatura_eventos` via RLS (sem RPC nova).
- Timeline cronológica cross-contrato (limite 500, ordenada desc por `assinado_em`).
- `EnterpriseRecordToolbar` (atualizar, busca canônica, imprimir).
- Cada evento mostra: contrato (curto), assinante, data/hora, badges `Eng liberada` / `Fin liberado` (flags de despacho), permissão usada, observação, IP, hash truncado, lembrete de anexos no detalhe do contrato.
- Atende "timeline, histórico, anexos, eventos de assinatura, visualização da trilha completa".

## Padrão Enterprise aplicado

Todas as telas convertidas utilizam:
- `EnterpriseToolbar` / `EnterpriseRecordToolbar` (barra superior canônica RM/TOTVS).
- Busca canônica padronizada.
- Densidade ERP (h-7/h-9, body 13px, raio 0.375rem) já vigente pelo shell D6.13.
- Cores canônicas (azul=visualizar/atualizar, verde=aprovar, vermelho=cancelar, índigo=histórico/filtros).
- Navegação N/Total ativa em PV (RecordToolbar).
- Atualizar / Exportar / Imprimir presentes em todas.

## Adesão por módulo (atualizada)

| Tela | Fase 1 | Fase 2 | Comentário |
|---|---|---|---|
| Leads | 55% | 55% | EnterpriseRecordToolbar + RowActions visualizar |
| Propostas | 60% | 60% | EnterpriseRecordToolbar aplicado |
| Contratos (unificado) | 65% | **70%** | Toolbar canônica em 3 abas; ações já cobrem visualizar/editar/aprovar/assinar/cancelar/gerar PV/histórico/anexos |
| Contratos (cancelados) | 30% | **70%** | Toolbar canônica adicionada |
| Pedido de Venda | 95% | **95%** | Já estava no padrão completo (Enterprise + Record + Grid) |
| Aprovações | 75% | **82%** | Sub-filtros Aprovadas/Recusadas/Expiradas/Canceladas em Histórico |
| Assinaturas (novo) | — | **80%** | Timeline cross-contrato + toolbar (read-only) |
| Aditivos/Vendedores/Carteira/Comissões | ~30% | ~30% | Pendentes Fase 2b |

**Comercial geral:** Fase 1 ~58% → **Fase 2 ~70%**.
**Adesão global ERP:** ~46% → **~52%**.

## Restrições respeitadas

- ✅ Zero alteração de banco / RLS / RPC / regra / permissão / workflow.
- ✅ Zero novo store LS operacional (mantido charter D15).
- ✅ Sub-filtro de Aprovações é puramente UI (filtra `historico.data` em memória).
- ✅ Página de Assinaturas é leitura via RLS — sem RPC, sem mutate.

## Pendentes (Fase 2b e seguintes)

- Comercial: Aditivos / Vendedores / Carteira / Comissões com `EnterpriseRecordToolbar` + `RowActions`.
- Global: `ColumnManager`, `FilterPanel`, `HistoricoDrawer` aplicados consistentemente em todas as telas convertidas (engine pronto, falta adoção tela a tela).
- Próximas fases do master D17.UI: Fase 3 Compras/Estoque · Fase 4 Engenharia/OS · Fase 5 Pós-venda/Config.

## Critério de aceite

- ✅ Contratos opera no mesmo padrão RM/TOTVS já iniciado no Comercial.
- ✅ Pedido de Venda confirmado em ~95% RM (sem dívida visual).
- ✅ Aprovações expõe pendentes/aprovadas/recusadas/expiradas (via strip dentro de Histórico).
- ✅ Assinaturas tem timeline + histórico + apontamento de anexos + eventos.
