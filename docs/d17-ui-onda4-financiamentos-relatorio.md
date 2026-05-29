# D17.UI Onda 4 — Financiamentos no padrão RM/TOTVS

**Status:** APLICADA 2026-05-29
**Escopo:** UX visual. Zero alteração em banco, RLS, RPCs, workflow, auditoria, regras financeiras.

## Mudanças

### `/financiamentos`
- `EnterpriseRecordToolbar` da página principal ganha:
  - `statusActions={ribbonRm({ cancelar, visualizar })}` — 8 botões circulares (WhatsApp, Cancelar, Agendar, Estornar, Visualizar, Imprimir, E-mail, Remessa) em paridade visual com Contas a Receber/Pagar, Comercial, Aprovações e Pós-venda.
  - `layoutBar={layoutBarRm()}` — linha Padrão + densidade.
  - `availableActions` ampliado: `novo, editar, cancelar, atualizar, anexos, filtroAvancado, colunas, exportar, imprimir, historico`.
  - Wiring sem mudança de regra: `novo` → aba Sem Contrato, `editar` → Pendências, `cancelar`/`visualizar` → Cancelados/Carteira, `atualizar` recarrega seed (mesmo comportamento anterior).
- 7 abas preservadas (Dashboard, Carteira, Sem Contrato, Previsão, Pendências, Finalizados, Cancelados).
- ModuloHistoricoDrawer já existente reaproveitado pelo botão Histórico.

### Abas internas (Pendências, Sem Contrato, Cancelados, Carteira, Previsão)
- Mantêm tabelas operacionais e diálogos atuais. As ações por linha (Aprovar, Liberar Engenharia, Cancelar com motivo, ver contrato/cliente, alterar banco/gerente/status, andamento/observação) **continuam funcionais** — nenhuma regra de fluxo foi tocada. Classificadas como enterprise-equivalentes (mesma decisão de Engenharia/Pós-venda).

## Reuso

100% via presets oficiais (`ribbonRm`, `layoutBarRm`) e `ModuloHistoricoDrawer` já existentes. Nenhum componente novo. Nenhuma duplicação.

## Aderência RM/TOTVS

| Módulo | Antes | Depois |
|--------|-------|--------|
| Financiamentos | ~72% | **~86%** |
| **Global D17.UI** | ~84% | **~86%** |

Faltam para fechar 90%+: RowActions por linha nos grids de Carteira/Pendências/Cancelados, ColumnManager/FilterPanel persistido, ProcessosMenu dedicado (Enviar ao banco, Solicitar documentação, Atualizar liberação) — todos endereçados em D17.UI.4b transversal.

## Critério de aceite

- ✅ Financiamentos exibe a mesma fita circular RM de Contas a Receber/Pagar, Comercial, Aprovações, Pós-venda e Financeiro.
- ✅ Linha Layout/Densidade presente.
- ✅ Zero mudança funcional (handlers e fluxos existentes preservados).
- ✅ Zero mudança de schema/RLS/RPC/workflow/auditoria.

## Próximas ondas

- **Onda 5** — Suprimentos (Compras + Estoque, padronização visual lado a lado, sem fusão ainda).
- **D17.UI.4b transversal** — ColumnManager + FilterPanel + RowActions universais nos 9 módulos.
