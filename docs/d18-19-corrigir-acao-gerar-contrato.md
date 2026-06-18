# D18.19 — Corrigir Ação "Gerar Contrato" na Aba Pendentes de Redação

## Problema
Em `/comercial/contratos` aba **Pendentes de Redação**, o botão "Gerar Contrato"
apenas exibia toast informativo (`acaoNoWS(...)`). Não navegava, não abria nada.

## Correção
O botão agora **navega para o workspace** do contrato selecionado e dirige o
foco para a sub-aba **Prévia** do `MinutaContratoPanel`, já destacando o botão
verde "Gerar contrato" (animate-pulse + ring esmeralda por 4s).

A mesma estratégia foi aplicada aos demais botões da aba Pendentes:

| Botão                | Destino (hash)                                    |
| -------------------- | ------------------------------------------------- |
| Abrir Minuta         | `#tab=resumo&minuta=contratante`                  |
| Editar Minuta        | `#tab=resumo&minuta=contratuais`                  |
| Editar Cláusulas     | `#tab=resumo&minuta=clausulas`                    |
| Anexar Documentos    | `#tab=documentos`                                 |
| **Gerar Contrato**   | `#tab=resumo&minuta=previa&focus=gerar`           |

> O ERP usa `useTabFromHash` (`#tab=...`) como convenção oficial. O parâmetro
> extra `minuta=<sub>` foi adicionado para direcionar a aba interna do
> `MinutaContratoPanel`; `focus=gerar` destaca o botão de geração final.

## Bloqueios mantidos
- Botão desabilitado se nenhum ou múltiplos contratos selecionados (tooltip
  "Selecione exatamente 1 contrato.").
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
