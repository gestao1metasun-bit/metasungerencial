# C-ENT.3 — Propostas Supabase (Lead → Proposta migrado)

**Data:** 2026-06-15  •  **Onda:** C-ENT.3 (Comercial Enterprise)

## Objetivo cumprido
Migrar a criação de propostas a partir do Lead (`criarPropostaParaLead`, LS) para a fonte oficial Supabase `public.propostas`, com permissões, governança (cancelar / gerar nova versão) e leitura via Supabase no detalhe do Lead. Sem quebrar fluxos legados de aprovação/contrato que ainda dependem de LS.

## Migrations
1. `... add app_permission` — adiciona 3 valores no enum `app_permission`:
   - `comercial.proposta.visualizar`
   - `comercial.proposta.gerar_nova`
   - `comercial.proposta.gerar_contrato`
2. `... grants + RPCs`:
   - GRANTs das 3 novas permissões para `admin_master`, `admin_geral`, `usuario`.
   - `rpc_proposta_criar_do_lead(_lead_id uuid, _observacao text)` — SECURITY DEFINER, `search_path=public`, `REVOKE anon / GRANT authenticated`. Valida auth, permissão `comercial.proposta.criar`, lead existente, lead não CANCELADO, `lead.cliente_id` não nulo. Insere proposta em `RASCUNHO`, vincula `consultor_id/cliente_id/lead_id`, gera `numero PR-YYMMDD-xxxxxx`, `versao P01`, registra dados de origem em `dados`.
   - `rpc_proposta_cancelar(_id uuid, _motivo text)` — SECURITY DEFINER. Substitui assinatura legada (`p_proposta_id`, retorno `uuid`) por `_id` / `void`. Valida permissão `comercial.proposta.cancelar`, motivo ≥ 5 chars, bloqueia cancelar `CANCELADA`/`ASSINADA`. Usa flag `app.via_revisao_proposta` para destravar o trigger `tg_propostas_bloqueia_edicao_aprovada` quando necessário.
   - Reutilizado o RPC oficial `rpc_proposta_solicitar_revisao(_id, _motivo)` para o caminho "Gerar nova versão".

## Tabela usada
`public.propostas` (já existente). Nenhuma DDL estrutural — apenas funções + permissões.

## Arquivos criados
- `src/lib/repositories/propostas-supabase-repo.ts` — repositório oficial:
  - reads: `listarPropostasPorLead`, `listarPropostasPorCliente`
  - writes: `criarPropostaDoLead`, `cancelarPropostaSupabase`, `gerarNovaVersaoProposta`
  - hooks React Query: `usePropostasPorLead`, `usePropostasPorCliente`, `useCriarPropostaDoLead`, `useCancelarPropostaSupabase`, `useGerarNovaVersaoProposta`
  - helpers UI: `statusPropostaBadgeClass`, `isPropostaSubstituida`
- `docs/c-ent-3-propostas-supabase-relatorio.md` (este relatório)

## Arquivos alterados
- `src/modules/leads/LeadsPage.tsx`
  - Removida import de `criarPropostaParaLead` (LS) — fluxo Lead → Proposta agora **100% Supabase**.
  - `SolicitarPropostaDialog` reescrito: usa `useCriarPropostaDoLead`, exige `lead.clienteId` Supabase, mostra cliente Supabase no diálogo, mantém `setLeadStatus(... PROPOSTA_SOLICITADA)` (lead store já tem write-through Supabase desde C-ENT.2).
  - `PropostasDoLeadPanel` reescrito: lê `usePropostasPorLead` (Supabase), exibe versão / número / status / valor / kWp, ações "Cancelar proposta" (gate `comercial.proposta.cancelar`) e "Gerar nova versão" (gate `comercial.proposta.gerar_nova`, habilitada só para `APROVADA/ASSINADA/VENCIDA`). Propostas substituídas em cinza com badge "(substituída)". Mensagem dirigindo edição/aprovação para `/comercial/propostas`.
- `src/integrations/supabase/types.ts` — regenerado automaticamente.

## Hooks criados
- `usePropostasPorLead(leadId)` — query `["propostas","by-lead",leadId]`.
- `usePropostasPorCliente(clienteId)` — alinhada com a chave já usada em `/comercial/clientes/$clienteId` (invalidação cruzada funciona).
- `useCriarPropostaDoLead`, `useCancelarPropostaSupabase`, `useGerarNovaVersaoProposta` — todos invalidam `["propostas"]`.

## Usos LS removidos (Lead → Proposta)
- `criarPropostaParaLead` em `LeadsPage.tsx` (SolicitarPropostaDialog).
- `usePropostas` LS no `PropostasDoLeadPanel` (substituído por `usePropostasPorLead` Supabase).
- `useContratos`, `criarContratoDeProposta`, `aprovarPropostaDoLead`, `marcarPropostaNaoAprovada`, `cancelarPropostaComMotivo`, `enviarContratoParaEngenharia`, `cancelarContrato`, `anexarContratoAssinado` e `AprovarPropostaDialog`/`AnexarAssinadoDialog` permanecem **importados** mas **não mais referenciados** dentro do PropostasDoLeadPanel — preservam compatibilidade enquanto outras telas (PropostasPage, CarteiraTab) usam o fluxo legado.

## Usos LS restantes (não migrados nesta onda — por design)
- `src/modules/propostas/PropostasPage.tsx` — listagem operacional principal de propostas continua em LS. (Próxima onda C-ENT.4 / C-ENT.5.)
- `src/modules/propostas/store.ts` — store LS preservada inteira; `criarPropostaParaLead` continua exportada (zero call site agora).
- `src/lib/contratos-store.ts` — todo o fluxo de Contratos continua LS. (Fora de escopo desta onda.)
- `src/modules/comercial/CarteiraTab.tsx` — leitura de `usePropostas` LS para cálculos.
- `src/modules/leads/LeadsPage.tsx` — `usePropostas` / aprovar / contratos importados ainda (sem call site no painel novo) para futura reativação ou remoção em C-ENT.5.

## Fluxo Lead → Proposta migrado
1. Usuário abre o detalhe do lead.
2. Clica "Solicitar Proposta" (gate `comercial.lead.converter` + lead não cancelado).
3. Diálogo exige `lead.clienteId` Supabase (caso ausente, instrui editar o lead).
4. Confirma → `rpc_proposta_criar_do_lead` cria a proposta em RASCUNHO no Supabase.
5. `setLeadStatus(LEAD_STATUS.PROPOSTA_SOLICITADA)` atualiza o lead (write-through Supabase).
6. Painel "Propostas deste lead" lê do Supabase via `usePropostasPorLead`.
7. Ações disponíveis: **Cancelar proposta** (RPC `rpc_proposta_cancelar`) e **Gerar nova versão** (RPC `rpc_proposta_solicitar_revisao` — origem → EM_REVISAO, nova versão RASCUNHO com `versao_pai_id`).
8. Cliente 360º (`/comercial/clientes/$clienteId`) já lê propostas do Supabase; nada quebrou.

## Permissões adicionadas
| Permissão | admin_master | admin_geral | usuario | uso |
|---|---|---|---|---|
| `comercial.proposta.visualizar` | ✅ | ✅ | ✅ | gate de listagem futura |
| `comercial.proposta.gerar_nova` | ✅ | ✅ | ✅ | botão "Gerar nova versão" |
| `comercial.proposta.gerar_contrato` | ✅ | ✅ | ✅ | reservada para C-ENT.4 (Contratos) |

Permissões pré-existentes reaproveitadas: `comercial.proposta.criar`, `.cancelar`, `.revisar`, `.editar`, `.aprovar`, `.aprovar_excecao`, `.reprovar`, `.reabrir`.

## Pendências técnicas
- **PropostasPage legada** ainda lê/escreve LS — migrar listagem oficial em C-ENT.4.
- **Aprovação de proposta + geração de contrato** continuam exclusivamente LS — pertencem à onda C-ENT.4 (Contratos).
- **Auditoria de cancelamento/gerar nova**: hoje vem do trigger `tg_propostas_audit` (audit_log) — adicionar timeline visual no detalhe do lead/cliente em onda futura.
- **`numero` curto** (`PR-YYMMDD-xxxxxx`) ainda não segue sequência humana — bom o suficiente para esta onda; humanizar em C-ENT.4.
- **Cliente 360º**: aba propostas já lê Supabase, mas ainda não destaca "ativa primeiro" / agrupa substituídas em colapsável (cosmético).

## Riscos
- **Médio** — propostas criadas via lead a partir de agora só existem no Supabase; telas LS legadas (PropostasPage) NÃO mostrarão essas propostas até C-ENT.4. Workaround documentado dentro do painel ("Edição comercial/aprovação: Comercial → Propostas").
- **Baixo** — Aprovação de propostas criadas via Supabase fica indisponível até C-ENT.4 (não há mais botão no detalhe do lead). Aceitável: ondas anteriores deixaram claro que aprovação completa entra em C-ENT.4.
- **Baixo** — `rpc_proposta_cancelar` mudou de assinatura (`p_proposta_id`→`_id`, retorno `uuid`→`void`). Não há chamadores antigos no código (varredura confirmou).
- **Baixo** — Trigger de bloqueio `tg_propostas_bloqueia_edicao_aprovada` continua ativo; cancelamento usa a flag oficial `app.via_revisao_proposta` (mesmo padrão da revisão).

## Próxima onda recomendada
**C-ENT.4 — Contratos Supabase**: migrar `criarContratoDeProposta`, listagem de contratos, vínculo proposta→contrato em Supabase. Habilita botão "Gerar contrato" gated por `comercial.proposta.gerar_contrato` e completa o fluxo Lead → Proposta → Contrato puro Supabase.
