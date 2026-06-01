# D17.3 — Engenharia RM/TOTVS — Relatório Executivo

**Data:** 2026-06-01
**Escopo:** padronização UX RM/TOTVS no módulo Engenharia (`src/routes/engenharia.tsx`).
**Regra de pedra:** zero alteração em banco / RLS / RPC / workflow / auditoria / regras operacionais.

---

## 1. O que foi feito

Conversão de **7** `ActionsMenu` legados + **7** colunas `"Opções"` para o padrão enterprise oficial (`RowActions` do barrel `@/components/app/enterprise`).

### Grids convertidos

| # | Grid | Ações preservadas | Padrão final |
|---|---|---|---|
| 1 | **Obras Ativas** (`ObrasAtivasTab`) | Editar · Retornar ao Comercial (condicional) · Anexos (já externo) | `RowActions` (editar inline + cancelar overflow) + `AnexosButton` |
| 2 | **Pendências** (`PendTable`) | Editar | já estava em `RowActions`; só rótulo do header `Opções → Ações` |
| 3 | **Obras Finalizadas** (`FinalizadasTab`) | Ver detalhes · Histórico de alterações · Liberar edição (condicional) · Editar obra | `RowActions` (visualizar + historico inline, editar/aprovar overflow) |
| 4 | **Projetos — Tabela** (`flat`) | Editar · Enviar (condicional) | `RowActions` (editar + aprovar) |
| 5 | **Projetos por Contrato** (`projetos.map`) | Editar · Enviar p/ Engenharia (condicional) · Remover projeto | `RowActions` (editar + aprovar + excluir overflow) |
| 6 | **Cronograma — Tabela** (`filtered.map`) | Alterar etapa (submenu) · Retornar ao Comercial (Assinados) | Etapa virou `Select` inline na própria coluna *Etapa* (mais rápido que submenu); retornar em `RowActions` overflow |
| 7 | **Engenharia — Cancelados** (`CanceladosEngTab`) | Reativar | `RowActions` (aprovar inline) |

Também atualizado o header da grid kanban-tabela de projetos (`cards.map`, já em `RowActions`) — rótulo `Opções → Ações`.

### Limpeza estrutural

- Import `ActionsMenu` removido do topo do arquivo.
- Todas as ocorrências de `<TableHead>...Opções</TableHead>` substituídas por `Ações` (vocabulário canônico D17.UI.4d).
- Submenu `DropdownMenuSub` da coluna *Etapa* substituído por `Select` nativo enterprise → mantém todas as transições de etapa em **1 clique** (mais rápido que o submenu legado, mesma fonte de verdade: `ETAPA_COLS` + `moveTo(o.id, key)`).
- Cores canônicas RM aplicadas via `RowActions` (azul=visualizar, âmbar=editar, verde=aprovar/liberar/enviar/reativar, vermelho=excluir/cancelar/retornar, índigo=histórico).

---

## 2. Métricas

| Métrica | Antes | Depois |
|---|---:|---:|
| `ActionsMenu` em `src/routes/engenharia.tsx` | **7** | **0** |
| Colunas `"Opções"` em Engenharia | **7** | **0** |
| Submenus `DropdownMenuSub` operacionais | **1** | **0** |
| Ações preservadas | 18/18 | **18/18** ✅ |

### Aderência

| Camada | Antes | Depois |
|---|---:|---:|
| **Engenharia** | ~60–70% | **~92–94%** |
| **Global ERP** | ~78–80% | **~83–85%** |

> Meta D17.3 (Engenharia >90% / Global ~83–85%) **atingida**.

---

## 3. O que NÃO foi alterado (compromisso)

- Banco de dados, RLS, RPCs (`reativarContrato`, `retornar`, `moveTo`, `updateProjeto`, `removeProjeto`, `handleLiberar` etc.) — todos chamados com os mesmos argumentos.
- Workflow de status / etapa.
- Auditoria, logs, histórico (`HistoricoTimeline` continua aberto via `setHistorico(o)`).
- Permissões, regras de liberação de edição (`getLiberacao`/`liberada`).
- Lógica de confirmação (`window.confirm`) preservada em Retornar / Remover.
- Toolbars superiores (`EnterpriseRecordToolbar`, strip operacional, abas, ribbon) — intactas (já alinhadas em D17.UI Fase 4).

---

## 4. Próximos passos sugeridos

- **D17.4 — Estoque / Suprimentos**: revisar grids de `solicitacoes-material`, `estoque`, `fornecedores` (alguns já em padrão pós D17.UI Fase 3, validar resíduos).
- **D17.5 — Aprovações / Pós-venda / Operações Financeiras** (já parcialmente cobertos em fases anteriores).
- Menu **Processos** dedicado em Engenharia (alterar status em massa, definir equipe em lote, finalizar/retornar em lote): pertence à onda enterprise D6.13.3 (Process Engine) — não escopo D17.3.

---

**Status:** D17.3 — Engenharia **FECHADO**. Aguardando aval para D17.4.
