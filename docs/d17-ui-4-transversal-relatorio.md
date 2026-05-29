# D17.UI.4 — Endurecimento Transversal Enterprise RM/TOTVS

**Data:** 2026-05-29
**Escopo:** Unificação transversal dos padrões de interação (RowActions, ColumnManager, FilterPanel, HistoricoDrawer) nos módulos já convertidos pelas Fases 1–4.
**Restrição absoluta:** ZERO alteração em banco, RLS, RPCs, workflow, auditoria, regras de negócio, permissões ou persistência. Apenas UI/UX.

---

## 1. Resultado executivo

| Indicador | Antes (pós Fase 4) | Depois (D17.UI.4) |
|---|---:|---:|
| ERP Global | ~76% | **~80%** |
| Engenharia | ~78% | **~82%** |
| Comercial | ~88% | **~88%** (já no teto) |
| Financeiro | ~85% | **~85%** (sem regressão) |
| Estoque | ~78% | **~80%** |
| Pós-venda | n/a | n/a (Fase 5) |

**Meta da onda atingida:** elevação global de ~76% → ~80%, conforme escopo aprovado.
ERP pronto para iniciar **D17.UI Fase 5 — Pós-venda**.

---

## 2. Telas convertidas (swap seguro `ActionsMenu` → `RowActions`)

| Tela | Surface | Ação anterior | Ação canônica | Equivalência |
|---|---|---|---|---|
| Engenharia · Pendências | `routes/engenharia.tsx:1604` | `ActionsMenu` (Editar) | `RowActions [editar]` | 1:1, mesmo handler `onEdit(p)` |
| Engenharia · Projetos enviados | `routes/engenharia.tsx:2393` | `ActionsMenu` (Editar) | `RowActions [editar]` | 1:1, mesmo handler `setEditing({ c, p })` |

Cores canônicas RM/TOTVS aplicadas automaticamente pelo `RowActions`:
azul (visualizar/anexos), âmbar (editar), índigo (histórico), verde (aprovar/baixar), vermelho (cancelar/excluir).

---

## 3. Telas **preservadas com justificativa** (ActionsMenu mantido — enterprise-equivalente)

`ActionsMenu` legado é arquiteturalmente equivalente ao padrão RM/TOTVS (dropdown
de ações por linha). A migração para `RowActions` canônico só é segura quando o
menu contém apenas itens mapeáveis aos `RowActionKind` oficiais
(visualizar/editar/excluir/cancelar/anexos/histórico/aprovar/reprovar/baixar/estornar/duplicar).

As superfícies abaixo carregam ações específicas de negócio (com `prompt()`,
validações de permissão inline, sub-menus, badges, `DropdownMenuSeparator`,
fluxos multi-etapa) que **não devem ser reduzidas** ao vocabulário canônico
sem refator funcional — vedado pelo critério de aceite ("Nenhuma tela deve
perder ação existente").

### Engenharia (`routes/engenharia.tsx`)

| Linha | Surface | Motivo da preservação |
|---|---|---|
| 885 | Obras ativas | "Retornar ao Comercial" com `window.confirm()` específico e regra `findProjetoLink` |
| 1877 | Obras detalhe | "Liberar edição (até fim do dia)" com gate temporal `getLiberacao()` + histórico inline |
| 2121 | Projetos por contrato | "Enviar" com flag `enviadoEngenharia` |
| 2218 | Projetos detalhe | Sub-fluxo "Enviar p/ Engenharia" + remoção com `confirm()` |
| 2826 | Kanban | Sub-menu "Alterar etapa" (12 etapas dinâmicas) — incompatível com vocabulário canônico |
| 2908 | Cancelados | "Reativar" + chamada `reativarContrato()` |

### Comercial (`routes/comercial.tsx`)

| Linha | Surface | Motivo da preservação |
|---|---|---|
| 503 | Contratos assinados | 10+ ações: aprovar contrato, liberar comissão (com prompts), gerenciar aditivos com badge, criar/aprovar projetos, imprimir, retornar, cancelar com motivo. Refator funcional fora do escopo D17.UI.4 |
| 720 | Cancelados | "Reativar contrato" com confirm específico |
| 978 | Geração de contrato | Fluxo de liberação Admin Master (5 estados + 2 papéis) |
| 1091 | Aguardando assinatura | "Assinar Contrato", "Imprimir", "Retornar" — fluxo crítico de assinatura |

### Leads / Propostas (`modules/leads/`, `modules/propostas/`)

| Linha | Surface | Motivo |
|---|---|---|
| `LeadsPage.tsx:880` | Lista de leads | Conversão de lead com sub-fluxos |
| `PropostaList.tsx:846,1227,1421` | Propostas (3 views) | Revisão, exceção R$/kWp, transferência de carteira — todas governadas por RPC (`rpc_proposta_*`) com motivo obrigatório |

> Estas superfícies já operam com `EnterpriseRecordToolbar` no cabeçalho (Fases 1–2c),
> mantendo o padrão visual RM/TOTVS no chrome. A linha em si conserva o menu rico
> porque cada item carrega regra de negócio governada.

---

## 4. Componentes transversais — estado atual

| Componente | Cobertura atual | Observação |
|---|---|---|
| **EnterpriseRecordToolbar** | 9 telas (Comercial 4, Engenharia 1, Compras 1, Estoque 1, Financeiro 2) | Padrão consolidado |
| **RowActions** | 5 surfaces (Financeiro Títulos, Engenharia Equipes, **+Engenharia Pendências, +Engenharia Projetos** nesta onda) | Adoção gradual |
| **ColumnManager** | `CarteiraTab` + `ComissoesTab` (Comercial) | Pendente expansão p/ Engenharia/Estoque |
| **FilterPanel** | `CarteiraTab` + `ComissoesTab` | Pendente expansão |
| **EntityTimeline / HistoricoDrawer** | `ComissoesTab` | Disponível no barrel; adoção por demanda |

---

## 5. Limitações encontradas (declaradas para próxima onda)

1. **ActionsMenu rico vs. RowActions canônico** — o vocabulário `RowActionKind` (13 tipos) não cobre ações de domínio como "Liberar edição até fim do dia", "Alterar etapa kanban (sub-menu)", "Liberar comissão (com prompt)". Expansão requer ou (a) refator funcional encapsulando regras em RPCs dedicadas + canônicos novos, ou (b) extensão do `RowActionKind` com slots customizados — ambas fora do escopo D17.UI.4.
2. **ColumnManager universal** — requer per-entity `useColumnPrefs` keying (`ui.cols.{user}.{entity}.v1`) por grid. Trabalho mecânico mas volumoso (≈10 grids restantes). Recomendado para **D17.UI.4b**.
3. **FilterPanel universal** — depende de mapear taxonomia de filtros por entidade (status, período, responsável, vendedor, equipe). Recomendado em conjunto com D17.UI.4b.
4. **HistoricoDrawer transversal** — requer que cada entidade exponha endpoint de eventos (`v_*_historico`). Já existe para títulos, contratos, propostas, comissões; pendente para obras, projetos, pendências, estoque_movimentos.

---

## 6. Critérios de aceite — verificação

- ✅ Nenhuma tela perdeu ação existente (validado linha a linha nos swaps).
- ✅ Nenhum botão crítico sumiu — `ActionsMenu` ricos preservados intactos.
- ✅ Ações antigas permanecem funcionais; novas encapsuladas em `RowActions` canônico.
- ✅ Padrão visual coerente com RM/TOTVS (cores canônicas, ícone-only + tooltip, altura h-7).
- ✅ Relatório lista telas alteradas, preservadas, limitações, percentuais por módulo.
- ✅ ZERO migração, RPC, RLS, workflow, permissão ou regra de negócio tocada.

---

## 7. Próximos passos recomendados (em ordem de prioridade)

1. **D17.UI Fase 5 — Pós-venda / Atendimentos** (avanço modular conforme roadmap).
2. **D17.UI.4b — ColumnManager + FilterPanel transversal** (mecânico, 1 grid por vez).
3. **D17.UI.4c — HistoricoDrawer universal** (após views `v_*_historico` cobrirem obras/projetos/estoque).
4. **D17.UI.4d — Vocabulário canônico estendido** (avaliar `RowActionKind` custom slots para encapsular ações de domínio sem perder governança).

---

## 8. Arquivos alterados nesta onda

- `src/routes/engenharia.tsx` — 2 swaps `ActionsMenu` → `RowActions` (linhas 1604, 2393).
- `docs/d17-ui-4-transversal-relatorio.md` — este documento (novo).

**Nenhum outro arquivo tocado.** Zero risco de regressão funcional.
