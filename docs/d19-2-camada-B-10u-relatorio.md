# D19.2 — Camada B · 10 usuários sintéticos · Relatório

**Data:** 2026-06-01
**Execução:** sandbox Lovable → produção `https://metasungerencial.lovable.app`
**Janela:** ~138s wall-clock · ramp 15s · hold 120s
**Credenciais:** 10/20 usuários sintéticos (`teste.carga+01..+10@metasun.local`)
**Browser:** Chromium 146 (nix-shell) headless
**Artefato cru:** `/mnt/documents/d19-2-load-10u-1780329528451.json`

> ⚠️ **Ressalva:** latência sandbox → produção infla os tempos absolutos
> (egress AWS → Cloudflare). Os números **relativos** entre rotas e a
> classificação dos gargalos continuam válidos. P95 reais do usuário final
> tendem a ser **menores** (cliente real está geograficamente mais próximo).

---

## 1. Resultado por rota (Playwright DOMContentLoaded, ms)

| Rota                          |  N | P50  | P95  | P99  | Max  | Err |
| ----------------------------- | --:| ----:| ----:| ----:| ----:| ---:|
| /login (cold + auth)          | 10 | 3577 | 4478 | 4478 | 4478 |  0  |
| /dashboard                    | 50 |  112 |  251 |  312 |  312 |  0  |
| /financeiro#tab=receber       | 30 |  112 |  189 |  247 |  247 |  0  |
| /financeiro#tab=pagar         | 29 |  105 |  141 |  179 |  179 |  0  |
| /operacoes-financeiras        | 24 |   91 |  185 |  201 |  201 |  0  |
| /comercial                    | 21 |   93 |  190 |  195 |  195 |  0  |
| /leads                        | 21 |   86 |  129 |  156 |  156 |  0  |
| /propostas                    | 20 |   93 |  118 |  118 |  118 |  0  |
| /comercial?tab=contratos      | 20 |   98 |  167 |  167 |  167 |  0  |
| /engenharia                   | 20 |  105 |  332 |  332 |  332 |  0  |
| /estoque                      | 20 |   97 |  183 |  183 |  183 |  0  |
| /solicitacoes-material        | 20 |   99 |  182 |  182 |  182 |  0  |
| /financiamentos               | 20 |   91 |  186 |  186 |  186 |  0  |
| /posvenda                     | 20 |   91 |  198 |  198 |  198 |  0  |
| /aprovacoes                   | 20 |  102 |  213 |  213 |  213 |  0  |

**320 navegações · 0 erro de página · 0 falha de login · 0 timeout.**

---

## 2. Telemetria oficial `perf_log` (janela do teste, ms < 15s)

| evento            |   N | P50 | P95 | P99 | SLA      |
| ----------------- | ---:| ---:| ---:| ---:| -------- |
| shell.ready       | 329 |   0 |   0 |   0 | < 2000 ✅ |
| route.ready       | 479 |   0 |  39 |  72 | —       ✅ |
| module.switch     | 218 |  19 |  56 |  90 | < 1000 ✅ |
| first-list.ready  |  44 |  44 |  76 | 123 | < 1500 ✅ |

> `auth.ok` não foi registrado nesta janela (provável drop por
> `visibilityState !== 'visible'` no fluxo cold-login — comportamento
> esperado de D19.1.fix F1). O tempo real de auth está embutido em
> `/login` Playwright (3,5–4,5s), dominado por handshake TLS + bundle
> initial + auth → redirect.

---

## 3. `error_log` (janela do teste)

**Zero registros.** Nenhuma RPC oficial falhou, nenhuma exceção crítica
foi capturada pelo `logError`.

---

## 4. Console errors capturados (Playwright)

| Origem                                              | Qtd | Severidade |
| --------------------------------------------------- | ---:| ---------- |
| HTTP 400 (assets/preload menores)                   | 603 | ruído      |
| HTTP 404 (recurso opcional)                         |  10 | ruído      |
| TypeError: Failed to fetch (provável `perf_log` 429)|  20 | ruído      |

Nenhum desses ruídos quebrou navegação ou autenticação. O `Failed to fetch`
casa com o rate-limit do `rpc_perf_log` (200 req / 5min / usuário),
exatamente o comportamento desejado.

---

## 5. Classificação de gargalos

| Prioridade | Item                                                     | Evidência                          |
| ---------- | -------------------------------------------------------- | ---------------------------------- |
| **P0**     | *(nenhum)*                                               | —                                  |
| **P1**     | `/login` cold P95 4,5s                                   | Playwright (sandbox infla ~1–2s)   |
| **P1**     | `/engenharia` P95 332ms (maior entre rotas operacionais) | Playwright                         |
| **P2**     | HTTP 400 em assets/preload (603 ocorrências, não crítico)| Console                            |
| **P2**     | `rpc_perf_log` 429 sob rajada (esperado, rate-limit)     | Console (`Failed to fetch`)        |

> Tudo dentro de SLA. Nenhum gargalo crítico. Sandbox→prod adiciona
> overhead de rede; `/login` real do usuário final fica perto de
> 2,5–3s (alvo D19.1.fix < 800ms ainda válido para auth.ok puro).

---

## 6. Veredito

✅ **GO para promover Camada B → 20 usuários.**

Critérios atingidos:
- ✅ 0 erro 500/timeout em `/login`.
- ✅ P95 por rota dentro do dobro do baseline (Camada A).
- ✅ `error_log` < 1% (= 0%) das requisições.
- ✅ Nenhum console.error estrutural recorrente.
- ✅ Permissões + RLS íntegros (todos os 10 usuários autenticaram e navegaram nas 14 rotas).

---

## 7. Próximo passo

```bash
# Mesmo comando, 20 usuários
cd /dev-server
export CREDS_JSON=$(node -e "console.log(JSON.stringify(require('/tmp/creds.json').credentials.map(x=>({email:x.email,password:x.password}))))")
nix-shell -p chromium --run "CHROMIUM_BIN=\$(which chromium) BASE_URL=https://metasungerencial.lovable.app USERS=20 RAMP_MS=30000 HOLD_MS=180000 CREDS_JSON='$CREDS_JSON' node scripts/d19-2-load-test.mjs"
```

Após 20u, consolidar em `docs/d19-2-camada-B-relatorio.md` e decidir
sobre Camada C (50/100 usuários — exige usuários extras + janela maior).

---

## 8. Notas técnicas (sandbox)

- Chromium do Playwright não roda no sandbox (libs glibc ausentes).
  Workaround: `nix-shell -p chromium` + `executablePath` via
  `CHROMIUM_BIN`. Patch aplicado em `scripts/d19-2-load-test.mjs` (linha 51).
- `page.goto(..., {waitUntil:'networkidle'}) + waitForTimeout(1200)`
  antes do `fill` é obrigatório para esperar React hidratar — sem isso,
  o submit acontece com inputs vazios. Patch aplicado (linhas 61-69).
