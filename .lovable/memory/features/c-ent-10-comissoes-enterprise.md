---
name: C-ENT.10 — Motor Enterprise de Comissões
description: Comissão como objeto independente, versionado, com origem (CONTRATO/ADITIVO/AJUSTE), múltiplos beneficiários, substituição append-only, RPCs oficiais, Workspace e integração ao Contrato. Sem geração de financeiro.
type: feature
---

## Princípio

Comissão é objeto. Nunca editar in-place. Toda mudança = nova versão (SUBSTITUIDA) ou comissão complementar (origem ADITIVO).

## Esquema

- `comercial_comissoes` estendida: `codigo` (seq `comissao_codigo_seq`), `projeto_id`, `proposta_id`, `aditivo_id`, `beneficiario_id/_nome`, `tipo_beneficiario`, `origem`, `comissao_origem_id`, `substituida_por_comissao_id`, `valor_previsto/_aprovado/_pago`, `motivo`, `justificativa_aprovacao`, `aprovada_em/_por`, `substituida_em/_por`, `titulo_financeiro_id` (FK, sem geração).
- Enums novos: `comercial_comissao_origem (CONTRATO|ADITIVO|AJUSTE)`, `comercial_comissao_tipo_beneficiario (CONSULTOR|INDICADOR|GERENTE|PARCEIRO|BANCO|OUTRO)`.
- Status enum +`APROVADA`, +`SUBSTITUIDA` (já existiam PREVISTA/LIBERADA/PAGA/CANCELADA/ESTORNADA).
- Anexos CHECK incluído `comercial_comissoes`.

## RPCs oficiais (SECURITY DEFINER, search_path=public, REVOKE anon, GRANT authenticated)

- `rpc_comissao_aprovar(uuid, text)` — PREVISTA→APROVADA.
- `rpc_comissao_substituir(uuid, numeric, text)` — cria nova `origem=AJUSTE`, antiga vira SUBSTITUIDA; motivo ≥ 5; recusa se PAGA/CANCELADA/SUBSTITUIDA/ESTORNADA.
- `rpc_comissao_gerar_de_aditivo(uuid, numeric, text)` — gera `origem=ADITIVO`, exige aditivo APLICADO, bloqueia duplicidade ativa, base = Δ valor.
- Preexistentes mantidas: liberar/marcar_paga/cancelar/estornar/reabrir/alterar_percentual.

## Trigger automático

- `tg_assinatura_cria_comissao_prevista` (existente) atualizado para preencher `codigo/origem=CONTRATO/beneficiario_*/tipo_beneficiario=CONSULTOR/valor_previsto`.
- `tg_comissao_timeline` (novo, INSERT+UPDATE) emite `eventos_timeline` `objeto_tipo='comissao'` com ações `COMISSAO_PREVISTA|_ADITIVO|_SUBSTITUIDA_NOVA|_APROVADA|_LIBERADA|_PAGA|_CANCELADA|_ESTORNADA|_SUBSTITUIDA`.

## Permissões novas

`comercial.comissao.criar | .editar | .aprovar | .substituir | .pagar` — concedidas admin_master/admin_geral/usuario (pagar só admins).

## UI

- `/comercial/comissoes` (lista global filtros status/origem/busca).
- `/comercial/comissoes/$comissaoId` (Workspace 4 abas: Resumo/Documentos/Timeline/Auditoria).
- Aba **Comissões** no Workspace do Contrato (`ComissoesContratoPanel`).
- `SubstituirComissaoDialog` para versionamento controlado.

## Não inclui

- Pagamento real / PIX / folha / banco.
- Geração automática de AP (só FK preparada).
- Cadastro UI para beneficiários múltiplos manuais.
- Workflow D5.1 de exceção sobre o gerador de assinatura.
