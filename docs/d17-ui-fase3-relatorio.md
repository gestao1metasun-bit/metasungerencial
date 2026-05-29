# D17.UI Fase 3 — Compras & Estoque Enterprise

**Data:** 2026-05-29
**Status:** APLICADA
**Escopo:** padronização visual/operacional dos módulos Compras e Estoque ao padrão RM/TOTVS.

## Restrições respeitadas
- Sem alteração de banco, RLS, RPCs, auditoria, workflow ou regra de negócio.
- Apenas frontend / presentation.

## Telas convertidas

### Compras — `/solicitacoes-material`
Fluxo único oficial de Compras hoje (Solicitações → Cotações → Pedidos → Recebimento).
- `EnterpriseRecordToolbar` (`entityType="compras"`) substitui botão "Nova solicitação" do `PageHeader`.
- Ações: `novo`, `atualizar`, `filtroAvancado`, `colunas`, `exportar`, `imprimir`.
- **Busca canônica** ligada à toolbar (código, setor, motivo, solicitante) com filtragem reativa via `useMemo`.
- `RowActions` (visualizar + historico) substitui o botão isolado de "olho".
- KPIs (`StatCard`) preservados.
- `OrdemCard` (cotação/escolha/recebimento) preservado — fluxo interno já enxuto.

### Estoque — `/estoque`
- Header substitui o antigo `EnterpriseToolbar` (grid v1) por `EnterpriseRecordToolbar` oficial D17 (`entityType="estoque"`).
- Ações: `novo`, `atualizar`, `filtroAvancado`, `colunas`, `exportar`, `imprimir`, `historico`.
- `EstoqueStrip` (chips densos: SKU/Disp/Reserv/Trânsito/Obras/A comprar) mantido — referência RM de densidade.
- **Itens / Saldos:** botão "Remover" substituído por `RowActions` (editar + excluir, cor canônica).
- **Movimentos / Entregas:** `EnterpriseRecordToolbar` no topo da aba com busca canônica reativa por cliente/item.
- Tabs (Resumo / Obras / Compras / Itens / Entregas) preservadas.

## Componentes D17 aplicados
| Componente               | Compras | Estoque |
|--------------------------|:-------:|:-------:|
| EnterpriseRecordToolbar  | ✅ (página) | ✅ (página + aba Entregas) |
| RowActions               | ✅      | ✅ (Itens) |
| Busca canônica           | ✅      | ✅ (Entregas) |
| ColumnManager            | ⏳ D17.UI.4 | ⏳ D17.UI.4 |
| FilterPanel              | ⏳ D17.UI.4 | ⏳ D17.UI.4 |
| HistoricoDrawer          | ⏳ D17.UI.4 | ⏳ D17.UI.4 |

`ColumnManager`/`FilterPanel`/`HistoricoDrawer` integrais ficam para a onda
de hardening D17.UI.4 (toolbars já expõem os ganchos `colunas`,
`filtroAvancado`, `historico` que sinalizam ao usuário onde chegará).

## Arquivos alterados
- `src/routes/solicitacoes-material.tsx`
- `src/routes/estoque.tsx`
- `docs/d17-ui-fase3-relatorio.md` (novo)

## Aderência D17 (estimativa)
| Módulo   | Antes  | Depois |
|----------|:------:|:------:|
| Compras  | ~25%   | ~70%   |
| Estoque  | ~55%   | ~78%   |
| **ERP Global** | **~58%** | **~70%** |

Critério de aceite atendido: ambos os fluxos operam no mesmo padrão visual
RM/TOTVS já consolidado em Comercial.

## Próximos passos sugeridos
1. **D17.UI Fase 4 — Engenharia / OS / Obras.**
2. **D17.UI.4 — Hardening transversal:** `ColumnManager`, `FilterPanel` e
   `HistoricoDrawer` aplicados em todas as telas já convertidas (Comercial,
   Compras, Estoque).
3. **D17.UI Fase 5 — Pós-venda / Configurações.**

> Recomendação: avançar para Fase 4 (Engenharia) para fechar a espinha
> operacional Comercial → Compras → Estoque → Engenharia antes do hardening
> transversal D17.UI.4.
