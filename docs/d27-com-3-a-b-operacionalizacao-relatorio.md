# D27.COM.3.a + .b — Operacionalização dos botões do Comercial

Aplicado em 2026-06-03. Plano: `.lovable/plan.md`.

## Escopo entregue

**Backend (D27.COM.3.a)** — 2 migrações:

- 4 permissões novas no enum `app_permission`:
  - `comercial.proposta.aprovar`
  - `comercial.comissao.gerar`
  - `engenharia.criar_obra`
  - `financiamento.criar_pendencia`

- Nova tabela `financiamentos_pendencias` (RLS por permissão, UNIQUE parcial
  por contrato ativo, integrabilidade contábil-ready, soft-delete,
  row_version, 3 índices).

- 5 RPCs oficiais (SECURITY DEFINER, `search_path=public`, REVOKE anon,
  GRANT authenticated, auditoria em `audit_log`):
  1. `rpc_proposta_aprovar(uuid, text)` — status → APROVADA, valida
     exceção R$/kWp se aplicável.
  2. `rpc_proposta_gerar_contrato(uuid)` — cria contrato vinculado,
     copia valor/potência/módulos/inversor/dados, vincula
     `propostas.contrato_id`, idempotente (re-chamar devolve o mesmo
     `contrato_id`).
  3. `rpc_contrato_enviar_engenharia(uuid)` — cria obra status
     `EM_PROJETO_APROVACAO` herdando dados do contrato (sem equipe, sem
     cronograma — Engenharia define depois). Atualiza
     `liberado_para_engenharia=true`. Idempotente (uma obra por contrato).
  4. `rpc_contrato_enviar_financiamento(uuid, text)` — exige
     `possui_financiamento=true`, cria pendência em
     `financiamentos_pendencias` (banco fica em aberto). Idempotente.
  5. `rpc_comissao_gerar_de_contrato(uuid)` — calcula R$/Wp e aplica
     faixa Meta Sun (2.00-2.10=3%, 2.11-2.30=4%, 2.31-2.44=5%,
     ≥2.45=6%). Cria comissão PREVISTA. Idempotente: se já existe
     PREVISTA para o contrato, retorna o id existente.

Toda mutação de status protegido usa flag de sessão oficial
(`app.via_revisao_proposta`, `app.via_comissao_rpc`). Nenhuma RPC faz
UPDATE direto fora dos guards.

**Frontend (D27.COM.3.b)** — só Propostas:

- Novo repo `src/lib/repositories/comercial-processos-repo.ts` com 5
  hooks React Query (toast + invalidate automático) e helper
  `executarEmLote` (sequencial, máx. 100, summary final).
- `PropostasPage.tsx`: ribbon RM canônico agora é REAL para os 5
  botões prioritários:
  - **Aprovar** → `rpc_proposta_aprovar`
  - **Gerar Contrato** → `rpc_proposta_gerar_contrato`
  - **Enviar Engenharia** → `rpc_contrato_enviar_engenharia` (usa
    `propostaVisualizada.contratoGeradoId`)
  - **Enviar Financiamento** → `rpc_contrato_enviar_financiamento`
  - **Gerar Comissão** → `rpc_comissao_gerar_de_contrato`
- Guards na UI: sem proposta selecionada → toast pedindo seleção. Sem
  contrato gerado → toast pedindo gerar contrato primeiro.

## Métricas

- Linter Supabase: 238 → 243 WARN (+5 padrão D14.2 aceito: 4 RPCs
  SECURITY DEFINER + 1 search_path).
- Permissões: 132 → 136 (+4).
- RPCs DEFINER: 199 → 204 (+5).
- Tabelas: 240 → 241 (+1: financiamentos_pendencias).

## O que NÃO foi feito (próximas sub-ondas)

| Sub-onda | Entrega |
|----------|---------|
| D27.COM.3.b2 | Wire dos botões na aba **Contratos Assinados** (`ContratoAssinadoTab`). Hoje os contratos dessa aba vêm de uma store LocalStorage legada (`useContratosStore`) cujos IDs não são UUIDs Supabase; precisa migração separada de contratos LS → Supabase antes do wire. |
| D27.COM.3.c | Reprovar / Cancelar / Reabrir / Aditivo / Enviar Assinatura + execução em lote a partir da seleção da `PropostaList`. |
| D27.COM.3.d | Tela operacional para o setor de Financiamentos consumir `financiamentos_pendencias` (definir banco, aprovar/reprovar). |
| D27.COM.FIN | Substituir status TEXT por enum em `financiamentos_pendencias` quando o fluxo amadurecer. |

## Aceite D27.COM.3.a+b

- ✅ 5 RPCs prioritárias operacionais via RPC oficial com auditoria.
- ✅ Idempotência em todas as 5 (re-chamar não cria duplicidade).
- ✅ Permissão respeitada por RPC; flags de sessão respeitam triggers
  de bloqueio existentes (C2 propostas + C6 comissões).
- ✅ Nenhum botão prioritário em modo "toast placeholder" no fluxo
  Propostas → ele agora ou faz a ação real ou explica honestamente
  o pré-requisito (proposta selecionada / contrato gerado).
- ✅ Zero alteração em Workflow D5.1 / Auditoria D24 / Notificações
  D23 / Suprimentos / Estoque / OS — fluxo isolado em Comercial.

## Riscos conhecidos

- A view de propostas da UI atual usa `usePropostas()` (store local),
  mas a persistência já é Supabase (`propostas-repo.ts`). Após
  `rpc_proposta_aprovar` ou `rpc_proposta_gerar_contrato`, o
  `invalidate` de React Query rerefresh as queries `["propostas"]` —
  porém o store local pode demorar para refletir. Para feedback
  imediato, o usuário deve recarregar (F5) ou abrir a proposta
  visualizada novamente. Refator do store em D27.COM.3.c.
- O botão `Enviar Engenharia/Financiamento/Comissão` na ribbon das
  Propostas funciona apenas após `Gerar Contrato` ter sido executado
  na mesma proposta — porque dependem do `contratoGeradoId`. O fluxo
  canônico do operador é: aprovar → gerar contrato → enviar
  engenharia/financiamento/comissão tudo na mesma tela.
