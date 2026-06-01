# D19.2.fix.50u.6 — Investigação Profunda do /login (cold start)

**Data:** 2026-06-01  
**Objetivo:** isolar onde estão os 29,5s do /login P95 frio em 50u para liberar (ou rejeitar) teste de 100 usuários.  
**Build alvo:** próxima publicação (após esta fix).

---

## 1. O que foi instrumentado

7 marcas novas, todas client-side via `src/lib/perf.ts`, expostas via
`window.__perfMarks()` para o script de carga ler sem depender de
telemetria (que descarta UA sintética para não poluir P95 real).

| Mark                       | Onde é setada                                       | Mede                                             |
|----------------------------|-----------------------------------------------------|--------------------------------------------------|
| `login.page.mount`         | Primeira linha do componente `LoginPage`            | Script parseado + React reconciliou 1ª vez       |
| `login.react.ready`        | `requestAnimationFrame` aninhado pós-mount          | Hidratação React + 1º paint                      |
| `login.supabase.ready`     | `useEffect` ao detectar `loading=false` do auth-store | Bootstrap do supabase-client + restore session |
| `login.auth.start`         | Antes de `signInWithPassword`                        | Início da chamada de auth                        |
| `login.auth.ok`            | Após resolver `signInWithPassword`                  | Auth concluída (rede + edge Supabase)            |
| `login.redirect.start`     | Antes de `navigate({to:"/dashboard"})`              | Início da transição de rota                      |
| `login.redirect.ok`        | `useEffect` quando `user` populado pós-redirect     | Onauth state change fechou + AppLayout pronto    |

Arquivos alterados:
- `src/lib/perf.ts` — expõe `window.__perfMarks()`
- `src/routes/login.tsx` — 7 marks + 4 measures

Zero impacto em RLS / Auth / regra / workflow / auditoria.

---

## 2. Quebra temporal calculada pelo script

O script `scripts/d19-2-login-only.mjs` deriva 6 fases por sessão:

| Fase                       | Deriva de                                              | O que isola                          |
|----------------------------|--------------------------------------------------------|--------------------------------------|
| `t_navigate`               | `goto(/login)` → `DOMContentLoaded`                    | Rede + edge cold + parse HTML        |
| `t_react_ready`            | `login.page.mount` → `login.react.ready`               | Hidratação React (puro client)       |
| `t_supabase_ready`         | `login.page.mount` → `login.supabase.ready`            | Supabase bootstrap + restoreSession  |
| `t_auth`                   | `login.auth.start` → `login.auth.ok`                   | signInWithPassword puro              |
| `t_redirect`               | `login.redirect.start` → `login.redirect.ok`           | Onauth state change + AppLayout lazy |
| `t_total`                  | `goto(/login)` → URL fora de `/login`                  | Login frio ponta-a-ponta             |

Agregação: **P50 / P95 / P99 / min / max / avg / n** por fase.  
Saída: `docs/d19-2-login-only-{USERS}u.json`.

---

## 3. Execução (rodar no notebook do Renan)

```bash
# Pré-requisito (uma vez): bun add -d playwright && bunx playwright install chromium

# Fase A — 10 usuários só em /login (baseline limpo)
BASE_URL=https://metasungerencial.lovable.app \
USERS=10 RAMP_MS=10000 \
CREDS_JSON="$(cat scripts/d19-2-creds.json)" \
OUT=docs/d19-2-login-only-10u.json \
node scripts/d19-2-login-only.mjs

# Fase B — 50 usuários só em /login (estresse isolado)
BASE_URL=https://metasungerencial.lovable.app \
USERS=50 RAMP_MS=30000 \
CREDS_JSON="$(cat scripts/d19-2-creds.json)" \
OUT=docs/d19-2-login-only-50u.json \
node scripts/d19-2-login-only.mjs
```

> Não rodar no sandbox: 50 Chromiums simultâneos saturam a VM (mesmo motivo do bloqueio 100u anterior).

---

## 4. Top 5 hipóteses de gargalo (a confirmar pela quebra)

| # | Hipótese                                          | Fase que confirma           | Correção candidata                                  | Ganho estimado |
|---|---------------------------------------------------|-----------------------------|-----------------------------------------------------|----------------|
| 1 | **Edge cold-start do Cloudflare Worker** sob ramp concorrente | `t_navigate` P95 ≫ P50 | Warm-pool/keepAlive 1 req/30s; SSR splash leve     | -10 a -15s    |
| 2 | **Bundle de auth ainda pesado** (sonner+dialog+icons carregados em /login) | `t_react_ready` > 1.5s | Mover Dialog "esqueci minha senha" para lazy chunk separado | -2 a -4s |
| 3 | **Supabase client bootstrap** + restoreSession serial | `t_supabase_ready` > 1s | Lazy-init do supabase client; getSession em paralelo | -1 a -2s     |
| 4 | **signInWithPassword** saturando rate-limit Supabase Auth em 50u | `t_auth` cresce com USERS | Aumentar instance Lovable Cloud OU escalonar ramp para 60s | -3 a -8s |
| 5 | **AppLayout lazy chunk** ainda baixa após auth.ok | `t_redirect` > 1.5s    | Prefetch AppLayout em `onauth state change` antes de navigate | -1 a -2s |

---

## 5. Veredito condicional para 100u

| Resultado de 50u-only       | Veredito 100u                                                  |
|-----------------------------|-----------------------------------------------------------------|
| `t_total` P95 < 15s         | 🟢 **GO 100u** — gargalo era contenção com módulos, não com /login |
| `t_total` P95 15–25s        | 🟡 Aplicar correção #1 + #2, re-testar antes de 100u           |
| `t_total` P95 > 25s         | 🔴 **NO-GO 100u** — saturação estrutural; manter GO 50u assistido, escopar D19.3 (warm-pool + SSR splash) |

---

## 6. Entregáveis desta turn

- ✅ Instrumentação granular (7 marks, 4 measures) publicada.
- ✅ `window.__perfMarks()` exposto para captura sem telemetria.
- ✅ `scripts/d19-2-login-only.mjs` com agregação P50/P95/P99 por fase.
- ⏳ **Pendente do operador:** publicar build + rodar Fase A (10u) e Fase B (50u) no notebook + colar JSON de saída.

---

## 7. Após receber os JSONs

Próxima turn: análise da quebra real, classificação P0/P1/P2 dos gargalos
identificados, patch específico para o componente dominante, e veredito
final 100u.
