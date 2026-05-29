# D17.UI.6 — Operações Financeiras Enterprise (relatório executivo)

**Data:** 2026-05-29  
**Status:** APLICADA.

## Entregas

1. **Anexos universais para Operações Financeiras**
   - Migração: `anexos.entidade_tipo_check` ampliado para incluir `operacoes_financeiras` e `operacoes_financeiras_parcelas`.
   - `pode_acessar_entidade()` ganha 2 branches que exigem permissão `operacao_financeira.visualizar` (admin segue total). RLS NÃO afrouxada.
   - `ENTIDADES_ANEXAVEIS` (engine TS) ampliada para os mesmos 2 tipos.
   - `AnexosButton` inline em cada linha do grid — categoria padrão `financeiro`, hint cobre contrato/comprovante/termo/autorização/recibo.

2. **Grid Enterprise (padrão RM/TOTVS)**
   - `RowActions` por status (regra de pedra):
     - **RASCUNHO / EM_APROVACAO:** Visualizar · Editar (overflow) · Aprovar · Aprovar e Liberar · Cancelar · Anexos · Histórico.
     - **APROVADA:** Visualizar · Liberar · Cancelar · Anexos · Histórico.
     - **LIBERADA / EM_PAGAMENTO / QUITADA:** Visualizar · Estornar (na visão) · Anexos · Histórico.
     - **CANCELADA / RENEGOCIADA:** Visualizar · Anexos · Histórico.
   - Cores canônicas D17.UI: azul = visualizar/anexos, verde = aprovar/liberar, vermelho = cancelar/estornar, índigo = histórico, âmbar = editar.

3. **Drawer detalhe**
   - Seção **Parcelas** — vencimento / competência / valor / observação / titulo_id (rastreabilidade).
   - Seção **Títulos gerados** — leitura via `useOpFinTitulos` (`origem_tipo='OPERACAO_FINANCEIRA' AND origem_id=op.id`). Botão **Estornar** por título chama `rpc_op_fin_estornar_recebimento`.
   - Seção **Histórico** — eventos append-only de `operacoes_financeiras_eventos`.
   - `ProcessosMenu` no header do drawer: Aprovar · Liberar · Aprovar e liberar · Cancelar (gated por status com hint).

4. **Regra de empréstimo (tipo → natureza canônica)**
   - `naturezaCanonicaParaTipo()` aplica regra de pedra ao trocar o tipo no diálogo:
     - Empresa **concede** (CLIENTE/FORNECEDOR/COLABORADOR/TERCEIRO/APLICACAO) → `SAIDA` → gera **A Receber**.
     - Empresa **recebe** (SOCIO_EMPRESA/CAPITAL_DE_GIRO/APORTE) → `ENTRADA` → gera **A Pagar**.
   - Usuário ainda pode sobrescrever manualmente (devoluções de sócio).

5. **Telemetria & error_log**
   - Mantido `withPerf("rpc.op_fin_criar" | "_aprovar" | "_liberar")` no repo.
   - `reportMutationError` registra falhas em `error_log` (módulo `financeiro`, tela `/operacoes-financeiras`, ação `op-fin:*`).
   - Toda ação na UI emite toast de sucesso ou erro — sem falha silenciosa.

## Critérios de aceite

- [x] Ações por status no padrão RM.
- [x] Menu Processos no drawer.
- [x] Anexos funcionando para `operacoes_financeiras` (allowlist + RLS por permissão).
- [x] Aprovar / Liberar / Aprovar e Liberar executam RPCs com toast + perf + error_log.
- [x] Geração de títulos visível na seção "Títulos gerados".
- [x] Estornar disponível por título.
- [x] Type-check limpo (`bunx tsc --noEmit` exit 0).

## Restrições respeitadas

- RLS não afrouxada (anexos exigem permissão `operacao_financeira.visualizar`).
- Auditoria intacta (`operacoes_financeiras_eventos` + `anexos_audit`).
- Nenhum lançamento manual em AR/AP — títulos só nascem via `rpc_op_fin_liberar`.
- Rastreabilidade preservada (parcela.titulo_id + dados.parcela_id/numero).
- Histórico append-only mantido.

## Próximos (D17.UI.6.b — opcional)

- Editor inline de operação no drawer (RASCUNHO/APROVADA).
- ColumnManager + FilterPanel + Exportar CSV (placeholders ainda em D17.UI.4c).
- Badge de contagem de anexos por linha.

**Libera D19.2 após validação operacional do Renan.**
