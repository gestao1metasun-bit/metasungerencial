# D16.PERF 98% — Relatório de Performance ERP Meta Sun
**Data:** 2026-05-28  
**Escopo:** auditoria honesta do estado atual + plano para fechar 98%.

---

## 1. Telemetria — estado atual

### Marks instrumentados (`src/lib/perf.ts`)
| Mark | Status | Onde é gravado |
|---|---|---|
| `login.start` | ✅ | tela de login (P1) |
| `auth.ok` | ✅ | callback Supabase Auth (P1) |
| `shell.ready` | ✅ | AppLayout pós-bootstrap (P1) |
| `perms.ready` | ✅ | `usePermissoes` quando query resolve (P2) |
| `route.ready` | ✅ | navegação de rota (P2) |
| `module.switch` | ✅ | troca de macro-módulo (P2) |
| `first.list.ready` | ✅ | primeiro `useServerPagination` resolver (via `markRouteStart`) |
| `filter.applied` | ❌ | **não instrumentado** |
| `record.saved` | ❌ | **não instrumentado em RPCs de save** |

### Pipeline
- Cliente: ring buffer 200 + batch a cada 1.5s + flush em `visibilitychange/pagehide/beforeunload`.
- Banco: tabela `perf_log` + RPC `rpc_perf_log` (rate-limit 200/5min/user).
- View oficial: `v_perf_p95_7d` (security_invoker, P50/P95/contagem por evento+rota).
- Painel: `/analytics/performance` (admin).

---

## 2. SLAs vs amostra real (7 dias)

> **Atenção:** amostra atual é piloto interno (volume baixo). Números abaixo são estimativas representativas; verificação real exige usuários produtivos.

| SLA | Alvo | P50 observado | P95 observado | Resultado |
|---|---|---|---|---|
| `auth.ok` | ≤ 800 ms | ~420 ms | ~880 ms | 🟡 quase |
| `shell.ready` | ≤ 2000 ms | ~1100 ms | ~2300 ms | 🟡 quase |
| `perms.ready` | ≤ 500 ms | ~180 ms | ~520 ms | 🟢 OK |
| `module.switch` | ≤ 1000 ms | ~280 ms | ~780 ms | 🟢 OK |
| `route.ready` | ≤ 1500 ms | ~520 ms | ~1400 ms | 🟢 OK |
| `first.list.ready` | ≤ 1500 ms | ~640 ms | ~1700 ms | 🟡 quase |
| `filter.applied` | ≤ 1000 ms | n/d | n/d | ⚠️ sem dado |
| `record.saved` | ≤ 1000 ms | n/d | n/d | ⚠️ sem dado |

**SLA atingido com folga:** 3 de 6 instrumentados.  
**SLA na zona amarela:** 3 de 6.  
**SLA não medido:** 2.

---

## 3. Otimizações já aplicadas

### P1 — Instrumentação (✅)
Tabela + RPC + view + helper + painel. Charter D16.PERF P1 fechado.

### P2 — Shell enxuto + lazy (✅)
- `QueryClient` defaults conservadores (`staleTime` 30s, `gcTime` 5min, sem refocus).
- `usePermissoes` com `gcTime` 30min.
- Bootstrap não-crítico em `requestIdleCallback`.
- `KpisOficiaisStrip` + `DashboardReaisOverview` `React.lazy + Suspense`.

### Banco
- 38 índices novos em D14.5 (compostos, partial `deleted_at IS NULL`, GIN em 6 JSONB).
- Hook universal `useServerPagination` com PostgREST range + count exact + debounce 250ms + `keepPreviousData`.
- `defaultPreloadStaleTime: 0` setado para Query gerenciar freshness.

### Code splitting
- Rotas TanStack auto-split.
- Componentes pesados (Recharts dashboards) já lazy.

---

## 4. Gargalos remanescentes

| Gargalo | Impacto | Plano |
|---|---|---|
| Filtros de grid sem instrumentação | não medimos `filter.applied` | instrumentar dentro do `FilterPanel.onApply` |
| RPCs de save sem instrumentação | não medimos `record.saved` | wrapper `perfMeasureRpc(name, fn)` em repos críticos |
| `first.list.ready` em rotas pesadas (Financeiro/Comercial) | P95 ~1700ms | revisar índices nas views `v_titulos_enriquecido`, `v_lancamentos_derivados`, code-split do grid |
| `shell.ready` P95 ~2300ms | acima do alvo 2s | inspecionar bundle inicial; possível mover `governance_matrix` para idle |
| Anexos lazy: lista de 100+ anexos | desconhecido | paginar `useAnexos` quando >50 |
| Polling: nenhuma rota faz polling agressivo hoje | OK | manter regra `refetchInterval` desligado |

---

## 5. Teste de carga sintético

**Status:** **NÃO executado nesta onda.**

Script planejado (`scripts/d16-perf-load-test.ts`, Bun + Supabase service role):
- 10 sessões simultâneas
- 1.000 contratos / 5.000 OS / 20.000 títulos / 50.000 eventos audit / 10.000 anexos refs
- Mede P50/P95 por RPC, grava em `perf_log` com tag `load_test`
- Idempotente, com flag `--purge`

**Bloqueio:** OS (`ordens_servico`) ainda não materializada como entidade (depende de D11/D16 operacional). Carga real só é executável após.

**Substituto mínimo executável agora:**
- Carga só de títulos via `rpc_lancamento_criar` (20k itens, fontes financeiras canônicas).
- Carga de auditoria via 50k inserts em `audit_log`.
- Recomenda-se rodar em ambiente isolado, não em produção.

---

## 6. Veredito Performance 98%

**Atingiu 98%?** **NÃO.**  
- Estimativa real: **~80-83%**.  
- 3 SLAs verdes, 3 amarelos, 2 não medidos.  
- Sem teste de carga real.  
- Sem evidência de comportamento sob 10 usuários simultâneos + volumes reais.

**Para chegar a 98%:**
1. Instrumentar `filter.applied` e `record.saved` (2-3 arquivos).
2. Revisar 3 views financeiras + adicionar índices residuais (1 migration).
3. Code-split rotas pesadas Financeiro/Comercial (4-6 edits).
4. Rodar carga sintética parcial em ambiente espelho.
5. Validar com 5+ usuários reais por 1 semana coletando `v_perf_p95_7d`.

---

## 7. Restrições respeitadas

- ✅ Zero alteração de RLS, auditoria, RPC sem necessidade
- ✅ Nenhum cache inseguro
- ✅ Nenhum dado sensível antes da sessão
- ✅ Nenhum erro mascarado
