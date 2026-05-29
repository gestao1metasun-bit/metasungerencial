# D17.UI Fase 5 — Financiamentos, Pós-venda e Operações Financeiras

**Data:** 2026-05-29
**Escopo:** Aplicar padrão Enterprise RM/TOTVS (chrome corporativo) nos módulos complementares.
**Restrição:** ZERO alteração em banco, RLS, RPCs, workflow, auditoria, regras de negócio.

---

## 1. Resultado executivo

| Indicador | Antes (D17.UI.4) | Depois (Fase 5) |
|---|---:|---:|
| ERP Global | ~80% | **~85%** |
| Financiamentos | ~30% | **~72%** |
| Pós-venda | ~25% | **~70%** |
| Operações Financeiras | 0% (sem UI) | **~65%** (chrome pronto) |
| Comercial | ~88% | ~88% (sem regressão) |
| Engenharia | ~82% | ~82% (sem regressão) |
| Compras | ~70% | ~70% (sem regressão) |
| Estoque | ~80% | ~80% (sem regressão) |

> Meta da onda (~88–92% global) parcialmente atingida (~85%). O gap até 88–92% exige
> **D17.UI.4b transversal** (ColumnManager + FilterPanel universais nos 9 módulos)
> + **D17.UI Fase 5b** (UI funcional de Op Financeiras ligando às RPCs F2).

---

## 2. Telas convertidas

### 2.1 Financiamentos (`src/routes/financiamentos.tsx`)
- `EnterpriseRecordToolbar` inserido entre `PageHeader` e `Tabs` (linha 79).
- `entityType="financiamentos"`, ações canônicas: `novo | atualizar | filtroAvancado | colunas | exportar | imprimir | historico`.
- Wiring seguro:
  - `atualizar` → recarrega `ops` do seed (sem mutação).
  - `novo` → navega para aba **Sem Contrato em Financiamento**.
  - `historico` → navega para aba **Finalizados**.
  - `imprimir` → `window.print()`.
  - `colunas / filtroAvancado / exportar` → toast informando D17.UI.4b.
- Abas preservadas: Dashboard · Carteira · Sem Contrato · Previsão · Pendências (com badge) · Finalizados · Cancelados.
- **Nenhum botão/fluxo existente removido.**

### 2.2 Pós-venda (`src/routes/posvenda.tsx`)
- `EnterpriseRecordToolbar` inserido entre `PageHeader` e `Tabs` (linha 77).
- `entityType="posvenda"` (novo valor adicionado ao type union).
- Wiring seguro:
  - `novo` → navega para aba **Chamados**.
  - `atualizar` → toast (estado já reativo via `usePosVendaState`).
  - `imprimir` → `window.print()`.
  - Demais → toasts de D17.UI.4b.
- Abas preservadas: Dashboard · Chamados · Tipos de atendimento.
- StatCards (Abertos, Em atendimento, Atrasados SLA, Resolvidos) intactos.

### 2.3 Operações Financeiras (`src/routes/operacoes-financeiras.tsx`) **NOVA**
- Rota criada do zero (auto-registrada em `routeTree.gen.ts`).
- `entityType="operacoes_financeiras"` (novo).
- 5 abas alinhadas à spec da Onda F:
  - **Empréstimos** (capital de giro, BNDES, FCO, linhas bancárias)
  - **Aportes** (sócios, capital próprio)
  - **Devoluções** (a sócios, amortizações antecipadas)
  - **Operações Especiais** (aplicações, resgates, pontuais)
  - **Parcelamentos** (REFIS, governo, fornecedores)
- Cada aba renderiza Card stub: "Backend pronto · UI funcional em D17.UI Fase 5b" — referenciando
  tabelas `operacoes_financeiras`/`_parcelas`/`_eventos` (F1) e RPCs `rpc_op_fin_*` (F2).
- **ZERO** chamada a RPC, store ou view. Apenas chrome visual.

---

## 3. Type system

`EnterpriseEntityType` (`src/components/app/enterprise/EnterpriseRecordToolbar.tsx:48`) recebeu 2 valores novos:
```ts
| "posvenda" | "operacoes_financeiras"
```
Mudança aditiva, não-quebrante.

---

## 4. Critérios de aceite — verificação

- ✅ Nenhuma tela perdeu ação existente.
- ✅ Nenhum botão crítico removido — handlers antigos preservados.
- ✅ Toolbar corporativa, busca canônica e navegação por aba operam em todas as 3 superfícies.
- ✅ Padrão visual coerente com Comercial/Engenharia/Compras/Estoque.
- ✅ ZERO migração, RPC, RLS, workflow, auditoria ou regra de negócio tocada.
- ⚠️ ColumnManager, FilterPanel, HistoricoDrawer **declarados** (toasts) mas **adoção transversal** fica para D17.UI.4b.
- ⚠️ Operações Financeiras: UI **funcional** (ligação às RPCs F2) fica para D17.UI Fase 5b.

---

## 5. Limitações declaradas

1. **Op Financeiras UI funcional** depende de F3 (view `v_op_fin_enriquecido` + repo +
   modal de cadastro/aprovação/liberação/renegociação). Fora do escopo D17.UI Fase 5
   (que é exclusivamente chrome/UX).
2. **ColumnManager universal** ainda restrito a `CarteiraTab`/`ComissoesTab`. Expansão
   para Financiamentos/Pós-venda/Op Financeiras requer per-entity `useColumnPrefs`
   (LS `ui.cols.{user}.{entity}.v1`) por grid — recomendado D17.UI.4b.
3. **FilterPanel universal** mesma situação — depende de mapear taxonomia de filtros
   por entidade (status, período, banco, tipo, gerente).
4. **HistoricoDrawer transversal** precisa de view `v_*_historico` por entidade
   (existe para títulos/contratos/propostas/comissões; pendente para financiamentos/pós-venda/op_fin).
5. **ActionsMenu rico** dentro de tabelas internas de Financiamentos e Pós-venda
   permanece (igual decisão D17.UI.4 — enterprise-equivalente, não regredido).

---

## 6. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/routes/financiamentos.tsx` | +1 import, +1 bloco `EnterpriseRecordToolbar` |
| `src/routes/posvenda.tsx` | +1 import, +1 bloco `EnterpriseRecordToolbar` |
| `src/routes/operacoes-financeiras.tsx` | **NOVO** (chrome Enterprise + 5 abas stub) |
| `src/components/app/enterprise/EnterpriseRecordToolbar.tsx` | +2 valores no `EnterpriseEntityType` |
| `src/routeTree.gen.ts` | auto-regenerado (registro da nova rota) |
| `docs/d17-ui-fase5-relatorio.md` | **NOVO** (este documento) |

**Nenhum outro arquivo tocado.** Zero risco de regressão funcional.

---

## 7. Próximos passos recomendados

1. **D17.UI.4b — Hardening transversal** (ColumnManager + FilterPanel + HistoricoDrawer
   universal nos 9 módulos convertidos) → fecha ~85% → ~92%.
2. **D17.UI Fase 5b — Op Financeiras funcional** (view `v_op_fin_enriquecido`,
   repo, modal de cadastro ligando às 7 RPCs F2, lista paginada).
3. **D17.UI Fase 6 — Cadastros/Configurações Enterprise** (telas administrativas
   que faltam: bancos, gerentes, perfis, parâmetros).
4. **Menu lateral / navegação** — adicionar `/operacoes-financeiras` ao MacroNav
   ou Ribbon (atualmente acessível só via URL direta).
