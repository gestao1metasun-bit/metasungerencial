# Plano de implementação

Mudanças concentradas em `src/lib/contratos-store.ts`, `src/lib/clientes-store.ts` e `src/routes/comercial.tsx`. O fluxo passa a ser: **contrato → composição de pagamento → projetos → aprovação individual → geração financeira proporcional (rateio)**.

## 1. Cliente vindo do banco (cadastro de contrato)

- Estender `clientes-store.ts` para armazenar `ClienteFull` completo (nome, doc, telefone, email, endereço) e exportar `useClientesFull()` + `addClienteFull()`. Migrar dados do seed `mock-data` preenchendo o que faltar.
- Em `CadastrarContratoTab`:
  - Substituir o input livre de cliente por um **combobox de busca** (nome / CPF / CNPJ) sobre `useClientesFull()`.
  - Ao selecionar: preencher automaticamente `clienteFull` e `cliente`.
  - Botão **"+ Novo cliente"** abre modal mínimo (nome, doc, telefone, email opcional, endereço) e grava no store.
  - E-mail continua opcional (já está, manter).

## 2. Composição de pagamento no contrato

- Adicionar no `ContratoFull` o campo `composicaoPagto: ComposicaoLinha[]` (já existe `parcelasPagto`; renomear semanticamente para "composição do contrato"). Cada linha:
  ```ts
  { id, formaPagamento, valor, parcelas: number, dataPrevista, competencia, observacao }
  ```
- Nova seção **"Composição de pagamento"** dentro do dialog de cadastro/edição do contrato com:
  - Tabela editável (adicionar/remover linhas).
  - Rodapé mostrando: `Valor do contrato | Soma da composição | Diferença` com cor (verde se zero, vermelho caso contrário).
- Validação: `validateContratoCompleto` exige `Math.abs(totalContrato - somaComposicao) <= 0.5`. Sem isso, **bloqueia aprovação** e geração financeira.

## 3. Projetos do contrato (já parcialmente feito)

- Garantir os campos obrigatórios por projeto: nome/tipo, endereço, kWp, módulos, **valor**, status, obs.
- Manter validação `soma(projetos) <= valorContrato + 0.5`.
- Mostrar painel resumo: `Total contrato | Soma projetos | Restante`.

## 4. Aprovação individual ou em lote

- Cada projeto já tem botão "Liberar p/ Engenharia". Renomear para **"Aprovar projeto"** e adicionar:
  - Status do projeto: `pendente` | `aprovado` (`aprovado: boolean` + `dataAprovacao`).
  - Aprovação em lote: na aba do contrato, checkboxes por projeto + botão "Aprovar selecionados". Cada um valida independente (valor, kWp, endereço, módulos).
- Apenas projetos `aprovado=true` ficam elegíveis para geração financeira.

## 5–8. Geração financeira proporcional (rateio)

Nova função em `contratos-store.ts`:

```ts
export function gerarFinanceiroProjeto(contratoId, projetoId): Lancamento[]
```

Lógica:
1. Bloqueia se composição não fechar com o contrato.
2. Bloqueia se projeto não estiver aprovado.
3. Bloqueia se `projeto.financeiroGerado === true` (não duplica).
4. `pct = projeto.valor / contrato.valor`.
5. Para cada linha da composição: gerar `Lancamento` com `valor = linha.valor * pct`, vinculado a `contrato`, `obra=projetoId`, `cliente`, `formaPagamento`, `competencia`, `dataEmissao`/`vencimento` da linha. Se `linha.parcelas > 1`, distribuir mensalmente.
6. Marcar `projeto.financeiroGerado = true`, `dataGeracaoFinanceiro`, `usuarioGeracao`.

Botão **"Gerar financeiro"** chama essa função por projeto. Botão "Gerar tudo aprovado" no contrato itera nos projetos aprovados que ainda não têm financeiro.

## 9. Pedidos de venda (refatorar)

Refatorar `PedidosVendaTab` para mostrar por contrato:

```
Contrato João — CT-2025-0142
Total: R$ 20.000  |  Aprovado: R$ 14.000  |  Pendente: R$ 6.000
Financeiro gerado: R$ 14.000  |  Pendente: R$ 6.000

  ▸ Projeto 1 casa  R$ 14.000  [Aprovado] [Financeiro gerado]   [Editar financeiro]
  ▸ Projeto 2 loja  R$ 6.000   [Pendente]                       [Aprovar]
```

Substituir o atual `ProjetoFinanceiro` (parcelas livres por projeto) por:
- Vista de **lançamentos gerados** (lidos de `readLancamentos()` filtrando `obra === projeto.id`).
- Edição inline limitada a forma/valor/datas/competência/status/obs com alerta se a soma divergir do valor do projeto.

## 10–11. Edição individual + visão consolidada

- Painel consolidado no topo do contrato com os indicadores listados (recebido/a receber lidos do `financeiro-store` filtrando por `contrato`).
- Edição de lançamento individual via `updateLancamento()` (adicionar helper em `financeiro-store.ts`).

## Detalhes técnicos

- Tipos novos em `contratos-store.ts`:
  ```ts
  export type ComposicaoLinha = {
    id: string; formaPagamento: FormaPagamento; valor: number;
    parcelas: number; dataPrevista: string; competencia: string; observacao?: string;
  };
  ```
  Acrescentar a `ContratoFull`: `composicaoPagto?: ComposicaoLinha[]`.
  Acrescentar a `ProjetoVinculado`: `aprovado?: boolean; dataAprovacao?: string; usuarioGeracao?: string; dataGeracaoFinanceiro?: string`.

- Acrescentar a `financeiro-store.ts`:
  ```ts
  export function updateLancamento(id, patch): void
  export function removeLancamentosDoProjeto(projetoId): void
  ```

- Manter retrocompatibilidade: se um contrato antigo tiver `parcelasPagto` e nenhuma `composicaoPagto`, migrar on-read.

## Fora de escopo (não mexer agora)

- Engenharia/financeiro fora dos pontos acima.
- Dashboard / relatórios.
- BI consolidado (entrega futura).

Após sua aprovação implemento tudo em uma rodada e valido com o build.
