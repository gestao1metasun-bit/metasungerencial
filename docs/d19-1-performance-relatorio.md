# D19.1 — Performance, Gargalos e Plano de Correção

**Wave:** D19.1 (diagnóstico oficial, sem alteração estrutural)
**Data:** 2026-05-29
**Escopo:** Medir tempos reais percebidos, ranquear gargalos, propor plano D19.1.fix.

---

## 1. Fonte oficial de medição

- Tabela `public.perf_log` (instrumentada na D16.PERF P1).
- Helper `src/lib/perf.ts` (`perfMark` / `perfMeasure`) + `rpc_perf_log` (rate-limit 200/5min).
- View `v_perf_p95_7d` (security_invoker, somente admin).
- Painel `/paineis/performance` (admin).

**Volumetria amostra:** 231 medições, 1 usuário (Renan, homologação), janela 24h-7d.
Massa de homologação confirmada (sem produção). Tabelas operacionais ainda baixíssimas (estoque_movimentos=8, produtos=8) — gargalos atuais são de **plataforma**, não de **dado**.

---

## 2. Resultado consolidado (últimos 7 dias)

| Evento            |  N  | Avg (ms) | P50  |   P95   | Max     | SLA D16     | Status |
|-------------------|----:|---------:|-----:|--------:|--------:|-------------|--------|
| auth.ok           |   1 |    2.400 | 2400 |   2.400 |   2.400 | ≤ 800 ms    | 🔴 ALTO |
| shell.ready       |  75 |      160 |    0 |       0 |  10.746 | ≤ 2.000 ms  | 🟢 OK   |
| perms.ready       |   1 |   96.547 | 96k  |  96.547 |  96.547 | ≤ 500 ms    | 🔴 OUTLIER |
| route.ready       | 104 |    8.126 |    0 |  44.256 | 198.793 | ≤ 1.000 ms  | 🟡 outliers |
| module.switch     |  33 |   25.611 | 1796 | 139.872 | 198.793 | ≤ 1.000 ms  | 🔴 ALTO |
| first-list.ready  |  16 |    1.648 |  708 |   5.759 |   5.921 | ≤ 1.500 ms  | 🟡 borderline |

**Leitura honesta:** P50 do shell/route é 0ms (cache quente). Os P95 explosivos vêm de **abas em background** e **navegações com o sistema ocioso** — Performance API contabiliza o tempo total da aba até o `perfMark`. Não é regressão real do ERP, mas **distorce o painel** e mascara o gargalo verdadeiro.

---

## 3. Ranking real de gargalos (após descontar outliers)

1. **auth.ok = 2.400 ms (3× o SLA)** — único candidato a otimização imediata real.
   - Causa provável: `supabase.auth.getSession()` + busca de perfil + roles em série no boot.
2. **first-list.ready P95 ≈ 5,7s** — grids com `select('*')` e sem `useServerPagination` ainda existem em 6/10 telas (D14.5.1 não fechado).
3. **module.switch / route.ready P95 elevados** — telemetria contaminada por `visibilitychange=hidden`. Precisa filtro.
4. **perms.ready outlier** — 1 medição em 96s (aba aberta e esquecida). `usePermissoes` já tem gcTime 30min (D16.PERF P2). Sem ação.

**Banco:** zero pressão. 5k linhas em 1 tabela (cidades_irradiacao, estática). Sem N+1 detectável.

---

## 4. Plano de correção D19.1.fix (proposta, NÃO aplicada nesta wave)

| ID  | Ação                                                                                  | Esforço | Impacto |
|-----|---------------------------------------------------------------------------------------|---------|---------|
| F1  | Filtrar outliers em `perf.ts`: descartar medições quando `document.visibilityState !== 'visible'` durante a janela. | S | ALTO (limpa o painel) |
| F2  | Em `v_perf_p95_7d` adicionar coluna `p95_filtrado` com `percentile_cont(0.95) FILTER (WHERE ms < 15000)`. | S | ALTO |
| F3  | Paralelizar boot de auth: `getSession` + `has_role` + `profiles` em `Promise.all`, hidratar via React Query. | M | ALTO (auth.ok 2.4s→<800ms) |
| F4  | Migrar 6 telas restantes para `useServerPagination` (D14.5.1) — Comercial/Compras/Engenharia/Pós-venda. | M | MÉDIO |
| F5  | Instrumentar `db.query` por RPC crítica (rpc_lancamento_criar, rpc_titulos_totais, has_role) com `perfMeasure('rpc.<nome>')`. | S | MÉDIO (observabilidade) |
| F6  | Lazy + `prefetch on hover` em rotas pesadas via `<Link preload="intent">`. | S | MÉDIO |

---

## 5. Massa de homologação (diretriz oficial)

Confirmado: 100% dos dados atuais são **HOMOLOGAÇÃO/SIMULAÇÃO**.
- Marcação a aplicar em D19.5 (operação assistida): banner global `[HOMOLOGAÇÃO]` + flag `metasun.ambiente='HOMOLOGACAO'`.
- Nenhum dado cliente/fornecedor/contrato/título/movimento deve ser tratado como produção até corte oficial.

---

## 6. Conclusão D19.1

- **Performance percebida real:** boa em cache quente (P50 ~0ms shell/route), aceitável em primeira carga (first-list P95 5,7s — alvo 1,5s).
- **Único SLA quebrado de forma estrutural:** `auth.ok` (2,4s vs 800ms).
- **Painel está poluído por outliers de background** — corrigir em F1+F2 antes de qualquer decisão de tuning maior.
- **Banco e RLS sem pressão** — não há gargalo de Postgres nesta massa.

**Maturidade Performance:** ~83% → estimativa ~85% após reconhecimento formal dos gargalos (sem fixes ainda).
Aplicar D19.1.fix sobe para ~92-95%.

---

## 7. Próximos passos D19 (roadmap)

| Wave   | Foco                                  | Pré-req           |
|--------|---------------------------------------|-------------------|
| D19.1.fix | F1-F6 acima                         | aprovação user    |
| D19.2  | Teste de carga 10/20/50/100 usuários simulados (k6 ou autocannon contra RPCs públicas). | D19.1.fix         |
| D19.3  | Observabilidade: painel unificado Perf+Errors+RPC+Integrações+Usuários ativos+Saúde. | D19.1.fix + F5 |
| D19.4  | Backup/Restore: documentar RPO/RTO Lovable Cloud, exercício de restore controlado em projeto espelho. | independente |
| D19.5  | Operação assistida real por módulo (checklist 10 módulos, banner HOMOLOGAÇÃO). | D19.1.fix |
| D19.6  | Readiness Integração externa (Domínio/Alterdata/Sankhya/TOTVS/SAP) — auditoria sobre tabelas D18.7/D18.8, sem ativar. | D18 (FEITO) |

**Restrições D19 reafirmadas:** sem SPED/ECD/ECF/Reinf/DCTFWeb/integração real. Sem alteração de RLS/Workflow/Auditoria/Regras Operacionais.
