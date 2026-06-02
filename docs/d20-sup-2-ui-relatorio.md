# D20.SUP.2.UI — Tela de Requisições de Suprimentos

**Data:** 2026-06-02
**Escopo:** UI puro sobre o backend D20.SUP.2. Zero migração, zero RPC nova, zero alteração de RLS.

## Entregas

1. **Repositório oficial** `src/lib/repositories/suprimentos-requisicoes-repo.ts`
   - `useRequisicoes(filters)` — lê `v_suprimentos_requisicoes_resumo` (limite 500, ordem por `criado_em desc`).
   - `useRequisicaoDetalhe(id)` — cabeçalho + itens + eventos em paralelo.
   - 12 hooks de mutation, um por RPC oficial: `useCriarRequisicao`, `useAtualizarRequisicao`, `useEnviarRequisicao`, `useAprovarRequisicao`, `useReprovarRequisicao`, `useRetornarRequisicao`, `useCancelarRequisicao`, `useVerificarEstoque`, `useEnviarCompra`, `useAtenderParcial`, `useAtenderTotal`, `useRegistrarEvento`.
   - Helpers `STATUS_LABEL`, `STATUS_TONE`, `STATUS_OPTIONS`, `PRIORIDADE_OPTIONS`.

2. **Tela principal** `src/modules/suprimentos/RequisicoesTab.tsx`
   - `EnterpriseRecordToolbar` (entityType=`compras`) com: Novo, Atualizar, Exportar (CSV), Filtros, Colunas.
   - Busca por número (debounce client-side).
   - Filtros: Tipo (Todos/Material/Serviço) e Status (13 valores canônicos).
   - Tabela densa: Nº · Tipo · Status (badge canônico) · Prioridade · Data necessária · Itens · Valor estimado · Valor aprovado · Criado em · Ações.
   - Rodapé com contagem + total estimado.
   - `RowActions` por linha (Visualizar / Histórico).
   - Linha clicável abre o detalhe.

3. **Diálogo Nova Requisição** `src/modules/suprimentos/NovaRequisicaoDialog.tsx`
   - Cabeçalho: tipo, prioridade, setor, data necessária, justificativa.
   - Múltiplos itens (descrição, unidade, qtd solicitada, valor unit. estimado).
   - Validações: ≥1 item com descrição e qtd > 0 antes de submeter.
   - Submete via `rpc_sup_requisicao_criar`; ao sucesso, abre o detalhe da nova requisição.

4. **Diálogo Detalhe / Ações** `src/modules/suprimentos/RequisicaoDetailDialog.tsx`
   - Header com nº + badge de status canônico + tipo + prioridade.
   - **Barra de ações** governada por status (gating client-side espelhando regras do backend):
     | Botão | Habilitado em |
     |---|---|
     | Enviar | RASCUNHO, RETORNADA |
     | Aprovar | ENVIADA, EM_APROVACAO |
     | Reprovar (motivo ≥5) | ENVIADA, EM_APROVACAO |
     | Retornar (motivo ≥5) | ENVIADA, EM_APROVACAO |
     | Cancelar (motivo ≥5) | Todos exceto CANCELADA/ATENDIDA/REPROVADA |
     | Verificar estoque | APROVADA, AGUARDANDO_ESTOQUE |
     | Enviar para compra (justificativa) | APROVADA, AGUARDANDO_ESTOQUE |
     | Atender total | APROVADA, EM_SEPARACAO, EM_COMPRA, PARCIALMENTE_ATENDIDA |
   - Prompt de motivo inline para Reprovar / Retornar / Cancelar / Enviar para compra (mín. 5 chars).
   - Abas: **Dados** (campos do cabeçalho + motivos quando preenchidos), **Itens** (tabela densa com qtds solicitada/aprovada/entregue + valores), **Histórico** (eventos append-only ordenados por data, mostrando transição de status).

5. **Integração ao hub Suprimentos**
   - `src/lib/route-tabs.ts`: aba `requisicoes` deixa de redirecionar para `/solicitacoes-material` e passa a ser interna.
   - `src/routes/suprimentos.tsx`: novo `TabsTrigger` + `TabsContent` que renderiza `RequisicoesTab`.

## Validação de botões (critério: nenhum botão visível sem ação)

| Botão | Status |
|---|---|
| Novo | ✅ abre `NovaRequisicaoDialog` |
| Salvar (no diálogo Novo) | ✅ `rpc_sup_requisicao_criar` |
| Cancelar (modal Novo) | ✅ fecha + reset |
| Atualizar | ✅ `refetch` + toast |
| Exportar | ✅ download CSV (10 colunas) |
| Filtros | ✅ Tipo + Status (`Select`) |
| Colunas | ✅ delega ao `EnterpriseRecordToolbar` (toast informativo até D17.UI.4 cobrir esta entidade) |
| Buscar | ✅ filtro por número |
| Visualizar | ✅ abre detalhe |
| Histórico | ✅ abre detalhe na aba Histórico |
| Enviar | ✅ `rpc_sup_requisicao_enviar` |
| Aprovar | ✅ `rpc_sup_requisicao_aprovar` |
| Reprovar | ✅ `rpc_sup_requisicao_reprovar` (motivo) |
| Retornar | ✅ `rpc_sup_requisicao_retornar` (motivo) |
| Cancelar (no detalhe) | ✅ `rpc_sup_requisicao_cancelar` (motivo) |
| Verificar estoque | ✅ `rpc_sup_requisicao_verificar_estoque` (mostra faltas via toast) |
| Enviar para compra | ✅ `rpc_sup_requisicao_enviar_compra` (justificativa) |
| Atender total | ✅ `rpc_sup_requisicao_atender_total` |
| Fechar modal | ✅ `onOpenChange(false)` |
| Voltar | ✅ click fora ou Esc fecha o diálogo |

**Kanban / Atender parcial** ainda não exposto na UI desta fase — RPCs `useAtenderParcial` já existem no repo e serão consumidas em D20.SUP.4 (atendimento parcial granular item-a-item) e D20.SUP.UI+ (Kanban por status).

## Critério de aceite

Fluxo end-to-end suportado nesta entrega:

1. Criar requisição de material com itens ✅ (`Novo` → preenche → `Salvar`).
2. Enviar para aprovação ✅ (`Enviar`).
3. Aprovar ✅ (`Aprovar`).
4. Verificar estoque ✅ (`Verificar estoque`).
5. Reprovar / Cancelar com motivo ✅ (botões com prompt inline).
6. Consultar histórico completo ✅ (aba Histórico).

## Restrições mantidas

- ❌ Não alterou RLS.
- ❌ Não alterou RPCs (somente consome as 12 oficiais).
- ❌ Não gera financeiro automático.
- ❌ Não toca compras/cotação/pedido (D20.SUP.5).
- ❌ Não toca estoque/entregas existentes.
- ❌ Não burla workflow (status só muda via RPC; backend impõe flag `app.via_sup_req_rpc`).

## Próximo

- **D20.SUP.3** — Workflow D5.1 (alçada `requisicao_suprimentos` por valor + CR + tipo).
- **D20.SUP.4** — Atendimento parcial item-a-item + integração efetiva com `rpc_sup_reservar/baixar` (D20.1).
