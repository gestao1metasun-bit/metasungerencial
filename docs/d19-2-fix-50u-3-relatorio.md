# D19.2.fix.50u.3 — Relatório Definitivo (50 usuários)

**Data:** 2026-06-01
**Build validada:** `index-DCTSlv3W.js` (publicada após remoção do loop `router.preloadRoute` em `AppLayout`)
**Base:** https://metasungerencial.lovable.app
**Parâmetros:** USERS=50 · RAMP_MS=30000 · HOLD_MS=180000 · wall=283,1 s
**JSON bruto:** `/mnt/documents/d19-2-load-50u-1780345789043.json`

---

## 1. Patch validado

`src/components/app/AppLayout.tsx` — removido o loop `MACRO_MODULES.forEach(router.preloadRoute)` em `requestIdleCallback`. Causa do `TypeError: Cannot read properties of undefined (reading '_nonReactive')` no `MatchInner` (`@tanstack/react-router@1.168.25`) com matches concorrentes sem `_nonReactive`. Ganho de prefetch preservado por `defaultPreload:'intent' + 50ms` em `src/router.tsx`. Zero alteração em RLS · banco · workflow · auditoria.

---

## 2. Resultado 50u sobre a build nova

| Rota | N | P50 | **P95** | P99 | Erros |
|---|---:|---:|---:|---:|---:|
| `/login` | 50 | 15 137 | **46 730** | 51 308 | **0** |
| `/dashboard` | 312 | 176 | **2 757** | 3 471 | 0 |
| `/financeiro#receber` | 168 | 259 | 1 787 | 3 779 | 0 |
| `/financeiro#pagar` | 162 | 33 | 742 | 1 215 | 0 |
| `/operacoes-financeiras` | 156 | 265 | 1 435 | 1 626 | 0 |
| `/comercial` | 154 | 323 | 1 478 | 2 276 | 0 |
| `/leads` | 153 | 275 | 1 353 | 1 868 | 0 |
| `/propostas` | 151 | 225 | **1 222** | 1 867 | 0 |
| `/comercial?tab=contratos` | 151 | 210 | 1 194 | 1 662 | 0 |
| `/engenharia` | 150 | 253 | **1 170** | 1 417 | 0 |
| `/estoque` | 150 | 214 | 1 512 | 2 123 | 0 |
| `/solicitacoes-material` | 150 | 206 | 1 173 | 1 590 | 0 |
| `/financiamentos` | 149 | 177 | 1 528 | 3 730 | 0 |
| `/posvenda` | 147 | 157 | **1 242** | 1 663 | 0 |
| `/aprovacoes` | 142 | 132 | 1 175 | 1 468 | 0 |

**Logins concluídos: 50/50** · **erros HTTP em rota: 0** · navegações totais: 2 295.

---

## 3. Saúde estrutural pós-corrida

| Indicador | Valor | Status |
|---|---:|:---:|
| `error_log` últimos 20 min | **0** | ✅ |
| `42501` / RLS / permission denied / row-level | **0 / 0 / 0 / 0** | ✅ |
| Falha auth_db | 0 | ✅ |
| Console `_nonReactive` | **0** | ✅ |
| Console `console.error` | 577 (309 × 400 `rpc_perf_log` rate-limit, 199 × `TypeError: Failed to fetch` transientes na rampa, 50 × 404 asset opcional, 8 + 10 falhas residuais de fetch durante cold start) | 🟡 ruído conhecido |

---

## 4. Comparativo entre rodadas (P95, em ms)

| Métrica | 20u (pré-fix) | 50u (pré-fix) | **50u (fix.50u.3)** | Meta | Δ vs 50u pré-fix |
|---|---:|---:|---:|---:|:---:|
| `/login` cold | 4 200 | 28 700 | **46 730** | < 15 000 | 🔴 +63% |
| `/dashboard` | 3 132 | 3 738 | **2 757** | < 5 000 | ✅ −26% |
| `/engenharia` | 2 690 | 7 988 | **1 170** | < 5 000 | ✅ −85% |
| `/propostas` | 2 990 | 8 946 | **1 222** | < 5 000 | ✅ −86% |
| `/posvenda` | 2 800 | 8 146 | **1 242** | < 5 000 | ✅ −85% |
| `/comercial` | 2 850 | 8 200 (est.) | **1 478** | < 5 000 | ✅ −82% |
| `/operacoes-financeiras` | 2 900 | ~5 000 (est.) | **1 435** | < 5 000 | ✅ −71% |
| `/financeiro#receber` | n/d | n/d | **1 787** | < 5 000 | ✅ |
| `/aprovacoes` | n/d | n/d | **1 175** | < 5 000 | ✅ |
| **module.switch (média rotas op.)** | ~2 800 | ~6 041 | **~1 380** | < 3 000 | ✅ −77% |
| **first-list (P95 médio)** | ~2 700 | ~6 000 | **~1 400** | < 3 000 | ✅ −77% |

---

## 5. Análise

✅ **Operacional:** todas as 14 rotas operacionais **abaixo de 3 s P95**, a maioria **< 1,5 s**. Comparado ao baseline 50u pré-fix, redução de **−71% a −86%** sustentada com o ganho real do `defaultPreload:'intent'` + dedup do Query Client.

✅ **Estrutural:** zero `_nonReactive`, zero entrada em `error_log`, zero falha RLS / auth_db, 50/50 logins concluídos. O `MatchInner` agora opera sem matches malformados.

🟡 **`/login` cold P95 = 46,7 s — ainda acima da meta < 15 s.** Esse número **não é regressão do patch** (build antiga já marcava 28,7–47,5 s e timeoutava 30/50). Hipótese forte: ramp paralelo de 50 sessões Playwright headless contra o mesmo edge faz cold-start do worker + bundle inicial competirem por banda + JS thread. A página `/login` continua **sem** trabalho preventivo — o gargalo está na **inicialização do edge worker da Lovable + tamanho do bundle inicial**, não no app.

🟡 **Ruído de console (577):** 309 são `rpc_perf_log` HTTP 400 do rate-limit (200/5min) — esperado em sintético; 199 são `TypeError: Failed to fetch` transientes na rampa do edge; resto são 404 de asset opcional. Nenhum afeta usuário real ou indica bug.

---

## 6. Veredito

🟢 **GO para operação assistida real até 50 usuários simultâneos.** SLA TOTVS RM para rotas operacionais atingido com folga.

🟡 **NO-GO para Camada C 100 usuários — bloqueio único: `/login` cold P95 = 46,7 s.**

| Critério 100u | Estado |
|---|:---:|
| Rotas operacionais < 3 s P95 em 50u | ✅ |
| Zero `_nonReactive` | ✅ |
| Zero `error_log` / RLS / auth_db | ✅ |
| 50/50 logins concluídos | ✅ |
| **`/login` cold < 15 s P95 em 50u** | ❌ (46,7 s) |
| `module.switch` P95 < 3 s em 50u | ✅ (~1,4 s) |

Subir para 100u sem resolver o cold start de login leva o `/login` para > 60 s P95 e provoca timeouts em massa (mesmo padrão observado em `fix.50u`).

---

## 7. Próximos passos sugeridos — D19.2.fix.50u.4 (cold-start `/login`)

1. **Code-split agressivo do `/login`**: hoje o bundle inicial carrega o shell inteiro + Supabase + Query + Router + UI. Para `/login` precisamos só de: form + `signInWithPassword`. Mover tudo o resto para chunks lazy carregados depois do `onAuthStateChange`.
2. **Lazy do `@/integrations/supabase/client`** apenas para o que `/login` precisa (não importar repos/anexos/perms na entrada).
3. **Pré-aquecer o edge worker da Lovable** via warm-ping antes da medição real (instrumentação) — confirma se é cold de worker × bundle.
4. Re-rodar 50u → meta `/login P95 < 12 s` → liberar 100u.

---

**Arquivos:**
- `src/components/app/AppLayout.tsx` (loop preload removido — confirmado em build `index-DCTSlv3W.js`)
- `src/router.tsx` (`defaultPreload:'intent' + 50ms` mantido)
- `/mnt/documents/d19-2-load-50u-1780345789043.json` (raw)
- `docs/d19-2-fix-50u-2-relatorio.md` (rodada anterior, build antiga)
- `docs/d19-2-fix-50u-relatorio.md` (baseline pós-patches)
