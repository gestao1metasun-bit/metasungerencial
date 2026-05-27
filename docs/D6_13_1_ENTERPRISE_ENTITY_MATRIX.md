# D6.13.1 — Matriz EnterpriseEntity

Mapeamento das **10 entidades críticas** do Meta Sun × **14 capacidades** que toda entidade enterprise deve ter (`EnterpriseEntity` contract). Objetivo: identificar lacunas e priorizar as ondas D6.13.2 → D6.13.7.

**Legenda:** ✅ = pronto · 🟡 = parcial · ❌ = ausente · — = não se aplica.

## Capacidades do contrato `EnterpriseEntity`

| # | Capacidade | Significado |
|---|---|---|
| 1 | **Identidade** | `id` (uuid) + `código` legível |
| 2 | **Status** | `status` controlado por state-machine, nunca editável livre |
| 3 | **Origem** | rastreabilidade upstream (PV→obra, contrato→PV, etc) |
| 4 | **Responsável/Setor** | `created_by` + `updated_by` + setor/equipe |
| 5 | **Soft delete** | `deleted_at` + `motivo_cancelamento` quando aplicável |
| 6 | **Auditoria** | linha em `audit_log` com before/after |
| 7 | **Snapshot** | versão congelada para impressão/contestação |
| 8 | **Anexos** | arquivos polimórficos vinculados |
| 9 | **Comentários** | thread interna por registro |
| 10 | **Flags** | tags operacionais (urgente, revisão, etc) via `flags_*` |
| 11 | **Histórico/Timeline** | linha do tempo unificada (eventos+audit+workflow+anexos) |
| 12 | **Permissões** | RLS + checagem de UI por permission key |
| 13 | **Processos contextuais** | ações registradas no Process Engine |
| 14 | **Lote + Export** | seleção múltipla, ações em lote, export CSV/XLSX |

## Matriz

| Entidade | Tabela | 1·ID | 2·Status | 3·Origem | 4·Resp. | 5·SoftDel | 6·Audit | 7·Snap | 8·Anex | 9·Coment | 10·Flags | 11·Timeline | 12·Perm | 13·Processos | 14·Lote/Export |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Clientes** | `clientes` | ✅ | 🟡 ativo/inativo | — | 🟡 só created_by | 🟡 inativação sem motivo | 🟡 parcial | ❌ | ❌ | ❌ | 🟡 flags_record | 🟡 só audit | ✅ RLS | ❌ solto | 🟡 export sim, lote não |
| **Contratos** | `contratos` | ✅ | ✅ catalog | ✅ proposta | ✅ | ✅ + motivo | ✅ | ✅ aditivos | ❌ | ❌ | ✅ | ✅ | ✅ RLS | 🟡 aditivos sim, sem engine | 🟡 export sim |
| **Pedidos de Venda** | `pedidos_venda` | ✅ | ✅ state-machine 42501 | ✅ contrato→PV | ✅ | ✅ + motivo | ✅ | 🟡 | ❌ | ❌ | ✅ | ✅ histórico próprio | ✅ RLS | 🟡 gerar/aprovar via RPC, fora do engine | ❌ |
| **Títulos Financeiros** | `titulos_financeiros` | ✅ | ✅ trigger-controlled | ✅ PV/contrato/compra | ✅ | ✅ via cancel RPC | ✅ | 🟡 parcelas | ❌ | ❌ | ✅ flags | ✅ via reconciliação | ✅ RLS+grants | 🟡 renegociar/baixar/cancelar via RPC, fora do engine | 🟡 renegociar lote sim |
| **Obras** | `obras` | ✅ | ✅ state-machine | ✅ PV→obra | ✅ | ✅ finalização store | ✅ | ✅ snapshot store | ❌ | ❌ | ✅ flags | 🟡 via rastreabilidade | ✅ RLS | 🟡 status muda via op controlada | ❌ |
| **Produtos** | `produtos` (estoque) | ✅ SKU | — | — | 🟡 | ❌ | 🟡 | — | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 🟡 export |
| **Estoque movimentos** | `estoque_movimentos` | ✅ | ✅ trigger anti-direct | ✅ origem polimórfica + CHECK | ✅ | — imutável | ✅ | ✅ imutável por design | ❌ | ❌ | ❌ | ✅ por obra/produto | ✅ RLS+grants | ✅ reservar/entregar/ajustar/inv | ✅ |
| **Aprovações (workflow)** | `workflow_aprovacoes` | ✅ | ✅ flag-gated | ✅ entidade origem | ✅ | — | ✅ + histórico próprio | ✅ congelado em decisão | ❌ | 🟡 comentário no histórico | ❌ | ✅ workflow_historico | ✅ permissões workflow.* | ✅ aprovar/negar/delegar via RPC | ✅ aprovar lote (D6.8 wave 1) |
| **Solicitações de Material** | `solicitacoes_material` | ✅ | ✅ workflow | ✅ obra | ✅ | ❌ | ✅ | 🟡 | ❌ | ❌ | ❌ | 🟡 via workflow | ✅ RLS | 🟡 enviar/aprovar via workflow | ❌ |
| **Ordens de Compra** | (a definir) | 🟡 emergente | 🟡 | 🟡 sol. material | 🟡 | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ |

## Lacunas transversais (alvo das próximas waves)

### 🔴 Crítico — bloqueia padronização

1. **Anexos (cap. 8)** — ❌ em **9/10 entidades**. Cada módulo improvisa. Resolve em **D6.13.4 Attachment Engine** (tabela polimórfica + Storage).
2. **Comentários (cap. 9)** — ❌ em **10/10 entidades**. Não existe thread interna. Resolve em **D6.13.6 Timeline** (parte da timeline unificada).
3. **Processos fora do motor (cap. 13)** — ❌/🟡 em **9/10 entidades**. RPCs existem mas cada tela monta seu próprio botão e checa permissão à mão. Resolve em **D6.13.3 Process Engine** (registro central + `useProcessos`).

### 🟠 Importante — limita governança

4. **Timeline única (cap. 11)** — 🟡 fragmentada. Cada entidade tem seu próprio `HistoricoTimeline` consumindo só `audit_log`. Workflow histórico, anexos e comentários ficam de fora. Resolve em **D6.13.6** (view `v_entity_timeline`).
5. **Lote (cap. 14)** — ❌/🟡 em **7/10 entidades**. Só Aprovações e Estoque têm execução em lote real. Resolve em **D6.13.3** (Bulk Operation Engine, irmão do Process Engine).
6. **Saved Views por usuário** — não existe. Filtros e colunas são por sessão/local. Resolve em **D6.13.5**.

### 🟡 Cosmético — não bloqueia, mas conta

7. **Snapshot (cap. 7)** — falta para PVs, solicitações de material e produtos. Pode ficar para depois do D6.13.
8. **Origem (cap. 3) em Produtos** — não se aplica diretamente; rastreabilidade de produto vive em movimentos.
9. **Ordens de Compra (entidade inteira)** — ainda emergente; padronizar quando virar entidade real no D8/D10.

## Priorização confirmada das próximas waves

| Wave | Resolve as lacunas | Migration? |
|---|---|---|
| **D6.13.2** Componentes Framework | Padroniza UI sobre o que já existe (sem nova capacidade) | Não |
| **D6.13.3** Process Engine + Bulk | 5, 13 | Não (só TS) |
| **D6.13.4** Attachment Engine | 1 (cap. 8) | **Sim** — `anexos_polimorficos` + bucket |
| **D6.13.5** Saved Views | 6 | **Sim** — `user_saved_views` |
| **D6.13.6** Timeline + Comentários | 2 (cap. 9), 4 (cap. 11) | **Sim** — `comentarios_polimorficos` + view `v_entity_timeline` |
| **D6.13.7** Governança Transversal | Documenta o contrato sobre 1-6 | Não (docs) |

## Conclusão D6.13.1

Meta Sun tem **fundação enterprise sólida em transações e estados** (capacidades 1-6, 12 muito bem cobertas), mas **fragmentação total em colaboração e produtividade operacional** (capacidades 8, 9, 11, 13, 14). A sequência **D6.13.3 → 4 → 6** ataca o coração do problema.

Estoque já hoje é o módulo mais próximo do contrato `EnterpriseEntity` (12/14 capacidades). Vira referência canônica para adoção.

→ D6.13.1 fechada. Próximo: **D6.13.2 — Componentes Framework** (consolida barrel `enterprise/index.ts`, sem migration, sem regressão).
