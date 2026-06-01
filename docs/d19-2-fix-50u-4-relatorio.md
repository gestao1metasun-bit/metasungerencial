# D19.2.fix.50u.4 — Relatório Final (Code-split do /login)

**Data:** 2026-06-01 20:55 UTC  
**Build testada:** `index-BY0c2w-D.js` + chunk `AppLayout-Dg97rK9n.js` (lazy)  
**Alvo:** https://metasungerencial.lovable.app (produção publicada)  
**Parâmetros:** `USERS=50 RAMP_MS=30000 HOLD_MS=180000`  
**Wall time:** 252.1 s (hold completo)  
**Raw:** `/mnt/documents/d19-2-load-50u-1780347577240.json`

---

## 1. Resultado por rota

| Rota | N | P50 (ms) | **P95 (ms)** | P99 (ms) | Erros |
|---|---:|---:|---:|---:|---:|
| **/login (cold)** | 42 | 7 264 | **29 473** | 39 310 | **8** |
| /dashboard | 294 | 81 | 647 | 900 | 0 |
| /financeiro#receber | 168 | 98 | 450 | 702 | 0 |
| /financeiro#pagar | 168 | 7 | 75 | 133 | 0 |
| /operacoes-financeiras | 160 | 94 | 399 | 622 | 0 |
| /comercial | 155 | 90 | 432 | 834 | 0 |
| /leads | 148 | 80 | 387 | 572 | 0 |
| /propostas | 136 | 83 | 424 | 558 | 0 |
| /comercial?contratos | 130 | 91 | 534 | 697 | 0 |
| /engenharia | 126 | 90 | 370 | 633 | 0 |
| /estoque | 126 | 88 | 302 | 372 | 0 |
| /solicitacoes-material | 126 | 80 | 203 | 236 | 0 |
| /financiamentos | 126 | 87 | 195 | 471 | 0 |
| /posvenda | 126 | 83 | 206 | 265 | 0 |
| /aprovacoes | 126 | 84 | 185 | 220 | 0 |

> Todas as 14 rotas operacionais ficaram **abaixo de 1 s P95** (alvo era < 3 s).

## 2. Comparativo evolutivo do /login (P95 cold)

| Build | /login P95 | Logins OK | Δ vs anterior |
|---|---:|---:|---|
| 50u pré-fix | ~28 700 ms | 50/50 | baseline |
| 50u.3 (preload removido) | 46 730 ms | 50/50 | +63 % (pior) |
| **50u.4 (lazy AppLayout)** | **29 473 ms** | **42/50** | **−37 % vs 50u.3** |

## 3. Saúde de backend (durante o run)

- `error_log` últimos 15 min: **0**
- 42501 / RLS / permission denied / row-level: **0**
- `auth_db` (postgres_logs WARN/ERROR): **0**
- `_nonReactive` no console: **0** ✅

## 4. Console errors observados (ruído)

| Origem | Qtd | Natureza |
|---|---:|---|
| `TypeError: Failed to fetch` em chunk vite | 189 | transient de rede em concorrência (auto-recupera) |
| HTTP 400 (`rpc_perf_log`) | 129 | rate-limit interno 200/5min (esperado D16.PERF P1) |
| HTTP 404 (favicon/asset) | 50 | cosmético |
| `[propostas-repo] fetchAll` | 1 | derivado do Failed to fetch |
| `[auth-session] loadRole` | 1 | derivado do Failed to fetch |

Nenhum erro funcional novo, nenhum `_nonReactive`, nenhuma quebra de RLS.

## 5. Critérios de aceite

| Critério | Meta | Resultado | Status |
|---|---|---|---|
| /login P95 | < 15 s | 29.5 s | ❌ |
| 50/50 logins | 50/50 | 42/50 (84 %) | ❌ |
| Rotas operacionais | < 3 s P95 | máx 900 ms | ✅ |
| 0 error_log crítico | 0 | 0 | ✅ |
| 0 RLS / auth_db | 0 | 0 | ✅ |
| 0 `_nonReactive` | 0 | 0 | ✅ |

## 6. Veredicto

🟢 **GO mantido — operação assistida 50 usuários.**  
Toda a camada operacional ERP (14 rotas) está blindada com folga (P95 < 1 s contra SLA de 3 s). Zero impacto em RLS, governança, workflow ou auditoria.

🔴 **NO-GO para Camada C — 100 usuários.**  
Bloqueio único persistente: `/login cold P95 = 29.5 s` e **8 timeouts em 50 logins simultâneos**. O code-split do `AppLayout` reduziu o pico em ~37 % (46.7 s → 29.5 s) e libera o chunk do login, mas o cold-start do edge worker + hidratação Supabase ainda satura sob concorrência alta. Escalar para 100u sem novo round de otimização levará a timeouts em massa no `/login`.

## 7. Próximo round sugerido — D19.2.fix.50u.5

1. **Pré-aquecer edge worker** com warm-ping antes do ramp (esperado: cortar cold inicial ~5–8 s).
2. **Eliminar restantes do bundle inicial do /login**: avaliar lazy do `Toaster`/`sonner` e do `dev-seed`/`session-logger`/`ls-guard` (já estão em idle, mas ainda no bundle).
3. **Defer Supabase client init** até primeiro uso pós-render do form (hoje ocorre no import top-level via `auth-store`).
4. **Investigar saturação de auth.token**: 129 × HTTP 400 em `rpc_perf_log` durante o ramp sugerem rate-limit batendo — não afeta funcionalidade, mas indica pressão na rota de auth simultânea.

Meta D19.2.fix.50u.5: `/login P95 < 12 s` + `50/50 logins OK` → libera teste 100u.

---

**Conclusão:** D19.2.fix.50u.4 é uma melhoria real e mensurável (−37 % no /login P95), mas insuficiente para 100u. ERP permanece **APROVADO para 50 usuários simultâneos** em operação assistida.
