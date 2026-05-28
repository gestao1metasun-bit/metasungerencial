# D15 — Onda 1.A (REESCRITA) — Relatório de Aderência ao Schema Real

Reescrita pós Onda 1.A.0 REV2 aplicada. Tudo abaixo foi conferido contra o banco real (snapshot 2026-05-28).

## 1. Aderência view derivada × tabelas reais

| Fonte (UNION) | Tabela real | Colunas usadas | Status |
|---|---|---|---|
| TITULO | `titulos_financeiros` | tipo, cliente_id, fornecedor_id, contrato_id, centro_id, conta_id, **natureza_id**, valor_bruto, valor_liquido, saldo, competencia, vencimento, status, codigo, observacoes, **codigo_externo/status_integracao/lote_integracao_id**, created_by | OK — usa campos REV2 |
| PARCELA | `parcelas_financeiras` | titulo_id, numero, valor, saldo, vencimento, recebido_em, status, observacoes, integrabilidade, created_by | OK |
| MOVIMENTO | `movimentacoes_financeiras` | titulo_id, parcela_id, tipo, valor, data, conta_id, forma_pagamento, observacao, user_id, integrabilidade | OK |
| ADIANTAMENTO | `adiantamentos` | direcao, cliente_id, fornecedor_id, contrato_id, data_movimento, competencia, valor, valor_abatido, saldo, status, conta_id, codigo, documento, observacao, integrabilidade, created_by | OK — tabela REV2 |
| EXTRATO | `extrato_banco` | conta_id, data, descricao, valor, documento, status, titulo_id, movimento_id, integrabilidade, importado_por | OK — filtra não conciliados |
| BOLETO | `boletos` | fornecedor_id, numero_boleto, data_emissao, data_entrada, valor_total, status, codigo, observacoes, integrabilidade, created_by | OK |
| RESCISAO | `rescisoes_contrato` | contrato_id, cliente_id, data_rescisao, motivo, devolucao_liquida, conta_devolucao_id, vencimento_devolucao, status, codigo, integrabilidade, created_by | OK |

Soft-delete: todas as fontes filtram `deleted_at IS NULL` onde a coluna existe.

## 2. Aderência RPCs × FKs / enums reais

| RPC | Permissão usada (enum real) | Tabelas mutadas | FKs respeitadas | Integra c/ hardening |
|---|---|---|---|---|
| rpc_lancamento_criar | `financeiro.editar` | titulos_financeiros, parcelas_financeiras | natureza_id→naturezas_financeiras, cliente/fornecedor/contrato/centro/conta_id | — |
| rpc_titulo_baixar | `financeiro.movimentar` | movimentacoes_financeiras | titulo_id, parcela_id, conta_id | Seta `app.via_movimentacao=true` (compatível com tg_tf_bloqueia_baixa_manual D4.1) |
| rpc_titulo_estornar | `financeiro.movimentar` | movimentacoes_financeiras (tipo=ESTORNO) | idem | Idem |
| rpc_titulo_cancelar | `financeiro.editar` | titulos_financeiros | — | Bloqueia se houver movimentação não estornada |
| rpc_adiantamento_registrar | `financeiro.movimentar` | adiantamentos | cliente_id XOR fornecedor_id | — |
| rpc_adiantamento_abater | `financeiro.movimentar` | movimentacoes_financeiras, adiantamento_abatimentos, adiantamentos | adiantamento_id, parcela_id, movimentacao_id | Seta `app.via_movimentacao=true` |
| rpc_renegociacao_aplicar | `financeiro.renegociar` | titulos_financeiros (origem+novo), parcelas_financeiras | titulo_substituto_id auto-FK | — |

Todas as 7 RPCs:
- `SECURITY DEFINER` + `SET search_path = public`
- `REVOKE ALL ... FROM PUBLIC, anon`
- `GRANT EXECUTE ... TO authenticated`
- gate via `public.has_permission(auth.uid(), <perm>)`
- registro em `public.audit_log` via helper `fn_audit_lancamento`
- idempotência opcional via `_request_id uuid` ↔ tabela `rpc_idempotencia`

## 3. Compatibilidade com objetos D14/D6.13 existentes

- `v_titulos_enriquecido` permanece intacta (não é tocada).
- `v_kpis_financeiro_oficial` e `v_reconciliacao_financeira` continuam fonte oficial de KPI; `v_lancamentos_derivados` complementa (fonte de **lançamentos**, não de saldo).
- Triggers de hardening D4.1 (`tg_tf_bloqueia_baixa_manual`) ativos: RPCs `baixar/estornar/abater` setam `app.via_movimentacao` antes do INSERT.
- Workflow D5.1 não é exigido nesta onda (renegociação > alçada será Onda 1.B).

## 4. Compatibilidade com futura Onda 1.B

Onda 1.B poderá:
1. ligar `useTitulos`/`useLancamentos` à view `v_lancamentos_derivados` sob flag `D15_FIN_DUAL_READ`;
2. trocar gravações LS por chamada das RPCs sob flag `D15_FIN_DUAL_WRITE`;
3. exigir workflow para `rpc_renegociacao_aplicar` em valores acima de alçada, reusando `workflow_aprovacoes` (D5.1);
4. preencher `lote_integracao_id` + `status_integracao` quando o motor de exportação for ligado (não nesta onda).

Nenhum nome/contrato definido aqui colide com o estado atual da UI ou stores.

## 5. Riscos e mitigações

| # | Risco | Mitigação |
|---|---|---|
| R1 | Linter sinalizar nova view como sem RLS | View é `security_invoker=on`, herda RLS das tabelas base — comportamento esperado, sem novos WARNs em `v_kpis_*`. |
| R2 | RPC SECURITY DEFINER exposta a anon | `REVOKE FROM PUBLIC, anon` explícito em todas as 7. Validação V4. |
| R3 | Baixa duplicada por reenvio do front | `_request_id` + tabela `rpc_idempotencia` com PK. |
| R4 | Conflito com trigger D4.1 | Uso de `set_config('app.via_movimentacao','true', true)` (escopo transação). |
| R5 | Cancelar título com baixa real | RPC bloqueia se existir movimento ≠ ESTORNO. |
| R6 | Adiantamento abatido > saldo | `FOR UPDATE` + checagem aritmética antes do INSERT. |
| R7 | View pesada em produção | UNION ALL sobre tabelas indexadas; sem materialização — se necessário, criar MV em Onda 1.B. |

## 6. Plano de teste (executar pós-migração)

1. `SELECT count(*) FROM public.v_lancamentos_derivados;` → não erra (0 hoje).
2. Validações V1–V5 do MIGRATION.sql.
3. Smoke autenticado:
   - chamar `rpc_lancamento_criar('RECEBER','AVULSO',null,100,'2026-06-15',<nat>,...,'req-1')` 2x → 1 título.
   - `rpc_titulo_baixar(parc,50,now(),conta,'PIX',null,'req-2')`.
   - `rpc_titulo_estornar(mov,'teste','req-3')`.
   - `rpc_titulo_cancelar(tit,'teste cancel','req-4')` → erro esperado (existe baixa).
4. Conferir `audit_log` recebeu 4 linhas com `modulo='financeiro'`.
5. Confirmar volumetria das 7 tabelas inalterada (continua zero).
6. `supabase--linter`: contagem total não deve aumentar.

## 7. Rollback

Bloco `BEGIN..COMMIT` ao final do MIGRATION.sql derruba na ordem inversa: RPCs → helper → view → tabela idempotência. Nenhum dado é tocado (não houve migração de dados).

## 8. Checklist de aceite

- [ ] MIGRATION.sql aplica sem erro
- [ ] 6 validações V1–V6 passam
- [ ] 0 RPCs novas executáveis por `anon`
- [ ] View `v_lancamentos_derivados` listável
- [ ] `supabase--linter`: nenhum novo WARN/ERROR
- [ ] Volumetria preservada nas 7 tabelas
- [ ] Flags D15_* permanecem `false`
- [ ] UI/stores inalteradas
- [ ] Documentação atualizada (este arquivo + memória)

## 9. Recomendação

Submeter o MIGRATION.sql via `supabase--migration` em **dois pacotes** para isolar falhas:
1. Tabela `rpc_idempotencia` + helper `fn_audit_lancamento` + view `v_lancamentos_derivados`.
2. As 7 RPCs financeiras + REVOKE/GRANT.

Após aprovação do usuário, posso emitir as migrações.
