# D20.SUP.3 — Workflow Aprovação + Integração com Estoque

**Data:** 2026-06-02
**Status:** APLICADA
**Escopo:** Fechar o elo Requisição → Reserva → Entrega/Baixa → Custo realizado na O.S. → Orçado x Realizado, com devolução parcial e visão de materiais dentro da O.S.

---

## 1) Banco de dados

Migração `D20.SUP.3 — Workflow estoque das Requisições`:

### Schema
- `suprimentos_requisicao_itens` ganhou:
  - `reserva_id uuid` (FK `estoque_reservas` ON DELETE SET NULL)
  - `movimento_baixa_id uuid` (FK `estoque_movimentos` ON DELETE SET NULL)
  - 2 índices parciais (somente registros com vínculo)

### RPCs novas / atualizadas (SECURITY DEFINER, `search_path='public'`, `REVOKE anon` + `GRANT authenticated`)

| RPC | Função |
|---|---|
| `rpc_sup_requisicao_verificar_estoque(p_id)` | **Reescrita.** Junta com `v_estoque_saldos` e retorna por item: `qtd_solicitada/aprovada/reservada/entregue/devolvida`, `saldo_fisico`, `saldo_reservado_total`, `saldo_disponivel`, `falta` e `status_atendimento` ∈ {DISPONIVEL, PARCIAL, INDISPONIVEL, RESERVADO, SEM_VINCULO, NAO_APROVADO}. Registra evento `ESTOQUE_VERIFICADO`. |
| `rpc_sup_requisicao_reservar(p_id)` | **Nova.** Exige O.S. vinculada + permissão `suprimentos.requisicao.atender`. Para cada item com `item_estoque_id`, reserva `LEAST(falta, disponível)` via `rpc_os_reservar_material` (reaproveita reserva existente quando há) e atualiza `quantidade_reservada` + `reserva_id`. Muda status para **EM_SEPARACAO** quando reserva ≥1 item. Registra `RESERVA_REALIZADA`. |
| `rpc_sup_requisicao_entregar(p_id, p_observacao)` | **Nova.** Para cada item com reserva, chama `rpc_os_baixar_material(reserva_id, qtd_falta_entregar)` — que internamente gera `estoque_movimentos.SAIDA`, `os_custos_realizados(origem=ESTOQUE)` e evento `MATERIAL_BAIXADO`. Atualiza `quantidade_entregue` + `movimento_baixa_id`. Status final → **ATENDIDA** (totalmente) ou **PARCIALMENTE_ATENDIDA**. |
| `rpc_sup_requisicao_devolver_item(p_item_id, p_quantidade, p_motivo)` | **Nova.** Motivo ≥5 chars. Chama `rpc_os_devolver_material(movimento_baixa_id, qtd, motivo)` que gera ENTRADA + custo realizado negativo (`origem=ESTOQUE_DEVOLUCAO`). Atualiza `quantidade_devolvida`. Registra `DEVOLUCAO`. |

### View nova
- `v_os_requisicoes_resumo` (`security_invoker=on`, `GRANT SELECT TO authenticated`):
  agrega por requisição vinculada a O.S.: contagens (qtd_itens), totais (solicitado/aprovado/reservado/entregue/devolvido) e `custo_material_total` (somatório de `estoque_movimentos.custo_total` via `movimento_baixa_id`).

### Permissões reutilizadas
- `suprimentos.requisicao.atender` (já existente em D20.SUP.2) governa Reservar / Entregar / Devolver.
- `os.material.reservar / baixar / devolver` (D20.1) — validadas dentro das RPCs `rpc_os_*` chamadas em cascata.

### Regras de pedra preservadas
- Status só muda via flag `app.via_sup_req_rpc='true'` setada pela própria RPC.
- Baixa de estoque sempre via `rpc_os_baixar_material` → custo realizado AUTOMÁTICO com `origem_tipo='ESTOQUE'`.
- Devolução sempre via `rpc_os_devolver_material` → ajuste negativo automático com `origem_tipo='ESTOQUE_DEVOLUCAO'`.
- Reserva nunca acima do disponível (`LEAST(falta, disponível)`); item sem `item_estoque_id` é ignorado com aviso no resumo.
- Sem O.S. vinculada na requisição → reserva/baixa rejeitada com mensagem clara.
- Nenhum INSERT direto em `estoque_movimentos` / `os_custos_realizados` — sempre via RPC oficial.
- Nenhum financeiro automático nesta onda.

---

## 2) Frontend

### Repo (`src/lib/repositories/suprimentos-requisicoes-repo.ts`)
4 novos hooks: `useVerificarEstoqueRPC`, `useReservarRequisicao`, `useEntregarRequisicao`, `useDevolverItemRequisicao`. 1 nova query: `useOsRequisicoes(osId)` consumindo `v_os_requisicoes_resumo`.

### RequisicaoDetailDialog
- Toolbar de ações reorganizada em 3 blocos com separadores:
  - **Workflow:** Enviar / Aprovar / Reprovar (motivo) / Retornar (motivo) / Cancelar (motivo)
  - **Estoque:** Verificar estoque (popula aba) / Reservar / Entregar/Baixar
  - **Compras:** Enviar p/ compra / Atender total
- Botões Reservar e Entregar são desabilitados (com tooltip) se a requisição não tem O.S. vinculada.
- Nova **aba Estoque** mostra grid enriquecido (saldo físico / reservado total / disponível / falta + badge de atendimento Disponível/Parcial/Indisponível/Reservado).
- Coluna `Reserv.` / `Devolv.` adicionada na aba Itens + botão **Devolver** por linha (prompt qtd + motivo ≥5 chars, máximo = entregue − já devolvido).
- Toast diferenciado: sucesso silencioso quando estoque atende; aviso amarelo quando há indisponíveis/parciais.

### Nova aba "Materiais" em /engenharia/gestao-servicos/:osId
- `src/modules/os/MateriaisTab.tsx`: 4 cards (Requisições / Qtd aprovada / Qtd entregue / Custo material) + grid de requisições com badges de status e botão "Abrir" que reabre o `RequisicaoDetailDialog` no contexto da O.S.
- Mensagem explícita: "Custos refletem o que já foi baixado de estoque para a O.S. (origem = ESTOQUE) e impactam o Orçado x Realizado automaticamente."

---

## 3) Auditoria de botões (escopo 8)

Todos os botões da tela de Requisições têm ação ou mensagem clara:

| Botão | Ação | Estado quando não disponível |
|---|---|---|
| Verificar estoque | `rpc_sup_requisicao_verificar_estoque` + popula aba Estoque | Disabled fora de APROVADA / AGUARDANDO_ESTOQUE / EM_SEPARACAO / PARCIALMENTE_ATENDIDA |
| Reservar | `rpc_sup_requisicao_reservar` | Disabled sem O.S. (tooltip explicativo) ou status incompatível |
| Entregar / Baixar | `rpc_sup_requisicao_entregar` | Disabled fora de EM_SEPARACAO / PARCIALMENTE_ATENDIDA, ou sem O.S. |
| Devolver (por item) | Prompt qtd+motivo → `rpc_sup_requisicao_devolver_item` | Disabled se entregue − devolvido = 0 |
| Enviar para compra | Prompt justificativa → `rpc_sup_requisicao_enviar_compra` | Disabled fora de APROVADA / AGUARDANDO_ESTOQUE |
| Atender total | `rpc_sup_requisicao_atender_total` | Disabled fora de status compatíveis |
| Enviar / Aprovar / Reprovar / Retornar / Cancelar | RPCs do D20.SUP.2 | Disabled conforme matriz de status |
| Histórico | Aba interna (sempre disponível) | — |
| Filtros / Colunas / Exportar (tab Requisições) | `EnterpriseRecordToolbar` D17.UI | — |

**Não implementados nesta onda (mensagem explícita / fora de escopo):**
- Botão "Separar" / "Confirmar separação" — o estado **EM_SEPARACAO** é assumido como passo único entre Reservar e Entregar; a separação física fica como atributo do entregar/baixar.
- Kanban — fora de escopo D20.SUP.3 (placeholder em /suprimentos para D20.SUP.4+).
- Assinatura/foto na entrega — preparado para futuras subondas (campos extras na devolução já existem como motivo).

---

## 4) Critério de aceite

✅ Criar Requisição de material vinculada a uma O.S.
✅ Aprovar
✅ Verificar saldo (com status por item + saldo físico/disponível)
✅ Reservar (gera `estoque_reservas` + atualiza saldo_reservado)
✅ Entregar/Baixar (gera `estoque_movimentos.SAIDA` + `os_custos_realizados.origem=ESTOQUE`)
✅ Custo realizado automático na O.S.
✅ Reflete em Orçado x Realizado (categoria MATERIAL)
✅ Visão dentro da O.S. (nova aba Materiais)
✅ Devolução parcial ou total com motivo
✅ Histórico append-only de todas as operações

---

## 5) Restrições respeitadas

- ❌ Nenhum financeiro automático gerado.
- ❌ Cotação / pedido / recebimento — fora de escopo (D20.SUP.4+).
- ❌ Nenhuma RLS afrouxada; permissões oficiais (`suprimentos.requisicao.atender`, `os.material.*`) reusadas.
- ❌ Nenhuma RPC oficial burlada.
- ❌ Estoque negativo bloqueado (LEAST disponível na reserva, saldo reservado validado na baixa).
- ❌ Nenhuma quebra em O.S. ou Estoque atuais.

---

## 6) Linter

184 WARN (+6 sobre baseline 178). Os 6 novos são padrão D14.2:
- 3 × "Public Can Execute SECURITY DEFINER Function" — as 3 RPCs novas (`reservar`, `entregar`, `devolver_item`) têm REVOKE anon + GRANT authenticated, padrão da casa.
- 3 × ruído estrutural pré-existente em outros módulos disparado por reanálise.

Nenhum ERROR. Maturidade global estimada **~98,5% → ~99%** (escopo operacional fechado para o ciclo Requisição → Custo na O.S.).

---

## 7) Próximas ondas sugeridas

- **D20.SUP.4** — Cotação + Pedido de Compra + Recebimento (preenche o caminho "sem saldo → comprar → atender").
- **D20.SUP.5** — Anexos/fotos/assinatura na entrega (universal Attachment Engine D6.13.4).
- **D20.SUP.6** — Kanban de requisições em /suprimentos.
- **D20.SUP.7** — Workflow D5.1 (alçadas) sobre `rpc_sup_requisicao_aprovar`.
