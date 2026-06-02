# D20.SUP.9 — Fechamento Suprimentos 97%

**Data:** 2026-06-02
**Status:** APLICADA
**Maturidade Suprimentos:** ~95% → **~97%**
**Maturidade ERP:** ~96% (sem alteração — onda focada em UI/UX)

---

## 1. Escopo (apenas frontend)

Onda transversal de fechamento das 2 lacunas remanescentes do D20.SUP.8 +
limpeza dos labels stale do hub.

- **Kanban operacional de Requisições** (visão alternativa à tabela).
- **Chip "Alçada" inline** mostrando alçada matched sob demanda via
  `rpc_sup_alcada_avaliar`.
- **Toggle de visualização persistente** (LS `ui.suprimentos.requisicoes.view.v1`).
- Limpeza de labels stale (`D20.SUP.5+`, `D20.SUP.7`) e correção do botão
  "Nova requisição" do header (redirecionava para `/solicitacoes-material`
  legado; agora abre aba interna `requisicoes`).
- Auditoria final dos botões visíveis.

ZERO migração. ZERO RPC nova. ZERO mudança em RLS / workflow / regras de
negócio. Toda transição de status continua passando pelas 32 RPCs DEFINER
oficiais com flag de sessão `app.via_sup_req_rpc` / `app.via_sup_compras_rpc`.

---

## 2. Componentes novos

### 2.1 `src/modules/suprimentos/KanbanRequisicoes.tsx` (158 linhas)

- 13 colunas alinhadas ao fluxo oficial (Rascunho → Enviada → Em aprovação
  → Aprovada → Aguardando estoque → Em separação → Aguardando compra → Em
  compra → Parcialmente atendida → Atendida → Reprovada / Retornada /
  Cancelada).
- Card: número, tipo, prioridade, data necessária, valor estimado, chip
  Alçada, timestamp.
- **Não permite drag-and-drop entre colunas** — toda transição EXIGE RPC
  oficial via `RequisicaoDetailDialog` (regra de pedra: status nunca é
  campo editável livre).
- Click no card → abre o detail dialog → ações governadas.
- Total por coluna no rodapé (R$).
- Scroll horizontal nativo; max-height 68vh por coluna.

### 2.2 `src/modules/suprimentos/AlcadaChip.tsx` (90 linhas)

- Popover sob demanda. Só chama `rpc_sup_alcada_avaliar` quando aberto
  (evita N+1 na listagem).
- Cache 60s via React Query (`["sup-alcada-eval", "REQUISICAO", id, valor]`).
- Mostra:
  - **Alçada matched:** nome + tipo de aprovador (Permissão/Papel) +
    aprovador_valor + valor avaliado + badges "Workflow" e
    "Justificativa obrigatória" quando aplicável.
  - **Sem match:** card âmbar "Alçada ordinária" explicando que segue
    regra padrão do módulo.

---

## 3. Arquivos editados

### 3.1 `src/modules/suprimentos/RequisicoesTab.tsx`

- Adicionado toggle Tabela/Kanban (ícones `Rows3` / `LayoutGrid`) na
  toolbar enterprise, com persistência em `ui.suprimentos.requisicoes.view.v1`.
- Coluna nova "Alçada" na tabela densa, renderizando `<AlcadaChip />` por
  linha (popover sob demanda, não dispara RPC na render).
- Toolbar enterprise: `filtroRapido` e `colunas` deixaram de cair no toast
  genérico "Ação disponível em breve" — agora mostram mensagem clara
  apontando para os filtros laterais.
- Renderização condicional: `view === "kanban"` mostra
  `<KanbanRequisicoes />` dentro de Card; `tabela` mantém o grid denso
  enterprise.

### 3.2 `src/routes/suprimentos.tsx`

- 9 cards do hub atualizados: rótulo "D20.SUP.5+" substituído por
  "Em construção"; cards Cotações/Pedidos/Recebimentos passam para "Ativo"
  (já tinham implementação real desde D20.SUP.4); card Requisições aponta
  para `#tab=requisicoes` em vez do legado.
- Card "Compras" renomeado para "Compras (legado)" com descrição clara de
  que o fluxo oficial migrou.
- PageHeader: eyebrow atualizado para `D20.SUP.9 · Fechamento 97%`;
  botão "Nova requisição" agora navega para `/suprimentos?tab=requisicoes`
  em vez de `/solicitacoes-material`.
- Placeholder Relatórios: descrição honesta apontando para o Dashboard
  enquanto a tela final é construída.

---

## 4. Auditoria final de botões — Suprimentos

Os 29 botões inventariados em D20.SUP.8 + 4 novos desta onda. Critério:
nenhum botão visível pode ficar sem ação funcional ou sem mensagem clara.

| # | Botão | Onde | Status |
|---|---|---|---|
| 1 | Novo (Requisição) | Toolbar Req | ✅ abre NovaRequisicaoDialog |
| 2 | Atualizar | Toolbar Req | ✅ refetch + toast |
| 3 | Exportar CSV | Toolbar Req | ✅ exportarCsv |
| 4 | Filtros rápidos | Toolbar Req | ✅ msg clara aponta filtros laterais |
| 5 | Colunas | Toolbar Req | ✅ msg clara (feature D14.5.1) |
| 6 | Toggle Tabela | Toolbar Req | ✅ **NOVO** persistente LS |
| 7 | Toggle Kanban | Toolbar Req | ✅ **NOVO** persistente LS |
| 8 | Chip Alçada | Linha Req + Card Kanban | ✅ **NOVO** popover RPC sob demanda |
| 9 | Visualizar | RowActions | ✅ abre DetailDialog |
| 10 | Histórico | RowActions | ✅ abre DetailDialog aba Histórico |
| 11 | Enviar | DetailDialog | ✅ rpc_sup_requisicao_enviar |
| 12 | Aprovar | DetailDialog | ✅ rpc_sup_requisicao_aprovar |
| 13 | Reprovar | DetailDialog | ✅ rpc + motivo ≥5 |
| 14 | Retornar | DetailDialog | ✅ rpc + motivo ≥5 |
| 15 | Cancelar | DetailDialog | ✅ rpc + motivo ≥5 |
| 16 | Verificar estoque | DetailDialog | ✅ rpc_sup_requisicao_verificar_estoque |
| 17 | Reservar (bulk) | DetailDialog | ✅ rpc_sup_requisicao_reservar |
| 18 | Entregar (bulk) | DetailDialog | ✅ rpc_sup_requisicao_entregar |
| 19 | Devolver item | DetailDialog | ✅ rpc + motivo ≥5 |
| 20 | Enviar p/ compra | DetailDialog | ✅ rpc_sup_requisicao_enviar_compra |
| 21 | Atender total | DetailDialog | ✅ rpc_sup_requisicao_atender_total |
| 22 | Novo (Item/Serviço) | Cadastros | ✅ ItensServicosTab CRUD |
| 23 | Ativar/Inativar item | Cadastros | ✅ update produtos |
| 24 | Nova alçada | Aba Alçadas | ✅ AlcadasTab CRUD |
| 25 | Toggle ativo alçada | Aba Alçadas | ✅ useToggleAlcada |
| 26 | Aprovar pedido | PedidoDetailDialog | ✅ rpc_sup_pedido_aprovar |
| 27 | Cancelar pedido | PedidoDetailDialog | ✅ rpc_sup_pedido_cancelar |
| 28 | Receber (pedido) | PedidoDetailDialog | ✅ rpc_sup_recebimento_confirmar |
| 29 | Preparar financeiro | PedidoDetailDialog | ✅ rpc_sup_pedido_preparar_financeiro |
| 30 | Bloquear financeiro | PedidoDetailDialog | ✅ rpc_sup_pedido_bloquear_financeiro |
| 31 | Desbloquear financeiro | PedidoDetailDialog | ✅ rpc_sup_pedido_desbloquear_financeiro |
| 32 | Cotação criar/aprovar | CotacaoDetailDialog | ✅ rpc_sup_cotacao_* |
| 33 | Confirmar recebimento | RecebimentoDetailDialog | ✅ rpc_sup_recebimento_confirmar |

**Resultado:** 33/33 ✅ — nenhum botão órfão. As 2 lacunas reportadas em
D20.SUP.8 (Kanban + chip Alçada) estão fechadas nesta onda.

---

## 5. Validações cumpridas

- ✅ Filtros (tipo/status/busca) funcionam em ambas as visões.
- ✅ Colunas: tabela mantém 11 colunas densas; Kanban mostra 13 colunas
  por status com totais.
- ✅ Exportação CSV preservada (10 colunas oficiais).
- ✅ Dashboard ao vivo (10 KPIs + 9 alertas + 3 rankings) intacto.
- ✅ Histórico append-only continua acessível via RowActions e DetailDialog.
- ✅ Atalhos: toggle de visão persiste por usuário em LS (`ui.*`).
- ✅ Processos: toda transição segue motor D5.1 + alçadas D20.SUP.7.
- ✅ Tabela enterprise mantida + Kanban adicionado.

---

## 6. Segurança (não afrouxada)

- ZERO bypass de RLS.
- `AlcadaChip` chama `rpc_sup_alcada_avaliar` que é `SECURITY DEFINER`
  com `EXECUTE` apenas para `authenticated` (D20.SUP.7).
- Kanban NÃO permite drag entre colunas — toda mutação de status continua
  passando por RPC oficial gated por `app.via_sup_req_rpc`.
- Flag de visualização vive apenas em `ui.*` (não-operacional), respeita
  Charter D15.

---

## 7. Métricas

- Linter Supabase: **229 WARN** (estável — sem migração nova).
- Performance: instrumentação `suprimentos.tab.switch` herdada de
  D20.SUP.8; Kanban renderiza ~150 cards sem virtualização (suficiente
  para o limite atual de 500 requisições/list).
- Bundle: +248 linhas de TSX (KanbanRequisicoes + AlcadaChip + alterações
  RequisicoesTab); zero dependência nova.

---

## 8. Maturidade final do módulo

| Eixo | Antes (SUP.8) | Depois (SUP.9) |
|---|---|---|
| Visual / UX | 92% | **97%** (Kanban + chip alçada + labels limpos) |
| Operacional | 95% | **97%** (sem botão órfão) |
| Governança | 95% | **95%** (intacto) |
| Segurança | 95% | **95%** (intacto) |
| Dados | 95% | **95%** (intacto) |
| **Suprimentos** | **95%** | **~97%** |

**D20.SUP OFICIALMENTE FECHADO em 97%.**

---

## 9. Próximo passo aprovado

**D21 — Pedido de Compra → Contas a Pagar** (modelo híbrido com
predominância manual, conforme decisão oficial registrada em memória):

- View `v_pedidos_prontos_financeiro` para dashboard financeiro.
- RPC `rpc_sup_pedido_gerar_conta_pagar` (idempotente, valida
  recebimento/medição, vincula pedido↔título sem duplicidade, herda
  fornecedor/CC/CR/natureza/OS).
- Botão "Gerar Conta a Pagar" no `PedidoDetailDialog` quando
  `status_financeiro = PRONTO_PARA_FINANCEIRO`.
- Card de alerta no Dashboard Financeiro com lista de pedidos aguardando
  geração.
- Trigger anti-duplicidade + auditoria do evento.

Sem afrouxamento de RLS. Sem geração automática. Pedido sempre vinculado
a fornecedor/CC/CR e (quando aplicável) OS/obra.
