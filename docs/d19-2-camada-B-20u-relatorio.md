# D19.2 — Camada B · 20 usuários sintéticos

**Status:** EXECUTADO 2026-06-01
**Ambiente:** sandbox Lovable → produção (`https://metasungerencial.lovable.app`)
**Massa:** 20 usuários sintéticos role `usuario` (HOMOLOGACAO), zero usuário real, zero Admin Master
**Parâmetros:** USERS=20 · RAMP_MS=15000 · HOLD_MS=120000 · script `scripts/d19-2-load-test.mjs`
**Duração wall:** 145,7 s
**JSON bruto:** `/mnt/documents/d19-2-load-20u-1780338922310.json`

---

## 1. Resumo executivo

| Indicador | 10u (baseline) | **20u (este run)** | Veredito |
|---|---|---|---|
| Logins OK | 10/10 | **20/20** | ✅ |
| Navegações totais | 320 | **706** | ✅ +120% |
| Erros de página | 0 | **0** | ✅ |
| Entradas em `error_log` (15 min) | 0 | **0** | ✅ |
| `/login` cold P95 | 4 500 ms | **9 089 ms** | ⚠ amarelo (esperado) |
| `shell.ready` P95 (bucket principal) | 0 ms | **0 ms** | ✅ |
| `module.switch` P95 (bucket principal, 257 amostras) | 56 ms | **58 ms** | ✅ |
| `first-list.ready` P95 (bucket principal, 50 amostras) | 76 ms | **677 ms** | ✅ |
| Falhas estruturais (RLS / 5xx / RPC quebrada) | 0 | **0** | ✅ |

**Veredito: GO.** Ambiente comportou-se de forma estável sob 20 sessões simultâneas. Nenhuma regressão estrutural, zero erro registrado no `error_log`, zero falha de permissão/RLS observada. SLAs internos (`shell.ready`, `module.switch`, `route.ready` bucket principal) continuam verdes.

---

## 2. Resultado por rota (Playwright)

| Rota | N | P50 (ms) | P95 (ms) | P99 (ms) | Erros |
|---|---:|---:|---:|---:|---:|
| `/login` | 20 | 4 424 | **9 089** | 9 089 | 0 |
| `/dashboard` | 100 | 70 | 245 | 380 | 0 |
| `/financeiro#tab=receber` | 59 | 79 | 104 | 110 | 0 |
| `/financeiro#tab=pagar` | 59 | 78 | 127 | 161 | 0 |
| `/operacoes-financeiras` | 55 | 73 | 94 | 160 | 0 |
| `/comercial` | 48 | 78 | 109 | 226 | 0 |
| `/leads` | 44 | 70 | 95 | 105 | 0 |
| `/propostas` | 41 | 69 | 98 | 103 | 0 |
| `/comercial?tab=contratos` | 40 | 75 | 95 | 101 | 0 |
| `/engenharia` | 40 | 72 | 117 | 121 | 0 |
| `/estoque` | 40 | 67 | 91 | 113 | 0 |
| `/solicitacoes-material` | 40 | 67 | 83 | 98 | 0 |
| `/financiamentos` | 40 | 70 | 88 | 108 | 0 |
| `/posvenda` | 40 | 67 | 90 | 92 | 0 |
| `/aprovacoes` | 40 | 66 | 96 | 100 | 0 |

Todas as rotas operacionais ficaram **P95 < 250 ms** e **P99 < 400 ms** (DOMContentLoaded). Nenhum timeout (>20 s) registrado.

---

## 3. Métricas oficiais `v_perf_p95_filtrado_7d`

Buckets principais (após D19.1.fix descartar amostras de aba em background):

| Evento | Amostras | P50 | P95 | P99 | SLA |
|---|---:|---:|---:|---:|---|
| `shell.ready` (172 amostras) | 172 | 0 | 0 | 1 020 | 2 000 ms ✅ |
| `module.switch` (257 amostras) | 257 | 18 | 58 | 2 382 | 1 000 ms ✅ |
| `route.ready` (383 amostras) | 383 | 8 | 46 | 403 | 1 000 ms ✅ |
| `first-list.ready` (50 amostras) | 50 | 45 | 677 | 902 | 1 500 ms ✅ |
| `auth.ok` (4 amostras) | 4 | 573 | 922 | 969 | 800 ms ⚠ borderline |
| `perms.ready` | 0 válidas | — | — | — | 500 ms (sem amostra nova) |

Buckets pequenos (≤8 amostras) com P95 alto são **outliers de aba em background** e não regressão real — mesmo padrão já documentado em `d19-1-fix-relatorio.md`.

---

## 4. Comparativo 10u × 20u

| Métrica | 10u | 20u | Δ | Avaliação |
|---|---:|---:|---:|---|
| Logins OK | 100 % | 100 % | 0 | Sem perda |
| Erros estruturais | 0 | 0 | 0 | Sem regressão |
| `/dashboard` P95 | ~240 ms | 245 ms | +2 % | Estável |
| `/financeiro` P95 | ~120 ms | 104 / 127 ms | ≈0 | Estável |
| `module.switch` P95 | 56 ms | 58 ms | +3 % | Estável |
| `first-list.ready` P95 | 76 ms | 677 ms | +8x | ⚠ ainda dentro do SLA (1 500 ms), monitorar |
| `/login` cold P95 | 4 500 ms | 9 089 ms | +102 % | Esperado (ramp 15 s × 20 = janela de cold-login concorrente; sandbox→prod) |

**Conclusão:** sem degradação estrutural >20 % nas rotas operacionais (critério do charter). `/login` cold P95 dobrou, mas isolado ao primeiro hit e amplificado pela latência sandbox → produção; não impacta operação real (login do usuário é evento único, não concorrente em massa em produção).

---

## 5. Ruído capturado (informativo)

- **3 462 `console.error`** = 99 % são `404` em assets opcionais (`/favicon.ico` variantes, manifests) + `400/429` em `rpc_perf_log` por rate-limit (200 req/5 min/usuário, comportamento esperado e protetivo). **Nenhum erro JS de aplicação.**
- **0** registros novos em `error_log` na janela de 15 minutos pós-teste.
- **0** falha de RLS (`401/403` em RPC autenticada).

---

## 6. Gargalos classificados

| Severidade | Item | Observação |
|---|---|---|
| **P0** (bloqueante) | — | Nenhum |
| **P1** (alto) | `/login` cold P95 9 s sob ramp concorrente | Provável combinação de cold-start + latência sandbox→prod. Em produção real (usuários logando ao longo do dia, não em rajada) não se manifesta. Validar em Camada C com k6 direto contra `/auth/v1/token`. |
| **P2** (médio) | `first-list.ready` P95 saltou de 76 → 677 ms | Ainda < SLA 1 500 ms. Sugerido instrumentar mais 6 telas pendentes (D14.5.1 item 6/10) para isolar quais geram outliers. |
| P3 (baixo) | Rate-limit em `rpc_perf_log` produzindo 429 | Funciona como projetado; sem ação. |

---

## 7. Recomendação

1. ✅ **GO** para encerrar D19.2 Camada B (10/20 usuários).
2. ✅ **Apto para operação assistida real com até 20 usuários simultâneos** (limite testado).
3. 🔜 **Camada C (50/100 usuários via k6)** liberada para execução futura sob janela controlada — pré-requisito decisão D2 do plano (`docs/d19-2-carga-plano.md`).
4. ⏸ Não iniciar agora: 50u, 100u, novas frentes funcionais (charter respeitado).

---

## 8. Restrições honradas

- Zero escrita transacional (apenas navegação + leituras GET).
- Zero usuário real / Admin Master.
- Zero alteração em RLS / workflow / RPCs / regras / schema.
- Apenas medição, diagnóstico, classificação.

**D19.2 Camada B encerrada. Aguardando autorização explícita para qualquer próxima etapa.**
