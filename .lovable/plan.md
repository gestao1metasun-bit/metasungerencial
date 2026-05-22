## Objetivo

Transformar o `financeiro-store.ts` atual (lista simples de lançamentos por camada) em uma estrutura completa de **Contas a Pagar / Contas a Receber** com **nascimento automático** vindo dos demais módulos, mantendo o que já funciona (camadas, dashboard, conciliações simples) e somando o que falta.

Tudo continua em `localStorage` (sem Supabase nesta etapa), com `useSyncExternalStore` e auditoria via `pushAudit()`.

---

## 1. Nova estrutura de dados

### Stores novos / estendidos
- `src/lib/fin-titulos-store.ts` (novo) — núcleo do AP/AR
  - `TituloPagar` e `TituloReceber` com:
    - `id`, `tipo` ("AP"|"AR"), `origem` ("compra"|"comissao"|"mao_obra"|"frete"|"manutencao"|"contrato"|"financiamento"|"manual")
    - `status`: `previsto | comprometido | parcial | a_pagar | a_receber | pago | recebido | cancelado`
    - `valorOriginal`, `valorPago`, `saldo`, `descontos`, `juros`, `multa`
    - `vencimento`, `competencia`, `dataEmissao`, `dataLiquidacao?`
    - `natureza`, `centroCusto`, `contaFinanceira`, `meioPagamento`
    - `fornecedor?` / `cliente?`, `obraId?`, `contratoId?`, `parcelaLabel?`
    - `comprovanteUrl?`, `observacao?`
    - `criadoPor`, `criadoEm`, bloqueado por `fechamento?`
  - `Pagamento` / `Recebimento` (movimentos parciais) com auditoria
- `src/lib/fin-fornecedores-store.ts` (novo) — cadastro simples (nome, doc, contato)
- `src/lib/fin-contas-store.ts` (novo) — contas bancárias / caixa
- `src/lib/fin-fechamento-store.ts` (novo) — mês fechado + flag de reabertura (somente gerente)
- `src/lib/financeiro-store.ts` (estender) — manter `Lancamento` legado como **view derivada** dos títulos (compat com Fluxo de Caixa atual)

### Helpers de geração automática
- `gerarAPdeCompra(compra)` — chamado ao registrar compra no Estoque
- `gerarAPdeComissao(contratoId, valor, parcelas)` — chamado ao liberar comissão
- `gerarAPdeMaoObra(obraId, sugestao)` — chamado quando Obra → Finalizada
- `gerarAPdeFrete(...)` / `gerarAPdeManutencao(...)`
- `gerarARdeContrato(contratoId)` — chamado ao assinar contrato (parcelamento)
- `gerarARdeFinanciamento(contratoId)` — chamado quando liberação aprovada
- `gerarARdeManutencao(obraId, valor)` — pós-venda paga

Cada helper grava `pushAudit({ entidade: "titulo", acao: "CRIACAO_AUTO", ... })`.

---

## 2. Integrações com módulos existentes

| Módulo | Gatilho | Ação no Financeiro |
|---|---|---|
| Comercial (`contratos-store.ts`) | contrato assinado | `gerarARdeContrato` (status `previsto`) |
| Financiamentos (`fin-pendencias.ts`) | `liberarParaEngenharia` / aprovação banco | `gerarARdeFinanciamento` (status `comprometido` → `a_receber`) |
| Estoque (novo — etapa de compras) | registrar compra | `gerarAPdeCompra` + entrada de estoque |
| Engenharia (`engenharia.tsx`) | obra → Finalizada | sugerir `gerarAPdeMaoObra` (usuário confirma) |
| Pós-venda / Obras finalizadas | manutenção registrada | `gerarAPdeManutencao` + opcional `gerarARdeManutencao` |

Comissão fica como **previsão** vinda do contrato; só vira AP quando usuário clica "Liberar comissão" na tela do contrato/financeiro.

---

## 3. UI — refatorar `src/routes/financeiro.tsx`

Tabs (substituem/expandem as atuais):

1. **Dashboard** — cards: Previsto 30d, Comprometido, A Pagar, A Receber, Recebido mês, Pago mês, Inadimplência, Saldo bancos, Margem obras
2. **Contas a Pagar** — tabela com filtros (status, natureza, fornecedor, obra, vencimento), ações: Editar (pré-pgto), Pagar (parcial/total), Cancelar, Estornar (pós-pgto)
3. **Contas a Receber** — espelho do AP, com baixa parcial + juros/multa/desconto
4. **Fluxo de Caixa** — manter view atual (alimentada agora pelos títulos)
5. **Cadastros** — Fornecedores, Contas financeiras, Naturezas, Centros de custo
6. **Conciliação** — banco, PIX, boleto, cartão (match manual)
7. **Fechamento** — fechar/reabrir mês, lista de períodos travados

Dialogs novos:
- `TituloDialog` (criar/editar título AP ou AR)
- `BaixaDialog` (pagar/receber com parcial, juros, multa, desconto, conta destino)
- `EstornoDialog` (motivo obrigatório → registra auditoria, libera edição)
- `LiberarComissaoDialog` (parcial/total) — disparado no Comercial e no Financeiro
- `FechamentoMensalDialog`

---

## 4. Regras de edição e auditoria

- **Antes do pagamento**: valor, vencimento, observação, natureza, centro custo livremente editáveis (auditado).
- **Após o pagamento**: campos travados; só via **Estorno** (com motivo) → reabre para edição → nova baixa.
- **Após fechamento mensal**: tudo travado, exceto para `role = admin_master` ou perfil "Gerente Financeiro".
- Toda alteração chama `pushAudit({ entidade: "titulo", acao, campo, valorAnterior, valorNovo, motivo })`.

Permissões via `perfis-store.ts` — adicionar capability `financeiro.editar_pago` e `financeiro.fechar_mes`.

---

## 5. Compatibilidade com o que já existe

- `financeiro-store.ts` — manter `useLancamentos`, `appendLancamentos`, `readLancamentos`, `removeLancamentosDoContrato` como **shims**:
  - `appendLancamentos` continua escrevendo a lista legada (para não quebrar Dashboard atual).
  - Adicionalmente, sempre que um título for criado/baixado, escrevemos um `Lancamento` espelho na camada certa (`Realizado` no pago, `Confirmado` no a pagar/receber, `Previsto` no previsto).
- Não mexer em: `contratos-store.ts`, `aditivos-store.ts`, `fin-pendencias.ts`, `estoque-store.ts`, exceto para **chamar** os novos helpers nos pontos certos.

---

## 6. Entregas em fases (mesma PR)

**Fase A — fundação (sem UI nova ainda)**
- Criar `fin-titulos-store.ts`, `fin-fornecedores-store.ts`, `fin-contas-store.ts`, `fin-fechamento-store.ts`
- Helpers de geração + shim para `financeiro-store.ts`
- Audit hooks

**Fase B — UI Contas a Pagar / Receber**
- Refatorar `financeiro.tsx` com novas tabs
- `TituloDialog`, `BaixaDialog`, `EstornoDialog`

**Fase C — Integrações automáticas**
- Hook em `contratos-store` (assinatura → AR)
- Hook em `fin-pendencias` (aprovação → AR)
- Hook em `engenharia` (finalizada → sugestão AP mão de obra)
- Botão "Liberar comissão" no contrato

**Fase D — Cadastros, Conciliação, Fechamento**
- Aba Cadastros (fornecedores/contas)
- Conciliação manual
- Fechamento mensal + permissões

---

## 7. Arquivos a criar / editar

**Criar**
- `src/lib/fin-titulos-store.ts`
- `src/lib/fin-fornecedores-store.ts`
- `src/lib/fin-contas-store.ts`
- `src/lib/fin-fechamento-store.ts`
- `src/modules/financeiro/components/TituloDialog.tsx`
- `src/modules/financeiro/components/BaixaDialog.tsx`
- `src/modules/financeiro/components/EstornoDialog.tsx`
- `src/modules/financeiro/components/LiberarComissaoDialog.tsx`
- `src/modules/financeiro/components/FechamentoMensalDialog.tsx`

**Editar**
- `src/routes/financeiro.tsx` (reescrita das abas)
- `src/lib/financeiro-store.ts` (shims para títulos)
- `src/lib/contratos-store.ts` (gatilho AR ao assinar + liberar comissão)
- `src/lib/fin-pendencias.ts` (gatilho AR ao aprovar/liberar)
- `src/lib/estoque-store.ts` (gatilho AP ao registrar compra)
- `src/routes/engenharia.tsx` (gatilho sugestão AP mão de obra na finalização)
- `src/lib/perfis-store.ts` (capabilities financeiras)
- `src/lib/route-tabs.ts` (novas abas do Financeiro)

---

## Perguntas antes de partir para a Fase A

1. **Escopo desta rodada**: implemento as 4 fases de uma vez (PR grande) ou prefere que eu faça **apenas a Fase A + B** agora (fundação + UI de AP/AR), e as integrações automáticas (Fase C) e o fechamento (Fase D) em rodadas seguintes? Recomendo dividir para conseguir validar visualmente antes das integrações dispararem títulos automáticos em cima dos dados atuais.
2. **Comissão**: confirma que **nunca** nasce automaticamente como contas a pagar — só quando o gerente clica "Liberar"? (no plano está assim)
3. **Dados atuais**: posso manter os seeds atuais de `financeiro-store` como histórico e começar os títulos novos zerados, ou prefere que eu migre os seeds existentes para a nova estrutura de títulos?
