# D6.11 — Bulk Operations Enterprise

Separar definitivamente **flag visual** (D6.10, já feito) de **ação em lote transacional** (D6.11, novo). Implementar infra genérica de seleção múltipla no `EnterpriseDataGrid` + primeira ação enterprise real: **renegociação consolidada de títulos financeiros**.

---

## D6.11.1 — Infra de seleção múltipla (genérica)

**`EnterpriseDataGrid`:**
- Coluna sticky de checkbox (header + linha), antes da coluna de flag
- Prop `selectable?: boolean` (default false — não quebra grids existentes)
- Prop controlada `selectedIds` + `onSelectionChange`
- Suporte a Shift+Click (range), Ctrl/Cmd+Click (toggle), header tri-state (none/some/all)
- Limpa seleção ao mudar filtro/página

**`EnterpriseToolbar`:**
- Slot `bulkActions?: ReactNode` — só renderiza quando `selectedIds.length > 0`
- Contador visível: "3 selecionados • Limpar"
- Substitui visualmente os botões "single record" (Editar/Anexar/Flag) enquanto há seleção múltipla

**Hook `useBulkSelection<T>(rows)`:**
- Estado de IDs selecionados, helpers `toggle/toggleAll/clear/isSelected`
- Retorna `selectedRows` derivado para validações

---

## D6.11.2 — Ação em lote: Renegociação Consolidada (Financeiro)

### Migração DB

**Novas colunas em `titulos_financeiros`:**
- `renegociado_em timestamptz`
- `renegociado_por uuid`
- `motivo_renegociacao text`
- `titulo_substituto_id uuid` (FK self) — aponta para o novo título consolidado
- Novo status permitido: `RENEGOCIADO` (já existe) + `SUBSTITUIDO` (novo, semântica de consolidação)

**Nova tabela `titulos_renegociacoes`** (cabeçalho do acordo):
- `id`, `cliente_id`, `titulo_novo_id`, `motivo`, `juros_aplicado`, `multa_aplicada`, `desconto_aplicado`, `valor_original_total`, `valor_renegociado_total`, `user_id/email`, `created_at`

**Tabela de vínculo `titulos_renegociacao_itens`:**
- `renegociacao_id`, `titulo_antigo_id`, `valor_consolidado`

**RPC `renegociar_titulos_lote(_titulo_ids uuid[], _motivo text, _condicoes jsonb)`:**

`_condicoes` = `{ parcelas: [{vencimento, valor}], juros, multa, desconto, observacao, conta_id?, portador_id? }`

Validações (transacional):
1. `auth.uid()` setado + permissão `financeiro.renegociar` ou admin
2. `array_length(_titulo_ids) >= 1`
3. `_motivo` mínimo 3 chars
4. Todos os títulos existem, `deleted_at IS NULL`
5. **Mesmo `cliente_id`** em todos (`COUNT(DISTINCT cliente_id) = 1`)
6. **Mesmo tipo** (CR ou CP — não misturar)
7. Status ∈ (`PENDENTE`, `PARCIAL`, `ATRASADO`) — bloqueia `RECEBIDO/CANCELADO/RENEGOCIADO/SUBSTITUIDO`
8. Saldo total > 0
9. Soma das novas parcelas ≈ `Σ saldos + juros + multa − desconto` (tolerância 0.01)

Efeitos:
1. Cria registro em `titulos_renegociacoes` (cabeçalho)
2. Cria **novo título** consolidado (mesmo cliente, valor = soma renegociada, origem = `RENEGOCIACAO`)
3. Cria parcelas conforme `_condicoes.parcelas`
4. Para cada título antigo: seta `status='SUBSTITUIDO'`, `titulo_substituto_id`, `renegociado_em/por/motivo`, **zera saldo via movimentação `renegociacao`** (não baixa caixa, marcador transacional)
5. Insere linhas em `titulos_renegociacao_itens` (vínculo antigo↔novo)
6. Snapshot em `entidade_versoes` para cada título antigo + novo
7. Audit log com `acao='RENEGOCIAR_LOTE'` e snapshot completo
8. Flag de sessão `app.via_renegociacao='true'` para passar pelo `tg_tf_bloqueia_baixa_manual`

Retorna: `{ titulo_novo_id, renegociacao_id }`

### UI

**`/financeiro/titulos`:**
- Grid passa a usar `selectable`
- Quando ≥1 selecionado, toolbar mostra ações em lote: **Renegociar**, **Cancelar em lote**, **Exportar selecionados**, **Imprimir**
- Botão **Renegociar** valida client-side (mesmo cliente, status ok) antes de habilitar; se inválido, mostra tooltip com motivo
- Abre `<RenegociarLoteDialog>`:
  - Resumo dos títulos selecionados (tabela read-only)
  - Inputs: motivo (obrigatório), juros %, multa %, desconto R$
  - Editor de parcelas (qtd + 1ª data + intervalo, ou tabela manual) com validação de soma
  - Preview do novo título (cliente, valor total, nº parcelas)
  - Confirmação → chama RPC → toast → refetch + abre o novo título

**Card de rastreabilidade** no detalhe de título:
- Se `SUBSTITUIDO` → "Renegociado em X, substituído por título Y" (link)
- Se origem = `RENEGOCIACAO` → "Consolida N títulos antigos" (lista com link)

---

## D6.11.3 — Outras ações em lote (segunda iteração, mesma infra)

Reusando `useBulkSelection` + slot `bulkActions`:

- **Aprovações** (`/aprovacoes`): Aprovar em lote / Negar em lote (mesma alçada, motivo obrigatório)
- **Pedidos de Venda**: Cancelar em lote, Exportar PDF/Excel, Mudar prioridade
- **Estoque**: Reservar para obra, Exportar saldos, Transferir (D10)
- **Engenharia**: Atribuir consultor, Mudar status (apenas transições válidas)

Cada uma vira sua própria RPC `<acao>_<entidade>_lote` seguindo o mesmo padrão de validação atômica + auditoria + snapshot.

---

## Ordem de execução

1. **D6.11.1** — `EnterpriseDataGrid` selectable + hook + toolbar slot
2. **D6.11.2 migração** — tabelas + RPC `renegociar_titulos_lote` + grants + RLS
3. **D6.11.2 UI** — `RenegociarLoteDialog` + integração na tela de títulos + card de rastreabilidade
4. **Validação manual** com o usuário
5. **D6.11.3** — demais ações em lote, uma onda por módulo

---

## Arquivos novos / alterados (D6.11.1 + D6.11.2)

**Migração:** `20260527_d611_renegociacao_lote.sql`

**Novos:**
- `src/hooks/useBulkSelection.ts`
- `src/components/financeiro/RenegociarLoteDialog.tsx`
- `src/components/financeiro/RastreabilidadeRenegociacaoCard.tsx`

**Alterados:**
- `src/components/erp/EnterpriseDataGrid.tsx` — coluna checkbox + props `selectable/selectedIds/onSelectionChange`
- `src/components/erp/EnterpriseToolbar.tsx` — slot `bulkActions` + contador
- `src/routes/_authenticated/financeiro/titulos.tsx` (ou equivalente) — wire-up + ações em lote
- `src/integrations/supabase/types.ts` — regenerado pela migração

---

## Decisões a confirmar antes de implementar

1. **`SUBSTITUIDO` é novo status** ou reusamos `RENEGOCIADO` para os antigos? (Proponho: `SUBSTITUIDO` p/ os antigos consolidados, `RENEGOCIADO` legado fica como sinônimo aceito)
2. **Permissão**: criar `financeiro.renegociar` nova, ou reusar `financeiro.titulos.editar`? (Proponho: nova, dado o impacto)
3. **CP (Contas a Pagar)** entra no mesmo RPC ou só CR nesta primeira onda? (Proponho: ambos, validando `tipo` uniforme)

Confirma a estrutura para eu prosseguir com D6.11.1 + D6.11.2 (migração primeiro)?
