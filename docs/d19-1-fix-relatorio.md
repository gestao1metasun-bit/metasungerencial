# D19.1.fix — Correção de Performance e Telemetria

**Wave:** D19.1.fix (correção pós-diagnóstico D19.1)
**Data:** 2026-05-29
**Pré-requisito atendido para:** D19.2 (Teste de Carga)

---

## 1. Escopo aplicado

| ID | Item | Status | Onde |
|----|------|--------|------|
| F1 | Descarte de medições com `visibilityState !== 'visible'` | ✅ aplicado | `src/lib/perf.ts` (`enqueue`) |
| F2 | Métrica `p95_filtrado` / `p99_filtrado` (drop >15s) | ✅ aplicado | migração `20260529160000_d19_1_fix_perf_filtrada.sql` + drop client-side em `enqueue` |
| F3 | Boot de autenticação paralelo / sem round-trips redundantes | ✅ aplicado | `src/lib/auth-store.ts` (`signInEmail`) |
| F4 | Conclusão D14.5.1 (server pagination universal) | 🟡 auditoria + plano | 6 telas restantes, documentadas abaixo |
| F5 | Instrumentação de RPCs críticas | ✅ helper + 1 RPC | `withPerf()` em `perf.ts` + `lancamentos-repo.criar` |
| F6 | Prefetch ao hover | ✅ aplicado | `src/router.tsx` (`defaultPreload: 'intent'`) |

---

## 2. F1 + F2 — Telemetria saneada

### Mudança em `src/lib/perf.ts`
`enqueue()` agora descarta antes de enviar:
1. Eventos registrados quando `document.visibilityState !== 'visible'`.
2. Eventos com `ms > 15.000` (outlier hard).

Ambos continuam no **ring buffer local** com prefixo `[skip:hidden]` / `[skip:outlier]` para `window.__perfRing()` (debug em DEV), mas **não vão para o banco**.

### Nova view oficial — `v_perf_p95_filtrado_7d`
```sql
SELECT evento, rota,
       amostras, amostras_validas, amostras_outlier,
       p50_ms, p95_ms,                       -- brutos (compat)
       p50_filtrado, p95_filtrado, p99_filtrado,
       max_filtrado, max_ms
FROM v_perf_p95_filtrado_7d;
```
Filtro `ms <= 15000` em todas as métricas `*_filtrado`.
RLS: `GRANT SELECT TO authenticated` (mesmo padrão de `perf_log`).

**Resultado:** os P95 de 44s/96s/139s observados em D19.1 deixam de aparecer (eram outliers de aba aberta e ociosa).

---

## 3. F3 — auth.ok: 2400ms → alvo <800ms

### Antes
```
signInWithPassword()   ~700ms
  └─ validateActiveSession()
       ├─ getUser()      ~400ms  ┐ paralelos
       └─ getSession()   ~400ms  ┘
       └─ loadRole()     ~250ms
  └─ navigate('/dashboard')
TOTAL: ~1.6-2.4s
```

### Depois (`src/lib/auth-store.ts`)
```
signInWithPassword()   ~700ms
  └─ aplica session+user IMEDIATAMENTE (são entregues validados pelo Auth)
  └─ loadRole() em background (não bloqueia)
  └─ navigate('/dashboard')
TOTAL esperado: ~700-800ms
```

**Raciocínio de segurança:**
- `signInWithPassword` já retorna sessão validada pelo Supabase Auth (JWT assinado server-side); chamar `getUser()` imediatamente depois é redundante.
- `validateActiveSession` continua sendo chamada em `refresh()` (hard reload) e em `onAuthStateChange` (TOKEN_REFRESHED, SIGNED_IN externo), preservando a re-validação em todos os outros caminhos.
- Papel (`role`) carrega em paralelo; até resolver, `useIsAdmin()` retorna `false` (fail-closed). RLS continua sendo a verdade final no banco.

---

## 4. F4 — D14.5.1 (server pagination) — Auditoria + plano

Inventário atual dos grids principais:

| Tela | Componente | useServerPagination? |
|------|------------|----------------------|
| Financeiro / Títulos | TitulosTabSupabase | ✅ |
| Financeiro / Adiantamentos | AdiantamentosTabSupabase | ✅ |
| Financeiro / Lançamentos | LancamentosTabSupabase | ✅ |
| Estoque / Itens | EstoquePage | ✅ |
| Compras / Solicitações | SolicitacoesPage | ✅ |
| Comercial / Leads | LeadsPage | ❌ pendente |
| Comercial / Propostas | PropostasPage | ❌ pendente |
| Comercial / Contratos | ContratoAssinadoTab | ❌ pendente |
| Engenharia / Obras | EngenhariaPage | ❌ pendente (paginação local) |
| Pós-venda / Tickets | PosVendaPage | ❌ pendente |
| Aprovações | AprovacoesPage | ❌ pendente (lista curta, baixa prioridade) |

Esforço estimado de migração: **~6h** para Leads/Propostas/Contratos/Obras/PosVenda (1 PR por tela com `useServerPagination` + `ServerPaginationFooter`). Recomendado entregar como **D19.1.fix.b** antes de D19.2 — hoje a massa é homologação (pouquíssimos registros), então o gargalo só aparecerá no teste de carga real.

---

## 5. F5 — RPCs instrumentadas

Novo helper em `src/lib/perf.ts`:
```ts
export async function withPerf<T>(label: string, fn: () => Promise<T>): Promise<T>
```
- Mede tempo total client-side da Promise (rede + execução server).
- Sempre reporta como `rpc.<nome>` mesmo em erro (`finally`).
- Aplica os mesmos filtros F1/F2.

**Aplicado em:** `lancamentos-repo.criar` → reporta `rpc.lancamento_criar`.

**Próximas RPCs a envolver** (D19.2 dependência):
- `rpc_titulos_totais` (hooks de KPIs financeiros)
- `has_role` / `has_permission` (paths de permissão)
- `rpc_idempotente_check` / `rpc_idempotente_commit` (todos os fluxos críticos)
- `rpc_contrato_assinar`, `rpc_proposta_solicitar_revisao`, `rpc_op_fin_criar`

Para evitar ruído neste fix, apenas `rpc.lancamento_criar` foi ligada — o helper está pronto para os demais call sites (1 linha cada).

---

## 6. F6 — Prefetch inteligente

`src/router.tsx`:
```ts
createRouter({
  defaultPreload: 'intent',     // hover/focus em <Link>
  defaultPreloadDelay: 50,      // ms de hover antes do prefetch
  defaultPreloadStaleTime: 0,   // mantido (React Query controla cache)
})
```

Efeito: ao passar o mouse 50ms sobre qualquer `<Link>` do MacroNav/Ribbon, o TanStack Router pré-carrega o code-chunk da rota destino. Troca de módulo percebida cai drasticamente sem nenhum custo extra de fetch (React Query continua sendo a verdade de dados; o que muda é o JS chunk).

---

## 7. Critério de aceite

| Métrica | Antes (D19.1) | Alvo D19.1.fix | Status esperado |
|---------|---------------|----------------|------------------|
| `auth.ok` P95 | 2400 ms | < 800 ms | ✅ via F3 |
| `module.switch` P95 filtrado | 139 872 ms | < 1000 ms | ✅ via F1+F2+F6 |
| `route.ready` P95 filtrado | 44 256 ms | < 1000 ms | ✅ via F1+F2 |
| `perms.ready` P95 filtrado | 96 547 ms | < 500 ms | ✅ via F1+F2 |
| `first-list.ready` P95 filtrado | 5 759 ms | < 1500 ms | 🟡 depende de F4.b (server pagination Comercial/Eng/Pós) |
| Telemetria confiável p/ D19.2 | ⚠️ contaminada | ✅ saneada | ✅ |

**Performance global:** ~85% → projeção **~92-94%**.
Faltam **F4.b** (6 telas restantes) para chegar a 95%.

---

## 8. Restrições reafirmadas

- Zero alteração em RLS, Workflow, Auditoria, Regras Operacionais.
- Nenhuma RPC ou trigger novo.
- Sem alteração em `perf_log` (estrutura), sem alteração em `rpc_perf_log`.
- View nova é additive (`v_perf_p95_filtrado_7d`); a view legada `v_perf_p95_7d` continua intacta.

---

## 9. Validação proposta antes de D19.2

1. Login real → conferir que `auth.ok` cai abaixo de 800ms em `v_perf_p95_filtrado_7d`.
2. Abrir 3-4 abas e deixar ociosas por 5min → conferir que nenhum P95 explode.
3. Hover sobre Links do MacroNav → conferir prefetch no DevTools (Network).
4. Criar 1 lançamento via TitulosTab → conferir entrada `rpc.lancamento_criar` no painel.
5. Se OK → liberar **D19.2 — Teste de Carga**.
