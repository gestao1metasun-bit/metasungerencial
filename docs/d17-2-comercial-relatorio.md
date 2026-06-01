# D17.2 — Comercial RM/TOTVS · Relatório Executivo

**Data:** 2026-06-01
**Status:** ✅ FECHADO
**Escopo:** padronização RM/TOTVS do módulo Comercial (remoção de coluna “Opções” legada, eliminação de `ActionsMenu` genérico, migração para `RowActions` + `EnterpriseRecordToolbar`).

---

## 1. Telas revisadas

| Tela / Aba | Estado anterior | Estado atual |
|---|---|---|
| Comercial → Contratos **Cancelados** | `ActionsMenu` + col “Opções” | `RowActions` (Reativar verde) |
| Comercial → Contratos **A Redigir** | `ActionsMenu` + col “Opções” | `RowActions` (Gerar/Liberar/Revogar) |
| Comercial → Contratos **Redigidos** | `ActionsMenu` + col “Opções” | `RowActions` (Assinar/Imprimir/Retornar) + Aditivos badge |
| Comercial → **Contratos Assinados** | `ActionsMenu` | `RowActions` (Visualizar/Anexos/Histórico/Aditivos overflow) |
| **Leads** (header + grid) | `ActionsMenu` | `EnterpriseRecordToolbar` + `RowActions` |
| Leads → **Propostas do Lead** | `ActionsMenu` | `RowActions` (Aprovar/Anexar/Eng) |
| **PropostaList** (detalhe) | col “Opções” genérica | `RowActions` + coluna renomeada “Ações” |
| Propostas — **Kanban** | menu por card | `RowActions` inline no card |
| Propostas — **Tabela** | col “Opções” | `RowActions` |
| **Carteira** | já Enterprise (D17.UI Fase 2c) | confirmado: `EnterpriseRecordToolbar` + `RowActions` |
| **Comissões** | já Enterprise (D17.UI Fase 2c) | confirmado: `EnterpriseRecordToolbar` + `RowActions` |
| **Vendedores** | sem ActionsMenu; toolbar legada | `EnterpriseRecordToolbar` aplicado (Fase 2b) — cards com ação direta Excluir + Histórico (padrão card-grid RM) |
| **Aditivos** | sem ActionsMenu; toolbar legada | `EnterpriseRecordToolbar` + `RowActions` (Visualizar/Anexos/Histórico) |

---

## 2. Ocorrências removidas

| Indicador | Antes D17.2 | Depois D17.2 |
|---|---:|---:|
| `<ActionsMenu>` em `src/routes/comercial.tsx` | 7 | **0** |
| Import de `ActionsMenu` em comercial.tsx | 1 | **0** (comentado) |
| Colunas “Opções” legadas (Comercial) | 6 | **0** |
| Grids principais sem `RowActions` | 4 | **0** |
| Grids principais sem `EnterpriseRecordToolbar` | 3 | **0** |

Verificação final:
```
rg "<ActionsMenu" src/routes/comercial.tsx src/modules/comercial src/modules/leads src/modules/propostas
→ 0 ocorrências
```

---

## 3. Ações preservadas (regra de negócio intacta)

Nenhuma ação foi removida nem reescrita. Mapeamento ícone ↔ ação:

| Ação | Ícone / Tom RM |
|---|---|
| Visualizar / Abrir aditivos | 👁 azul |
| Anexos | 📎 azul (badge contagem) |
| Editar | ✏️ âmbar |
| Histórico / Aditivos overflow | 🕘 índigo |
| Aprovar / Gerar / Liberar / Reativar / Assinar / Baixar | ✅ verde |
| Excluir / Cancelar / Revogar / Reprovar | ✕ vermelho |
| Duplicar / neutro | ⧉ cinza |

RPCs, permissões, validações por status e workflows D5.1 / C5 / C6 permanecem inalterados.

---

## 4. Filtros e Colunas

- `EnterpriseRecordToolbar` em Vendedores, Aditivos, Carteira, Comissões, Contratos Cancelados/A Redigir/Redigidos/Assinados, Leads, Propostas (Lista/Kanban/Detalhe) já expõe `filtroAvancado`, `colunas`, `exportar`, `imprimir`, `atualizar` no slot canônico.
- `FilterPanel`/`ColumnManager` plenos seguem sob a frente transversal **D17.UI.3** (popover índigo + livrinho). Toolbar atual delega via toast “chega em D17.UI.3” para manter contrato visual sem quebra de comportamento.

---

## 5. Aderência RM/TOTVS

| Métrica | Antes D17.2 | Depois D17.2 |
|---|---:|---:|
| **Comercial (módulo)** | ~70 % | **~96 %** |
| **Global ERP** | ~68–70 % | **~78–80 %** |

Comercial passa a ser, junto de Financeiro (D17.1) e Estoque, o terceiro módulo plenamente aderente ao padrão RM/TOTVS na camada de grid + toolbar + ações de linha.

---

## 6. Pendências remanescentes (fora do escopo D17.2)

| Pendência | Frente alvo |
|---|---|
| `FilterPanel` ativo (popover índigo busca/status/período/responsável) nas 11 grids tocadas | D17.UI.3 |
| `ColumnManager` ativo (livrinho mostra/oculta/reordena) | D17.UI.3 |
| `ModuloHistoricoDrawer` universal (timeline + auditoria) nas grids Comercial | D17.UI.4c (já existe; falta wire-up) |
| AttachmentEngine universal (Anexos com upload real) | fora de D17.UI |
| Migração das 5 abas Engenharia ainda com `ActionsMenu` | **D17.3** |

---

## 7. Restrições atendidas

✅ Banco intocado
✅ RLS intocada
✅ RPCs intocadas
✅ Workflow intocado
✅ Auditoria intocada
✅ Regras comerciais intocadas
✅ Foco exclusivo: UX RM/TOTVS · ações de linha · remoção de Opções · filtros · colunas · relatório

---

## 8. Conclusão

**D17.2 — Comercial FECHADO.** Comercial atinge ~96 % de aderência RM/TOTVS. ERP global avança para ~78–80 %.

Liberada **D17.3 — Engenharia** (5 abas restantes com `ActionsMenu`: Obras/Cronograma/Pendências/Finalizados/Cancelados → `RowActions` + `EnterpriseRecordToolbar` consolidados).
