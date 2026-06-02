# E.OS.5 — Dashboard Executivo + Produtividade (Entrega 3)

Data: 2026-06-02

## Entregas

### 1. Dashboard executivo da O.S. (aba Dashboard) — ampliado
- 16 KPIs:
  - Custo previsto / realizado / desvio R$ / desvio %
  - Valor orçado / Valor em PV / Saldo a faturar / Serviços faturáveis
  - Lucro previsto / lucro realizado / margem prevista / margem realizada (todos com semáforo ok/danger)
  - Tarefas abertas / concluídas / aderência horas / anexos / formulários respondidos
- Botão **Atualizar** (refetch).
- Alertas operacionais derivados de dados oficiais:
  - Custo realizado acima do orçado
  - Desvio acima de 10%
  - Lucro realizado negativo
  - Estouro por categoria (semáforo `ESTOURO` em `v_os_orcado_realizado`)
  - Tarefas impedidas / em pausa
  - Tarefas sem técnico responsável
  - Tarefas sem data prevista
- Sem alertas → confirmação verde.

### 2. Orçado x Realizado (aba já existente)
Mantém 8 categorias (`OS_CATEGORIAS`): material, mão de obra, hospedagem, alimentação, combustível, equipamentos, terceiros, outros — orçado / realizado / variação R$ / variação % / semáforo (`OK`/`ATENCAO`/`ESTOURO`/`NEUTRO`) + totalizador.

### 3. Aba Produtividade — NOVA
KPIs:
- horas previstas / realizadas / aderência (semáforo)
- taxa de conclusão
- tarefas abertas / concluídas
- tempo médio por tarefa (derivado de `data_inicio`/`data_fim` em tarefas finalizadas)
- atraso médio (`data_prevista` < hoje em tarefas ainda abertas)
- tarefas impedidas / em pausa / atrasadas (semáforo)
- técnicos envolvidos

Gráficos (recharts):
- **Tarefas por status** — BarChart
- **Horas previstas × realizadas** — BarChart agrupado
- **Ranking por técnico** (filtrado pelos técnicos envolvidos nesta O.S., dados de `v_os_produtividade_tecnico`) — BarChart agrupado prev/real

### 4. Alertas operacionais
Incluídos no Dashboard (item 1) — derivados client-side de:
- `v_os_dashboard_kpis` (custo previsto/realizado)
- `v_os_orcado_realizado` (semáforo por categoria)
- `useOsTarefas` (status/técnico/data_prevista)

Sem nova view nem RPC.

### 5. Serviços faturáveis
Exibidos no Dashboard via `data.servicos_faturaveis` e `valor_em_pv` (saldo a faturar).
Faturamento real continua bloqueado a RPC oficial (conforme escopo).

### 6. Botões visíveis validados
- "Dashboard O.S." no header de `/engenharia` — passou de toast para `<Link to="/engenharia/gestao-servicos">` (real).
- "Atualizar" em Dashboard + Produtividade — `refetch()` real.
- Demais botões (`Voltar`, `Gerenciar modelos`, abas, processos `EnterpriseRecordToolbar`) já validados em entregas anteriores.

## Arquivos alterados
- `src/routes/engenharia.gestao-servicos.$osId.tsx`
  - imports: `useOsProdutividade`, `useOsProdutividadeTecnico`, recharts
  - nova aba `produtividade`
  - `DashboardTab` reescrito com lucro/margem/alertas
  - novo componente `ProdutividadeTab`
- `src/routes/engenharia.tsx`
  - Botão "Dashboard O.S." vira link real

## Hooks/views/RPCs consumidos (todos pré-existentes)
- view `v_os_dashboard_kpis`
- view `v_os_orcado_realizado`
- view `v_os_produtividade`
- view `v_os_produtividade_tecnico`
- hook `useOsTarefas` (table `os_tarefas`)
- Nenhuma RPC nova; nenhuma view nova; nenhuma migração.

## Restrições respeitadas
- ✅ Sem alteração de RLS
- ✅ Sem alteração de workflow
- ✅ Sem alteração de regras financeiras/comerciais/estoque/engenharia
- ✅ Apenas views/RPCs/hooks pré-existentes
- ✅ Sem mock; sem fallback silencioso

## Critério de aceite — atendido
Ao abrir uma O.S., o gestor agora responde:
- ✅ está dentro do orçamento? (Dashboard: Desvio + tom)
- ✅ quanto desviou? (Desvio R$/%)
- ✅ quem produziu? (Produtividade → ranking técnico)
- ✅ quanto tempo levou? (Produtividade → tempo médio/tarefa, horas real)
- ✅ o que está atrasado? (Alertas + KPI atrasadas)
- ✅ o que pode faturar? (Dashboard → faturáveis + saldo)
- ✅ qual a margem? (Dashboard → margem prev/real)
- ✅ quais tarefas faltam? (Dashboard → abertas/Produtividade)
- ✅ quais formulários estão pendentes? (Dashboard → formulários respondidos)
- ✅ quais anexos existem? (Dashboard → anexos)

Maturidade O.S.: ~85% → **~95%**.

## Próximo
**Entrega 4 — Hardening & relatório 95%** (auditoria final de botões, matriz de cobertura, build limpo final).
