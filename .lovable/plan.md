# D16.PERF — Meta Oficial de Performance ERP Meta Sun

Objetivo: deixar o ERP **rápido como TOTVS RM** sem abrir mão de RLS, auditoria, governança ou D14/D15. Robusto **e** rápido.

## Metas oficiais (SLA interno)

| Indicador | Meta | Forma de medição |
|---|---|---|
| Auth Supabase (signIn) | ≤ 800 ms | `perf.mark('auth.start' → 'auth.ok')` |
| Shell renderizado pós-login | ≤ 2 000 ms | `perf.mark('shell.ready')` |
| Troca de módulo (cache quente) | ≤ 1 000 ms | `perf.mark('route.ready')` |
| Primeira lista operacional | ≤ 1 500 ms | `perf.mark('data.ready')` |
| Permissões carregadas | ≤ 500 ms | `perf.mark('perms.ready')` |
| Bundle inicial (sem módulos) | ≤ 350 KB gzip | `vite build --report` |

## Estratégia em 6 ondas

### Onda P1 — Instrumentação (base de medição)
- `src/lib/perf.ts`: helper `perfMark(label)`, `perfMeasure(from,to)`, ring buffer 200 entradas + `console.table` em dev.
- Eventos oficiais: `login.start`, `auth.ok`, `perms.ready`, `shell.ready`, `route.<id>.ready`, `data.<key>.ready`.
- Persistir P95 diário em tabela `perf_log` (id, evento, ms, rota, user_id, created_at) com RLS `admin` + insert via RPC `rpc_perf_log` (rate-limit por sessão). Sem PII.
- Painel `/paineis/performance` (admin) com P50/P95 dos últimos 7 dias por evento.

### Onda P2 — Login + Shell enxuto
- `login.tsx`: remover qualquer prefetch de módulos. Só auth + redirect.
- `__root.tsx` / shell: garantir que `MacroNav` e `Ribbon` não importem telas — só metadados de menu.
- `usePermissoes`: 1 única query, `staleTime: 5min`, `gcTime: 30min`. Eliminar duplicações detectadas.
- `SaudeSistema`, `DashboardReaisOverview`, `KpisOficiaisStrip`: **lazy + sob demanda** (não no boot). Carrega após `shell.ready` via `requestIdleCallback`.
- Auditoria de imports síncronos no shell: nenhuma rota de módulo pode estar no grafo do root.

### Onda P3 — Lazy loading de módulos
TanStack Start já suporta automatic code splitting. Validar/forçar:
- Remover qualquer `export function` em route files (quebra splitting — ver `tanstack-code-splitting`).
- Mover componentes pesados (`FinanceiroPage`, `ComercialPage`, `ContratosPage`, `ConfiguracoesPage`, `PaineisPage`, `EstoquePage`, `EngenhariaPage`) para `getRouteApi` + função interna não-exportada.
- Garantir que charts (`recharts`), editores e libs grandes só sejam importados dentro do componente da rota, nunca no shell.
- Conferir `vite build` → cada módulo vira chunk próprio.

### Onda P4 — React Query + paginação server-side
- Auditar todos os `useQuery` operacionais: aplicar `staleTime: 30s` mínimo, `gcTime: 5min`, `refetchOnWindowFocus: false` por padrão (override só onde necessário).
- Remover hooks duplicados (mesmo `queryKey` montado 2x).
- Aplicar `useServerPagination` + `ServerPaginationFooter` (D14.5) nos grids ainda em client-side: Títulos, Lançamentos, Movimentações, Contratos, Propostas, Estoque, Fornecedores, Clientes, Compras, Aprovações.
- Padrão: page 50, max 200, busca debounced 250ms, `count: 'exact'` só na primeira página.
- Proibir `.select('*')` sem `.limit()` (regra já no charter D15, reforçar nas telas).

### Onda P5 — Dashboard + saúde controlados
- `useSaudeSistema`: refresh manual + auto a cada **5 min** (era 2 min). `staleTime: 4min`.
- `useKpisOficiais`: idem 5min, `enabled` só quando aba visível (`document.visibilityState === 'visible'`).
- Zero polling no shell. Dashboard só monta na rota `/paineis/*`.

### Onda P6 — Supabase (queries, views, índices)
- Rodar `pg_stat_statements` top 20 e EXPLAIN ANALYZE nas 6 views oficiais `v_kpis_*_oficial`, `v_saude_sistema`, `v_lancamentos_derivados`, `v_titulos_enriquecido`, `v_adiantamentos_enriquecido`, `v_reconciliacao_*`.
- Criar índices faltantes (foco: filtros por `deleted_at IS NULL`, `created_at DESC`, `status`, `data_competencia`, `obra_id`, `cliente_id`).
- Trocar `select('*')` por colunas explícitas nas views/RPCs consumidas pela UI.
- Validar que nenhuma view oficial caiu de `security_invoker=on` (D14.2).
- Medir RPCs críticas (`rpc_lancamento_criar`, `rpc_titulos_totais`, `rpc_contrato_assinar`, etc.) com timing client + log servidor.

## Segurança (intocada)
- RLS, policies, audit triggers, `security_invoker=on`, `error_log`, `governance_matrix`, workflow flags, idempotência → **nada removido**.
- Cada otimização passa pelo linter Supabase. Baseline atual ~122 WARN (aceitos D14.2) — não pode subir por causa de performance.
- `perf_log` e `rpc_perf_log` seguem padrão D14: RLS admin, EXECUTE só authenticated, search_path explícito, sem PII.

## Entrega
1. `docs/d16-perf-relatorio.md`: gargalos identificados, antes/depois (ms), arquivos alterados, queries otimizadas, módulos lazy.
2. Painel `/paineis/performance` (admin) com gráfico P50/P95 7 dias.
3. Checklist de conformidade: RLS ok, linter estável, auditoria preservada.

## Sequência de execução
P1 (instrumentação) → P2 (login/shell) → mede baseline real → P3 (lazy) → mede → P4 (Query+paginação) → P5 (dashboard) → P6 (Supabase) → relatório final.

Cada onda commit isolado, com leitura do painel `/paineis/performance` antes/depois.

## Riscos
- Hooks duplicados podem estar em componentes muito acoplados → refator pode tocar várias telas; mitigado por flag `D16_PERF_*` quando o risco for alto.
- Mexer em `usePermissoes` afeta TODO o ERP → mudança apenas em cache, não em lógica de permissão.
- Lazy loading agressivo pode mostrar fallback chato → usar `pendingComponent` com skeleton do shell já carregado.

Confirma para eu começar pela Onda P1 (instrumentação + painel)?
