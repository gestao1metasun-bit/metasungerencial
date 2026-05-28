# Onda 0 — Inventário Supabase (baseline)
Gerado: 2026-05-28 · Read-only

## Totais de objetos

| Objeto | Quantidade |
|---|---|
| Tabelas (public) | **66** |
| Views | **56** |
| Materialized Views | 3 (`mv_kpi_comercial`, `mv_kpi_engenharia`, `mv_kpi_consultor`) |
| Funções/RPCs | **86** |
| Policies RLS | **174** |
| Índices | **320** |

## Volumetria (tabelas operacionais críticas)

| Tabela | Linhas | Diagnóstico |
|---|---:|---|
| `cidades_irradiacao` | 5571 | seed estático ✅ |
| `role_permissions` | 99 | seed ✅ |
| `governance_matrix` | 41 | D14.3 ✅ |
| `naturezas_financeiras` | 21 | seed parcial — Onda 2 |
| `audit_log` | **15** | 🔴 sem cobertura diária |
| `gerencial_parametros` | 11 | seed |
| `workflow_alcadas` | 11 | D5.1 ✅ |
| `bancos` | 10 | parcial |
| `plano_contas` | 10 | parcial |
| `estoque_movimentos` | 8 | smoke |
| `produtos` | 8 | smoke |
| `contas_financeiras` | 4 | parcial |
| `centros_resultado` | 3 | parcial |
| `profiles` | 1 | só admin master |
| **`contratos`** | **0** | 🔴 operação 100% em LS |
| **`clientes`** | **0** | 🔴 operação 100% em LS |
| **`leads`** | **0** | 🔴 operação 100% em LS |
| **`propostas`** | **0** | 🔴 operação 100% em LS |
| **`pedidos_venda`** | **0** | 🔴 operação 100% em LS |
| **`projetos`** / `projetos_contrato` | **0** | 🔴 |
| **`obras`** | **0** | 🔴 |
| **`titulos_financeiros`** | **0** | 🔴 — Onda 1 |
| **`parcelas_financeiras`** | **0** | 🔴 — Onda 1 |
| **`movimentacoes_financeiras`** | **0** | 🔴 — Onda 1 |
| **`fornecedores`** | **0** | 🔴 — Onda 2 |
| `adiantamentos`, `boletos`, `extrato_banco`, `rescisoes_*`, `titulos_renegociacoes`, `titulos_taxas` | 0 | estrutura D15.1.a.0.i+ pronta |
| `tarefas`, `cotacoes_compra`, `ordens_compra`, `solicitacoes_material`, `estoque_reservas`, `estoque_entregas` | 0 | aguarda operação real |
| `workflow_aprovacoes` | 0 | sem operação |

## Views oficiais consolidadas (NÃO MEXER)

- `v_kpis_comercial_oficial`, `v_kpis_engenharia_oficial`, `v_kpis_financeiro_oficial`, `v_kpis_estoque_oficial`, `v_kpis_obras_oficial`, `v_kpis_workflow_oficial` (D14.1)
- `v_saude_dados`, `v_reconciliacao_*` (D14.1)
- `v_titulos_enriquecido` (D15.1.a.1.i)
- `v_origem_*` 4 views (D4.4)
- `v_hardening_report` (D4.6)
- `v_governance_matrix_full/_gaps/_resumo` (D14.3)
- `v_governance_gaps_status` (D14.4)

## RPCs principais (não mexer no contrato existente)

Workflow: `solicitar_aprovacao`, `aprovar_solicitacao`, `negar_solicitacao`, `cancelar_solicitacao`, `resolver_alcada`
Financeiro: `receber_parcela`, `rpc_titulos_totais` (D15.1.a.1.i)
PV: `gerar_titulos_do_pv`, `enviar_pv_para_analise`, `enviar_pv_para_engenharia`, `aprovar_pv`
Compras: `registrar_cotacao`, `escolher_cotacao`, `processar_aprovacao_compra`, `enviar_solicitacao_material`
Estoque: `reservar_material_para_obra`, `registrar_entrega_material`, `baixar_estoque_por_entrega`, `ajustar_estoque_manual_controlado`, `estoque_saldo_disponivel`
Engenharia: `enviar_projeto_para_engenharia`, `aprovar_projeto`, `cancelar_projeto`
Auditoria/segurança: `is_admin`, `has_role`, `has_permission`, `is_period_closed`, `can_edit_operacional`, `soft_delete_entidade`, `refresh_mv_kpis`, `kpi_*`

## Triggers críticos (NÃO mexer)

- `tg_tf_bloqueia_baixa_manual` (D4.1) — exige flag `app.via_movimentacao`
- `tg_mf_aplica_movimento` — engine de movimentação financeira atômica
- `tg_em_append_only`, `tg_em_bloqueia_saldo_negativo`, `tg_em_valida_origem` (estoque)
- `tg_wf_valida_transicao` — exige flag `app.via_workflow_rpc`
- `tg_pv_valida_transicao`, `tg_pv_status_historico` (PV)
- `tg_tf_guard_periodo`, `tg_guard_estado_critico` (governança)
- `tg_audit_row` (configurável por tabela — Onda 5 anexa nas faltantes)
- `tg_snapshot_version` (versionamento)
- `tg_er_bloqueia_pv_cancelado` (estoque ↔ PV)

## Estado linter (D14.2)

- Total atual: ~75 warns (estável desde D14.2)
- Todas as views em `security_invoker=on`
- `EXECUTE FROM anon REVOKED` em 65 funções DEFINER

## Próximo passo

Onda 1.A criar:
- View `v_lancamentos_derivados` (security_invoker=on)
- RPCs `rpc_lancamento_*` (SECURITY DEFINER, EXECUTE TO authenticated)
- Tabela `migracao_d15_log`
- Tabela `idempotency_keys`
