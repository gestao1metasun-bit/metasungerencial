# D18.12 — Reconstrução da Esteira Oficial de Contratos

## Objetivo
Substituir o fluxo direto **MINUTA → ATIVO** pela esteira completa exigida pela operação Meta Sun:

```
Proposta APROVADA
   ↓ (rpc_proposta_gerar_contrato)
Contrato MINUTA (Pendente)
   ↓ (rpc_contrato_gerar_final)            [D18.12 NEW]
Contrato GERADO / AGUARDANDO_ASSINATURA
   ↓ (rpc_contrato_marcar_assinado)        [D18.12 NEW]
Contrato ATIVO + Proposta CONTRATADA
   ↓
Financeiro / Engenharia (gates desabilitados até integração)
```

## Status oficiais reconhecidos
| Etapa      | Status aceitos no banco                                  |
|------------|----------------------------------------------------------|
| minuta     | MINUTA, PENDENTE_REVISAO, PENDENTE_APROVACAO, PENDENTE, RASCUNHO |
| gerado     | GERADO, AGUARDANDO_ASSINATURA, EM_ASSINATURA             |
| assinado   | ASSINADO, ATIVO, ATIVA, VIGENTE                          |
| cancelado  | CANCELADO (ou `cancelado = true`)                        |

Classificador em `src/lib/contrato-etapa.ts` (`EtapaContrato`, `classificarEtapaContrato`, `rotuloEtapaContrato`, `badgeEtapaContrato`).

## RPCs criadas/ajustadas
- **`rpc_contrato_gerar_final(p_contrato_id, p_observacao)`** — `SECURITY DEFINER`, search_path=public, EXECUTE → authenticated.
  - MINUTA/PENDENTE/RASCUNHO → `GERADO` (etapa `AGUARDANDO_ASSINATURA` no jsonb).
  - Valida contrato existe, não cancelado, com cliente, proposta origem e valor>0.
  - NÃO toca proposta. NÃO dispara financeiro/engenharia.
- **`rpc_contrato_marcar_assinado(p_contrato_id, p_observacao)`** — `SECURITY DEFINER`, search_path=public, EXECUTE → authenticated.
  - GERADO/AGUARDANDO_ASSINATURA → `ATIVO` (etapa `ASSINADO`, `data_assinatura = COALESCE(data_assinatura, hoje)`).
  - Marca proposta de origem como `CONTRATADA` via flag `app.via_revisao_proposta`.
- **`rpc_contrato_cancelar_minuta`** — mantida intacta (MINUTA → CANCELADO + proposta volta a APROVADA).
- **`rpc_contrato_aprovar_minuta`** — mantida por compatibilidade (não chamada por UI nova).

## UI

### `/comercial/contratos` (listagem)
- 4 abas: **Pendentes**, **Contratos Gerados**, **Contratos Assinados**, **Cancelados**.
- Coluna **Etapa** classificada pelo helper. Datas: Criado / Gerado / Assinado.
- Mensagens vazias por aba contextualizadas.

### `/comercial/contratos/$contratoId` (workspace)
Variações por etapa (título via `rotuloEtapaContrato`):
| Etapa     | Panel renderizado                | Botões header                                     |
|-----------|----------------------------------|--------------------------------------------------|
| minuta    | `MinutaContratoPanel`            | Voltar, Cliente 360, Proposta origem             |
| gerado    | `ContratoGeradoPanel`            | Voltar, Cliente 360, Proposta origem             |
| assinado  | `ContratoAssinadoActions`        | Voltar, Cliente 360, Proposta origem, **Novo Aditivo**, **Cancelar contrato** |
| cancelado | (nenhum)                         | Voltar, Cliente 360, Proposta origem             |

### `MinutaContratoPanel`
- Botão principal renomeado **Aprovar contrato → Gerar contrato** (`useGerarContratoFinal`).
- Cancelar minuta inalterado.
- Texto do diálogo deixa claro que a proposta permanece em `CONTRATO_PENDENTE` até a assinatura.

### `ContratoGeradoPanel` (novo)
- Único botão de ação: **Marcar como assinado** (`useMarcarContratoAssinado`).
- Texto explicita que campos comerciais já estão travados e que Financeiro/Engenharia só serão liberados após o registro.

### `ContratoAssinadoActions` (novo, inline no workspace)
- Botões **Gerar financeiro** e **Enviar engenharia** desabilitados com tooltip
  `"Disponível após integração financeira/engenharia."` — nunca toast genérico.

## Repositório `comercial-processos-repo.ts`
Novos hooks:
- `useGerarContratoFinal(contratoId, observacao?)`
- `useMarcarContratoAssinado(contratoId, observacao?)`

Ambos invalidam `propostas`, `contratos`, `obras`, `comissoes`, `financiamentos_pendencias`, `aditivos`.

## Bloqueios mantidos
- Proposta `CONTRATO_PENDENTE` / `CONTRATADA` continua bloqueada para edição/exclusão/cancelamento direto (lógica existente em `PropostaList.tsx`).
- Geração de contrato apenas a partir de proposta `APROVADA` (validação na RPC `rpc_proposta_gerar_contrato`).
- Cancelar minuta devolve proposta a `APROVADA` (RPC existente).

## Pendências / próximas ondas
- Aba **Cláusulas** dedicada (hoje as cláusulas vivem no campo livre `observacoes` da minuta).
- RPCs reais `rpc_contrato_gerar_financeiro` / `rpc_contrato_enviar_engenharia_oficial` ainda em backlog (botões desabilitados).
- Voltar contrato GERADO → MINUTA exige nova permissão dedicada (não implementado nesta onda).
- Aba **Auditoria** ainda placeholder; eventos seguem via `Timeline`.

## Riscos
- Contratos legados em `Ativo` (50 registros) seguem classificados como `assinado` — comportamento esperado.
- A flag `app.via_revisao_proposta` é reusada para permitir a transição `APROVADA → CONTRATADA`; trigger anti-edição de proposta exige essa flag.

## Validação
- `bunx tsc --noEmit` → **0 erros**.
- Linter Supabase: WARNs aumentam apenas pelos novos `SECURITY DEFINER` (padrão D14.2 já aceito).

## Critério de aceite
✔ Contratos recebe somente propostas aprovadas (origem RPC `rpc_proposta_gerar_contrato`).
✔ Aba **Pendentes** lista minutas; **Gerados** lista aguardando assinatura; **Assinados** lista ativos; **Cancelados** lista anulados.
✔ Proposta vira `CONTRATADA` somente após assinatura registrada.
✔ Financeiro e Engenharia só aparecem após etapa assinado (e disabled até integração).
✔ Contrato pendente editável (cláusulas/forma de pagamento/observações); contrato gerado bloqueado para edição comercial; contrato assinado libera projetos/aditivos/comissões.
✔ Nenhum fluxo novo usa LocalStorage.
✔ `tsc --noEmit` limpo.
