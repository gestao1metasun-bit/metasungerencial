# D18.17 — Padronização do Layout da Grade de Contratos

## Objetivo
Adequar `/comercial/contratos` ao padrão visual/operacional do ERP: sem coluna
"Ações" por linha, com checkbox de seleção e toolbar contextual que muda
conforme aba/seleção.

## Mudanças
- **Coluna "Ações" removida** de todas as 5 abas (minuta, gerado, aguardando,
  assinado, cancelado). Ícones por linha (olho/lápis/clipe/abrir/cancelar)
  deixaram de existir.
- **Checkbox por linha** + **checkbox no header** (select-all da aba).
  Estado tri-state quando seleção parcial. Seleção é resetada ao trocar de aba.
- **ContextualToolbar** acima da tabela, com 3 modos:
  - 0 selecionados → "Nenhum contrato selecionado" + ações globais
    (Atualizar, Filtros, Exportar, Layout).
  - 1 selecionado → contador `1 contrato selecionado`, código do contrato,
    `Limpar seleção` + ações por aba/status.
  - N>1 selecionados → contador `N contratos selecionados`, `Limpar seleção`,
    Exportar selecionados + aviso "Ações em lote indisponíveis para esta
    seleção" (lote ainda não habilitado por segurança).
- **Clique no código** abre o workspace do contrato. **Duplo clique na linha**
  também abre. Toggle do checkbox NÃO abre o workspace (stopPropagation).
- **Toolbar superior** do PageHeader perdeu o botão "Atualizar" individual
  (agora vive na toolbar contextual global).

## Ações por aba (seleção única)
| Aba | Ações habilitadas |
| --- | --- |
| Pendentes de Redação | Abrir minuta · Editar minuta · Editar cláusulas · Anexar documentos · Gerar contrato · Cancelar minuta · Proposta origem · Cliente 360º |
| Contratos Gerados | Abrir contrato gerado · Visualizar PDF · Baixar PDF · Enviar p/ assinatura · Anexar contrato assinado · Marcar como aguardando assinatura · Proposta origem · Cliente 360º |
| Aguardando Assinatura | Abrir contrato · Reenviar assinatura · Anexar contrato assinado · Marcar como assinado · Proposta origem · Cliente 360º |
| Contratos Assinados | Abrir contrato · Abrir projetos · Criar aditivo · Ver comissões · Ver documentos · Ver timeline · Gerar financeiro (disabled) · Enviar engenharia (disabled) · Proposta origem · Cliente 360º |
| Cancelados | Visualizar contrato · Ver documentos · Ver timeline · Proposta origem · Cliente 360º (somente leitura) |

## Permissões aplicadas (botão fica `disabled` com tooltip explicativa)
- `comercial.contrato.visualizar` — gate de página.
- `comercial.contrato.editar_minuta` — Editar minuta · Editar cláusulas.
- `comercial.contrato.criar` — Gerar contrato.
- `comercial.contrato.cancelar` — Cancelar minuta/contrato.
- `comercial.contrato.enviar_assinatura` — Enviar / Reenviar assinatura.
- `comercial.contrato.assinar` — Marcar como assinado.
- Gerar financeiro / Enviar engenharia ficam sempre `disabled` com tooltip
  "Disponível após integração do módulo financeiro/engenharia" (D18.16).

## Ações inseguras NÃO mostradas em lote
- Cancelamento em lote, Gerar em lote, Marcar assinado em lote, Enviar
  assinatura em lote — nenhum mostrado até existir RPC oficial em lote.
  Apenas "Exportar selecionados" (placeholder) e Limpar seleção.

## Padrão visual
- Toolbar em `Card` denso (`p-2`), botões `ghost size=sm h-7 px-2 text-xs`
  com ícone + label, separadores verticais agrupando blocos lógicos
  (workflow / cancelamento / referências externas), tooltip universal,
  estado `disabled` + `loading` (spin no ícone para Atualizar).

## Arquivos alterados
- `src/routes/comercial.contratos.index.tsx` — reescrita da listagem, novo
  componente interno `ContextualToolbar`, `ToolbarBtn`, `PropostaOrigemBtn`,
  `Cliente360Btn`. `ContratoRow` enxuto sem `RowActions`. `ColumnsHeader` com
  checkbox de select-all em todas as abas.

## Testes
- `tsc --noEmit` limpo (build do harness).
- Navegação: ribbon Comercial → Contratos abre `/comercial/contratos` com as
  5 abas oficiais. Nenhuma ação de proposta exposta.

## Riscos / pendências
- Ações em lote (Gerar, Cancelar, Enviar assinatura em lote) ficam para onda
  futura — requerem RPCs `rpc_contrato_*_em_lote` com idempotência.
- Filtros avançados, Exportar e Layout estão como `toast` placeholder.
- Integração com Financeiro (`Gerar financeiro`) e Engenharia (`Enviar
  engenharia`) entra em D18.16.
