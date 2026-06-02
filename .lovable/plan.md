# D20.SUP — Módulo Suprimentos (Compras + Estoque + Requisições unificados)

Repensar D20: antes de aprofundar O.S.↔Estoque direto, criar a camada **Suprimentos** como ponto único de entrada operacional (requisição → aprovação → estoque/compra → entrega → baixa → custo realizado → orçado×realizado).

## Princípios de pedra

- O.S. **não baixa estoque direto**. Sempre via Suprimentos (Requisição→Reserva→Entrega→Baixa), salvo permissão especial.
- Status crítico sempre é consequência de operação controlada, nunca campo livre.
- Nada de financeiro automático nesta fase — apenas preparar vínculo (fornecedor, pedido, CR/CC, OS/obra, documento).
- Contábil D18: campos de mapeabilidade ficam preparados (natureza, CR, CC, competência, evento canônico, integrabilidade). Sem partidas reais agora.
- RPCs SECURITY DEFINER + flags de sessão para todas as transições. Idempotência via `rpc_idempotente_check/commit`. Auditoria forward-only.
- Reaproveitar o que existe (`solicitacoes_material`, `ordens_compra`, `estoque_movimentos`, `estoque_reservas`, `os_custos_realizados`, RPCs D20.1, view `v_os_material_resumo`) — ampliar, não duplicar.

## Sub-ondas

### D20.SUP.1 — Arquitetura + rotas (FUNDAÇÃO, sem regra nova)
- Rota `/suprimentos` com abas: Dashboard, Requisições, Estoque, Compras, Cotações, Pedidos, Recebimentos, Entregas, Cadastros, Relatórios.
- MacroNav + Ribbon Enterprise (D6) + EnterpriseRecordToolbar + vocabulário D17.UI.4d.
- Cada aba inicialmente é um shell que **reaproveita** as telas atuais (`/estoque`, `/solicitacoes-material`, etc.) via componentes — zero duplicação.
- Permissão `suprimentos.acessar` (alias somatório das existentes).
- Auditoria de botões visíveis nesta rota.

### D20.SUP.2 — Requisições (Material + Serviço)
- Ampliar `solicitacoes_material` ou criar `suprimentos_requisicoes` (decisão D1, ver abaixo) com `tipo IN (MATERIAL,SERVICO)`, vínculo opcional OS/obra/projeto/CR/CC, prioridade, data necessária, justificativa, itens, anexos.
- Status canônico: RASCUNHO/ENVIADA/EM_APROVACAO/APROVADA/REPROVADA/EM_SEPARACAO/AGUARDANDO_COMPRA/EM_COMPRA/PARCIALMENTE_ATENDIDA/ATENDIDA/CANCELADA.
- 4 RPCs: `criar/enviar/cancelar/atualizar_rascunho`. Histórico universal D17.UI.4c.

### D20.SUP.3 — Aprovação via Workflow D5.1
- Alçada `requisicao_suprimentos` (por valor + CR + tipo).
- Reaproveita motor `workflow_aprovacoes` + flag `app.via_workflow_rpc`.
- Ações: aprovar/reprovar/retornar (motivo ≥5), encaminhar p/ estoque ou compra.
- 3 permissões novas `suprimentos.requisicao.{aprovar,reprovar,retornar}`.

### D20.SUP.4 — Atendimento via Estoque
- RPC `rpc_sup_atender_estoque(requisicao_id)`: verifica saldo, gera reserva (reusa RPCs D20.1), marca `EM_SEPARACAO`.
- RPCs `rpc_sup_separar/entregar/baixar/devolver` (reuso máximo das D20.1, com vínculo a `requisicao_id` em `estoque_reservas`+`estoque_movimentos`).
- Atendimento parcial: o que falta dispara automaticamente AGUARDANDO_COMPRA.
- Custo realizado nasce automático (já feito em D20.1, só ampliar origem).

### D20.SUP.5 — Atendimento via Compras
- `suprimentos_cotacoes` (fornecedor, preço, prazo, condição, frete, anexos) + `cotacao_itens`.
- RPC `rpc_sup_cotar/aprovar_cotacao/gerar_pedido` (alimenta `ordens_compra` existente com `requisicao_id` + `os_id`).
- Recebimento: `rpc_sup_receber_material` (gera ENTRADA + atualiza pedido + atende requisição) / `rpc_sup_registrar_servico` (sem estoque, gera custo realizado origem=COMPRA).

### D20.SUP.6 — Reflexo em O.S.
- View `v_os_suprimentos_resumo` (requisições/reservas/entregas/devolução/serviços por OS).
- Card "Suprimentos" na O.S. consumindo a view.
- Orçado × Realizado material/serviço/total + margem.

### D20.SUP.7 — Relatórios + rastreabilidade
- Views: `v_sup_rastreabilidade` (Requisição→Reserva/Compra→Pedido→Recebimento→Entrega→Custo OS), `v_sup_pendencias`, `v_sup_giro_fornecedor`.
- Painel `/suprimentos/relatorios` com pílulas D17.

### D20.SUP.8 — Simulação operacional + auditoria de botões
- Script `scripts/d20-sup-simular.ts` (read-write via RPCs oficiais, flag `simulacao=true`, cleanup).
- Auditoria de TODOS os botões visíveis (Tabela/Kanban/Novo/Editar/Excluir/Aprovar/Reservar/Separar/Entregar/Baixar/Devolver/Cotar/Gerar pedido/Receber/Atualizar/Anexos/Histórico/Filtros/Colunas/Exportar) + fix do "Tabela" quebrado em Gestão de Projetos.
- Relatório final + atualização da memória.

## Detalhes técnicos

- **Schema-first**: cada sub-onda começa por migração (DDL + RLS + GRANT + RPCs + índices) e só depois mexe em UI.
- **Reuso**: `solicitacoes_material` provavelmente vira a tabela base de requisições (ampliada com `tipo`, `os_id`, `prioridade`, `data_necessaria`, `status` ampliado) — evita migração de dados.
- **Vínculos novos**: `requisicao_id` em `estoque_reservas`, `estoque_movimentos`, `ordens_compra`, `os_custos_realizados`.
- **Permissões novas**: `suprimentos.acessar`, `suprimentos.requisicao.{criar,aprovar,reprovar,retornar,cancelar}`, `suprimentos.cotacao.{criar,aprovar}`, `suprimentos.pedido.{gerar,receber}`, `suprimentos.entrega.{executar,devolver}`. Total ~10.
- **Contábil-ready**: cada nova tabela já nasce com natureza_id, CR, CC, competência, codigo_externo, status_integracao, hash_integracao, evento_canonico.

## Decisões necessárias antes de começar

D1 — **Base da Requisição**: ampliar `solicitacoes_material` (preserva dados, mais simples) ou criar `suprimentos_requisicoes` nova (mais limpa, exige migração de dados)?

D2 — **Permissão de exceção** "baixar O.S. direto sem requisição": manter (já existe `os.material.baixar`) como exceção controlada, ou bloquear de vez e exigir requisição sempre?

D3 — **Ordem de execução**: ir SUP.1→SUP.8 sequencial (mais seguro, 8 turnos), ou agrupar (1+2 / 3+4 / 5 / 6+7 / 8) em 5 turnos?

D4 — **Escopo deste turno**: começar agora pela SUP.1 (fundação de rotas + shell, sem regra nova, sem migração) e só seguir após sua aprovação, ou já emendar SUP.2 (schema requisições) no mesmo turno?

## Não-objetivos (não fazer agora)

- Financeiro automático (título AP no recebimento) — só preparar vínculo.
- Partidas contábeis reais — apenas mapeabilidade.
- Refator de Estoque/Compras existentes — só envelopar atrás da camada Suprimentos.
- Mudar RLS de forma permissiva.
- Quebrar O.S./Estoque/Compras atuais.

## Critério de aceite global

Fluxo ponta-a-ponta executável: Requisição→Aprovação→(Estoque OU Cotação→Pedido→Recebimento)→Entrega→Baixa→Custo realizado na O.S.→Orçado×Realizado→Rastreabilidade. Nenhum botão visível sem ação.
