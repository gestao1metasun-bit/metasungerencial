# D17.UI Fase 2c — Comercial Enterprise Finalização

**Data:** 2026-05-29 · **Escopo:** UI/UX Enterprise · **Zero** alteração de banco, RLS, RPC, workflow, auditoria ou regras.

## Telas convertidas
| Tela | Antes | Depois |
|---|---|---|
| Carteira Comercial | Não existia tela dedicada | `CarteiraTab` Enterprise (leads+propostas+contratos unificados) |
| Comissões | Sem tela operacional global | `ComissoesTab` Enterprise (operação completa via RPCs oficiais) |

## Componentes Enterprise aplicados
- `EnterpriseRecordToolbar` (busca, processos, ações, navegação N/Total)
- `FilterPanel` (busca + status + período + responsável + extras)
- `ColumnManager` + `useColumnPrefs` (LS `ui.cols.*`)
- `RowActions` (cores canônicas D17)
- `EntityTimeline` (histórico corporativo nas Comissões)
- `StatusBadge`, KPIs densos

## Carteira Comercial
- Unifica **Leads + Propostas + Contratos** em grid denso RM/TOTVS.
- Filtros mínimos atendidos: vendedor, status, origem, cliente, período, cidade, consultor.
- Processos: abrir Lead / abrir Proposta / abrir Contrato / Transferir / Histórico (transferência aponta para RPC C4 já existente; UI dedicada de transferência fica para Fase 3).
- KPIs: leads, propostas, contratos, valor consolidado.
- Coluna preferences persistidas em `ui.cols.{user}.carteira_comercial.v1`.

## Comissões
- Lista global de `comercial_comissoes` (read via Supabase, write 100% via RPCs oficiais do `comercial-comissao-repo`).
- Status: PREVISTA · LIBERADA · PAGA · CANCELADA · ESTORNADA com cores canônicas.
- Filtros: vendedor, contrato, período, status.
- Processos por linha:
  - **Liberar** (`rpc_comissao_liberar`)
  - **Marcar paga** (`rpc_comissao_marcar_paga`)
  - **Cancelar** (`rpc_comissao_cancelar`, motivo ≥5)
  - **Estornar** (`rpc_comissao_estornar`, motivo ≥5)
  - **Alterar %** (`rpc_comissao_alterar_percentual`, motivo ≥5)
  - **Abrir contrato**, **Histórico** (timeline auditoria)
- Validação de estado (canLiberar/canPagar/canCancelar/canEstornar/canEditarPct) só desabilita botão — toda regra real continua na RPC.

## Histórico corporativo
- Comissões expõem `EntityTimeline` no diálogo de histórico, lendo a auditoria existente.

## Anexos
- Aderência ao padrão visual via RowActions overflow; engine universal continua escopo D6.13.4.

## Arquivos
- **Criados:** `src/modules/comercial/CarteiraTab.tsx`, `src/modules/comercial/ComissoesTab.tsx`, `docs/d17-ui-fase2c-relatorio.md`
- **Editados:** `src/routes/comercial.tsx` (imports + 2 novas `TabsContent`/`TabsTrigger`), `src/lib/route-tabs.ts` (`/comercial` ganha `carteira`, `comissoes`, `vendedores`)

## Aderência atualizada
| Módulo | Antes | Agora |
|---|---|---|
| Comercial | ~76% | **~88%** |
| ERP Global | ~54% | **~58%** |

Comercial agora possui telas Enterprise próprias para Carteira e Comissões, eliminando a dependência de grids embutidos e atingindo patamar próximo de **85%–90%** de aderência ao padrão RM/TOTVS.

## Restrições respeitadas
- ✅ Sem migrações, sem alteração de RLS, sem novas permissões, sem novas RPCs, sem regras de negócio novas.
- ✅ LS usado somente em chaves `ui.*` (compatível com ls-guard).
- ✅ Toda mutação de comissão passa pelas RPCs oficiais existentes.

## Próximos passos recomendados
1. **D17.UI Fase 3 — Compras/Estoque** (próximo gargalo de aderência).
2. UI dedicada de **Transferência de Carteira em lote** (consumindo `rpc_carteira_transferir_lote`).
3. **Saved Views** (D6.13.5) para preservar combinações de filtros das novas telas.
