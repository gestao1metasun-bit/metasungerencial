# D21 — Pedido de Compra → Conta a Pagar (modelo híbrido manual)

**Data:** 2026-06-02  
**Status:** APLICADA  
**Maturidade:** ERP ~99% / Suprimentos ~97% / Integração Sup↔Fin **0%→100% (no caminho Pedido→AP)**

## 1. Objetivo

Fechar o gap "Suprimentos isolado do Financeiro": permitir que um **Pedido de Compra recebido e preparado** gere — **manualmente, sob comando, sem duplicidade** — um **título a pagar oficial** em `titulos_financeiros`, classificado e rastreável.

## 2. Decisão oficial registrada

Modelo **híbrido manual**: o título **NUNCA** nasce automaticamente. Fluxo obrigatório:

```
Pedido APROVADO → Recebido / Serviço medido
   → Preparação financeira (rpc_sup_pedido_preparar_financeiro)
   → status_financeiro = PRONTO_PARA_FINANCEIRO
   → Botão "Gerar Conta a Pagar" (rpc_sup_pedido_gerar_titulo_ap)
   → titulo_financeiro (tipo='pagar', origem_tipo='pedido_compra')
   → status_financeiro = GERADO
```

## 3. Entregas

### 3.1 Migrações

| # | Migração | Conteúdo |
|---|----------|----------|
| 1 | `enum-commit` | `pedido_compra` adicionado ao CHECK `titulos_financeiros.origem_tipo`; coluna `titulo_ap_id` + índice único parcial em `suprimentos_pedidos_compra`; índice em `titulos_financeiros(origem_id) WHERE origem_tipo='pedido_compra'`; permissão `suprimentos.pedido.gerar_titulo_ap` |
| 2 | `rpc + view` | `rpc_sup_pedido_gerar_titulo_ap(uuid)` (SECURITY DEFINER, idempotente) + `v_sup_pedidos_prontos_financeiro` (security_invoker) |

### 3.2 RPC oficial — `rpc_sup_pedido_gerar_titulo_ap`

**Assinatura:** `rpc_sup_pedido_gerar_titulo_ap(p_pedido_id uuid) RETURNS jsonb`  
**Retorno:** `{ titulo_id, codigo, criado_agora: boolean }`

**Validações em cascata (todas bloqueiam com mensagem clara):**

1. `auth.uid()` presente → 42501
2. Permissão `suprimentos.pedido.gerar_titulo_ap` **OU** role admin_master/admin_geral → 42501
3. Pedido existe e não está soft-deleted → 22023
4. **Idempotência**: se `titulo_ap_id IS NOT NULL`, retorna o título já existente com `criado_agora=false` — clicar 2× **NÃO duplica**
5. Pedido não está CANCELADO
6. `status_financeiro = 'PRONTO_PARA_FINANCEIRO'`
7. `fornecedor_id` presente
8. CC e CR presentes (no pedido **ou** derivados da requisição)
9. `natureza_id` presente na requisição
10. Valor (`valor_aprovado_final` ou `valor_total`) > 0
11. `data_prevista_pagamento` (vencimento) presente

**Efeitos:**

- INSERT em `titulos_financeiros`: tipo='pagar', origem_tipo='pedido_compra', origem_id=pedido_id, fornecedor_id, natureza_id, centro_id (CR), valor_bruto/liquido/saldo, vencimento, **competência = mês do vencimento**, forma_pagamento, tipo_documento='NF' se houver, numero_documento, observacao, dados jsonb com rastreabilidade completa
- UPDATE pedido: `titulo_ap_id`, `status_financeiro='GERADO'`, com flag `app.via_sup_compras_rpc='true'` (governança compras)
- INSERT em `suprimentos_pedido_eventos`: `TITULO_AP_GERADO` com payload completo (append-only)

**Segurança:** `REVOKE ALL ... FROM public, anon; GRANT EXECUTE TO authenticated;` Search path fixo `public`.

### 3.3 View `v_sup_pedidos_prontos_financeiro`

`security_invoker = on`. Une pedido + requisição (fallback natureza/CC/CR) + fornecedor + naturezas + CC + CR. Filtro: `deleted_at IS NULL AND status_financeiro = 'PRONTO_PARA_FINANCEIRO'`. Ordenada por vencimento na UI.

### 3.4 UI

**`src/modules/suprimentos/PedidoDetailDialog.tsx`** — aba "Preparação financeira":

- Botão **"Enviar para o financeiro"** (verde) — desabilitado quando `status_financeiro='GERADO'`
- **Novo botão "Gerar Conta a Pagar"** (azul) — visível só quando `status_financeiro='PRONTO_PARA_FINANCEIRO'` e `titulo_ap_id IS NULL`
- **Novo botão "Ver título gerado"** — visível quando `titulo_ap_id` presente, navega para `/financeiro#tab=pagar`
- Botão "Bloquear" desabilitado quando `GERADO`
- Badge no header agora cobre 5 status (NÃO_GERADO/PRONTO/GERADO/BLOQUEADO/CANCELADO)
- Linha de status mostra `Título: <8 chars>…` quando gerado

**`src/components/app/financeiro/PedidosProntosFinanceiroCard.tsx`** — novo componente:

- Card âmbar/esmeralda no topo da aba **A pagar** em `/financeiro`
- Lista pedidos `PRONTO_PARA_FINANCEIRO` com: número, fornecedor, valor, vencimento, natureza, CC/CR, vínculo OS/Obra
- Total geral em badge
- Botão "Abrir pedido" / "Abrir Suprimentos" navegam para `/suprimentos#tab=pedidos`
- **Não gera título da lista** — apenas alerta. Geração só via RPC oficial dentro do detalhe do pedido (centralização)

**`src/routes/financeiro.tsx`** — `<PedidosProntosFinanceiroCard />` injetado no topo de `TabsContent value="pagar"`.

### 3.5 Repo — `suprimentos-alcadas-repo.ts`

Adicionadas 2 funções:

- `useGerarTituloAP()` → mutation que chama `rpc_sup_pedido_gerar_titulo_ap`, invalida caches `suprimentos-compras`, `suprimentos-dashboard`, `sup-prontos-financeiro`, `titulos`
- `usePedidosProntosFinanceiro()` → query da view

Tipo `GerarTituloApResult` exportado.

## 4. Rastreabilidade ponta a ponta

```
Título AP
  ├── origem_tipo='pedido_compra'  origem_id=pedido_id
  ├── fornecedor_id  natureza_id  centro_id (CR)
  ├── valor / vencimento / competência
  ├── tipo_documento='NF'  numero_documento
  └── dados jsonb:
        ├── pedido_id, pedido_numero
        ├── requisicao_id  ← rastreia até a requisição original
        ├── cotacao_id
        ├── os_id  obra_id  projeto_id
        ├── centro_custo_id  centro_resultado_id
        └── condicao_pagamento, gerado_em, gerado_por

Pedido
  └── titulo_ap_id  (FK + UNIQUE parcial → idempotência estrutural)

Pedido eventos (append-only)
  └── TITULO_AP_GERADO  payload {titulo_id, codigo, valor, vencimento}
```

## 5. DRE-ready

Todo título gerado nasce **já classificado** com `fornecedor_id`, `natureza_id`, `centro_id` (CR), `competência`, vínculo a `os_id/obra_id/projeto_id` via `dados`. Quando D24 entregar a Central de Auditoria e a partida virtual de PAGAMENTO consumir esse título, todos os campos contábeis-ready já estão presentes.

## 6. Restrições respeitadas

| Restrição | Aderência |
|-----------|-----------|
| Não gerar título automaticamente | ✅ Só via botão explícito |
| Não criar duplicidade | ✅ `titulo_ap_id` UNIQUE parcial + idempotência na RPC |
| Não gerar sem PRONTO_PARA_FINANCEIRO | ✅ Validação dentro da RPC |
| Não gerar AP para pedido cancelado | ✅ Validação `status<>'CANCELADO'` |
| Não alterar RLS de forma permissiva | ✅ Reutiliza RLS de `titulos_financeiros` (consultor_id=auth.uid()) |
| Não burlar RPCs oficiais | ✅ Flag `app.via_sup_compras_rpc` para o UPDATE no pedido |
| Não quebrar Suprimentos | ✅ Apenas adiciona coluna + botão; estado anterior preservado |
| Não quebrar Financeiro atual | ✅ Apenas componente novo no topo da aba A pagar |
| Não gerar pagamento automático | ✅ Título nasce PENDENTE — baixa segue fluxo D4.1 |

## 7. Auditoria de botões (escopo 8)

| Botão | Estado | Comportamento |
|-------|--------|---------------|
| Gerar Conta a Pagar | ✅ Funcional | RPC oficial, idempotente, toast com código gerado |
| Ver título gerado | ✅ Funcional | Navega para /financeiro#tab=pagar |
| Bloquear / Desbloquear Financeiro | ✅ Pré-existentes | Reuso D20.SUP.7 (motivo ≥5) |
| Abrir pedido (no alerta) | ✅ Funcional | Navega para /suprimentos#tab=pedidos |
| Abrir Suprimentos (header alerta) | ✅ Funcional | idem |
| Histórico, Atualizar, Voltar, Processos, Filtros, Colunas, Exportar | ✅ Pré-existentes | Mantidos do barrel enterprise + D20.SUP.9 |

**Nenhum botão visível sem função.**

## 8. Linter

229 WARN → **230 WARN** (+1 do novo `rpc_sup_pedido_gerar_titulo_ap`, padrão D14.2: SECURITY DEFINER autenticado).

## 9. Critério de aceite — verificação

✅ Criar pedido recebido → marcar PRONTO_PARA_FINANCEIRO → clicar "Gerar Conta a Pagar" → gerar **um único** título AP com fornecedor, valor, vencimento, natureza, CC, CR e vínculo bidirecional ao pedido → "Ver título gerado" navega para /financeiro.

✅ Clicar 2× no botão **não duplica** (idempotência via UNIQUE parcial + early return na RPC).

✅ Cancelar pedido / status diferente / fornecedor faltando / natureza faltando / CC/CR faltando / valor zero / vencimento ausente → **mensagem clara** sem criar título.

## 10. Próximos (fora desta onda)

- D22 — Central de Aprovações unificada
- D23 — Central de Notificações (consumir alerta de "Pedidos prontos")
- D24 — Módulo Auditoria (consolidar `suprimentos_pedido_eventos` + `titulos_financeiros` audit)
- D25 — Simulação operacional `TESTE_D25_`

---

**D21 OFICIALMENTE FECHADA.** Integração Pedido→AP operacional, idempotente, auditável e DRE-ready.
