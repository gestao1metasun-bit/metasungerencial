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
`MinutaContratoPanel` agora escuta `hashchange` / `popstate` /
`lovable:hash-sync`, lê `minuta` (uma das abas internas
`contratante|contratuais|pagamento|clausulas|previa`) e `focus=gerar`,
trocando a sub-aba e ativando o highlight do botão verde.

## Arquivos alterados
- `src/routes/comercial.contratos.index.tsx` — handlers de status/process
  passam hash de foco para `abrirContrato`.
- `src/components/app/contratos/MinutaContratoPanel.tsx` — leitura de hash
  para `minuta` e `focus=gerar`, highlight no botão.

## Critério de aceite
- ✅ Clicar "Gerar Contrato" abre o workspace do contrato.
- ✅ Abre direto na aba Prévia da minuta.
- ✅ Sem toast informativo como ação principal.
- ✅ Desabilitado quando 0 ou >1 contratos selecionados.
- ✅ `tsc --noEmit` limpo.
