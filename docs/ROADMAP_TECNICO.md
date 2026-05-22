# Roadmap Técnico — ERP Meta Sun

> Documento vivo. Fase atual: transição de "painel operacional" para **ERP + BI + Controladoria + Inteligência Operacional**.
> Prioridade agora: **arquitetura, performance, escalabilidade, segurança e governança** — não novas telas.

---

## 1. Roadmap por Horizonte

### Curto prazo (0–4 semanas) — Fundação
- [x] Estrutura Analytics (CFO Amplo / Privado, abas por setor)
- [x] Permissões `analytics.amplo` / `analytics.privado`
- [x] `gerencial_parametros` + histórico
- [x] Soft delete, audit_log, period_locks, versionamento
- [ ] **Índices críticos** em `contratos`, `obras`, `projetos`, `clientes`, `tarefas` (ver §2.2)
- [ ] **Views materializadas** para KPIs do Analytics (refresh agendado via `pg_cron`)
- [ ] **React Query** com `staleTime` e `gcTime` corretos em todas as telas pesadas
- [ ] Code-splitting da rota `/analytics` (já é a maior do bundle)
- [ ] Substituir `useEffect+fetch` remanescentes por loaders + `useSuspenseQuery`
- [ ] Limites de `select` (paginação + `range`) — eliminar `select('*')` sem filtro

### Médio prazo (1–3 meses) — Inteligência
- [ ] **Parecer Executivo automático** (job diário → tabela `parecer_executivo`)
- [ ] **Simuladores**: expansão (equipe, filial), financiamento, capacidade operacional
- [ ] **BI cruzado**: comercial × engenharia × financeiro (margem real por obra)
- [ ] **Central de Controladoria** (§6)
- [ ] **Parâmetros gerenciais 100% editáveis** via UI (§7)
- [ ] **Background jobs** via `pg_cron` + `/api/public/jobs/*`
- [ ] Cache em camadas: React Query (cliente) + view materializada (DB) + edge cache (futuro)

### Longo prazo (3–12 meses) — Autonomia
- [ ] **IA Diretiva** via Lovable AI (Gemini 2.5 Pro): pareceres em linguagem natural
- [ ] Forecast (receita, fluxo de caixa, capacidade) com séries históricas
- [ ] Detecção de anomalias (queda de conversão, custo fora da curva, obra travada)
- [ ] Recomendações automáticas ("não contratar agora", "expansão moderada viável")
- [ ] Machine learning leve: scoring de leads, probabilidade de fechamento, risco de inadimplência
- [ ] Analytics preditivo: cenários what-if persistidos

---

## 2. Revisão de Arquitetura

### 2.1 Camadas (separação obrigatória)

```
┌─────────────────────────────────────────────┐
│ OPERACIONAL  (escreve)                      │
│ cadastros, lançamentos, movimentação        │
│ — RLS por consultor_id                      │
│ — soft delete + audit_log                   │
└──────────────────┬──────────────────────────┘
                   │ (read-only, agregado)
┌──────────────────▼──────────────────────────┐
│ ANALYTICS    (lê)                           │
│ views materializadas, KPIs, pareceres       │
│ — RLS por permissão (amplo/privado)         │
│ — NUNCA escreve em tabelas operacionais     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│ INTELIGÊNCIA (interpreta)                   │
│ jobs, parecer automático, forecast, IA      │
│ — roda em background (pg_cron + server fn)  │
└─────────────────────────────────────────────┘
```

**Regra:** componente de Analytics **nunca** faz `insert/update/delete`. Componente Operacional **nunca** consulta view materializada de KPI.

### 2.2 Banco — Índices prioritários

```sql
-- Filtros mais usados em Analytics e listagens
CREATE INDEX CONCURRENTLY idx_contratos_consultor_status   ON contratos(consultor_id, status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_contratos_data_assinatura    ON contratos(data_assinatura)      WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_obras_status_finalizacao     ON obras(status, data_finalizacao) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_obras_consultor              ON obras(consultor_id)             WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_projetos_cliente             ON projetos(cliente_id)            WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_tarefas_assigned_status      ON tarefas(assigned_to, status);
CREATE INDEX CONCURRENTLY idx_audit_log_entidade           ON audit_log(entidade, entidade_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_ev_entidade                  ON entidade_versoes(entidade, entidade_id, versao DESC);
```

### 2.3 Views materializadas (Analytics)

```sql
CREATE MATERIALIZED VIEW mv_kpi_comercial AS ...;   -- conversão, ticket, pipeline
CREATE MATERIALIZED VIEW mv_kpi_financeiro AS ...;  -- DRE, EBITDA, ROCE
CREATE MATERIALIZED VIEW mv_kpi_engenharia AS ...;  -- obras, prazo médio, atraso

-- refresh agendado
SELECT cron.schedule('refresh-kpis', '*/15 * * * *', $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_comercial;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_financeiro;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_engenharia;
$$);
```

### 2.4 Segurança / Governança (já implementado, manter)
- RLS em **todas** as tabelas (sem exceção)
- `has_role` / `has_permission` via `SECURITY DEFINER` (sem recursão)
- Triggers de guarda: estado crítico, dependências, período fechado
- Versionamento (`entidade_versoes`) + audit_log
- `admin_master` única conta com bypass total

---

## 3. Performance

### Sintomas atuais
- Dashboard zerando no refresh → falta de cache persistente
- Refresh pesado → tudo recalcula no cliente a cada render
- Carregamento excessivo → `select('*')` sem paginação

### Soluções (em ordem de impacto)
1. **Views materializadas** (item 2.3) — reduz CPU do cliente em ~80%
2. **React Query com `staleTime: 5min`** para KPIs, `1min` para listas operacionais
3. **Paginação obrigatória**: `range(0, 49)` em toda listagem
4. **Lazy load** de abas pesadas (`React.lazy` por tab do Analytics)
5. **Debounce** em filtros (300ms) e busca (500ms)
6. **`useMemo`** em cálculos derivados dentro do CFOTab (hoje recalcula a cada keystroke)
7. **Background jobs** para parecer executivo, alertas, agregações

---

## 4. Central de Controladoria (próxima grande etapa)

Estrutura sugerida — rota `/controladoria`:

| Aba | Conteúdo |
|---|---|
| DRE Gerencial | receita, CMV, despesas, EBITDA, líquido — mês a mês |
| Orçamento | metas anuais por centro de custo |
| Previsto × Realizado | comparativo com desvio % e alerta |
| Centro de Custo | rateio por filial / setor / projeto |
| Análise de Margem | por obra, por consultor, por linha |
| Projeções | 3, 6, 12 meses (baseado em pipeline + sazonalidade) |

Tabelas novas necessárias:
- `centros_custo`
- `orcamento` (ano, mês, centro_custo, conta, valor_previsto)
- `realizado` (view materializada agregando lançamentos)
- `metas_controladoria`

---

## 5. Parâmetros Gerenciais — 100% editáveis

Já existe `gerencial_parametros` + `_historico`. Falta:

- [ ] Tela `/configuracoes/parametros` com edição visual (faixas, cores, alertas)
- [ ] Validação por categoria (margem 0–100%, ROCE pode ser negativo, etc.)
- [ ] Botão **Restaurar padrão** (snapshot dos defaults)
- [ ] Export / Import JSON (backup)
- [ ] Diff visual no histórico ("conversão excelente: 35% → 45% — por @renan em 22/05/26")

Indicadores que devem ser parametrizáveis:
ROI, EBITDA, ROCE, margem líquida, conversão, inadimplência, alavancagem, cobertura de dívida, capital de giro, produtividade, prazo médio obra, estoque crítico, ticket médio, CAC, LTV.

---

## 6. Visão Futura — Autonomia

Evolução do papel do sistema:

| Hoje | Próximo | Futuro |
|---|---|---|
| Mostra dado | Interpreta | Decide / sugere |
| "Margem: 18%" | "Margem abaixo da meta (22%)" | "Reduzir custo de equipe X em 8% recupera meta em 60 dias" |

Implementação progressiva:
1. **Regras determinísticas** (já temos alertas no CFO Privado)
2. **Parecer Executivo** automático com templates
3. **IA generativa** (Lovable AI) para narrar pareceres
4. **Forecast + recomendação** com base em histórico

---

## Próximos passos concretos (ordem sugerida)

1. Criar índices da §2.2 (migração única, `CONCURRENTLY`)
2. Criar views materializadas + `pg_cron` de refresh
3. Refatorar `/analytics` para consumir views (não recalcular no cliente)
4. Lazy load das abas CFO / Comercial / Engenharia
5. Tela de Parâmetros Gerenciais editáveis
6. Job diário de Parecer Executivo
7. Iniciar Central de Controladoria
