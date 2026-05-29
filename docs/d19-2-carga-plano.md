# D19.2 — Teste de Carga · Plano Oficial

**Status:** ABERTO 2026-05-29
**Pré-condições:** D17.UI Onda 6 fechada (~93%), D19.1.fix aplicado, perf_log + v_perf_p95_filtrado_7d operacionais.

## 1. Escopo

Validar capacidade real do ERP Meta Sun em 4 níveis de concorrência: **10 / 20 / 50 / 100 usuários simultâneos**, sobre fluxos representativos de Comercial, Financeiro, Suprimentos, Engenharia, Financiamentos, Pós-venda.

## 2. Estratégia (3 camadas, do barato ao definitivo)

### 2.A — Baseline atual (sem custo, executável agora)
Extrair P50/P95/P99 reais dos últimos 7 dias direto do `v_perf_p95_filtrado_7d` (já alimentado por `perf.ts`). Resultado = capacidade observada com o tráfego real atual (~1-3 usuários).

### 2.B — Carga sintética leve via browser orquestrado (10/20 usuários)
Script Node + Playwright que abre N sessões headless contra `https://metasungerencial.lovable.app`, faz login como usuários de teste, percorre rotas-chave, coleta `performance.timing` e logs do `perf_log` no Supabase. Roda do sandbox Lovable.

### 2.C — Carga média/pesada (50/100 usuários)
k6 ou Artillery contra os endpoints REST do Supabase (PostgREST + RPCs). Mede latência do banco isoladamente. Não exercita a UI, mas dá teto de vazão de RPC/RLS.

## 3. Métricas (coletadas em todas as camadas)

| Métrica | Fonte | SLA D16.PERF |
|---|---|---|
| auth.ok | perf_log | 800 ms |
| shell.ready | perf_log | 2000 ms |
| route.ready | perf_log | 1000 ms |
| module.switch | perf_log | 1000 ms |
| first-list.ready | perf_log | 1500 ms |
| perms.ready | perf_log | 500 ms |
| rpc.<nome> | perf_log via withPerf | 800 ms |
| taxa de erro | error_log | <1% |
| locks/deadlocks | pg_stat_activity / supabase_db_health | 0 |
| timeouts (504) | logs Cloudflare | <0,5% |

## 4. Fluxos por módulo (script de navegação)

```
Comercial  : /leads → /propostas → /contratos (assinados) → abrir 1 contrato → /comercial/comissoes
Financeiro : /financeiro?aba=receber → ?aba=pagar → /operacoes-financeiras → /financeiro?aba=conciliacao
Suprimentos: /solicitacoes-material → /estoque → aba Movimentos → aba Entregas
Engenharia : /engenharia → aba Cronograma → aba Pendências → aba Finalizados
Financiamento: /financiamentos → aba Carteira → aba Pendências → aba Finalizados
Pós-venda  : /posvenda → aba Garantias → aba Histórico
```
Ciclo de 90 s por usuário sintético, com think-time de 2-5 s entre cliques (mais realista que rajada pura).

## 5. Critérios de aceite (idênticos ao charter)

| Carga | Critério |
|---|---|
| 10 | Operação fluida. Zero erro crítico. P95 dentro dos SLAs. |
| 20 | Operação estável. Sem degradação >20% no P95. |
| 50 | Aceitável p/ operação assistida. Documentar gargalos. |
| 100 | Teste de limite. Relatório de capacidade + ponto de saturação. |

## 6. Restrições (do charter)

- ZERO alteração em RLS / auditoria / workflow / regras / schema.
- Sem novas funcionalidades.
- Apenas medir, diagnosticar, classificar, recomendar.

## 7. Entregas previstas

1. `docs/d19-2-camada-A-baseline.md` — P50/P95/P99 atuais por marca.
2. `docs/d19-2-camada-B-10-20.md` — relatório Playwright 10/20 usuários.
3. `docs/d19-2-camada-C-50-100.md` — relatório k6 50/100 usuários.
4. `docs/d19-2-veredito.md` — apto/não apto para operação assistida real.

## 8. Decisões pendentes (BLOQUEIO)

D19.2 não dispara sozinho. Preciso de aprovação em **3 pontos** antes de rodar carga real:

| # | Decisão | Por quê |
|---|---|---|
| D1 | Usar **usuários reais de teste** já existentes no Supabase prod, ou **criar usuários sintéticos descartáveis**? | Carga real grava em perf_log/error_log e pode tocar auditoria. |
| D2 | Aceita rodar a **Camada C (k6 50/100 user)** contra o Supabase de produção em janela fora do expediente? | Vai consumir cota e pode acionar rate-limit. |
| D3 | OK começar **só pela Camada A (baseline)** nesta turn, sem custo, sem risco, e decidir B/C depois com dado real em mão? | Recomendação técnica. |

**Recomendação:** começar pela Camada A agora (zero risco) e usar o resultado para calibrar B e C.
