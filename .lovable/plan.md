
# Onda F — Operações Financeiras (independente do fluxo comercial)

Objetivo: criar a camada **Operações Financeiras** dentro do módulo Financeiro
para registrar empréstimos, aportes, capital de giro e aplicações sem
contaminar contratos, propostas, PV, comissão, engenharia, faturamento ou
indicadores comerciais (ticket médio, conversão).

Não há nada pré-existente no Supabase (`SELECT` confirmou: 0 tabelas
`operac%` / `emprest%` / `aporte%`). Construção é greenfield, em cima do
padrão enterprise já vigente (D5.1 workflow + D14.2 security + D14.3
governance + D15 row_version/audit/idempotência).

## Regra de pedra (gravada em memory)

Operações Financeiras impactam **somente**:
- `titulos_financeiros` (AR/AP gerados pela operação)
- Tesouraria / Fluxo de Caixa / DRE financeiro
- Conciliação bancária

E **nunca** alteram: contratos, propostas, PV, engenharia,
`comercial_comissoes`, faturamento, KPIs comerciais (`v_kpis_comercial_oficial`).

Garantia técnica: títulos gerados nascem com
`origem_tipo = 'OPERACAO_FINANCEIRA'` e `origem_id = operacao_id`.
Triggers existentes de comissão (C6) só disparam em `assinatura_eventos`,
não em títulos com essa origem. Views de KPI comercial filtram por
`origem_tipo` ∈ {CONTRATO, PV} — operações financeiras ficam fora por
construção.

## Subondas (entrega incremental, cada uma fecha sozinha)

### F1 — Fundação DB (DDL puro, sem UI)

Tabelas novas:
- `operacoes_financeiras` (cabeçalho)
- `operacoes_financeiras_parcelas` (cronograma)
- `operacoes_financeiras_eventos` (append-only: criada/aprovada/quitada/renegociada/cancelada/estornada)

Enums novos:
- `op_fin_tipo`: `EMPRESTIMO_COLABORADOR | EMPRESTIMO_CLIENTE | EMPRESTIMO_FORNECEDOR | EMPRESTIMO_SOCIO_EMPRESA | EMPRESTIMO_EMPRESA_TERCEIRO | APORTE_CAPITAL | CAPITAL_DE_GIRO | APLICACAO_FINANCEIRA`
- `op_fin_status`: `RASCUNHO | EM_APROVACAO | APROVADA | LIBERADA | EM_PAGAMENTO | QUITADA | RENEGOCIADA | CANCELADA`
- `op_fin_natureza_caixa`: `ENTRADA | SAIDA` (derivada por tipo; aporte/sócio/giro/resgate=ENTRADA, demais empréstimos+aplicação=SAIDA)
- `op_fin_forma_baixa`: `FOLHA | COMISSAO | MANUAL | PIX | TED | BOLETO | DESCONTO_TITULO`

Campos universais já obrigatórios pelo charter:
`row_version`, `created_by`, `deleted_at`, integrabilidade (`codigo_externo`,
`sistema_destino`, `status_integracao`, `hash_remessa`, `lote`, etc.),
`natureza_id`, `centro_resultado_id`, `conta_id`.

Vínculo polimórfico para contraparte (1 só preenchido):
`colaborador_id | cliente_id | fornecedor_id | socio_id | terceiro_nome`.

CHECK: aporte e sócio→empresa não geram parcelas; demais sim.

Permissões novas no enum `app_permission`:
`operacao_financeira.criar/aprovar/liberar/quitar/renegociar/cancelar/estornar/visualizar`.

Naturezas financeiras semeadas (idempotente, `categoria=OPERACAO`):
`EMP_COLAB`, `EMP_CLIENTE`, `EMP_FORN`, `EMP_SOCIO_EMP`, `EMP_EMP_TERC`,
`APORTE`, `CAPGIRO`, `APLICACAO`, `RESGATE`.

RLS por permissão. Audit forward-only. Trigger `row_version`. Sem dados, sem
flag ligada.

### F2 — RPCs oficiais (motor da operação)

Tudo `SECURITY DEFINER`, EXECUTE só `authenticated`, idempotência via
`rpc_idempotente_check/commit` (Onda 6), flag de sessão
`app.via_op_fin_rpc` para bloquear UPDATE direto.

1. `rpc_op_fin_criar(payload jsonb)` → cria cabeçalho `RASCUNHO`.
2. `rpc_op_fin_gerar_parcelas(op_id, parcelas jsonb[])` → cronograma (valida soma=valor_total).
3. `rpc_op_fin_aprovar(op_id, motivo)` → entra na alçada D5.1 quando ≥ R$ 20k (reaproveita motor).
4. `rpc_op_fin_liberar(op_id)` → gera os **títulos financeiros oficiais** em `titulos_financeiros` com `origem_tipo='OPERACAO_FINANCEIRA'`, `origem_id=op_id`, status `EM_ABERTO`, e — para tipos ENTRADA — registra movimentação em conta_id.
5. `rpc_op_fin_renegociar(op_id, novo_cronograma, motivo)` → marca antigo `RENEGOCIADO`, mantém histórico, gera nova operação encadeada (`renegociacao_de`).
6. `rpc_op_fin_cancelar(op_id, motivo)` → bloqueia se houver baixa.
7. `rpc_op_fin_estornar_recebimento(parcela_id, motivo)` → reabre parcela, reverte movimentação, evento append-only.

Baixa parcial e pagamento maior que parcela: reutiliza
`rpc_titulo_baixar_parcela` existente (parcelas da operação **são** títulos
após F2.4). Excedente vira amortização automática nas próximas parcelas via
RPC já existente de adiantamento N:N — comportamento idêntico ao AR
comercial, sem código novo.

Conciliação: nada de novo — títulos com `origem_tipo='OPERACAO_FINANCEIRA'`
já aparecem em `v_titulos_enriquecido` e na tela de conciliação.

### F3 — UI (aba dentro do Financeiro)

Nova aba `/financeiro` → **Operações Financeiras** usando 100% o barrel
`@/components/app/enterprise`:

- `EnterpriseRecordToolbar` (sem ação "Novo" cega — abre wizard tipado por tipo de operação)
- `EnterpriseDataGrid` com colunas: nº, tipo, contraparte, valor, parcelas, saldo devedor, status, criado_em
- `RowActions`: ✏ editar (só RASCUNHO), ✓ aprovar, ▶ liberar, ↻ renegociar, ✕ cancelar, 👁 visualizar, 📎 anexos, 🕐 histórico
- `FilterPanel`: tipo, status, contraparte, período
- `ColumnManager` + `BulkActionBar`
- `ServerPaginationFooter`

Wizard `NovaOperacaoFinanceiraDialog` em 3 passos:
1. **Tipo** (cards visuais — colaborador, cliente, fornecedor, sócio→empresa, empresa→terceiro, aporte, capital de giro, aplicação)
2. **Dados** (contraparte, valor, finalidade, conta, CR, natureza pré-selecionada)
3. **Cronograma** (parcela única / fixo / personalizado, com validação de soma)

Detalhe da operação (drawer / rota filha): cabeçalho + cronograma + títulos
gerados + eventos (timeline append-only) + anexos (`anexos-repo`).

Cor das ações: respeita matriz canônica D17.UI (azul/verde/vermelho/âmbar/índigo/cinza).

Acesso por permissão; ribbon e workspace tabs já honram `accessKey`.

### F4 — Relatórios e KPIs (read-only, alinhados à view oficial)

View `v_op_fin_resumo` (security_invoker) sobre
`operacoes_financeiras + parcelas + titulos_financeiros`:
- valor emprestado / recebido / saldo devedor
- parcelas em aberto / vencidas
- inadimplência (% e R$)
- operações ativas / quitadas / renegociadas / canceladas
- breakdown por tipo

Card em `/analytics/financeiro` (não em comercial). KPIs comerciais
permanecem intocados.

### F5 — Governança + Hardening

- Linhas em `governance_matrix` para `operacao_financeira.*` (workflow,
  motivo, audit, lote, estorno, SLA, criticidade) — segue padrão D14.3.
- Workflow de alçada D5.1 com limites parametrizáveis (default 20k/50k/>50k).
- Validação final no `v_saude_sistema`: KPI "operações financeiras com
  títulos órfãos" deve ser 0.
- Documento `docs/onda-f-operacoes-financeiras-spec.md` (regra de pedra,
  matriz tipo×comportamento, mapeamento de naturezas).

## O que NÃO entra nesta onda

- Folha de pagamento real (baixa "FOLHA" apenas marca a forma; integração
  com folha externa fica em ondas futuras de RH/Folha).
- Mark-to-market de aplicação (rendimento entra como evento manual; cálculo
  diário automático vira onda específica).
- Liquidação automática banco-a-banco (já existe via conciliação atual).

## Ordem de execução e gates

```text
F1 (schema) → aprovação manual → F2 (RPCs) → smoke test admin →
F3 (UI nova aba) → F4 (view+card) → F5 (governance+docs+memory)
```

Cada subonda fecha sozinha (DB ok mesmo sem UI). Sem flags D15 paralelas:
operação financeira é módulo novo, não migração — entra direto como
single-source no Supabase desde F2.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Contaminar KPI comercial | `origem_tipo='OPERACAO_FINANCEIRA'` + filtros já existentes nas views; teste em F5. |
| Trigger de comissão disparar | Comissão (C6) só ouve `comercial_assinatura_eventos`. Não toca contratos → seguro por construção. |
| Confundir com adiantamento de fornecedor | Naturezas separadas (`EMP_FORN` ≠ `ADIANTAMENTO`); UI usa wizard tipado, não campo livre. |
| Edição direta de status | Trigger anti-edição com flag `app.via_op_fin_rpc` (padrão C2/C5). |

## Próximo passo

Aprovação para começar por **F1 (migração de schema)**. F2..F5 entram em
sequência, com relatório executivo em cada fechamento e atualização do
índice de memória.
