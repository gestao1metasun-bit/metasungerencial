# D18.18 — Editor de Minuta, Cláusulas e Forma de Pagamento

Onda aplicada em 2026-06-18 sobre `/comercial/contratos/$contratoId` (workspace do contrato pendente).
Toda a edição contratual acontece **somente** quando `etapa === "minuta"`
(`PENDENTE_REDACAO` / `MINUTA`). Nada disso aparece em Propostas, nem em
contratos gerados/assinados/cancelados.

## Local correto

- Rota única: `/comercial/contratos/$contratoId`
- Componente: `src/components/app/contratos/MinutaContratoPanel.tsx`
- Persistência: colunas oficiais de `public.contratos`
  (`forma_pagamento`, `valor_entrada`, `data_assinatura`,
  `possui_financiamento`, `financiamento_banco`, `financiamento_valor`,
  `observacoes`) **+** snapshot completo em `contratos.dados` (jsonb).
- **Não usa LS.** Sem fluxo paralelo.

## Abas internas (do editor)

1. **Contratante** — snapshot contratual editável (não sobrescreve Cliente 360).
2. **Dados Contratuais** — responsável assinatura, e-mail, prazo, local,
   data base, observações internas e que entram no contrato.
3. **Forma de Pagamento** — PIX · Boleto · Cartão · Financiamento ·
   Entrada+Parcelas · Misto.
4. **Cláusulas** — editor com template padrão, ordenação, obrigatória/opcional,
   ocultar/mostrar, revisar, adicionar/remover, restaurar padrão.
5. **Prévia** — render com variáveis substituídas + imprimir/PDF + Gerar final.

As demais abas do workspace permanecem inalteradas (Resumo, Propostas,
Projetos, Aditivos, Documentos, Timeline, Comissões, Auditoria).

## Forma de Pagamento

Implementada em `src/lib/contrato-clausulas-template.ts`:

| Tipo | Campos |
|------|--------|
| PIX | valor, data prevista, chave, observação |
| Boleto | valor, qtde parcelas, valor parcela, 1º venc., dia fixo, observação |
| Cartão | valor, parcelas, bandeira, taxa, observação |
| Financiamento | banco (Sicredi/Caixa/BASA/BB/Outro), valor, entrada, prazo, status, observação, cláusula específica |
| Entrada + Parcelas | entrada, data entrada, saldo, qtde parcelas, 1º venc. |
| Misto | componentes livres combinando os tipos acima |

**Validação:** `somaFormaPagamento(...)` ≅ `valor_total` (tolerância R$ 0,01).
Se não fechar, alerta vermelho **"Forma de pagamento não fecha com o valor
total do contrato."** e botão **Gerar contrato** bloqueado.

## Cláusulas

Template padrão com 14 cláusulas cobrindo as categorias oficiais:
Identificação, Objeto, Escopo Técnico, Valor e Pagamento, Prazo, Obrig.
Contratada, Obrig. Contratante, Financiamento (opcional), Energia/
Concessionária, Garantias, Aditivos (opcional), Cancelamento, Assinatura,
Foro.

- Obrigatórias **não podem ser removidas** (somente ocultadas).
- Opcionais podem ser removidas.
- Reordenação por setas ↑/↓.
- Estado por cláusula: `obrigatoria`, `oculta`, `revisada`, `complementar`.
- "Restaurar padrão" recria o template (confirmação no navegador).
- "Nova cláusula" adiciona uma complementar editável.

## Variáveis suportadas

`{{cliente_nome}}`, `{{cliente_documento}}`, `{{cliente_endereco}}`,
`{{valor_total}}`, `{{valor_total_extenso}}`, `{{potencia_kwp}}`,
`{{quantidade_modulos}}`, `{{inversor}}`, `{{forma_pagamento}}`,
`{{prazo_execucao}}`, `{{cidade}}`, `{{data_contrato}}`.

`valor_total_extenso` é gerado por `valorPorExtenso(...)` (suporta milhar e
centavos em PT-BR). Variáveis obrigatórias vazias destacam o texto em
vermelho na prévia e bloqueiam **Gerar contrato**.

## Validações para Gerar Contrato

Bloqueia se faltar qualquer item:

- nome do contratante
- documento (CPF/CNPJ)
- endereço contratual
- e-mail de assinatura
- forma de pagamento selecionada
- forma de pagamento fechando com valor total
- valor total > 0
- nenhuma cláusula obrigatória pendente de revisão
- nenhuma variável obrigatória vazia

Após gerar (`rpc_contrato_gerar_final`): status `MINUTA → GERADO/
AGUARDANDO_ASSINATURA`. Edição livre de cláusulas/forma fica travada.

## Reabrir Minuta (D18.18)

Implementada em `ContratoGeradoPanel`:

- Botão **Reabrir minuta** (ícone `Undo2`) visível só com permissão
  `comercial.contrato.editar_minuta`.
- Diálogo exige **motivo ≥ 5 caracteres**.
- UPDATE direto em `contratos`: `status = 'MINUTA'`, snapshot adicionado em
  `dados.timeline` (`{ tipo: 'REABERTURA_MINUTA', motivo, em }`) +
  `dados.reaberto_em` + `dados.motivo_reabertura`.
- Só `GERADO/AGUARDANDO_ASSINATURA` pode reabrir.
- `ASSINADO` e `CANCELADO` **não** podem reabrir (etapa ≠ "gerado" não
  renderiza o painel).

## Contrato gerado / assinado / cancelado

- **Gerado:** apenas visualizar prévia, anexar contrato assinado (aba
  Documentos), marcar como assinado, reabrir minuta (com permissão).
  Nunca edita cláusulas/forma/proposta origem/valor/potência/módulos.
- **Assinado/Ativo:** sem editor; libera Financeiro/Engenharia
  (`rpc_contrato_marcar_assinado` é o gate oficial).
- **Cancelado:** somente leitura.

## Arquivos alterados

- **Novo** `src/lib/contrato-clausulas-template.ts` — template padrão de
  cláusulas, helpers de variáveis (substituirVariaveis, variaveisFaltando,
  valorPorExtenso) e config tipada de forma de pagamento
  (`FormaPagamentoConfig`, `somaFormaPagamento`, `descricaoFormaPagamento`,
  `formaPagamentoVazia`).
- **Reescrito** `src/components/app/contratos/MinutaContratoPanel.tsx` —
  editor multi-aba descrito acima.
- **Atualizado** `src/components/app/contratos/ContratoGeradoPanel.tsx` —
  botão "Reabrir minuta" + timeline.
- **Atualizado** `src/routes/comercial.contratos.$contratoId.tsx` —
  passa `cliente`, `proposta` (origem) ao painel de minuta e `dados` ao
  painel de gerado.

## Permissões usadas

- `comercial.contrato.visualizar` — abrir workspace.
- `comercial.contrato.editar_minuta` — editar todas as abas do editor
  e reabrir minuta.
- `comercial.contrato.gerar_minuta` — botão Gerar contrato.
- `comercial.contrato.cancelar` — cancelar minuta.
- `comercial.contrato.aprovar_minuta` — marcar como assinado.

## Pendências / próximas ondas

- Geração de **PDF real** ainda usa `window.print()` (CSS print). PDF
  vetorial com paginação fica para próxima onda quando integrarmos um
  motor server-side.
- "Enviar para assinatura" digital (DocuSign/Clicksign) — fora do escopo.
- RPC oficial `rpc_contrato_reabrir_minuta` substituiria o UPDATE direto
  por evento de governança (D5.1) em onda futura — hoje a auditoria é
  feita por trigger `tg_contratos_audit` + snapshot em `dados.timeline`.

## Riscos

- O snapshot de variáveis depende da proposta origem mais recente
  vinculada (`propostas[0]`). Se múltiplas propostas vincularem o
  contrato, a primeira é a de referência (mesma regra já em uso em
  `useConsumoContrato`).
- `clausulas` em `dados` jsonb não tem schema validado pelo banco — a
  tipagem TS no client é a única salvaguarda. Documentado para D18 futuro
  caso se queira normalizar.

## Critério de aceite atendido

- [x] Contrato pendente abre editor real de minuta.
- [x] Cláusulas podem ser adicionadas, removidas, editadas, ordenadas.
- [x] PIX, boleto, cartão, financiamento, entrada+parcelas e misto.
- [x] Soma da forma de pagamento valida contra valor do contrato.
- [x] Prévia renderiza variáveis e destaca pendências.
- [x] Gerar contrato bloqueia edição livre (vai p/ GERADO).
- [x] Contrato gerado vai para aguardando assinatura.
- [x] Contrato assinado/cancelado não permite editar minuta.
- [x] Nada disso aparece em Propostas.
- [x] `tsc --noEmit` limpo.
