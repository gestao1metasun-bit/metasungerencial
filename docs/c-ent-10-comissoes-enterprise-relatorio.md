# C-ENT.10 — Motor Enterprise de Comissões

**Data:** 2026-06-17  
**Status:** APLICADA

## Princípio

Comissão é objeto independente, com ciclo de vida próprio. Nunca editada in-place — toda mudança gera nova versão (SUBSTITUIDA) ou nova comissão complementar (origem ADITIVO).

## Migrations

1. `20260617_c_ent_10_p1` — extensão da `comercial_comissoes`:
   - Novos enums: `comercial_comissao_origem (CONTRATO/ADITIVO/AJUSTE)`, `comercial_comissao_tipo_beneficiario (CONSULTOR/INDICADOR/GERENTE/PARCEIRO/BANCO/OUTRO)`.
   - Novos valores de status: `APROVADA`, `SUBSTITUIDA`.
   - Novas colunas: `codigo` (unique, seq `comissao_codigo_seq`), `projeto_id`, `proposta_id`, `aditivo_id`, `beneficiario_id`, `beneficiario_nome`, `tipo_beneficiario`, `origem`, `comissao_origem_id`, `valor_previsto`, `valor_aprovado`, `valor_pago`, `motivo`, `aprovada_em/_por`, `justificativa_aprovacao`, `substituida_em/_por`, `substituida_por_comissao_id`, `titulo_financeiro_id` (preparado).
   - Backfill: `beneficiario_*` ← `vendedor_*`, `valor_previsto` ← `valor_calculado`, `proposta_id` ← do contrato, `codigo` ← sequência.
   - 5 novas permissões: `comercial.comissao.criar | .editar | .pagar | .aprovar | .substituir`.
   - Anexos: `comercial_comissoes` adicionado ao CHECK universal.
2. `20260617_c_ent_10_p2` — grants + RPCs + trigger:
   - Grants das 5 permissões (criar/editar/aprovar/substituir → admin_master/admin_geral/usuario; pagar → admins).
   - Trigger `tg_assinatura_cria_comissao_prevista` atualizado para preencher `codigo/origem=CONTRATO/beneficiario_*/tipo_beneficiario=CONSULTOR/valor_previsto`.
   - 3 RPCs SECURITY DEFINER (search_path=public, REVOKE anon, GRANT authenticated):
     - `rpc_comissao_aprovar(uuid, text)` — PREVISTA → APROVADA com justificativa opcional.
     - `rpc_comissao_substituir(uuid, numeric, text)` — cria nova com origem=AJUSTE e marca antiga SUBSTITUIDA, motivo ≥ 5.
     - `rpc_comissao_gerar_de_aditivo(uuid, numeric, text)` — gera comissão origem=ADITIVO vinculada, base = Δ valor do aditivo, exige aditivo APLICADO e bloqueia duplicidade.
   - Trigger `tg_comissao_timeline` (INSERT + UPDATE de status) emite eventos em `eventos_timeline` com `objeto_tipo='comissao'`.
3. `20260617_c_ent_10_p3` — correção do nome de coluna (`evento_tipo`).

## RPCs adicionadas

- `rpc_comissao_aprovar`
- `rpc_comissao_substituir`
- `rpc_comissao_gerar_de_aditivo`

(reaproveitadas: `rpc_comissao_liberar`, `_marcar_paga`, `_cancelar`, `_estornar`, `_reabrir`, `_alterar_percentual` — já existentes desde C6).

## Hooks (src/lib/repositories/comercial-comissao-repo.ts)

Adicionados:
- `useComissaoById`
- `useComissoesAll({status?, origem?})`
- `useAprovarComissao`
- `useSubstituirComissao`
- `useGerarComissaoDeAditivo`

Tipos atualizados: `ComissaoStatus` (+APROVADA, +SUBSTITUIDA), `ComissaoOrigem`, `ComissaoTipoBeneficiario`, `Comissao` (campos C-ENT.10).

## Componentes

- `src/components/app/comissoes/SubstituirComissaoDialog.tsx`
- `src/components/app/comissoes/ComissoesContratoPanel.tsx` — painel reutilizável usado pela aba do contrato.

## Rotas criadas

- `/comercial/comissoes` — listagem (busca + filtros status/origem, 9 colunas, ação Abrir).
- `/comercial/comissoes/$comissaoId` — Workspace 4 abas (Resumo / Documentos / Timeline / Auditoria) com toolbar de ações gated por permissão.

## Integração Workspace do Contrato

- Nova aba **Comissões** com `ComissoesContratoPanel` (toda a lista da entidade, ações inline).

## Timeline

Eventos emitidos automaticamente:
- `COMISSAO_PREVISTA` (origem CONTRATO)
- `COMISSAO_ADITIVO` (origem ADITIVO)
- `COMISSAO_SUBSTITUIDA_NOVA` (origem AJUSTE)
- `COMISSAO_APROVADA`, `_LIBERADA`, `_PAGA`, `_CANCELADA`, `_ESTORNADA`, `_SUBSTITUIDA` (toda transição de status)

## Integração futura (preparada, sem ação)

- `comercial_comissoes.titulo_financeiro_id` (FK nullable para `titulos_financeiros`) — relacionamento pronto. Nenhum AP é gerado.

## Permissões

| Permissão | admin_master | admin_geral | usuario |
| --- | --- | --- | --- |
| `comercial.comissao.visualizar` | ✓ | ✓ | ✓ |
| `comercial.comissao.criar` | ✓ | ✓ | ✓ |
| `comercial.comissao.editar` | ✓ | ✓ | ✓ |
| `comercial.comissao.aprovar` | ✓ | ✓ | ✓ |
| `comercial.comissao.substituir` | ✓ | ✓ | ✓ |
| `comercial.comissao.liberar` | (preexistente) |
| `comercial.comissao.pagar` | ✓ | ✓ | — |
| `comercial.comissao.cancelar` | (preexistente) |

## Pendências

- Cadastro real de beneficiários distintos (Indicador/Gerente/Parceiro/Banco) — hoje suportado pelo enum + colunas, sem UI dedicada para criar comissões manuais multiparte.
- Política comercial parametrizada (parâmetro R$/kWp + workflow D5.1) ainda não dispara fluxo de exceção ao gerar do contrato — depende de C3 já fechada (`proposta_excecao_rs_kwp`), mas o gancho específico em `tg_assinatura_cria_comissao_prevista` para forçar status `PREVISTA pendente de aprovação` não foi implementado nesta onda.
- Botão "Gerar comissão de aditivo" não foi colocado no UI do aditivo (RPC pronta).

## Riscos

- Trigger executa com `SECURITY DEFINER` → eventos de timeline herdam usuário do `auth.uid()` quando disponível; em contextos de service_role o evento usa `created_by`.
- `valor_aprovado` é definido = `valor_calculado` na aprovação por padrão; ajustes finos em outra onda.
- Linter: 268 WARNs (todos padrão D14.2 — search_path, public anon execute, extensão em public).

## Não foi feito nesta onda (proposital)

- Pagamento real, PIX, integração folha/banco, geração de contas a pagar, recalculo financeiro, remoção de legado.
