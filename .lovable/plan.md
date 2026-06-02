# D20.SUP.7 — Alçadas + Aprovações + Preparação Financeira

Escopo aprovado é amplo (6 frentes). Para entregar sem quebrar nada do que já está estabilizado (D20.SUP.1..6), proponho execução em **3 migrações + camada UI + dashboard**, todas idempotentes e sem alterar RPCs já em uso.

## Migração 1 — Alçadas + Preparação Financeira (schema)

Nova tabela `suprimentos_alcadas` (regras corporativas):
- `id`, `nome`, `ativo`, `prioridade` (int, menor = avalia primeiro)
- Critérios opcionais (todos nullable, AND quando preenchidos):
  - `tipo` (MATERIAL/SERVICO/NULL), `valor_min`, `valor_max`
  - `setor`, `natureza_id`, `centro_custo_id`, `centro_resultado_id`
  - `fornecedor_id`, `prioridade_req` (BAIXA/NORMAL/ALTA/URGENTE)
  - `destino` (ALMOXARIFADO/OS/OBRA/PROJETO)
  - `etapa` (REQUISICAO/COTACAO/PEDIDO) — uma regra por etapa
- `aprovador_tipo` (PERMISSAO/ROLE), `aprovador_valor` (chave da permissão/role exigida)
- `exige_workflow` (bool), `observacao_obrigatoria` (bool)
- Soft-delete + row_version + audit padrão D14.x

Nova tabela `suprimentos_alcadas_aplicadas` (append-only):
- `id`, `entidade_tipo` (REQUISICAO/COTACAO/PEDIDO), `entidade_id`
- `alcada_id`, `aprovador_user_id`, `decisao` (APROVADO/REPROVADO/RETORNADO)
- `motivo`, `observacao`, `valor_avaliado`, `data_hora`
- Sem UPDATE/DELETE (triggers anti-mutação como nos eventos da SUP.2)

**Preparação financeira** (campos novos, sem gerar título):
- `suprimentos_pedidos_compra`:
  - `condicao_pagamento` text, `data_prevista_pagamento` date
  - `documento_fiscal` text, `valor_aprovado_final` numeric
  - `status_financeiro` text CHECK IN (`NAO_GERADO`,`PRONTO_PARA_FINANCEIRO`,`GERADO`,`BLOQUEADO`,`CANCELADO`) default `NAO_GERADO`
  - `financeiro_observacao` text, `financeiro_bloqueio_motivo` text
- Permissões novas no enum: `suprimentos.alcada.gerir`, `suprimentos.pedido.preparar_financeiro`, `suprimentos.pedido.bloquear_financeiro`

GRANT + RLS por permissão. Sem mexer em `titulos_financeiros`.

## Migração 2 — RPCs oficiais

- `rpc_sup_alcada_avaliar(entidade_tipo, entidade_id, etapa, valor)` → retorna `{alcada_id, exige_workflow, aprovador_tipo, aprovador_valor}` (matching por prioridade, primeira regra ativa que satisfaz todos critérios). SECURITY DEFINER, EXECUTE authenticated.
- `rpc_sup_alcada_registrar_decisao(entidade_tipo, entidade_id, alcada_id, decisao, motivo, observacao, valor_avaliado)` — INSERT em `_aplicadas`, checa permissão do aprovador, valida motivo≥5 quando decisao≠APROVADO.
- `rpc_sup_pedido_preparar_financeiro(pedido_id, payload jsonb)` — preenche condição/data/documento/valor/observação e seta `status_financeiro='PRONTO_PARA_FINANCEIRO'`; exige permissão; valida fornecedor+CC+CR+natureza presentes; sem criar título.
- `rpc_sup_pedido_bloquear_financeiro(pedido_id, motivo)` / `rpc_sup_pedido_desbloquear_financeiro(pedido_id, motivo)`.

Triggers existentes (`app.via_sup_compras_rpc`) preservadas; novas RPCs setam a flag onde mutam `pedidos_compra`.

## Migração 3 — Views (Dashboard + Alertas)

Todas `security_invoker=on`, leitura authenticated:
- `v_suprimentos_dashboard_kpis` — uma linha com: requisicoes_abertas, _aprovadas, _rejeitadas, valor_solicitado, _aprovado, _em_compra, _recebido, estoque_reservado, itens_criticos, requisicoes_atrasadas (data_necessidade < hoje).
- `v_suprimentos_dashboard_por_fornecedor` / `_por_natureza` / `_por_cc` / `_por_os`.
- `v_suprimentos_alertas` — UNION ALL gerando linhas `{tipo_alerta, entidade_tipo, entidade_id, severidade, mensagem, criado_em}` cobrindo os 9 alertas do escopo.

## Camada UI (sem migração)

- Novo `src/lib/repositories/suprimentos-alcadas-repo.ts` (CRUD alçadas + avaliar + registrar decisão + dashboard hooks + alertas).
- Nova aba **Alçadas** em `/suprimentos` (admin) — grid + dialog CRUD com `EnterpriseRecordToolbar` + `RowActions`.
- Aba **Dashboard** já existe: ligar aos KPIs reais (substitui placeholders) — cards numéricos + 4 mini-tabelas (por fornecedor/natureza/CC/OS) + lista de alertas com ícone+severidade.
- `RequisicaoDetailDialog` / `CotacaoDetailDialog` / `PedidoDetailDialog`:
  - Botões **Aprovar/Reprovar/Retornar** passam a chamar `rpc_sup_alcada_avaliar` antes; se não houver alçada que case, bloqueia com toast claro; se houver, mostra a alçada exigida no header (chip "Alçada: Gerente — até R$5.000") e exige permissão correspondente.
  - Novo botão **Ver alçada** abre popover com histórico de `_aplicadas` da entidade.
- `PedidoDetailDialog`: nova seção **Preparação Financeira** com form (condição, data prevista, documento, valor final, observação) + botões **Enviar p/ financeiro / Bloquear / Desbloquear**. Badge de `status_financeiro`.
- Auditoria de botões: cada botão sem ação ganha tooltip "Em D20.SUP.8" ou é removido. Kanban fica como placeholder honesto (entra em D20.SUP.8).

## Restrições respeitadas

- Zero geração automática de título financeiro.
- Zero relaxamento de RLS (novas tabelas RLS por permissão).
- Mutação de status continua exclusiva via RPC + flag de sessão.
- Sem alteração em estoque / OS / contratos / comercial.
- Aprovação sem alçada/permissão é bloqueada (UI + RPC).

## Entregas finais

1. `supabase/migrations/2026...d20-sup-7-1-alcadas-schema.sql`
2. `supabase/migrations/2026...d20-sup-7-2-rpcs.sql`
3. `supabase/migrations/2026...d20-sup-7-3-views.sql`
4. `src/lib/repositories/suprimentos-alcadas-repo.ts`
5. Nova `src/modules/suprimentos/AlcadasTab.tsx`
6. Update em `RequisicaoDetailDialog.tsx`, `CotacaoDetailDialog.tsx`, `PedidoDetailDialog.tsx`, `suprimentos.tsx` (Dashboard ligado + aba Alçadas)
7. `docs/d20-sup-7-relatorio.md`

## Critério de aceite

Criar requisição → motor de alçada avalia e exige permissão correta → aprovar (registro em `_aplicadas`) → cotação aprovada com alçada → pedido aprovado com alçada → preparar pedido para financeiro (`PRONTO_PARA_FINANCEIRO`) sem criar título → dashboard mostra valores e alertas em tempo real.

Estimativa: 3 turnos de migração + 1 turno UI grande + 1 turno relatório.

**Confirma execução nesta sequência?** Se sim, começo já pela Migração 1 (schema alçadas + preparação financeira).