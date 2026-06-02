# D20.SUP.4 — Compras dentro de Suprimentos

Status: APLICADA 2026-06-02.

## Entregas

1. **Schema** (2 migrações):
   - Enums `sup_cot_status`, `sup_ped_status`, `sup_rec_status` + 13 novas permissões `suprimentos.cotacao.*`, `suprimentos.pedido.*`, `suprimentos.recebimento.*`.
   - Tabelas canônicas: `suprimentos_cotacoes` (+ `_itens`, `_eventos`), `suprimentos_pedidos_compra` (+ `_itens`, `_eventos`), `suprimentos_recebimentos` (+ `_itens`, `_eventos`). Eventos append-only (trigger).
   - Coluna `pedido_item_id` em `suprimentos_requisicao_itens` (vínculo Requisição ↔ Pedido).

2. **Guard de status** em cada cabeçalho exige flag de sessão `app.via_sup_compras_rpc='true'` setada apenas pelas RPCs oficiais.

3. **RPCs** SECURITY DEFINER:
   - Cotação: `rpc_sup_cotacao_criar(req_id)`, `_enviar`, `_aprovar(p_id, fornecedor_id)`, `_reprovar(motivo)`, `_cancelar(motivo)`, `_item_upsert(...)`.
   - Pedido: `rpc_sup_pedido_gerar(cotacao_id)`, `_aprovar`, `_enviar`, `_cancelar(motivo)`.
   - Recebimento: `rpc_sup_recebimento_criar(...)`, `_confirmar(p_id)` atualiza `quantidade_recebida` dos itens do pedido, fecha o status do pedido (PARCIALMENTE_RECEBIDO/RECEBIDO) e libera material para o fluxo de separação/entrega da requisição original.
   - `_criar` recupera apenas os itens com falta (qtd aprovada – reservada – entregue) — não duplica o que já está reservado.
   - `_aprovar` exige fornecedor com ao menos um item cotado.

4. **Views auxiliares** (security_invoker): `v_suprimentos_compras_resumo`, `v_suprimentos_cotacoes_lista`, `v_suprimentos_pedidos_lista`, `v_suprimentos_recebimentos_lista`.

5. **UI**:
   - Repo oficial `src/lib/repositories/suprimentos-compras-repo.ts` (queries + 12 hooks de mutation).
   - 3 abas reais em `/suprimentos`: **Cotações**, **Pedidos**, **Recebimentos** com `EnterpriseRecordToolbar` + `RowActions` + `StatusBadge` cor canônica.
   - Dialogs de detalhe:
     - `CotacaoDetailDialog`: escolha de fornecedor por item, totais por fornecedor, ações Enviar / Aprovar / Reprovar / Cancelar / Gerar pedido + histórico.
     - `PedidoDetailDialog`: Aprovar / Enviar fornecedor / Cancelar + aba **Receber** com captura de quantidades por item e confirmação atômica (cria recebimento, insere itens, confirma via RPC).
     - `RecebimentoDetailDialog`: confirmar rascunho + histórico append-only.
   - Botão **"Enviar para compra"** no `RequisicaoDetailDialog` agora dispara `rpc_sup_requisicao_enviar_compra` **e** cria automaticamente a cotação via `rpc_sup_cotacao_criar`.

6. **Menu reorganizado**: macros `Compras` e `Estoque` removidos do MacroNav. As rotas continuam ativas e são reutilizadas dentro de **Suprimentos** (cards do hub + abas internas). NavItems migrados para o macro `suprimentos`.

## Restrições mantidas

- Sem geração financeira automática (vínculo cliente/fornecedor/CR/CC/OS preparado; conta a pagar é fase posterior).
- Toda mutação passa por RPC; sem UPDATE direto de status.
- Append-only em eventos (trigger).
- Motivo obrigatório (≥5) em reprovação/cancelamento.
- Recebimento não pode exceder a quantidade pedida (validado dentro da RPC).
- Recebimento gera entrada via fluxo já existente da requisição (separar/entregar/baixar) — não burla as RPCs D20.SUP.3.

## Linter

122 → 218 → 218 WARN (todos do padrão D14.2: SECURITY DEFINER callable, search_path, extensão em public).

## Próximos passos sugeridos

- D20.SUP.4.b: integração com Workflow D5.1 para alçada da cotação por valor.
- D20.SUP.5: Anexos (nota fiscal) no recebimento + assinatura digital do recebedor.
- D20.SUP.6: Kanban + relatório de rastreabilidade ponta-a-ponta.
- D20.SUP.7: gerar título AP automático na confirmação do recebimento (regra validada).
