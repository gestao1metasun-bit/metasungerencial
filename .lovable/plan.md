## D12 — Analytics Enterprise

Refundar `/analytics` como **central executiva corporativa**, com 8 setores, KPIs oficiais reconciliados, drill-down em todo "olhinho" e padrão visual já fechado em D6 (ribbon + toolbar + grid denso + full width). Zero mock.

### Princípios (não-negociáveis)

1. **Fonte única.** Todo KPI vem de view/RPC oficial em Supabase (`v_*`, `kpi_*`, `vw_*`). Quando a view não existe → criar via migration ANTES da UI.
2. **Drill-down obrigatório.** Cada KPI tem ícone 👁 que abre grid denso com a base por trás (não modal genérico, e sim `EnterpriseDataGrid` com filtros pré-aplicados).
3. **Reconciliação visível.** Onde houver mais de uma fonte (ex.: contratos × PVs × títulos), mostrar badge de conformidade (✅ reconciliado / ⚠ divergente) ligado ao `v_hardening_report` / view de reconciliação oficial.
4. **Padrão D6.** Ribbon na rota, `EnterpriseToolbar` no topo de cada setor, `KPICard` denso (h ≤ 96px), grid abaixo. Sem dashboards SaaS gigantes.
5. **RLS respeitada.** Reusar `getMyPermissions` + `useAnalyticsAccess`. Setores aparecem condicionalmente conforme `analytics.amplo`/`analytics.privado`/permissões setoriais.

### Estrutura de rotas

Migrar de uma rota única `/analytics` com 14 tabs para **rotas-irmãs por setor**, espelhando o padrão de `/paineis.*`:

```text
/analytics                    → Diretoria/Geral (visão consolidada)
/analytics.comercial          → Comercial
/analytics.financeiro         → Financeiro
/analytics.financiamentos     → Financiamentos
/analytics.engenharia         → Engenharia
/analytics.estoque            → Estoque
/analytics.aprovacoes         → Aprovações
/analytics.posvenda           → Pós-venda
```

Ribbon contextual de cada rota com tabs internas (Visão / Operação / Exceções / Rankings / Reconciliação). MacroNav já mostra "Analytics" como módulo único; ribbon faz a navegação setorial.

### Ondas

#### D12.0 — Fundação (esta onda — ENTREGAR JÁ)
- Criar rotas-irmãs (8 arquivos `analytics.*.tsx`) com layout esqueleto: `PageHeader` + ribbon setorial + `EnterpriseToolbar` + área de KPIs + grid stub.
- Atualizar `nav-structure.ts` (Analytics aponta para `/analytics` consolidado) e `route-tabs.ts` (ribbon de cada rota).
- Criar `src/components/app/analytics/AnalyticsKpiStrip.tsx` (faixa densa de KPIs reusável, com prop `onDrillDown`).
- Criar `src/components/app/analytics/AnalyticsSectorShell.tsx` (shell padrão de setor: toolbar + período + filtros + slot KPIs + slot grid).
- Hook `useAnalyticsPeriod()` (state em URL search-param `from/to/preset`).
- Stub de cada setor exibe banner "Em ligação à base oficial — Onda D12.x" até o setor estar pronto, mas estrutura navegável.

#### D12.1 — Comercial (próxima onda)
- Views/RPCs novas (migration): `v_analytics_comercial_kpis` (contratos gerados/assinados/pendentes/cancelados, valor vendido, ticket, kWp, kWh, conversão, tempo médio assinatura) + `v_ranking_vendedores` + `v_funil_comercial`.
- UI: KPI strip + ranking grid + funil + comparativo mensal (tabela densa, não gráfico).
- Drill-down: cada KPI abre grid de contratos com filtro pré-aplicado.

#### D12.2 — Financeiro
- Reusar `v_hardening_report`, `v_titulos_*`, `vw_fluxo_caixa_real`. Adicionar `v_analytics_financeiro_kpis` (AP/AR totais, vencidos, 30/60/90, inadimplência, realizado×previsto).
- DRE resumido via `v_dre_gerencial` (criar se não existir).
- Filtros: período, status, CR, natureza, conta. Drill-down → `/financeiro-titulos` com search-params.

#### D12.3 — Financiamentos
- Migration `v_analytics_financiamentos` (total, por banco, por gerente, liberados/pendentes/cancelados, ticket, prazo médio, tempo liberação).
- Ranking bancos + comparativo BASA × SICREDI × outros.

#### D12.4 — Engenharia
- Reusar `v_obras_metricas_reais`, `use-eng-metricas`. Adicionar custo previsto×realizado por obra, gargalos por equipe, materiais pendentes (via `v_origem_*`).
- Drill-down: linha → `/engenharia` filtrado.

#### D12.5 — Estoque
- `v_estoque_saldo`, `v_estoque_reservado`, `v_estoque_transito` + curva ABC futura (`v_estoque_curva_abc` migration), divergências de inventário, rastreabilidade.

#### D12.6 — Aprovações
- Sobre `workflow_aprovacoes` + `workflow_aprovacoes_historico`. KPIs: pendentes, SLA vencido, tempo médio, por setor, por aprovador, gargalos.
- Drill-down → `/aprovacoes` filtrado.

#### D12.7 — Pós-venda
- Sobre `posvenda_store` + chamados. Volume, SLA, satisfação, recorrências.

#### D12.8 — Diretoria/Geral (consolidação)
- `/analytics` raiz agrega o melhor de cada setor: faturamento, contratos, financeiro snapshot, engenharia snapshot, estoque snapshot, financiamentos snapshot, **alertas críticos** (de `v_hardening_report`), **reconciliações** (de view oficial), saúde operacional ERP (semáforo por setor).
- Card de "Saúde do ERP" com 8 indicadores (1 por setor) mostrando ✅/⚠/❌.

### Migração suave

A rota atual `/analytics` mantém suas tabs de KPIs financeiros gerenciais (EBITDA/ROI/etc.) DENTRO da view Diretoria/Geral via tab "KPIs Financeiros" — nada de quebrar o que já existe. O conteúdo migra progressivamente conforme as ondas D12.1+ entregam views reconciliadas.

### Componentes novos (D12.0)

```text
src/components/app/analytics/
  AnalyticsSectorShell.tsx    # shell padrão de setor
  AnalyticsKpiStrip.tsx       # faixa horizontal densa de KPIs com 👁
  AnalyticsDrillSheet.tsx     # sheet right com grid de drill-down
  AnalyticsPeriodPicker.tsx   # picker de período (preset/from/to) integrado a URL
  AnalyticsHealthCard.tsx     # semáforo de saúde por setor (Diretoria)
src/hooks/
  use-analytics-period.ts
  use-analytics-sector-kpis.ts  # wrapper genérico por setor
src/lib/repositories/
  analytics-repo.ts             # facade tipado para v_analytics_*
```

### Rotas novas (D12.0)

```text
src/routes/analytics.comercial.tsx
src/routes/analytics.financeiro.tsx
src/routes/analytics.financiamentos.tsx
src/routes/analytics.engenharia.tsx
src/routes/analytics.estoque.tsx
src/routes/analytics.aprovacoes.tsx
src/routes/analytics.posvenda.tsx
```

A rota raiz `/analytics` é reescrita para virar Diretoria/Geral (mantendo tabs financeiras como subseção). Ribbon de cada uma definido em `route-tabs.ts`.

### Critério de aceite por onda

- Onda D12.0: navegação 8 setores funcionando, layout enterprise consistente, stubs honestos ("Aguardando ligação D12.x"), zero quebra do `/analytics` atual.
- Ondas D12.1+: cada setor entra apenas quando suas views/RPCs estiverem criadas, RLS validada e drill-down ligado. Nada de KPI sem fonte.

### Fora de escopo (D12)

- Gráficos elaborados (continuamos tabela densa > chart bonito, alinhado a D6).
- Reconciliação NOVA (D12 consome `v_hardening_report` existente; expandir reconciliação é D7).
- Permissões granulares novas por setor (reusar `analytics.amplo`/`analytics.privado` e perms setoriais já existentes).
- Export PDF executivo (entra em D12.9 se solicitado).

### Próximo passo após aprovação do plano

Implementar **D12.0** em um único turno: 8 rotas + 5 componentes shell + hook de período + atualização de `nav-structure`/`route-tabs`. Sem tocar em migration ainda (D12.1 abre a primeira migration de view oficial).
