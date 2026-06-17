---
name: D18.8 — Fluxo Proposta → Contrato Pendente (Minuta)
description: Restaura camada entre Proposta APROVADA e Contrato ATIVO. Contrato nasce MINUTA, abre workspace editável, aprovação explícita via rpc_contrato_aprovar_minuta. 100% Supabase.
type: feature
---

Sub-onda D18.8 APLICADA 2026-06-17. Restaura fluxo perdido em C-ENT.11.b.

## Status canônicos
- **Proposta**: + `CONTRATO_PENDENTE` (entre APROVADA e CONTRATADA).
- **Contrato**: `MINUTA` / `ATIVO` / `CANCELADO`. Helper `classificarEtapaContrato` em `src/lib/contrato-etapa.ts` normaliza variações legadas (`Rascunho`, `Pendente`, `PENDENTE_REVISAO`).

## Permissões novas (app_permission)
- `comercial.contrato.aprovar_minuta`
- `comercial.contrato.editar_minuta`
Concedidas a admin_master / admin_geral / usuario.

## RPCs
- `rpc_proposta_gerar_contrato` REWRITE: cria MINUTA, marca proposta CONTRATO_PENDENTE (via flag `app.via_revisao_proposta`).
- `rpc_contrato_gerar_de_propostas` REWRITE (lote): idem.
- NOVA `rpc_contrato_aprovar_minuta(p_contrato_id, p_observacao)` — MINUTA → ATIVO, proposta → CONTRATADA. Valida cliente/proposta_id/valor>0.
- NOVA `rpc_contrato_cancelar_minuta(p_contrato_id, p_motivo)` — motivo ≥5, devolve proposta para APROVADA.
Todas SECURITY DEFINER, search_path=public, REVOKE anon, GRANT authenticated.

## UI
- `/comercial/contratos` — abas Pendentes (default) / Ativos / Cancelados. Badge âmbar "CONTRATO PENDENTE".
- `/comercial/contratos/$contratoId` — quando MINUTA, injeta `MinutaContratoPanel` (editor + Aprovar/Cancelar minuta). Travado: valor_total/potencia/módulos/inversor (mudam só por nova proposta ou aditivo).
- `/leads` — após gerar contrato em lote, navega direto para workspace.

## Regras de pedra
- Contrato NUNCA nasce ATIVO via fluxo de aprovação. Sempre MINUTA primeiro.
- Proposta APROVADA pode gerar contrato; após geração vira CONTRATO_PENDENTE (travada).
- Proposta CONTRATO_PENDENTE só sai para CONTRATADA via `rpc_contrato_aprovar_minuta`, ou volta para APROVADA via `rpc_contrato_cancelar_minuta`.
- Massa fixa D18.x histórica (50 ativo + 6 rascunho + 1 pendente) intacta.

## Pendência
- `PropostasPage` LS ainda chama `aprovarProposta()` (helper LS legado) que cria contrato pendente LS. Esse caminho continua por compat com Engenharia/Financeiro LS; homologação real D18.8 = `/comercial/clientes/$id` (Propostas Supabase → Gerar contrato) e `/leads` (seleção múltipla → Gerar contrato).

Detalhes em docs/d18-8-fluxo-proposta-contrato-pendente.md.
