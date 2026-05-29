# D17.UI Onda 5 — Suprimentos (Compras + Estoque) no padrão RM/TOTVS

**Status:** APLICADA 2026-05-29
**Escopo:** UX visual. Zero alteração em banco, RLS, RPCs, workflow, auditoria, regras de negócio, estrutura Compras/Estoque. Sem fusão dos módulos (decisão prévia).

## Mudanças

### `/solicitacoes-material` (Compras)
- `EnterpriseRecordToolbar` ganha `statusActions={ribbonRm()}` + `layoutBar={layoutBarRm()}`.
- `availableActions` ampliado: `novo, editar, cancelar, atualizar, anexos, filtroAvancado, colunas, exportar, imprimir, historico`.
- `RowActions` por linha (já em Fase 3) mantidos — visualizar/histórico por status.
- Busca canônica e `ModuloHistoricoDrawer` preservados.

### `/estoque` — header
- `EnterpriseRecordToolbar` ganha `statusActions={ribbonRm({ visualizar → aba Itens })}` + `layoutBar={layoutBarRm()}`.
- `availableActions` ampliado com `editar, cancelar, anexos`.
- 5 abas mantidas (Resumo · Obras/Reservas · Compras · Produtos/Saldos · Movimentos/Entregas) — todos os fluxos internos (entrada, saída, transferência, reserva, baixa, ajuste, inventário, entrega) intactos.

### `/estoque` — sub-toolbar Movimentos/Entregas
- Mesma fita RM + layoutBar aplicada.
- `availableActions` ganha `anexos` e `historico`.

## Reuso

100% via presets oficiais (`ribbonRm`, `layoutBarRm`). Nenhum componente novo. Nenhuma duplicação visual.

## Aderência RM/TOTVS

| Módulo | Antes | Depois |
|--------|-------|--------|
| Compras (`/solicitacoes-material`) | ~70% | **~84%** |
| Estoque (`/estoque`) | ~78% | **~88%** |
| **Global D17.UI** | ~86% | **~88%** |

Faltam para fechar 90%+: ProcessosMenu dedicado (Gerar cotação / Gerar pedido / Receber / Entrada / Saída / Transferência / Reserva / Ajuste / Inventário) na barra principal, ColumnManager+FilterPanel persistido por aba, RowActions estendido nos grids internos de Compras/Saldos/Obras — todos endereçados em D17.UI.4b transversal.

## Critério de aceite

- ✅ Compras e Estoque exibem a mesma fita circular RM já presente em Comercial, Aprovações, Pós-venda, Financeiro e Financiamentos.
- ✅ Linha Layout/Densidade presente em ambos.
- ✅ Zero mudança funcional — fluxos de pedido, cotação, recebimento, entrada, saída, transferência, reserva, baixa, ajuste, inventário e entrega preservados.
- ✅ Zero mudança de schema/RLS/RPC/workflow/auditoria.
- ✅ Compras e Estoque permanecem como módulos separados (sem fusão, conforme decisão).

## Próximas ondas

- **D17.UI.4b transversal** — ColumnManager + FilterPanel + RowActions universal + ProcessosMenu dedicado em todos os 9 módulos.
- Com isso, fechamento estimado: Global ~88% → ~92-95%.
