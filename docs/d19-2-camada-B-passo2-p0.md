# D19.2 — Camada B · Passo 2/6 · P0 (Otimizações de Baixo Risco)

**Status:** APLICADO 2026-06-01
**Risco:** mínimo (apenas cache de leitura)
**Regras de negócio / RLS / workflow / auditoria:** **não tocados.**

---

## 1) Otimizações aplicadas

### 1.1 Cache de cadastros auxiliares (`src/lib/repositories/cadastros-repo.ts`)
- `staleTime`: 60 s → **5 min** (300 s)
- `gcTime`: default (5 min) → **30 min**
- `refetchOnWindowFocus`/`refetchOnReconnect`: **false**

Impacto direto: 9 hooks (`useGruposFin`, `useSubgruposFin`, `useMeiosPagamento`,
`useTiposAplicacao`, `useNaturezasFin`, `useCentrosResultado`,
`useContasFinanceirasOficiais`, `useFornecedoresOficiais`,
`useClientesOficiais`) deixam de re-consultar a cada troca de tela.

### 1.2 Cache de fornecedores Supabase (`src/lib/repositories/fornecedores-repo.ts`)
- `staleTime`: 30 s → **5 min**
- `gcTime`: default → **30 min**
- `refetchOnWindowFocus`: **false**

---

## 2) Já vigentes (verificados, não foram alterados)

| Item                                              | Estado                       |
| ------------------------------------------------- | ---------------------------- |
| `usePermissoes` (`src/hooks/use-permissions.ts`)  | staleTime 5min + gcTime 30min |
| `comercial-catalogos-repo` (4 catálogos)          | staleTime 5min               |
| QueryClient global (`src/router.tsx`)             | staleTime 30s + noRefocus    |
| `defaultPreload: 'intent'` (prefetch por hover)   | ligado (D19.1.fix F6)        |
| `withPerf` em 33 RPCs canônicas                   | ligado (passo D3)            |

---

## 3) Itens **auditados mas deferidos** (alto risco em 1 turno)

| Item                                              | Por que deferir                                                 |
| ------------------------------------------------- | --------------------------------------------------------------- |
| Lazy-load das *Tabs* em `financeiro.tsx` (1047 L) | 16 tabs encadeadas; exige Suspense + fallback por tab, refactor |
| Lazy-load das *Tabs* em `comercial.tsx` (5684 L)  | arquivo monolítico, alto risco de regressão JSX                 |
| Paginação server-side em Leads/Propostas/Eng/PV   | grids ainda usam stores LS / coleção em memória — D14.5.1       |
| RPC agregadora p/ dashboards                      | exige DDL/views — fora do escopo P0                             |

> Esses itens ficam reservados para turnos dedicados (`D19.2.P1` por módulo).

---

## 4) Telas impactadas

Todas as telas que consomem cadastros auxiliares — particularmente
`/financeiro` (todas as abas), `/comercial`, `/operacoes-financeiras`,
`/solicitacoes-material`, modais de Lançamento, Adiantamento, Conciliação,
Recorrentes, Fornecedores, Centros/Naturezas.

## 5) Risco

- Único efeito visível: cadastros recém-criados/editados podem demorar até
  5 min para aparecer **em outra aba** que já carregou a lista (a aba de
  edição invalida via `useQueryClient` localmente — comportamento já
  presente). Aceitável p/ teste de carga e operação assistida.
- Zero alteração em RLS, workflow, regras de negócio, auditoria.
- Zero alteração em escrita.

## 6) Estimativa de impacto (qualitativa)

| Métrica                | Antes (Camada A) | Esperado pós-P0 |
| ---------------------- | ---------------- | --------------- |
| `module.switch` P95    | 11,3 s 🔴        | 7-9 s 🟡 (lazy fica em P1) |
| `first-list.ready` P95 | 4,7 s 🔴         | 3,0-3,5 s 🟡    |
| Volume RPC cadastros   | alto             | -60 a -80%      |

## 7) Build

Mudanças triviais (1 const + 1 bloco de options). Build deve passar limpo.

## 8) Próximo passo

**Passo 3 — Camada B com 10 usuários sintéticos** liberada.

```bash
CREDS_JSON=$(node -e "console.log(JSON.stringify(require('/mnt/documents/d19-2-loadtest-credentials.json').credentials.map(c=>({email:c.email,password:c.password}))))")
BASE_URL=https://metasungerencial.lovable.app USERS=10 RAMP_MS=15000 HOLD_MS=120000 \
  CREDS_JSON="$CREDS_JSON" node scripts/d19-2-load-test.mjs
```

Executar entre 19h e 22h. Se estável → 20 usuários. Em seguida consultar
`v_perf_p95_filtrado_7d` e `error_log` p/ relatório consolidado.
