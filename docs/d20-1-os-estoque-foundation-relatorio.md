# D20.1 — Fundação Integração O.S. ↔ Estoque

**Data:** 2026-06-02  
**Escopo:** schema + RPCs (sem UI)  
**Aprovado:** D20 (sub-onda 1 de 6)

## Entregue

### Schema
- `estoque_reservas` + `estoque_movimentos`: novas FKs `os_id` (→ `os_ordens`) e `tarefa_id` (→ `os_tarefas`), nullable, com índices parciais.
- `os_custos_realizados`:
  - `origem_tipo` agora NOT NULL com default `MANUAL` e CHECK em `{MANUAL,ESTOQUE,ESTOQUE_DEVOLUCAO,COMPRA,FINANCEIRO_FUTURO}`
  - `valor` aceita negativo (era `>= 0`), agora apenas `<> 0` — viabiliza estorno linha-a-linha
  - índice em `(origem_tipo, origem_id)` para rastrear de volta ao movimento

### Permissões novas
- `os.material.reservar`
- `os.material.baixar`
- `os.material.devolver`

### RPCs oficiais (SECURITY DEFINER, search_path=public, REVOKE anon + GRANT authenticated)
| RPC | Função |
|---|---|
| `rpc_os_reservar_material(os_id, produto_id, qtd, motivo?, tarefa_id?)` | cria reserva vinculada à O.S., evento `MATERIAL_RESERVADO` |
| `rpc_os_baixar_material(reserva_id, qtd, custo_unit?, obs?)` | gera `estoque_movimentos.SAIDA` + atualiza reserva (`PARCIAL`/`ENTREGUE`) + insere `os_custos_realizados` categoria `MATERIAL` origem `ESTOQUE` apontando para o movimento |
| `rpc_os_devolver_material(movimento_id, qtd, motivo)` | gera `ENTRADA` proporcional + reverte saldo entregue da reserva + insere custo `ESTOQUE_DEVOLUCAO` com valor negativo |
| `rpc_os_cancelar_reserva(reserva_id, motivo)` | marca reserva `CANCELADA` |

Todas exigem permissão correspondente (ou role admin) e validam quantidades. Custo realizado nasce automaticamente da baixa — zero edição manual.

### View oficial
- `v_os_material_resumo` (security_invoker, GRANT authenticated): por O.S., agrega reservas ativas, qtd reservada, qtd entregue, custo baixado, custo devolvido, **custo realizado líquido por estoque**.

## Restrições respeitadas
- Sem UI nova
- Sem geração automática de financeiro
- RLS existente intacto
- Nenhuma regra fora da O.S. tocada
- Vínculos legados (`obra_id`/`pv_id`/`projeto_id`) preservados

## Estado do linter
- Total: 164 WARN (era 139 + 25 novas das RPCs DEFINER, todas alinhadas ao padrão aceito em D14.2 — `REVOKE EXECUTE FROM anon` aplicado, `search_path` setado, sem ERRORs).

## Próximas sub-ondas
- **D20.2** — UI "Material" dentro da O.S. (Reservar / Baixar / Devolver / Cancelar) + integração com `EnterpriseRecordToolbar`
- **D20.3** — Compras → O.S.: vínculo `solicitacoes_material.os_id` + recebimento alimenta reserva
- **D20.4** — Orçado × Realizado: card de variação de material por O.S. consumindo `v_os_material_resumo` + `v_os_orcado_realizado`
- **D20.5** — Auditoria de botões dos módulos afetados
- **D20.6** — Operação simulada (adiada para depois de D20.2–D20.5)

## Maturidade
- ERP global: ~99% → mantido (foundation puro)
- Camada O.S. operacional: 95% → 96% (custo realizado automático destravado)
- Pronto para destravar UI em D20.2.
