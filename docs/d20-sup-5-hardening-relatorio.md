# D20.SUP.5 — Hardening + Teste Operacional de Suprimentos

> Onda de validação ponta a ponta do módulo **Suprimentos** após o fechamento
> de D20.SUP.1..4 (fundação, requisições, workflow estoque, compras).
> Esta entrega é **auditoria + correção pontual**, não nova feature.

---

## 1. Escopo testado

| Fluxo | Caminho | Resultado |
|---|---|---|
| F1 — Requisição com estoque disponível | REQ → Aprovar → Verificar → Reservar → Entregar | ✅ Aprovado |
| F2 — Requisição sem estoque | REQ → Aprovar → Verificar → Enviar p/ compra → Cotação → Pedido → Recebimento → Atende REQ | ✅ Aprovado |
| F3 — Requisição parcial | REQ → Reservar disponível → Enviar saldo p/ compra → Receber → Completar | ✅ Aprovado |
| F4 — Devolução | Entregar → Devolver parcial → Saldo+ / Custo− | ✅ Aprovado |
| F5 — Serviço | REQ tipo SERVICO → Cotação → Pedido → Recebimento (sem entrada física) → Custo OS | ⚠️ Aprovado com ressalva (ver §4) |

**Massa de teste**: ambiente HOMOLOGAÇÃO. Nenhum dado de produção tocado.
Nenhum financeiro automático foi gerado (regra D20: títulos AP só em D20.SUP.6+).

---

## 2. Rastreabilidade ponta a ponta

Toda movimentação real ocorre via RPC oficial, registrada em tabela
append-only `*_eventos` (RLS + triggers anti-UPDATE/DELETE) e propagada à
view `v_os_material_resumo` / `v_os_requisicoes_resumo`.

```
Requisição (suprimentos_requisicoes)
   └─ Itens (suprimentos_requisicao_itens) ─┬─ reserva_id ──→ estoque_reservas
                                            ├─ movimento_baixa_id ──→ estoque_movimentos (SAIDA, os_id)
                                            └─ pedido_item_id ──→ suprimentos_pedido_itens
                                                                      └─ cotacao
                                                                      └─ recebimentos → estoque_movimentos (ENTRADA)
   └─ Eventos (suprimentos_requisicao_eventos) — append-only, usuario+motivo+timestamp
↓
O.S. (os_ordens) ── v_os_material_resumo / os_custos_realizados (origem=ESTOQUE / ESTOQUE_DEVOLUCAO)
↓
Orçado x Realizado (já consumido pela aba Materiais/Custos da O.S.)
```

Campos garantidos em cada elo: **usuário · data/hora · status · motivo ·
fornecedor · item · qtd · valor · O.S. · CR · CC · natureza**.

---

## 3. Auditoria de botões e ações visíveis

Critério: nenhum botão visível sem ação funcional ou sem mensagem clara.

| Tela | Toolbar | Linha (RowActions) | Status |
|---|---|---|---|
| Dashboard | Atualizar | — | ✅ |
| Requisições | Novo · Atualizar · Exportar CSV · Filtros · Status | Visualizar · Histórico | ✅ |
| Detalhe Requisição | Enviar · Aprovar · Reprovar · Retornar · Cancelar · Verificar estoque · Reservar · Entregar · Enviar p/ compra | Devolver (por item) | ✅ |
| Cotações | Atualizar · Filtros · Status | Visualizar · Gerar pedido · Cancelar · Histórico | ✅ |
| Pedidos | Atualizar · Filtros · Status | Visualizar · Aprovar · Cancelar · Histórico | ✅ |
| Detalhe Pedido | Enviar ao fornecedor · Receber (atômico) | — | ✅ |
| Recebimentos | Atualizar · Filtros · Status | Visualizar · Confirmar · Histórico | ✅ |
| Estoque (aba interna) | Toolbar Enterprise legada preservada | RowActions oficiais | ✅ |
| Compras (aba interna) | Toolbar Enterprise legada preservada | RowActions oficiais | ✅ |
| Entregas · Cadastros · Relatórios | Placeholders honestos com banner "Em construção / D20.SUP.5+" | — | ⚠️ Placeholder declarado |

> **Botões não implementados ainda** (declarados honestamente no UI, sem
> simular ação): **Anexar nota**, **Kanban**, **Processos avançados**. Vão
> para D20.SUP.6/7.

---

## 4. Inconsistências encontradas + correções

| # | Inconsistência | Correção aplicada nesta onda |
|---|---|---|
| I1 | Rotas legadas `/estoque` e `/solicitacoes-material` continuavam abrindo telas plenas sem indicar a unificação. | Banner de compatibilidade compacto no topo de cada uma, com link âncora `/suprimentos#tab=estoque` e `/suprimentos#tab=requisicoes`. Telas mantidas funcionais. |
| I2 | Fluxo de **Serviço** (tipo `SERVICO`) usa o mesmo pipeline da compra (cotação/pedido/recebimento) sem entrada física no estoque. Hoje funciona porque `rpc_sup_recebimento_confirmar` só libera material para REQ se houver vínculo de item; serviço fica registrado em `suprimentos_recebimentos` + evento. | Validado. Decisão: **manter assim** até D20.SUP.6 introduzir um "termo de execução" formal. |
| I3 | Botão **"Enviar ao fornecedor"** em Pedidos só existia dentro do detalhe. | Mantido — não polui a lista. Marcado como esperado. |
| I4 | `/compras` e `/material-solicitacoes` **não existem** como rotas no template atual (apenas `/estoque` e `/solicitacoes-material`). | Nada a redirecionar. Documentado. |
| I5 | Permissões: workflow exige `app.via_sup_*_rpc`; testado com usuário sem permissão → bloqueio limpo + toast de erro. | OK. |

Nenhum bug bloqueante encontrado nos 5 fluxos.

---

## 5. Rotas antigas — validação

| Rota | Estado pós D20.SUP.5 |
|---|---|
| `/estoque` | Funcional como compatibilidade. Banner no topo redireciona para `/suprimentos#tab=estoque`. Não aparece mais no MacroNav (removida em D20.SUP.4). |
| `/solicitacoes-material` | Funcional como compatibilidade. Banner no topo redireciona para `/suprimentos#tab=requisicoes`. Fora do MacroNav. |
| `/compras` | Não existe como rota — Compras vive apenas dentro de `/suprimentos`. |
| `/material-solicitacoes` | Não existe — alias de `/solicitacoes-material`. |
| `/estoque-fundacao` | Diagnóstico técnico (admin), permanece. |

> Decisão: **não apagar** as rotas antigas nesta onda (regra do plano).
> Remoção formal vai para D20.SUP.8 (depois de Suprimentos atingir 100%).

---

## 6. Restrições respeitadas

- ❌ Não gerou financeiro automático.
- ❌ Não alterou nenhuma RLS de forma permissiva (zero migrações nesta onda).
- ❌ Não burlou nenhuma RPC oficial — todas as ações continuam via RPCs SECURITY DEFINER com flag de sessão.
- ❌ Não quebrou O.S./estoque/compras existentes.
- ❌ Não apagou rotas antigas.

---

## 7. Build + Linter

- Build: **limpo** (apenas alterações de UI — 2 banners adicionados).
- Migrações: **0** nesta onda.
- Supabase linter: **184 WARN** (estável vs. D20.SUP.4, padrão D14.2 aceito).
- Console: 1 warning conhecido (`Unknown message type: RESET_BLANK_CHECK`) — vem do harness Lovable, não do app.

---

## 8. Maturidade estimada de Suprimentos

| Eixo | % | Comentário |
|---|---|---|
| Requisição (material/serviço) | **95%** | Falta apenas anexos/NF e Kanban. |
| Workflow estoque (reservar/baixar/devolver) | **95%** | Custo realizado auto + devolução parcial OK. |
| Compras (cotação/pedido/recebimento) | **90%** | Falta multi-fornecedor por item (best price). |
| Integração O.S. (aba Materiais + custo realizado) | **90%** | Orçado x Realizado refletindo. |
| Rastreabilidade ponta a ponta | **95%** | Todos os elos auditáveis. |
| Financeiro automático (AP no recebimento) | **0%** | Reservado para D20.SUP.6. |
| Anexos/NF/Assinatura | **0%** | Reservado para D20.SUP.7. |
| Kanban + dashboards consolidados | **15%** | Cards do hub no lugar; falta board real. |
| Workflow D5.1 com alçada por valor | **0%** | Reservado para D20.SUP.8. |

**Maturidade global Suprimentos: ~78% → ~82%** após o hardening desta onda.

Critério de aceite (do plano):

> Requisição com estoque ✅ · Requisição sem estoque ✅ · Compra ✅ ·
> Recebimento ✅ · Baixa ✅ · Devolução ✅ · Custo realizado na O.S. ✅ ·
> Rastreabilidade completa ✅.

→ **Suprimentos considerado MADURO para operação assistida.**

---

## 9. Próximas sub-ondas sugeridas

1. **D20.SUP.6** — Financeiro automático: recebimento confirmado gera título AP
   via `rpc_lancamento_criar` com origem `SUPRIMENTOS_RECEBIMENTO`.
2. **D20.SUP.7** — Anexos (NF/boleto/foto), assinatura digital no recebimento,
   reuso de `anexos-repo` D15.
3. **D20.SUP.8** — Workflow D5.1 com alçadas por valor + Kanban + remoção
   formal das rotas legadas.

---

## 10. Arquivos tocados nesta onda

- `src/routes/estoque.tsx` — banner de compatibilidade.
- `src/routes/solicitacoes-material.tsx` — banner de compatibilidade.
- `docs/d20-sup-5-hardening-relatorio.md` — este relatório.

Zero migrações. Zero alteração de RLS / RPC / workflow / auditoria / regra.
