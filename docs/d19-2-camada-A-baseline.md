# D19.2 — Camada A · Baseline Real (perf_log + error_log)

**Data:** 2026-06-01
**Janela:** últimos 7 dias
**Fonte:** `perf_log` (telemetria client-side D16.PERF) + `error_log` (D15.1 F1)
**Usuários distintos no período:** **1** (`a24db3c5…b591`) — tráfego natural, sem carga sintética
**Risco/impacto:** zero — leitura puramente analítica, nenhuma alteração de banco/RLS/RPC.

---

## 1. P50 / P95 / P99 por evento

### 1.A — Bruto (inclui outliers de abas ociosas)

| Evento | Amostras | P50 | P95 | P99 | Max | SLA D16 |
|---|---:|---:|---:|---:|---:|---:|
| route.ready | 307 | 0 ms | 8 340 | 84 989 | 198 793 | 1 000 |
| shell.ready | 212 | 0 ms | 0 | 7 634 | 10 746 | 2 000 |
| module.switch | 104 | 1 404 | 44 256 | 175 487 | 198 793 | 1 000 |
| first-list.ready | 67 | 232 | 4 709 | 6 178 | 6 676 | 1 500 |
| auth.ok | 5 | 587 | 2 100 | 2 340 | 2 400 | 800 |
| rpc.op_fin_criar | 5 | 423 | 875 | 912 | 921 | 800 |
| perms.ready | 1 | 96 547 | 96 547 | 96 547 | 96 547 | 500 |

### 1.B — Filtrado (ms ≤ 15 000, conforme D19.1.fix F2)

| Evento | Amostras válidas | P95 filtrado | SLA | Status |
|---|---:|---:|---:|:---:|
| module.switch | 95 | **11 263** | 1 000 | 🔴 |
| first-list.ready | 67 | **4 709** | 1 500 | 🔴 |
| route.ready | 298 | **4 051** | 1 000 | 🟡 |
| auth.ok | 5 | **2 100** | 800 | 🟡 (D19.1.fix esperado em ~800 — amostra antiga pré-fix) |
| rpc.op_fin_criar | 5 | **875** | 800 | 🟡 borderline |
| shell.ready | 212 | **0** | 2 000 | 🟢 |

**Leitura honesta:** mesmo após filtro de outlier, `module.switch` e `first-list.ready` continuam quebrados estruturalmente — é regressão real, não ruído. `auth.ok` 2 100 ms é amostra capturada antes do D19.1.fix entrar em vigor (boot paralelo); refazer medição pós-fix.

---

## 2. P50/P95/P99 por rota (filtrado em 1.B é mais confiável; abaixo é bruto)

| Rota | Amostras | P50 | P95 | P99 |
|---|---:|---:|---:|---:|
| /dashboard | 253 | 0 | 905 | 6 976 |
| /financeiro | 149 | 386 | 5 097 | 64 563 |
| /comercial | 77 | 0 | **95 887** | 198 793 |
| /operacoes-financeiras | 76 | 0 | 2 454 | 5 756 |
| /posvenda | 58 | 0 | 908 | 1 893 |
| /financiamentos | 22 | 2 164 | 37 193 | 38 398 |
| /cadastros | 12 | 430 | 3 696 | 3 696 |
| /configuracoes | 11 | 991 | **91 070** | 95 452 |
| /engenharia | 6 | 397 | 12 171 | 12 171 |
| /estoque | 3 | 12 578 | 12 578 | 12 578 |
| /login | 6 | 242 | 580 | 586 |
| /solicitacoes-material | 4 | 692 | 964 | 964 |
| /analytics | 4 | 6 464 | 9 177 | 9 177 |
| /aprovacoes | 2 | 620 | 620 | 620 |

**Observações:**
- Rotas com P95 > 30 s (`/comercial`, `/configuracoes`, `/financiamentos`) são quase certamente **abas em background** — `module.switch` mede tempo desde clique até render, e aba oculta pausa rAF.
- O filtro de visibilidade do D19.1.fix F1 só cobre eventos NOVOS; o histórico inclui medições contaminadas.
- Rotas com P95 < 1 500 ms (`/dashboard`, `/posvenda`, `/login`, `/aprovacoes`, `/solicitacoes-material`) confirmam que o shell base está saudável.

---

## 3. RPCs instrumentadas (withPerf)

| RPC | Amostras | P50 | P95 | SLA |
|---|---:|---:|---:|---:|
| rpc.op_fin_criar | 5 | 423 | 875 | 800 🟡 |

**Lacuna crítica:** apenas **1 RPC** está instrumentada (`rpc_lancamento_criar` via `lancamentos-repo`, e essa nem aparece — não foi exercitada). RPCs canônicas pendentes de `withPerf`:
- `rpc_titulos_totais`, `rpc_proposta_*`, `rpc_contrato_assinar`, `rpc_idempotente_*`, `has_role`, `rpc_op_fin_aprovar/liberar/renegociar/cancelar`, todas as `rpc_governance_*`.

Sem isso, a Camada B não vai conseguir atribuir gargalo a banco vs. rede vs. UI.

---

## 4. Erros (error_log)

| Métrica | Valor |
|---|---:|
| Total de erros nos últimos 7 dias | **0** |
| Erros críticos | 0 |
| Erros não resolvidos | 0 |

**Leitura:** zero erros estruturais reportados. Pode significar (a) nada quebrou, ou (b) `logError` ainda não é chamado em todos os caminhos. Combinar com auditoria de adoção em D17.UI.4b.

---

## 5. Limitações desta camada

| # | Limitação | Impacto |
|---|---|---|
| L1 | Amostra de **1 usuário** | Não há concorrência medida; P95 é "P95 dele" |
| L2 | Histórico inclui medições pré-D19.1.fix | P95 bruto inflado por outliers de visibilidade |
| L3 | Cobertura `withPerf` em ~5% das RPCs | Cega para gargalos de banco |
| L4 | `error_log` ainda subutilizado | Não validar SLA de erro <1% só por essa fonte |
| L5 | `perf_log` não captura tempo de DB isoladamente | Camada C (k6 contra PostgREST) é obrigatória para isso |

---

## 6. Gargalos priorizados (saída desta camada)

| Prio | Gargalo | Evidência | Ação proposta |
|---|---|---|---|
| **P0** | `module.switch` P95 filtrado 11,3 s | Item 1.B | Investigar bundle de `/comercial`, `/financiamentos`, `/configuracoes` — provável carga síncrona de stores legadas; aplicar `React.lazy` faltante. |
| **P0** | `first-list.ready` P95 4,7 s | Item 1.B | Auditar 6 telas pendentes do D14.5.1 (server pagination). Hoje algumas grids ainda fazem `.select('*')` sem range. |
| **P1** | `route.ready` P95 4,0 s | Item 1.B | Mesma raiz de P0; prefetch `defaultPreload:'intent'` (D19.1.fix F6) já mitiga primeira navegação, falta segunda. |
| **P1** | `auth.ok` 2,1 s | Item 1.B | Reamostrar pós-D19.1.fix antes de agir; provável que já esteja em ~800 ms. |
| **P2** | RPCs sem `withPerf` | Item 3 | Aplicar wrapper em 8 RPCs críticas (sem alterar comportamento). |
| **P2** | `/configuracoes` P95 91 s, `/comercial` P95 95 s, `/estoque` P50 12,5 s | Item 2 | Confirmar se some após L2 (medições novas pós-fix). Se persistir, profilar render. |
| **P3** | `error_log` ainda baixo | Item 4 | Garantir cobertura mínima em handlers de mutação. |

---

## 7. Recomendação oficial — passagem para Camada B

**GO condicional.** Antes de subir Playwright com 10/20 usuários sintéticos contra produção, é mais barato resolver primeiro a higiene da telemetria — caso contrário a Camada B vai medir os mesmos artefatos que já mascararam a Camada A:

| Pré-requisito | Justificativa | Esforço |
|---|---|---|
| **PR1** — Esperar 48 h de tráfego pós-D19.1.fix e re-extrair baseline 1.B | Confirma se `auth.ok` e `module.switch` reais já estão dentro do SLA sem ação extra | 0 código |
| **PR2** — Aplicar `withPerf` em 8 RPCs canônicas | Camada B precisa atribuir tempo a banco | ~30 min, zero risco |
| **PR3** — Confirmar 3 decisões do plano D19.2 §8 (D1/D2/D3 — usuário sintético, janela, ordem) | Carga real escreve em `perf_log`/`error_log` e pode acionar rate-limit do Cloudflare/Supabase | aprovação |

Se PR1+PR2 + as 3 decisões vierem aprovados, **Camada B fica liberada** com:
- 10 usuários sintéticos primeiro (smoke), depois 20.
- Janela: fora do expediente (sugestão: 19h–22h, alinhada ao snapshot Renan).
- Usuários sintéticos descartáveis (recomendado D1=B) para não poluir auditoria real.

---

## 8. Veredito Camada A

| Dimensão | Valor |
|---|---|
| **Aderência SLA atual** | **~55–60%** (3 verdes, 2 amarelos, 2 vermelhos sobre 7 marcas) |
| **Capacidade observada** | 1 usuário, sem concorrência medida |
| **Apto operação assistida 1–3 usuários** | ✅ Sim (já é o cenário atual em produção) |
| **Apto 10–20 usuários** | ⏳ Inconclusivo — requer Camada B |
| **Apto 50+ usuários** | ⏳ Inconclusivo — requer Camada C |

**Performance global estimada:** ~83% (mesmo número da auditoria D17.UI/PERF 98%, sem mudança — esta camada não muda o sistema, só fotografa).

---

## 9. Decisões pendentes para destravar Camada B

Conforme `docs/d19-2-carga-plano.md` §8:

- **D1** — usuários sintéticos descartáveis (recomendado) **ou** usuários reais de teste já existentes?
- **D2** — autoriza Playwright contra `https://metasungerencial.lovable.app` fora do expediente?
- **D3** — autoriza aplicar PR2 (instrumentação `withPerf` em 8 RPCs) antes de Camada B?

**Sem essas 3 respostas, D19.2 não avança para Camada B.**

---

**Relatório fechado.** Próximo passo aguardando aval do operador.
