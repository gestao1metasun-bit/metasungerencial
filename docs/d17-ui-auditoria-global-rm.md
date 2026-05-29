# D17 — Auditoria Global RM/TOTVS — ERP Meta Sun
> Gerado automaticamente · $(date +%Y-%m-%d)

## Legenda de colunas
| Sigla | Significado |
|-------|-------------|
| Opções? | Coluna "Opções" na grid (não-RM) |
| AM? | ActionsMenu / dropdown genérico |
| RA? | RowActions diretas (padrão RM) |
| ERT? | EnterpriseRecordToolbar |
| Proc? | ribbonRm / ribbonRmAprovacao |
| Hist? | ModuloHistoricoDrawer |
| Anex? | AnexosButton / AttachmentEngine |
| FP? | FilterPanel |
| CM? | ColumnManager |
| Exp? | Exportar |
| CLASSE | ALTA / MÉDIA / BAIXA |

---

## 1. MÓDULO COMERCIAL

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Leads | `src/modules/leads/LeadsPage.tsx:158,866` | **S** | **S** | S (parcial) | S | S | N | N | N | N | N | **ALTA** |
| Propostas / PropostaList | `src/modules/propostas/components/PropostaList.tsx:828,1298` | **S** | **S** | N | S | S | N | N | N | N | N | **ALTA** |
| Propostas / PropostasPage | `src/modules/propostas/PropostasPage.tsx:275` | N | N | N | S | S | N | N | N | N | N | MÉDIA |
| Contratos (assinados/gerados) | `src/routes/comercial.tsx:700,948,1075` | **S** | **S** | N | S | S | S | N | N | N | N | **ALTA** |
| Contratos Cancelados | `src/routes/comercial.tsx:713` | **S** | **S** | N | S | S | S | N | N | N | N | **ALTA** |
| Vendedores | `src/routes/comercial.tsx:4818` | N | N | N | S | S | N | N | N | N | N | MÉDIA |
| Aditivos | `src/routes/comercial.tsx:5578` | N | N | S | S | S | N | N | N | N | N | BAIXA |
| Carteira | `src/modules/comercial/CarteiraTab.tsx:232` | N | N | S | S | S | N | N | S | S | N | BAIXA |
| Comissões | `src/modules/comercial/ComissoesTab.tsx:219` | N | N | S | S | S (Aprov) | N | N | S | S | N | BAIXA |

**Nota:** ContratosTab tem 3 sub-grids (Gerados, Assinados, Em elaboração) todas com `"Opções"` + `ActionsMenu`.

---

## 2. MÓDULO FINANCEIRO

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| A Receber (Supabase) | `src/modules/financeiro/TitulosTabSupabase.tsx:266` | N | N | S | S | S | N | N | N | N | S | BAIXA |
| A Pagar (Supabase) | `src/modules/financeiro/TitulosTabSupabase.tsx:266` | N | N | S | S | S | N | N | N | N | S | BAIXA |
| A Receber (legado) | `src/modules/financeiro/TitulosTab.tsx:691` | N | N | S (TituloRowActions) | S | S (Aprov) | N | N | N | N | S | BAIXA |
| A Pagar (legado) | `src/modules/financeiro/TitulosTab.tsx:691` | N | N | S | S | S | N | N | N | N | S | BAIXA |
| Lançamentos (Supabase) | `src/modules/financeiro/LancamentosTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Despesas Fixas (Recorrentes) | `src/modules/financeiro/RecorrentesTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Adiantamentos (Supabase) | `src/modules/financeiro/AdiantamentosTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Renegociações | `src/components/app/financeiro/RenegociacaoHistoricoListSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Rescisões (Supabase) | `src/modules/financeiro/RescisoesTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Conciliação (Supabase) | `src/modules/financeiro/ConciliacaoTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Fechamento (Supabase) | `src/modules/financeiro/FechamentoTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| CMV / Compras (Supabase) | `src/modules/financeiro/CmvTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Fornecedores (Supabase) | `src/modules/financeiro/FornecedoresTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Centros & Naturezas | `src/modules/financeiro/CentrosNaturezasTabSupabase.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Cadastros Estruturais | `src/modules/financeiro/CadastrosTab.tsx` | N | N | N | N | N | N | N | N | N | N | **ALTA** |
| Parâmetros Financeiros | `src/components/app/financeiro/ParametrosFinanceirosForm.tsx` | N | N | N | N | N | N | N | N | N | N | MÉDIA |
| Operações Financeiras | `src/routes/operacoes-financeiras.tsx:96` | N | N | N | S | S (Aprov) | S | N | N | N | N | MÉDIA |

**Obs:** Módulo Financeiro tem o RmTabHeader/TituloRowActions como padrão próprio, mas as abas Supabase mais novas (Lançamentos, Recorrentes, Adiantamentos, Renegociações, Rescisões, Conciliação, Fechamento, CMV, Fornecedores, Centros, Cadastros) **não possuem nenhum padrão RM** — são tabelas plain sem toolbar.

---

## 3. MÓDULO FINANCIAMENTOS

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Sem Financiamento | `src/routes/financiamentos.tsx:83` | N | N | N | S | S | S | N | N | N | N | MÉDIA |
| Em Financiamento | `src/routes/financiamentos.tsx:83` | N | N | N | S | S | S | N | N | N | N | MÉDIA |
| Pendências | `src/routes/financiamentos.tsx:83` | N | N | N | S | S | S | N | N | N | N | MÉDIA |
| Finalizados | `src/routes/financiamentos.tsx:83` | N | N | N | S | S | S | N | N | N | N | MÉDIA |
| Cancelados | `src/routes/financiamentos.tsx:83` | N | N | N | S | S | S | N | N | N | N | MÉDIA |

**Obs:** Financiamentos tem ERT + ribbonRm + ModuloHistoricoDrawer mas sem RowActions, FilterPanel ou ColumnManager.

---

## 4. MÓDULO COMPRAS (Solicitações de Material)

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Solicitações | `src/routes/solicitacoes-material.tsx:99,153` | N | N | S | S | S | S | N | N | N | N | BAIXA |
| Cotações | `src/routes/solicitacoes-material.tsx` | N | N | N | S | S | S | N | N | N | N | MÉDIA |
| Pedidos | `src/routes/pedidos-venda.tsx:164` | N | N | N | N (EnterpriseToolbar legado) | N | N | N | N | N | S | **ALTA** |
| Recebimentos | `src/routes/pedidos-venda.tsx:164` | N | N | N | N (EnterpriseToolbar legado) | N | N | N | N | N | S | **ALTA** |

**Obs:** `pedidos-venda.tsx` usa `EnterpriseToolbar` do `@/components/app/grid/EnterpriseToolbar` (componente legado, não o `EnterpriseRecordToolbar` do barrel enterprise).

---

## 5. MÓDULO ESTOQUE

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Itens | `src/routes/estoque.tsx:129,827` | N | N | S | S | S | S | N | N | N | S | BAIXA |
| Movimentações | `src/routes/estoque.tsx:928` | N | N | N | S | S | N | N | N | N | N | MÉDIA |
| Reservas | `src/routes/estoque.tsx` | N | N | N | S | S | N | N | N | N | N | MÉDIA |
| Inventário | `src/routes/estoque.tsx` | N | N | N | S | S | N | N | N | N | N | MÉDIA |
| Entregas | `src/routes/estoque.tsx` | N | N | N | S | S | N | N | N | N | N | MÉDIA |

---

## 6. MÓDULO ENGENHARIA

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Obras Ativas | `src/routes/engenharia.tsx:812,880,897` | **S** | **S** | N | S | S | S | S | N | N | N | **ALTA** |
| Cronograma | `src/routes/engenharia.tsx:1403,1608` | **S** | N | S | S | S | S | N | N | N | N | MÉDIA |
| Pendências | `src/routes/engenharia.tsx:1506,1617` | N | N | S | S | S | S | N | N | N | N | BAIXA |
| Finalizados (Eng.) | `src/routes/engenharia.tsx:1855,1876,1889` | **S** | **S** | N | S | S | S | N | N | N | N | **ALTA** |
| Equipes | `src/routes/engenharia.tsx:1710,1733` | N | N | S | S | S | S | N | N | N | N | BAIXA |
| Gestão de Projetos | `src/routes/engenharia.tsx:2011,2120,2133` | **S** | **S** | N | S | S | S | N | N | N | N | **ALTA** |
| Projetos (Kanban + tabela) | `src/routes/engenharia.tsx:2312,2387,2838` | **S** | **S** | S (parcial) | S | S | S | N | N | N | N | **ALTA** |
| Cancelados (Eng.) | `src/routes/engenharia.tsx:2886,2910,2920` | **S** | **S** | N | S | S | S | N | N | N | N | **ALTA** |

---

## 7. PÓS-VENDA

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Pós-Venda (geral) | `src/routes/posvenda.tsx:80` | N | N | N | S | S | S | N | N | N | N | MÉDIA |

---

## 8. APROVAÇÕES

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Fila de Aprovações | `src/routes/aprovacoes.tsx:154` | N | N | N | S | S (Aprov) | N | N | N | N | N | MÉDIA |

---

## 9. ASSINATURAS

| Tela | Arquivo:linha | Opções? | AM? | RA? | ERT? | Proc? | Hist? | Anex? | FP? | CM? | Exp? | CLASSE |
|------|--------------|---------|-----|-----|------|-------|-------|-------|-----|-----|------|--------|
| Assinaturas | `src/routes/assinaturas.tsx:85` | N | N | N | S | S | S | N | N | N | N | MÉDIA |

---

## 10. ANALYTICS / DASHBOARDS / CADASTROS

| Tela | Arquivo | Opções? | AM? | RA? | ERT? | CLASSE |
|------|---------|---------|-----|-----|------|--------|
| Analytics (todas as sub-rotas) | `src/routes/analytics.*.tsx` | N | N | N | N | N/A (leitura) |
| Cadastros gerais | `src/routes/cadastros.tsx` | N | N | N | N | MÉDIA |
| Dashboards | `src/routes/dashboards.*.tsx` | N | N | N | N | N/A (leitura) |

---

## RESUMO DE OCORRÊNCIAS

| Padrão Legado | Contagem | Arquivos |
|---------------|----------|---------|
| Coluna `"Opções"` em grids | **18** | comercial(3), engenharia(6), leads(2), PropostaList(2) |
| `ActionsMenu` em uso real (não import) | **28** | comercial(6), engenharia(12), leads(2), PropostaList(4) |
| `EnterpriseToolbar` legado (grid/) | **1** | pedidos-venda |
| Telas sem **nenhum** padrão RM | **11** | financeiro Supabase tabs |

---

## LISTA PRIORIZADA — CLASSIFICAÇÃO ALTA

### 🔴 LOTE 1 — Máxima urgência (ActionsMenu + coluna "Opções" visível)

| # | Tela | Arquivo | Problema principal |
|---|------|---------|-------------------|
| 1 | **Leads** | `src/modules/leads/LeadsPage.tsx` | Coluna "Opções" + ActionsMenu nas linhas |
| 2 | **PropostaList** | `src/modules/propostas/components/PropostaList.tsx` | Coluna "Opções" + ActionsMenu |
| 3 | **Contratos (3 sub-grids)** | `src/routes/comercial.tsx:700,948,1075` | Coluna "Opções" + ActionsMenu em Cancelados, Gerados, Em Elaboração |
| 4 | **Obras Ativas** | `src/routes/engenharia.tsx:812` | Coluna "Opções" + ActionsMenu |
| 5 | **Finalizados Eng.** | `src/routes/engenharia.tsx:1855` | Coluna "Opções" + ActionsMenu |
| 6 | **Gestão de Projetos** | `src/routes/engenharia.tsx:2011` | Coluna "Opções" + ActionsMenu (2 sub-grids) |
| 7 | **Projetos Tabela** | `src/routes/engenharia.tsx:2312` | Coluna "Opções" + ActionsMenu |
| 8 | **Cancelados Eng.** | `src/routes/engenharia.tsx:2886` | Coluna "Opções" + ActionsMenu |

### 🟠 LOTE 2 — Alta urgência (sem toolbar RM — telas Supabase "nuas")

| # | Tela | Arquivo |
|---|------|---------|
| 9 | **Lançamentos** | `src/modules/financeiro/LancamentosTabSupabase.tsx` |
| 10 | **Despesas Fixas** | `src/modules/financeiro/RecorrentesTabSupabase.tsx` |
| 11 | **Adiantamentos** | `src/modules/financeiro/AdiantamentosTabSupabase.tsx` |
| 12 | **Renegociações** | `src/components/app/financeiro/RenegociacaoHistoricoListSupabase.tsx` |
| 13 | **Rescisões** | `src/modules/financeiro/RescisoesTabSupabase.tsx` |
| 14 | **Conciliação** | `src/modules/financeiro/ConciliacaoTabSupabase.tsx` |
| 15 | **Fechamento** | `src/modules/financeiro/FechamentoTabSupabase.tsx` |
| 16 | **CMV/Compras** | `src/modules/financeiro/CmvTabSupabase.tsx` |
| 17 | **Fornecedores** | `src/modules/financeiro/FornecedoresTabSupabase.tsx` |
| 18 | **Centros & Naturezas** | `src/modules/financeiro/CentrosNaturezasTabSupabase.tsx` |
| 19 | **Cadastros Estruturais** | `src/modules/financeiro/CadastrosTab.tsx` |

### 🟡 LOTE 3 — Médio (EnterpriseToolbar legado / sem RowActions)

| # | Tela | Arquivo |
|---|------|---------|
| 20 | **Pedidos de Venda** | `src/routes/pedidos-venda.tsx` — usa `EnterpriseToolbar` do grid/ |
| 21 | **Recebimentos** | `src/routes/pedidos-venda.tsx` — usa `EnterpriseToolbar` do grid/ |

---

## PLANO DE CORREÇÃO — ORDEM DE EXECUÇÃO

### Sprint D17.1 — Comercial + Propostas (estimativa: 1-2 dias)
1. `src/modules/leads/LeadsPage.tsx` — substituir ActionsMenu → RowActions, "Opções" → "Ações"
2. `src/modules/propostas/components/PropostaList.tsx` — mesmo padrão
3. `src/routes/comercial.tsx` funções `ContratosTab` e `ContratosCanceladosTab` — 3 grids

### Sprint D17.2 — Engenharia (estimativa: 1-2 dias)
4. `src/routes/engenharia.tsx:ObrasAtivasTab` (linha ~812)
5. `src/routes/engenharia.tsx:FinalizadosTab` (linha ~1855)
6. `src/routes/engenharia.tsx:GestaoProjetosTab` (linha ~2011, 2 grids)
7. `src/routes/engenharia.tsx:ProjetosTab / KanbanTab` (linha ~2312, 2838)
8. `src/routes/engenharia.tsx:CanceladosEngTab` (linha ~2886)

### Sprint D17.3 — Financeiro Supabase "nuas" (estimativa: 2-3 dias)
9-19. Adicionar `EnterpriseRecordToolbar` + `ribbonRm()` + `layoutBarRm()` + `ModuloHistoricoDrawer` em cada aba Supabase do financeiro (Lançamentos, Recorrentes, Adiantamentos, Renegociações, Rescisões, Conciliação, Fechamento, CMV, Fornecedores, Centros, Cadastros)

### Sprint D17.4 — Compras / Pedidos (estimativa: 0,5 dia)
20-21. `src/routes/pedidos-venda.tsx` — migrar `EnterpriseToolbar` (legado grid/) para `EnterpriseRecordToolbar` do barrel enterprise

### Sprint D17.5 — Refinamento MÉDIO (estimativa: 1 dia)
- Adicionar `FilterPanel` + `ColumnManager` nas telas que têm ERT mas sem FP/CM: Financiamentos, Pós-Venda, Aprovações, Assinaturas, Estoque (Movimentações/Reservas/Inventário/Entregas), Operações Financeiras

---

## ESTIMATIVA DE ADERÊNCIA

### Metodologia
- Total de telas operacionais auditadas: **~55**
- Telas ALTA (fora do padrão): **21** (38%)
- Telas MÉDIA (parcialmente conformes): **20** (36%)
- Telas BAIXA/OK (conformes): **14** (25%)

### Aderência atual estimada

| Critério | Conformes | % |
|----------|-----------|---|
| Tem EnterpriseRecordToolbar | ~33/55 | **60%** |
| Sem coluna "Opções" | ~41/55 | **74%** |
| Sem ActionsMenu | ~37/55 | **67%** |
| Tem RowActions | ~22/55 | **40%** |
| Tem ModuloHistoricoDrawer | ~22/55 | **40%** |
| Tem ribbonRm/Processos | ~33/55 | **60%** |
| **Score global ponderado** | — | **~57%** ⚠️ |

> **A estimativa de 93% não se confirma.** O score real está em torno de **57-60%** considerando todos os 7 critérios RM/TOTVS. A discrepância se explica porque as telas do barrel enterprise foram criadas corretamente, mas boa parte das telas originais (Comercial, Engenharia) e todas as telas Supabase mais novas (Financeiro) nunca receberam migração.

### Aderência pós-correção (após D17.1–D17.5)

| Critério | Pós-correção |
|----------|-------------|
| EnterpriseRecordToolbar | ~95% |
| Sem "Opções"/ActionsMenu | ~99% |
| RowActions | ~85% |
| ModuloHistoricoDrawer | ~80% |
| FilterPanel + ColumnManager | ~70% |
| **Score global estimado** | **~85–88%** |

---

## ARQUIVOS A NÃO MODIFICAR (fora do escopo)
- `src/components/app/ActionsMenu.tsx` — manter para possíveis usos legítimos fora de grids
- `src/components/app/grid/EnterpriseToolbar.tsx` — manter, mas deprecar para grids
- Dashboards / Analytics — são telas de leitura, sem ação de linha, fora do escopo RM

---

*Auditoria realizada via análise estática de código-fonte · src/routes/** · src/modules/** · src/components/app/**.*
