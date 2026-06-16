# C-ENT.9 — Aditivo Compensatório

## Regra de pedra
Aditivo `APLICADO` é **imutável**: não pode ser cancelado, editado ou apagado.
Para corrigir efeitos, **gere um aditivo COMPENSATÓRIO** que referencia o original
e aplica uma nova alteração sobre os valores vigentes.

Mensagem oficial (UI):
> *"Aditivo aplicado não pode ser cancelado ou editado. Para corrigir seus efeitos, gere um aditivo compensatório."*

## Migrations
- `20260616_aditivo_compensatorio.sql`:
  - `aditivos` ganha `tipo_aditivo` (`NORMAL`/`COMPENSATORIO`, default `NORMAL`),
    `aditivo_origem_id` FK→`aditivos.id`, `motivo_compensacao`, `observacao_compensacao`.
  - CHECKs: `tipo_aditivo IN (NORMAL,COMPENSATORIO)`,
    `(NORMAL ⇒ origem=NULL) AND (COMPENSATORIO ⇒ origem NOT NULL)`.
  - Índice parcial em `aditivo_origem_id`.
  - Novo valor de enum `app_permission`: `comercial.aditivo.compensar`.
  - Reescrita de `rpc_aditivo_aplicar(_payload jsonb)` com novos parâmetros e
    validações de origem (status APLICADO, mesmo contrato, mesmo escopo, mesmo
    projeto quando PROJETO).
- Grant: `comercial.aditivo.compensar` concedida a todo role que já possui
  `comercial.aditivo.criar`.

## RPC
`rpc_aditivo_aplicar` agora:
1. Valida `tipo_aditivo` e (se COMPENSATORIO) a origem.
2. Calcula deltas a partir dos valores **vigentes** do projeto/contrato.
3. Insere o novo aditivo com `tipo_aditivo`, `aditivo_origem_id`, `motivo_compensacao`,
   `observacao_compensacao` e código `…-C` quando COMPENSATORIO.
4. Atualiza projeto/contrato (igual ao fluxo NORMAL — compensatório também é um aditivo
   atômico que altera os valores vigentes).
5. Emite timeline:
   - `ADITIVO_COMPENSATORIO_APLICADO` (no aditivo novo).
   - `ADITIVO_COMPENSADO` (no aditivo original, sem alterá-lo).
   - `ALTERACAO_POR_ADITIVO_COMPENSATORIO` (no projeto e no contrato).
   - Para NORMAL, mantém `ADITIVO_APLICADO`/`PROJETO_ALTERADO_POR_ADITIVO`/`CONTRATO_ALTERADO_POR_ADITIVO`.

## Repo
`src/lib/repositories/aditivos-repo.ts`
- `AditivoSupabase` ganha `tipo_aditivo`, `aditivo_origem_id`, `motivo_compensacao`,
  `observacao_compensacao`.
- `AplicarAditivoInput` aceita os mesmos campos.
- `aplicarAditivo` reusada (sem mudança de assinatura externa).

## Componentes
- `NovoAditivoDialog.tsx` — agora bimodal:
  - Sem `aditivoOrigem` → modo **NORMAL** (mesmo comportamento de C-ENT.8).
  - Com `aditivoOrigem` → modo **COMPENSATÓRIO**: escopo/projeto travados,
    badge âmbar, alerta com Δ do aditivo original, campo obrigatório
    *Motivo da compensação*, aviso de "não altera histórico do original".
- `AditivosListPanel.tsx` — atualizado:
  - Coluna `Tipo` com badge `NORMAL` / `COMPENSATÓRIO` (âmbar).
  - Sob o código, exibe `Compensa: ADT-XXX` (quando compensatório) e
    `Compensado por aditivo posterior` (quando foi compensado).
  - Ação `Compensar` (botão âmbar) em aditivos APLICADOS, gated por
    `comercial.aditivo.compensar`.
  - Botão `Ban` desabilitado com tooltip exibindo a mensagem oficial de
    imutabilidade — substitui qualquer ação de "Cancelar" para APLICADOS.

## Workspaces integrados
- `src/routes/comercial.contratos.$contratoId.tsx`
  - Estado `compensarOrigem` controla o dialog.
  - `AditivosListPanel` recebe `podeCompensar` + `onCompensar`.
  - `NovoAditivoDialog` recebe `aditivoOrigem` (limpa ao fechar).
- `src/routes/comercial.projetos.$projetoId.tsx`
  - Estado `compensarOrigem` + `useProjetosPorContrato` (necessário para
    `NovoAditivoDialog`).
  - `AditivosListPanel` ganha `podeCompensar` + `onCompensar`.
  - `NovoAditivoDialog` renderizado quando há origem selecionada.

## Permissões
- Nova: `comercial.aditivo.compensar` (gate no botão "Compensar").
- Reutiliza: `comercial.aditivo.criar` (motor RPC).
- Quem já tinha `criar` recebeu `compensar` (idempotente).

## Timeline emitida
| Quando                | Evento                                        | Em                |
|-----------------------|-----------------------------------------------|-------------------|
| NORMAL aplicado       | `ADITIVO_APLICADO`                            | aditivo novo      |
| NORMAL aplicado       | `PROJETO_ALTERADO_POR_ADITIVO` *(se PROJETO)* | projeto           |
| NORMAL aplicado       | `CONTRATO_ALTERADO_POR_ADITIVO`               | contrato          |
| COMPENSATÓRIO aplicado| `ADITIVO_COMPENSATORIO_APLICADO`              | aditivo novo      |
| COMPENSATÓRIO aplicado| `ADITIVO_COMPENSADO`                          | aditivo original  |
| COMPENSATÓRIO aplicado| `ALTERACAO_POR_ADITIVO_COMPENSATORIO`         | projeto + contrato|

## Validações
- `tipo_aditivo COMPENSATORIO ⇒ aditivo_origem_id obrigatório` (CHECK + RPC).
- Origem precisa estar `APLICADO`.
- Origem precisa pertencer ao mesmo contrato.
- Mesmo `tipo_escopo` (PROJETO/CONTRATO) que a origem.
- Mesmo `projeto_id` quando origem é de projeto.
- Aditivo de origem **não é mutado** — apenas referenciado.
- Compensar **compensatório** é permitido (cadeia 001 → 002 → 003); cada elo
  fica registrado por `aditivo_origem_id`.

## Riscos
- O cálculo do compensatório usa os **valores vigentes atuais**, não os do
  aditivo original. Se houver mais de um aditivo entre o original e o
  compensatório, o usuário precisa avaliar o efeito líquido desejado.
- A cadeia de compensações não é visualizada graficamente nesta onda —
  é exibida apenas linearmente via `Compensa: ADT-XXX` e
  `Compensado por aditivo posterior`.

## Pendências
- Painel "árvore de compensações" e diff acumulado entre aditivo original e
  compensatório.
- Permissão fina de "compensar contrato cancelado" — hoje continua bloqueado
  pela mesma regra de contrato CANCELADO não aceitar aditivo.

## Não fizemos nesta onda
- Financeiro complementar / estorno / recomissionamento.
- PDF, assinatura, reabertura de contrato/projeto.
- Edição/cancelamento de aditivo APLICADO (continua proibido).

## Próxima onda recomendada
**C-ENT.10 — Comissões enterprise**: amarrar liberação/cancelamento de comissão
a aditivos (normal e compensatório) sem mutar o aditivo aplicado.
