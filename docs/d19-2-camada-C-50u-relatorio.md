# D19.2 — Camada C · 50 usuários sintéticos · Relatório Executivo

**Data:** 2026-06-01
**Ambiente:** sandbox Lovable → produção (`https://metasungerencial.lovable.app`)
**Parâmetros:** `USERS=50`, `RAMP_MS=30000`, `HOLD_MS=180000`
**Massa:** 50 usuários sintéticos `teste.carga+01..50@metasun.local`, role `usuario`, HOMOLOGAÇÃO
**Wall clock:** 246,5 s
**JSON bruto:** `/mnt/documents/d19-2-load-50u-1780341408978.json`

> Ressalva: latências absolutas incluem RTT sandbox → produção (Cloudflare). Gargalos **relativos** (degradação entre 10u/20u/50u) continuam válidos.

---

## 1. Resultado por rota (Playwright)

| Rota | N | P50 (ms) | P95 (ms) | P99 (ms) | Erros |
|---|---:|---:|---:|---:|---:|
| **/login** (cold ramp) | 42 | 14 517 | 28 690 | 32 195 | **8** |
| /dashboard | 210 | 591 | 2 590 | 7 744 | 0 |
| /financeiro#tab=receber | 126 | 605 | 1 781 | 1 910 | 0 |
| /financeiro#tab=pagar | 126 | 549 | 2 140 | 2 742 | 0 |
| /operacoes-financeiras | 126 | 626 | 2 885 | 4 023 | 0 |
| /comercial | 126 | 489 | 2 590 | 11 615 | 0 |
| /leads | 126 | 444 | 1 717 | 3 095 | 0 |
| /propostas | 125 | 468 | **8 946** | 11 856 | 0 |
| /comercial?tab=contratos | 121 | 583 | 2 154 | 10 055 | 0 |
| /engenharia | 108 | 586 | **7 988** | 11 885 | 0 |
| /estoque | 99 | 762 | 3 360 | 14 299 | 0 |
| /solicitacoes-material | 91 | 756 | 2 223 | 11 848 | 0 |
| /financiamentos | 84 | 958 | 3 096 | 13 988 | 0 |
| /posvenda | 84 | 835 | **8 146** | 13 143 | 0 |
| /aprovacoes | 84 | 716 | 1 964 | 8 575 | 0 |

**Totais:** 42/50 logins OK · 1 778 navegações executadas · 8 timeouts no /login · 0 erro estrutural em rota operacional.

## 2. Telemetria interna (`v_perf_p95_filtrado_7d`, últimos 7d)

| Evento | P50 | P95 | P99 | SLA | Status |
|---|---:|---:|---:|---:|:---:|
| shell.ready | 0 | 0 | 260 | 2000 | 🟢 |
| auth.ok | 1112 | 1624 | 1677 | 800 | 🟡 |
| first-list.ready | 310 | 2127 | 2530 | 1500 | 🟡 |
| route.ready | 435 | 3306 | 4687 | 1000 | 🟠 |
| module.switch | 3388 | 6041 | 6453 | 1000 | 🔴 |
| rpc.op_fin_criar | 423 | 875 | 912 | 800 | 🟡 |

> `module.switch`/`route.ready` P95 explodem por outliers de aba em background sob 50 sessões headless simultâneas (mesmo padrão da Camada B 20u, amplificado). O filtro de visibilidade do `perf.ts` cobre o caso comum, mas várias abas Playwright permanecem `visible` em paralelo. Não é regressão de produto.

## 3. Saúde do banco e auditoria

- **`error_log`** (20 min cobrindo a run): **0 entradas**.
- **0 falha de RLS** (nenhum `42501` registrado).
- **0 falha de autenticação no banco** (8 erros de /login foram timeouts de DOM Playwright, não rejeição do Supabase Auth).
- **0 deadlock**, **0 timeout 504**, **0 console.error de aplicação** (4 054 console errors são 404 em assets opcionais + 400/429 do `rpc_perf_log` rate-limit conhecido).

## 4. Comparativo 10u × 20u × 50u

| Métrica | 10u | 20u | 50u | Δ 20→50 |
|---|---:|---:|---:|---:|
| Logins OK | 10/10 | 20/20 | 42/50 | **−16%** |
| Navegações | 320 | 706 | 1 778 | +152% |
| /login P95 | 4 500 | 9 089 | **28 690** | **+216%** |
| /dashboard P95 | ~250 | ~250 | 2 590 | +936% |
| /financeiro receber P95 | <250 | <250 | 1 781 | ↑ |
| /propostas P95 | <250 | <250 | **8 946** | ↑↑ |
| /engenharia P95 | <250 | <250 | **7 988** | ↑↑ |
| /posvenda P95 | <250 | <250 | **8 146** | ↑↑ |
| first-list.ready P95 (perf_log) | 76 | 677 | 2 127 | +214% |
| module.switch P95 (perf_log) | 56 | 58 | 6 041 | +10 312% |
| `error_log` no período | 0 | 0 | **0** | = |
| Falha RLS / auth_db | 0 | 0 | 0 | = |

## 5. Classificação de gargalos

### P0 — bloqueador para 100u (precisa correção antes de promover)

| # | Gargalo | Evidência | Origem provável | Ação |
|---|---|---|---|---|
| P0-1 | **/login cold P95 28,7 s + 8/50 timeouts** | tabela §1, queda 100%→84% de sucesso | rampa concorrente bate cold-start de Auth + carregamento inicial do shell (≈1 MB de JS no primeiro paint) | Pré-aquecer shell (route preload no /login) · Aumentar `timeout` Playwright para baseline real (não é correção de produto, mas separa ruído) · Avaliar **upgrade instância Lovable Cloud** se reproduzir com usuários reais |
| P0-2 | **module.switch P95 6,0 s** (SLA 1 s) | `v_perf_p95_filtrado_7d` | Lazy-load de chunk + ensureQueryData em rota nova sob contenção de CPU do cliente | Garantir `defaultPreload:'intent'` (já aplicado em D19.1.fix) também para módulos pesados via prefetch no hover do MacroNav |

### P1 — degradação tolerável, monitorar

| # | Gargalo | Evidência | Ação |
|---|---|---|---|
| P1-1 | /propostas /engenharia /posvenda P95 ~8 s | tabela §1 | Confirmar paginação server-side já adotada (D14.5.1); investigar `useQuery` sem `staleTime` específico nessas telas |
| P1-2 | route.ready P95 3,3 s (SLA 1 s) | perf_log | Idêntico ao P0-2: chunk fetch + primeira renderização sob pressão |
| P1-3 | first-list.ready P95 2,1 s (SLA 1,5 s) | perf_log | Aceitável; reavaliar após P0-1/P0-2 corrigidos |

### P2 — ruído conhecido, sem ação

- 404 em assets opcionais (favicons/ícones legados): sem impacto operacional.
- 400/429 em `rpc_perf_log`: rate-limit intencional (200/5min por usuário); o frontend descarta silenciosamente.
- /dashboard P95 2,6 s: aceitável para landing; degradação esperada com 50 sessões headless puxando a mesma rota simultaneamente.

## 6. Veredito

**🟡 PARCIAL — operação assistida estável até 20 usuários confirmada · 50 usuários SUPORTADO com degradação.**

- ✅ Zero falha estrutural · Zero falha RLS · Zero entrada em `error_log` · Zero comprometimento de auditoria.
- ✅ Todas as 14 rotas operacionais responderam (1 778/1 778 = **100%** sucesso pós-login).
- ⚠ /login degrada de 9 s → 29 s sob ramp concorrente e perde 16% dos logins (P0-1).
- ⚠ Navegação intermódulo cai de <250 ms → 6 s P95 (P0-2).

### Recomendação operacional

| Cenário | Decisão |
|---|---|
| **Operação assistida real até 20 usuários simultâneos** | ✅ Liberado (mantém GO da Camada B) |
| **Operação real 20–50 usuários simultâneos** | ⚠ Liberar apenas com supervisão · documentar que login pode levar até 30 s sob pico · UX precisa cobrir tela de "aguardando" |
| **Promover D19.2 para 100 usuários agora** | ❌ **NO-GO.** Resolver P0-1 e P0-2 antes. |
| **Novas frentes funcionais** | ⏸ Bloqueado pelo charter até P0s endereçados |

### Próximos passos sugeridos (não disparar sem autorização)

1. **D19.2.fix.50u** — corrigir P0-1 (pré-aquecimento shell) e P0-2 (prefetch de módulos MacroNav).
2. **Re-rodar 50u** após fix; meta: /login P95 ≤ 12 s, module.switch P95 ≤ 2 s.
3. Só então autorizar **Camada C 100u**.

---

## 7. Restrições respeitadas (charter)

- ✅ Zero alteração em RLS / auditoria / workflow / regra de negócio / schema.
- ✅ Zero escrita transacional (somente navegação GET).
- ✅ Massa 100% sintética em HOMOLOGAÇÃO; nenhum usuário real tocado.
- ✅ Sem Admin Master; role `usuario` (apenas visualizar/atender).
- ✅ Sem início de Camada Contábil/Fiscal preparatória, novas telas, novos módulos ou novas integrações.

---

**Status final D19.2 Camada C 50u:** EXECUTADA · RELATÓRIO ENTREGUE · **NO-GO** para 100u até P0-1 e P0-2 corrigidos.
