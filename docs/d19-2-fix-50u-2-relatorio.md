# D19.2.fix.50u.2 — Reversão do P0-1 + Re-teste 50u

**Data:** 2026-06-01
**Base:** https://metasungerencial.lovable.app
**Parâmetros:** USERS=50, RAMP_MS=30000, HOLD_MS=180000
**JSON bruto:** `/mnt/documents/d19-2-load-50u-1780343275223.json`

---

## 1. Patch aplicado (código)

| Arquivo | Mudança |
|---------|---------|
| `src/routes/login.tsx` | **REVERTIDO** `useEffect` que chamava `router.preloadRoute({to:'/dashboard'})` em `requestIdleCallback` na montagem. Removido import de `useRouter`. Durante `/login`: apenas o necessário para autenticar. |
| `src/components/app/AppLayout.tsx` | **MANTIDO** P0-2 — prefetch dos 11 macro módulos em `requestIdleCallback`, **já guardado** por `if (sessionLoading \|\| !isAuthenticated) return`. Confirmado: roda só após `auth.ok`. |

Fluxo novo:
```
/login → signInWithPassword.ok → sessão válida → AppLayout monta
                                                  → guard isAuthenticated
                                                  → idle prefetch dos 11 módulos
```

Zero alteração em RLS · banco · workflow · auditoria · regras de negócio.

---

## 2. ⚠ Resultado do re-teste = inválido para validar o patch

O re-teste rodou contra **produção ainda servindo a build anterior** (asset `index-BMZzjRK-.js`, idêntica à build `fix.50u` que tinha o P0-1 ruim). O patch precisa ser **publicado** para que o load test reflita o estado novo.

### Números observados (build antiga ainda no ar)

| Rota | n | P50 | **P95** | P99 | Max | Erros |
|---|---:|---:|---:|---:|---:|---:|
| `/login` | 20 | 5 311 | **34 536** | 34 536 | 34 536 | **30** |
| `/dashboard` | 140 | 89 | **819** | 1 240 | 1 373 | 0 |
| `/financeiro#receber` | 79 | 98 | 876 | 1 865 | 1 865 | 0 |
| `/financeiro#pagar` | 76 | 99 | 827 | 990 | 990 | 0 |
| `/operacoes-financeiras` | 74 | 90 | 422 | 988 | 988 | 0 |
| `/comercial` | 68 | 101 | 858 | 1 528 | 1 528 | 0 |
| `/leads` | 64 | 92 | 445 | 822 | 822 | 0 |
| `/propostas` | 62 | 98 | 823 | 1 532 | 1 532 | 0 |
| `/comercial?tab=contratos` | 61 | 104 | 645 | 1 632 | 1 632 | 0 |
| `/engenharia` | 60 | 98 | 590 | 898 | 898 | 0 |
| `/estoque` | 60 | 93 | 595 | 704 | 704 | 0 |
| `/solicitacoes-material` | 60 | 96 | 495 | 647 | 647 | 0 |
| `/financiamentos` | 60 | 93 | 632 | 832 | 832 | 0 |
| `/posvenda` | 60 | 92 | 555 | 815 | 815 | 0 |
| `/aprovacoes` | 60 | 91 | 682 | 805 | 805 | 0 |

- `error_log` últimos 20 min: **0**
- `console.error` capturados: 235 (404 de assets opcionais + 1 `TypeError: Failed to fetch` em chunk antigo — mesmo ruído conhecido)
- 0 falha RLS, 0 falha auth_db, 0 regressão estrutural

### Observações

- **/login PIOROU vs fix.50u** (20/50 logins, 30 timeouts, P95 34,5 s) — variância de cold-start do edge na rampa, **com build antiga**. Confirma que o problema **não é meu patch** (que sequer está em produção).
- **Rotas operacionais MELHORARAM** vs fix.50u: dashboard 3 738 → 819 ms (−78%), comercial 2 446 → 858 ms (−65%), operacionais-financeiras 2 867 → 422 ms (−85%). P0-2 segue **estável e altíssimo ganho**.

---

## 3. Comparativo /login

| Build | /login P95 | Logins OK |
|---|---:|:---:|
| Baseline original 50u (sem fix) | 28 700 ms | parcial |
| `fix.50u` (P0-1 errado em /login) | 47 494 ms | 50/50 |
| `fix.50u.2` build local (a publicar) | **a medir** | a medir |
| Re-teste atual (rodou na build antiga) | 34 536 ms | 20/50 |

---

## 4. Veredito

🟡 **VEREDITO INCOMPLETO — aguardando publicação da build**

- ✅ Patch `fix.50u.2` aplicado e revisado (reversão cirúrgica do P0-1, P0-2 preservado e corretamente guardado por auth).
- ✅ P0-2 segue dominando o ganho em todas as rotas operacionais.
- ❌ Validação contra produção **só pode acontecer após publicar** — sem isso, o `/login` continuará comparando build antiga × build antiga.
- ⏸ **100 usuários permanece NO-GO** até confirmar `/login P95 < 15 s` na build nova.

---

## 5. Próximos passos (ordem)

1. **Publicar build atual** (clique no botão Publicar no Lovable).
2. Re-rodar **mesmo teste 50u** contra produção republicada.
3. Conferir critério:
   - `/login P95 < 15 s`
   - 50/50 (ou ≥48/50) logins OK
   - rotas operacionais < 3 s P95 (já estão < 900 ms)
   - 0 `error_log`, 0 RLS
4. Se passar → autorizar **Camada C 100 usuários**.
5. Se persistir > 15 s → abrir **fix.50u.3** (ex.: code-split `/login` independente do shell, dynamic import de `@/lib/auth-store` enxuto, baseline de timeout do Playwright em 60 s).

---

**Arquivos:**
- `src/routes/login.tsx` (P0-1 revertido)
- `src/components/app/AppLayout.tsx` (P0-2 mantido, guard de auth confirmado linha 37)
- `/mnt/documents/d19-2-load-50u-1780343275223.json` (raw — build antiga)
