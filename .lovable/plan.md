# Plano: UI Enterprise 98% + Performance 98%

Escopo gigantesco (11 módulos UI + 6 SLAs + carga). Para entregar com qualidade RM/TOTVS sem virar refactor superficial, proponho execução em **3 sprints sequenciais**, cada um fechável e auditável. Entrego os relatórios finais no fim do Sprint 3.

---

## Sprint 1 — Fundação (UI Kit + Telemetria completa)

**Frente A.1 — Helper universal de adoção**
- Criar `src/components/app/enterprise/EnterprisePageShell.tsx` — wrapper padrão de 3 linhas (PageHeader + EnterpriseRecordToolbar + FilterPanel/ColumnManager strip).
- Criar `useEnterpriseGrid()` hook que combina: `useServerPagination` + `useColumnPrefs` + `useRowSelection` + filtros + densidade + layout (LS `ui.{entity}.v1`).
- Padronizar `RowActions` defaults (ver / editar / excluir / anexos / histórico / processos).
- `ExportButton`, `RefreshButton`, `DensityToggle`, `LayoutToggle`, `NavCounter` no barrel.

**Frente B.1 — Telemetria completa**
- Adicionar marks faltantes: `perms.ready`, `route.ready`, `module.switch`, `first.list.ready`, `filter.applied`, `record.saved`.
- Instrumentar em `AppLayout`, `usePermissoes`, `WorkspaceTabBar`, `useServerPagination`, `FilterPanel`, RPCs de save mais usadas.
- Atualizar `v_perf_p95_7d` para incluir novos marks + view `v_perf_sla_status` (verde/amarelo/vermelho por SLA).
- Painel `/analytics/performance` ganha cards por SLA.

## Sprint 2 — Conversão UI em onda (11 módulos)

Ordem por impacto operacional, cada um usando o helper do Sprint 1:

1. **Comercial** (leads, propostas, clientes) — referência junto com Financeiro
2. **Contratos**
3. **Pedido de Venda**
4. **Compras**
5. **Estoque** (já é referência, só normalizar via shell)
6. **Engenharia**
7. **Ordem de Serviço**
8. **Financiamentos**
9. **Aprovações**
10. **Pós-venda**
11. **Configurações**

Cada módulo: troca `<table>`/toolbar custom → `EnterprisePageShell` + `EnterpriseDataGrid` + `RowActions` padrão. Persistência só em `ui.*`. Zero LS operacional novo, zero RPC nova, zero RLS.

## Sprint 3 — Performance + Carga + Relatórios

**Frente B.2 — Otimização**
- Auditar queries lentas via `pg_stat_statements` (read_query).
- Garantir `defaultPreloadStaleTime: 0`, `staleTime` por hook (perms 30min, cadastros 10min, listas 30s).
- Code-split rotas pesadas (lazy + Suspense) — Financeiro, Comercial, Engenharia.
- Revisar índices faltantes nas views novas (Op. Financeiras F1, comercial C5/C6).
- Polling: substituir por React Query `refetchInterval` controlado, default desligado.

**Frente B.3 — Teste de carga sintético**
- Script `scripts/d16-perf-load-test.ts` (Bun + Supabase service role) que insere via RPCs reais:
  10 sessões × (1k contratos / 5k OS / 20k títulos / 50k audit / 10k anexos refs).
- Mede P50/P95 por endpoint, registra em `perf_log` com tag `load_test`.
- Idempotente, com flag de cleanup (`--purge`).

**Entregáveis finais (docs/)**
- `docs/d17-ui-relatorio-98.md` — 11 módulos, componentes aplicados, aderência, prints (capturados via browser tool).
- `docs/d16-perf-relatorio-98.md` — P50/P95 por rota, SLA verde/vermelho, queries otimizadas, resultado carga.
- `docs/veredito-operacao-assistida.md` — UI%, PERF%, gate go/no-go, pendências de uso real.
- Atualizar `mem://features/d17-ui-98-completo` e `mem://features/d16-perf-98-completo`.

---

## Restrições (charter D15/D17 mantido)

- Proibido: nova RPC, nova tabela, mexer em RLS/auditoria, dado operacional em LS, regra de negócio.
- Permitido: views read-only de telemetria, índices de performance, refactor de UI, marks de perf.
- Tudo via barrel `@/components/app/enterprise`.

---

## Tamanho realista

- Sprint 1: ~6 arquivos novos + 4 edits + 1 migration (índices/views perf).
- Sprint 2: ~30-40 arquivos editados (10 módulos × 3-4 telas cada).
- Sprint 3: ~3 docs + 1 script + 1 migration (índices).

Quer que eu execute **Sprint 1 já**, e depois siga Sprint 2 e 3 em mensagens seguintes? Ou prefere que eu reduza o escopo do Sprint 2 (ex.: só os 5 módulos mais usados: Comercial, Contratos, PV, Compras, Estoque)?