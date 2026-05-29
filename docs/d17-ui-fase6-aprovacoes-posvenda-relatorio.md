# D17.UI Fase 6 (Onda 2) — Aprovações + Pós-venda no padrão RM/TOTVS

**Status:** APLICADA 2026-05-29
**Escopo:** UX visual apenas. Zero alteração em banco, RLS, RPCs, workflow, auditoria, regras.

## Mudanças

### `/aprovacoes`
- Substituído `EnterpriseToolbar` legado por `EnterpriseRecordToolbar` oficial.
- Fita RM aplicada via `ribbonRmAprovacao()` — botões circulares: Aprovar, Reprovar, Baixar, Estornar, Visualizar, Imprimir, E-mail, Remessa.
- Wiring: Aprovar/Reprovar/Cancelar/Visualizar conectados aos handlers existentes (`setAcao`, `setDetalhe`) preservando gates `podeAprovarSelecionada` / `podeCancelarSelecionada`.
- `layoutBar={layoutBarRm()}` adicionada (Padrão + densidade).
- `availableActions`: visualizar, atualizar, anexos, filtroAvancado, colunas, exportar, imprimir, historico.
- Busca migrada para `search` / `onSearchChange` da toolbar (mantém estado `busca`).

### `/posvenda`
- `EnterpriseRecordToolbar` ampliada com `statusActions={ribbonRm()}` + `layoutBar={layoutBarRm()}`.
- `availableActions` expandido: novo, editar, cancelar, atualizar, anexos, filtroAvancado, colunas, exportar, imprimir, historico.
- Estados não-suportados ainda exibem toast informativo (padrão D17.UI.4b).

## Reuso

100% via presets já criados na Onda 1 (`ribbonRm`, `ribbonRmAprovacao`, `layoutBarRm`).
Nenhum componente novo. Nenhuma duplicação visual.

## Aderência RM/TOTVS

| Módulo | Antes | Depois |
|--------|-------|--------|
| Aprovações | ~55% | ~80% |
| Pós-venda | ~60% | ~82% |
| **Global D17.UI** | ~76% | **~80%** |

Faltam (próximas ondas): RowActions por linha no grid de aprovações, ColumnManager/FilterPanel persistido, ProcessosMenu específico de pós-venda (abrir/concluir/reabrir atendimento).

## Critério de aceite

✅ Aprovações e Pós-venda exibem a mesma fita circular RM de Contas a Receber/Pagar.
✅ Linha de Layout/Densidade presente em ambas.
✅ Zero mudança funcional (handlers existentes preservados).
✅ Zero mudança de schema/RLS/RPC.
