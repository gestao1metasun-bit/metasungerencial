# D18.13 — Reconstrução do Fluxo Real Proposta → Contratos → Assinatura

**Data:** 2026-06-18  
**Status:** APLICADA (incremental sobre D18.12)

## Objetivo
Consolidar o fluxo oficial Proposta APROVADA → Contrato PENDENTE DE REDAÇÃO →
Contrato GERADO / AGUARDANDO ASSINATURA → Contrato ASSINADO/ATIVO → liberação
de Financeiro e Engenharia. Eliminar ambiguidade entre proposta e contrato.

## Esteira oficial

```
PROPOSTA APROVADA
   │  [Enviar para Contratos]  →  rpc_proposta_enviar_para_contratos
   ▼
CONTRATO PENDENTE DE REDAÇÃO   (status=MINUTA · etapa=PENDENTE_REDACAO)
   │  [Gerar Contrato]         →  rpc_contrato_gerar_final
   ▼
CONTRATO GERADO / AGUARDANDO ASSINATURA   (status=GERADO/AGUARDANDO_ASSINATURA)
   │  [Marcar como Assinado]   →  rpc_contrato_marcar_assinado
   ▼
CONTRATO ASSINADO / ATIVO     (libera financeiro + engenharia)
```

## Telas alteradas

| Tela | Mudança |
|---|---|
| `/comercial/contratos` | Tabs renomeadas: **Pendentes de Redação · Contratos Gerados / Aguardando Assinatura · Contratos Assinados · Cancelados**. Empty-state da aba pendente atualizado. |
| `/comercial/contratos/$contratoId` | Título já usa `rotuloEtapaContrato(etapa)`; ações por etapa (MinutaContratoPanel · ContratoGeradoPanel · ContratoAssinadoActions) mantidas. Financeiro/Engenharia continuam **desabilitados com tooltip explicativo** até integração. |
| `/comercial/propostas` | Mantém redirect canônico para `/comercial#tab=orcamentos` (workspace embarcado), sem card intermediário. |
| `GerarContratoDialog` | Renomeado para a semântica **Enviar para Contratos** (título, botão, toast). Passa a chamar `useEnviarPropostaParaContratos`. |

## Backend

| RPC | Status | Função |
|---|---|---|
| `rpc_proposta_enviar_para_contratos(uuid)` | **NOVO (D18.13)** | Wrapper canônico oficial sobre `rpc_proposta_gerar_contrato`. SECURITY DEFINER, `search_path=public`, EXECUTE só `authenticated`. |
| `rpc_proposta_gerar_contrato(uuid)` | mantido | Cria contrato `MINUTA` (`dados.etapa=PENDENTE_REDACAO`); marca proposta como `CONTRATO_PENDENTE`; cria vínculo `contrato_propostas`; registra timeline. |
| `rpc_contrato_gerar_final(uuid, text)` | D18.12 | `MINUTA → GERADO/AGUARDANDO_ASSINATURA`. |
| `rpc_contrato_marcar_assinado(uuid, text)` | D18.12 | `GERADO → ATIVO`, marca proposta origem como `CONTRATADA`. |
| `rpc_contrato_cancelar_minuta(uuid, text)` | D18.8 | Cancela minuta e devolve proposta para `APROVADA`. |

## Status canônicos × etapa UI

| Status DB | Etapa UI (`classificarEtapaContrato`) | Rótulo |
|---|---|---|
| `MINUTA · PENDENTE_REVISAO · PENDENTE_APROVACAO · PENDENTE · RASCUNHO` | `minuta` | **CONTRATO PENDENTE** |
| `GERADO · AGUARDANDO_ASSINATURA · EM_ASSINATURA` | `gerado` | **AGUARDANDO ASSINATURA** |
| `ASSINADO · ATIVO · ATIVA · VIGENTE` | `assinado` | **ASSINADO** |
| `CANCELADO` ou flag `cancelado=true` | `cancelado` | **CANCELADO** |

## Campos por etapa (MinutaContratoPanel / ContratoGeradoPanel)

**Etapa MINUTA — editáveis:** observações, valor entrada, forma de pagamento textual,
financiamento (banco/valor), dados contratuais complementares em `contratos.dados`.

**Etapa MINUTA — bloqueados:** valor global, potência, módulos, inversor, consumo
(alterações comerciais/técnicas exigem nova proposta).

**Etapa GERADO:** somente Marcar como Assinado / Voltar para minuta (permissão) /
Anexar contrato assinado (via DocumentosObjetoPanel). Nenhuma edição comercial.

**Etapa ASSINADO:** abas Projetos/Aditivos/Comissões liberadas. Botões "Gerar
financeiro" e "Enviar engenharia" presentes mas **desabilitados** com tooltip
*"Disponível após integração …"* — sem toast genérico.

## Gating de Financeiro/Engenharia
- Antes da assinatura: nenhuma ação financeira/engenharia visível no workspace
  do contrato.
- Após `rpc_contrato_marcar_assinado`: o painel `ContratoAssinadoActions`
  renderiza os botões em modo `disabled` com tooltip explicativo.
- A integração efetiva entrará em onda própria (Financeiro / Engenharia).

## Proposta origem
- Status `CONTRATO_PENDENTE` → proposta read-only; aparece link para o contrato
  pendente no workspace do contrato (botão "Proposta origem").
- Status `CONTRATADA` → proposta read-only; vínculo permanente com contrato
  ATIVO via `contrato_propostas`.

## Ribbon Comercial
- **Propostas** → `/comercial/propostas` (redirect canônico para o workspace
  embarcado de propostas).
- **Contratos** → `/comercial/contratos` (lista com 4 abas oficiais).
- **Comissões** → `/comercial/comissoes`.
- Sem cards intermediários de redirecionamento.

## Testes executados
- `tsc --noEmit`: limpo (após corrigir referência ao hook renomeado).
- Migração aplicada — linter Supabase: 277 WARNs (todos do padrão aceito
  D14.2 — search_path mutável em RPCs herdadas + `Public Can Execute
  SECURITY DEFINER Function` que é o modelo oficial do ERP; nenhum WARN
  novo introduzido por esta onda).
- Smoke do fluxo (manual): Aprovar proposta → Enviar para Contratos →
  contrato aparece em "Pendentes de Redação" → editar minuta → Gerar
  contrato → aparece em "Contratos Gerados / Aguardando Assinatura" →
  Marcar Assinado → vai para "Contratos Assinados" e proposta vira
  `CONTRATADA`.

## Riscos
- O dialog `GerarContratoDialog` ainda persiste dados financeiros via
  `UPDATE` direto na tabela `contratos` após a RPC. Mantido por
  compatibilidade — refator para RPC dedicada
  (`rpc_contrato_salvar_minuta`) fica em onda própria.
- Camada Propostas continua majoritariamente LS (PropostaList). A
  separação física da rota `/comercial/propostas` para componente
  dedicado (sem redirect) virá quando a migração Propostas LS→Supabase
  fechar (Onda C-ENT.3 já parcial).

## Pendências para próximas ondas
- `rpc_contrato_salvar_minuta(uuid, jsonb)` formal (substitui UPDATE direto).
- Integração real de Financeiro (`rpc_contrato_gerar_financeiro`) e
  Engenharia (`rpc_contrato_enviar_engenharia` já existe e cria obra;
  ligar ao botão quando UI engenharia estiver pronta).
- Tela `/comercial/propostas` dedicada (sem redirect) com grid Supabase.
- Aba "Cláusulas" e "Dados Contratuais" como abas explícitas no
  workspace do contrato MINUTA (hoje vivem dentro do
  `MinutaContratoPanel`).
