
# D14 — Enterprise 99% Readiness

Frente transversal de fechamento. Não cria módulo novo. Cada onda fortalece uma das 6 camadas (Visual, Operacional, Governança, Segurança, Dados, Arquitetura).

## Regra de execução

Uma onda por vez, com critério de saída antes de abrir a próxima. Nada de tocar em código de UI antes de Data Truth e Security estarem fechadas — senão polimos em cima de números errados ou de RLS furada.

## Sequenciamento proposto

```text
D14.1  Enterprise Data Truth        (Dados)        ── pré-requisito de tudo
D14.2  Security & RLS Final Scan    (Segurança)    ── pré-requisito de operação
D14.3  Governance Matrix            (Governança)
D14.4  Operational Rollout          (Operacional)
D14.5  Performance & Pagination     (Arquitetura)
D14.6  Tests & Homologation         (Arquitetura)
D14.7  Final 99% Report             (Relatório)
```

Visual Enterprise (96 → 99%) é tratado como passe transversal dentro de D14.4 por rota crítica, não como onda própria — o shell já está fechado (D6).

---

## D14.1 — Enterprise Data Truth (recomendada para começar AGORA)

Objetivo: nenhum KPI executivo pode divergir silenciosamente.

Entregas:
- Inventário de todos os hooks/components que calculam KPI hoje (`useDashboard*`, `useKpis*`, cálculos inline em `paineis/*`, `analytics/*`, `financeiro/*`).
- Criar/consolidar 6 views oficiais (somente as que ainda não existem):
  - `v_kpis_comercial_oficial`
  - `v_kpis_financeiro_oficial`
  - `v_kpis_estoque_oficial`
  - `v_kpis_engenharia_oficial`
  - `v_kpis_aprovacoes_oficial`
  - `v_kpis_financiamentos_oficial`
- Substituir cálculos paralelos por leitura da view oficial.
- Painel `/paineis/saude-dados` com status OK / Divergente / Crítico por KPI, última verificação e origem provável (já temos `v_hardening_report` como base).
- Toda métrica com "olhinho" abre grid de origem + filtros + totalização + export.

Critério de saída: reconciliação financeiro / estoque / comercial / engenharia / aprovações / financiamentos / compras bate 100% com a view oficial em ambiente de homologação.

---

## D14.2 — Security & RLS Final Scan

Objetivo: blindagem pré-produção, zero risco crítico sem justificativa.

Entregas:
- Rodar `security--run_security_scan` + `supabase--linter` completos.
- Matriz de teste por perfil: Admin Master, Diretoria, Financeiro, Comercial, Engenharia, Estoque, Compras, Consultor, Somente Leitura.
- Auditar SECURITY DEFINER, GRANTs, policies, storage buckets, RPCs, views.
- Bloquear via trigger (onde ainda não está):
  - DELETE físico em entidades críticas (contratos, PVs, títulos, obras, estoque).
  - UPDATE direto de status crítico fora das RPCs/flag de sessão.
  - Baixa fora de `movimentacoes_financeiras`.
  - Estoque negativo.
  - Aprovação fora de `app.via_workflow_rpc`.
- Relatório: riscos corrigidos / aceitos / mitigados / residuais.

Critério de saída: scan limpo para crítico/alto. Riscos aceitos documentados em `mem://security/*` + `security--update_memory`.

---

## D14.3 — Governance Matrix

Entregas:
- Tabela `governance_matrix` (ou doc estrutural) com:
  `Ação | Entidade | Permissão | Workflow? | Motivo? | Auditoria? | Lote? | Estorno?`
- Cobrir as 15 ações críticas listadas (cancelar, excluir, renegociar, baixar, estornar, alterar vencimento/valor/CR/natureza/portador, ajustar estoque, aprovar compra, alterar status obra, cancelar/aditivar contrato).
- Congelamento de alçada no momento da abertura do workflow (snapshot em `workflow_aprovacoes.alcada_snapshot`).
- Delegação: aprovador substituto, férias, ausência, escalonamento.
- SLA por aprovação: prazo, atraso, escalonamento, alerta.

Critério: nenhuma ação crítica executável sem trilha transversal.

---

## D14.4 — Operational Rollout (inclui passe visual 96→99%)

Por rota crítica, fechar checklist:
- Toolbar RM (Salvar / Filtrar / ProcessosMenu / MaisAções).
- Seleção múltipla + ações em lote.
- Anexos + Histórico + ProcessMenu + Visões salvas + Export + Print.
- Sem sidebar fixa, sem card SaaS, sem barra duplicada, sem placeholder.

Rotas no escopo: Contas a Receber, Contas a Pagar, Títulos, PVs, Contratos, Propostas, Obras, Estoque, Aprovações, Compras, Financiamentos.

Processos mínimos por módulo já listados no brief — vira matriz de cobertura.

Critério: usuário opera em lote sem retrabalho manual em todas as 11 rotas.

---

## D14.5 — Performance & Pagination

- Server-side pagination nos grids críticos (títulos, PVs, estoque_movimentos, obras, aprovações).
- Índices: `status`, `cliente_id`, `contrato_id`, `origem_id`, `entidade_id`, `created_at`, `vencimento`, `deleted_at`, `centro_resultado`, `natureza`, `conta_financeira`.
- GIN nos `jsonb` consultados (`dados`, `valor_novo`, `valor_anterior`).
- Padronizar engines: `EnterpriseEntity`, `ProcessEngine`, `AttachmentEngine`, `TimelineEngine`, `SavedViewsEngine`, `BulkOperationEngine`.

---

## D14.6 — Tests & Homologation

- Testes mínimos das RPCs críticas, RLS, workflow, renegociação, baixa, estoque, anexos, reconciliação.
- Seed de homologação: 20 clientes → contratos → PVs → títulos → obras → estoque → compras → aprovações → renegociações → anexos.
- Teste ponta-a-ponta: Lead → Proposta → Contrato → PV → Financeiro → Engenharia → Estoque → Compra → Aprovação → Baixa → Analytics.

---

## D14.7 — Final 99% Report

Tabela final `Camada | Antes | Depois | Status | Pendências` + recomendação piloto interno / produção ampla.

---

## Decisão necessária antes de mexer em código

Qual onda abro AGORA?

1. **D14.1 Data Truth** — recomendação técnica. Sem isso, qualquer ajuste visual ou operacional pode estar pintando em cima de número errado. É a base de D14.4 e D14.7.
2. **D14.2 Security** — pode rodar em paralelo (scan é leitura). Posso iniciar D14.1 + scan de leitura de D14.2 no mesmo turno.
3. **Outra ordem** — você define.

Também preciso saber: durante D14.1, posso **criar/alterar views oficiais** (migrations) e **substituir hooks de KPI** existentes? Isso vai mexer em dashboards já em uso, e prefiro confirmação antes de tocar.
