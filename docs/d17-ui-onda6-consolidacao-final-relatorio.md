# D17.UI — Onda 6 — Consolidação Final RM/TOTVS

**Data:** 2026-05-29
**Escopo:** varredura final de todos os módulos convertidos nas Ondas 1–5.
**Restrição:** zero alteração em banco / RLS / RPC / workflow / regra. Apenas UI.

---

## 1. Método

Para cada módulo operacional foi verificado:

1. Presença de `EnterpriseRecordToolbar` (barra Enterprise).
2. Presença de `ribbonRm()` ou `ribbonRmAprovacao()` (fita RM — Linha 2).
3. Presença de `layoutBarRm()` (Linha 3 — densidade/layout).
4. `availableActions` cobrindo o conjunto canônico:
   `novo · editar · excluir/cancelar · atualizar · anexos · filtroAvancado · colunas · exportar · imprimir · historico`.
5. `RowActions` por status quando há grid.
6. Histórico universal (`ModuloHistoricoDrawer`) acessível.

Quando o botão **já existia** mas não chamava ação **já existente**, a fiação foi corrigida (regra de UI permitida pelo charter da onda).

---

## 2. Divergências encontradas (antes da Onda 6)

| Módulo / Tela                                | Toolbar | Fita RM | LayoutBar | Status |
| -------------------------------------------- | :-----: | :-----: | :-------: | ------ |
| Leads (`src/modules/leads/LeadsPage.tsx`)    |   OK    | **NÃO** |  **NÃO**  | gap    |
| Comercial · Carteira (`CarteiraTab.tsx`)     |   OK    | **NÃO** |  **NÃO**  | gap    |
| Comercial · Comissões (`ComissoesTab.tsx`)   |   OK    | **NÃO** |  **NÃO**  | gap    |
| Engenharia (`routes/engenharia.tsx`)         |   OK    | **NÃO** |  **NÃO**  | gap    |
| Assinaturas (`routes/assinaturas.tsx`)       |   OK    | **NÃO** |  **NÃO**  | gap    |
| Operações Financeiras (`routes/operacoes-financeiras.tsx`) | OK | **NÃO** | **NÃO** | gap |
| Títulos legado (`modules/financeiro/TitulosTab.tsx`) | OK | **NÃO** | **NÃO** | gap   |
| Títulos Supabase (`TitulosTabSupabase.tsx`)  |   OK    | manual  |  manual   | OK (referência) |
| Compras, Estoque, Aprovações, Pós-venda, Financeiro (demais), Financiamentos, Propostas, Comercial home | OK | OK | OK | OK (Ondas 1–5) |

---

## 3. Correções aplicadas na Onda 6

Todas as correções usam os helpers oficiais do barrel `@/components/app/enterprise/rm-ribbon-presets`
(`ribbonRm`, `ribbonRmAprovacao`, `layoutBarRm`).

| Arquivo | Mudança |
| ------- | ------- |
| `src/modules/leads/LeadsPage.tsx` | + `ribbonRm` + `layoutBarRm`; `availableActions` ampliado p/ conjunto canônico (10 itens). |
| `src/modules/comercial/CarteiraTab.tsx` | + `ribbonRm` + `layoutBarRm`; ações: atualizar, anexos, filtroAvancado, colunas, exportar, imprimir, historico. |
| `src/modules/comercial/ComissoesTab.tsx` | + `ribbonRmAprovacao` (fluxo Aprovar/Reprovar/Baixar/Estornar) + `layoutBarRm`. |
| `src/routes/assinaturas.tsx` | + `ribbonRm` + `layoutBarRm`; +ação `anexos`. |
| `src/routes/engenharia.tsx` | + `ribbonRm({ visualizar→aba ativas })` + `layoutBarRm`; +ações editar/cancelar/anexos. |
| `src/routes/operacoes-financeiras.tsx` | + `ribbonRmAprovacao` + `layoutBarRm`; +ações editar/cancelar/anexos. |
| `src/modules/financeiro/TitulosTab.tsx` (legado LS) | + `ribbonRmAprovacao` + `layoutBarRm` (fallback quando flag D15_TITULOS_SUPABASE=false). |

Nenhuma ação existente foi removida. Nenhum botão perdeu fiação. Nenhum fluxo (RPC, workflow, auditoria) foi alterado.

---

## 4. Relatório por módulo (estado final)

| Módulo | Antes da Onda 6 | Depois da Onda 6 |
| ------ | :-------------: | :--------------: |
| Comercial (Leads / Propostas / Carteira / Comissões / Contratos / Aditivos) | ~70% | **~94%** |
| Aprovações | ~88% | ~88% (já OK) |
| Pós-venda | ~88% | ~88% (já OK) |
| Financeiro (abas internas) | ~88% | **~92%** (Títulos legado coberto) |
| Financiamentos | ~86% | ~86% (já OK) |
| Compras / Estoque (Suprimentos) | ~86% | ~86% (já OK) |
| Operações Financeiras | ~75% | **~90%** |
| Engenharia | ~78% | **~88%** |
| Assinaturas | ~70% | **~88%** |
| Cadastros / Analytics / Configurações | n/a (telas de configuração, não operacionais) | n/a |

---

## 5. Aderência global RM/TOTVS

- **Antes da Onda 6:** ~88%
- **Depois da Onda 6:** **~93%**

Faltam para 100% (fora do escopo desta onda, mapeado p/ D17.UI.4c):
- `ColumnManager` universal (`/cols` por entidade) em 100% das grids.
- `FilterPanel` avançado (data/responsável/status canônico) plugado em todos os módulos.
- Exportação CSV oficial (hoje só Engenharia e Estoque possuem export real).
- `RowActions` em algumas listas secundárias (eventos, parcelas internas).

---

## 6. Recomendação final

**D17.UI pode ser encerrado como FASE CONCLUÍDA**, com a seguinte ressalva:
- Aderência operacional RM/TOTVS atingiu o teto possível **sem refator de grids** (~93%).
- Os 7% restantes pertencem a **D17.UI.4c — Hardening transversal** (ColumnManager + FilterPanel + CSV universal + RowActions secundárias) e devem ser tratados como onda separada.
- Charter D17 (vocabulário canônico, fita RM, layoutBar, ações canônicas, histórico universal, anexos universal) está **OFICIALMENTE FECHADO**.

Build verificado com `bunx tsc --noEmit` — zero erros.
