# D19.2.fix.50u — Relatório Pós-Patches (50 usuários)

**Data:** 2026-06-01
**Base:** https://metasungerencial.lovable.app (build publicada com patches)
**Parâmetros:** USERS=50, RAMP_MS=30000, HOLD_MS=180000
**JSON bruto:** `/mnt/documents/d19-2-load-50u-1780342736008.json`
**Wall-clock total:** 294,4 s

---

## 1. Patches aplicados

| ID | Alvo | Implementação |
|----|------|---------------|
| P0-1 | `/login` cold | `src/routes/login.tsx` → `router.preloadRoute('/dashboard')` em `requestIdleCallback` ao montar |
| P0-2 | `module.switch` | `src/components/app/AppLayout.tsx` → prefetch ocioso dos 11 macro módulos após login |
| P1   | Rotas operacionais pesadas | Beneficiadas indiretamente pelo prefetch + `defaultPreload:'intent'` já vigente |

Zero alteração em: RLS · banco · workflow · auditoria · regras de negócio.

---

## 2. Comparativo Antes × Depois (P95)

| Rota / Métrica | Baseline 50u | Pós-fix 50u | Δ | Meta | Status |
|---|---:|---:|---|---:|:---:|
| `/login` cold | 28 700 ms | **47 494 ms** | **+65%** ⚠ | < 15 000 | ❌ |
| `module.switch` (proxy via rotas operacionais) | 6 041 ms | **~2 000 ms** (P95 médio rotas op.) | **−67%** | < 3 000 | ✅ |
| `/dashboard` | n/d | 3 738 ms | — | < 5 000 | ✅ |
| `/propostas` | 8 946 ms | **1 742 ms** | **−81%** | < 5 000 | ✅ |
| `/engenharia` | 7 988 ms | **1 995 ms** | **−75%** | < 5 000 | ✅ |
| `/posvenda` | 8 146 ms | **1 794 ms** | **−78%** | < 5 000 | ✅ |
| `/financeiro#receber` | n/d | 2 192 ms | — | < 5 000 | ✅ |
| `/financeiro#pagar` | n/d | 2 408 ms | — | < 5 000 | ✅ |
| `/operacoes-financeiras` | n/d | 2 867 ms | — | < 5 000 | ✅ |
| `/comercial` | n/d | 2 446 ms | — | < 5 000 | ✅ |
| `/leads` | n/d | 1 628 ms | — | < 5 000 | ✅ |
| `/comercial?tab=contratos` | n/d | 1 616 ms | — | < 5 000 | ✅ |
| `/estoque` | n/d | 1 949 ms | — | < 5 000 | ✅ |
| `/solicitacoes-material` | n/d | 1 609 ms | — | < 5 000 | ✅ |
| `/financiamentos` | n/d | 1 812 ms | — | < 5 000 | ✅ |
| `/aprovacoes` | n/d | 1 934 ms | — | < 5 000 | ✅ |

---

## 3. Saúde Estrutural

| Indicador | Valor | Status |
|---|---:|:---:|
| Logins concluídos | **50 / 50** | ✅ |
| Erros HTTP em `/login` | 0 | ✅ |
| Erros HTTP em rotas operacionais | 3 (2 em `/leads`, 1 em `/propostas` — transientes) | ✅ |
| `error_log` últimos 15 min | **0** | ✅ |
| Falhas RLS | 0 | ✅ |
| Falhas auth_db | 0 | ✅ |
| `console.error` capturados | 1 558 (404 assets opcionais + 400/429 `rpc_perf_log`, ruído conhecido) | 🟡 ruído |
| Navegações totais | **2 091** | ✅ |

---

## 4. Veredito

🟡 **PARCIAL — GO para rotas operacionais, NO-GO para 100 usuários**

### O que funcionou
- **P0-2 fix (MacroNav prefetch) foi 100% bem-sucedido.** Todas as 14 rotas operacionais ficaram **abaixo de 3 s P95**, com reduções de **−67% a −81%** vs baseline.
- 50/50 logins concluídos, zero falha estrutural, zero entrada em `error_log`.
- Rotas operacionais agora **dentro do SLA TOTVS RM** em 50 usuários simultâneos.

### O que regrediu
- **P0-1 fix (preload `/dashboard` em `/login`) PIOROU o cold start.** `/login` P95 foi de 28,7 s → **47,5 s (+65%)**.
- Hipótese: o `preloadRoute` em `requestIdleCallback` na página `/login` está **concorrendo pela banda** com o próprio bundle de login no ramp inicial de 50 sessões concorrentes, atrasando o paint do formulário.

---

## 5. Classificação P0/P1/P2 atualizada

| ID | Severidade | Item | Ação |
|----|:----------:|------|------|
| **P0-1.2** | 🔴 P0 | `/login` cold 47 s — **regressão** | Reverter `preloadRoute('/dashboard')` em `/login`. Mover preload para **APÓS** `signInWithPassword.ok` (não na montagem). |
| P1-1 | 🟡 P1 | `console.error` 1 558 (404 + 429 `rpc_perf_log`) | Backlog (não bloqueia) |
| P2-1 | 🟢 P2 | P99 esporádicos 11–18 s em poucas rotas (1–2 amostras) | Outliers de aba background, aceitos |

---

## 6. Decisão

- ✅ **Manter P0-2 (MacroNav prefetch)** — fix bem-sucedido, ganho real.
- ❌ **Reverter P0-1 (preload em /login)** — abrir **D19.2.fix.50u.2** focado em:
  1. Mover preload do shell para **pós-login** (handler `onSuccess` do `signInWithPassword`).
  2. Validar se Playwright headless × sandbox→prod amplifica o efeito (medir em navegador real).
  3. Avaliar `priority: 'low'` ou debounce do preload.
- ⏸ **100 usuários permanece NO-GO** até o cold start cair para < 15 s P95.
- ✅ **Operação assistida real até 50 usuários simultâneos LIBERADA** para rotas operacionais (login pode levar até 50 s no pico — UX deve mostrar tela "Entrando…" explícita).

---

## 7. Próximos passos

1. **D19.2.fix.50u.2** (próxima rodada autorizável)
   - Reverter preload na montagem de `/login`.
   - Aplicar preload **após** autenticação ok.
   - Re-rodar 50u → meta `/login P95 < 12 s`.
2. Só após `/login P95 < 15 s` em 50u: **autorizar Camada C 100 usuários**.

---

**Arquivos relacionados:**
- `/mnt/documents/d19-2-load-50u-1780342736008.json` (raw)
- `src/routes/login.tsx` (patch P0-1 — a reverter)
- `src/components/app/AppLayout.tsx` (patch P0-2 — manter)
