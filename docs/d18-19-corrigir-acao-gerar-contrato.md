# D18.19 — Corrigir Ação "Gerar Contrato" na Aba Pendentes de Redação

## Problema
Em `/comercial/contratos` aba **Pendentes de Redação**, o botão "Gerar Contrato"
apenas exibia toast informativo (`acaoNoWS(...)`). Não navegava, não abria nada.

## Correção final
O botão agora **navega imediatamente para o workspace** do contrato selecionado
usando a URL oficial `/comercial/contratos/$contratoId?tab=previa&focus=gerar`,
sem toast informativo e sem permanecer na grid. O workspace abre a sub-aba
**Prévia** do `MinutaContratoPanel` e destaca o botão verde "Gerar contrato".

A mesma estratégia foi aplicada aos demais botões da aba Pendentes:

| Botão                | Destino (hash)                                    |
| -------------------- | ------------------------------------------------- |
| Abrir Minuta         | `#tab=resumo&minuta=contratante`                  |
| Editar Minuta        | `#tab=resumo&minuta=contratuais`                  |
| Editar Cláusulas     | `#tab=resumo&minuta=clausulas`                    |
| Anexar Documentos    | `#tab=documentos`                                 |
| **Gerar Contrato**   | `?tab=previa&focus=gerar`                         |

> A navegação antiga via hash foi preservada para os demais atalhos internos,
> mas a ação principal **Gerar Contrato** usa query params oficiais conforme o
> aceite desta correção.

## Bloqueios mantidos
- Botão desabilitado sem seleção com tooltip "Selecione um contrato pendente.".
- Botão desabilitado com múltipla seleção com tooltip "Selecione apenas um contrato para gerar.".
- Desabilitado sem permissão `comercial.contrato.criar` ou se contrato
  cancelado.
- Aparece somente na aba `minuta` (Pendentes de Redação).

## Workspace
`MinutaContratoPanel` agora lê `?tab=previa&focus=gerar` na entrada da rota,
mantém compatibilidade com o hash legado (`minuta=previa&focus=gerar`) e troca
a sub-aba interna para **Prévia**, ativando o highlight do botão verde.

## Arquivos alterados
- `src/routes/comercial.contratos.index.tsx` — ação **Gerar Contrato** navega
  com search params oficiais e tooltips específicos de seleção.
- `src/routes/comercial.contratos.$contratoId.tsx` — workspace trata
  `tab=previa` como entrada direta no painel de minuta.
- `src/components/app/contratos/MinutaContratoPanel.tsx` — leitura de query/hash
  para abrir Prévia e destacar `focus=gerar`.

## Critério de aceite
- ✅ Clicar "Gerar Contrato" abre o workspace do contrato.
- ✅ Abre direto na aba Prévia da minuta.
- ✅ Sem toast informativo como ação principal.
- ✅ Desabilitado quando 0 ou >1 contratos selecionados.
- ✅ `tsc --noEmit` limpo.
