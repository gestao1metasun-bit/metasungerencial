# Plano — Fluxo operacional Contrato → Projeto → Engenharia → Financeiro

Esse é um redesenho grande. Proponho dividir em **5 entregas sequenciais** para você aprovar/validar cada etapa antes da próxima. Assim eu não quebro o que já está funcionando e você consegue testar.

---

## Entrega 1 — Cadastro + Validação + Aprovação do contrato
**Arquivos:** `src/lib/contratos-store.ts`, `src/routes/comercial.tsx`

- Novos status: `Pendente de informações`, `Em análise`, `Pronto para aprovação`, `Aprovado`, `Cancelado`.
- Form "Novo Contrato" com **todos** os campos obrigatórios (cliente completo + dados do contrato + forma de pagto + banco se financiamento + obs).
- Botão **Salvar** bloqueado se faltar campo; mostra lista exata: *"Preencha: X, Y, Z"*.
- Tela de conferência com botão **Validar contrato** → roda checklist e move para `Pronto para aprovação` ou mantém `Pendente` listando o que falta.
- Botão **Aprovar contrato** com confirmação resumida → status `Aprovado`.
- Após aprovado: campos estruturais (nº, cliente, valor, potência, forma pagto) ficam **bloqueados**; botão **Solicitar alteração** exige motivo + usuário + data/hora, gravado em `auditoria`.

## Entrega 2 — Aba Projetos dentro do contrato aprovado
**Arquivos:** `src/lib/contratos-store.ts`, `src/routes/comercial.tsx`

- Aba "Projetos" só liberada após `Aprovado`.
- Novo Projeto: nome, local, potência prevista, valor previsto, obs, status inicial.
- Trava: soma valores e soma potências dos projetos não pode exceder contrato (sem aprovação extra).
- **Sem trava de quantidade de placas** — só potência e valor.

## Entrega 3 — Aba Orçamento Previsto + aprovação
**Arquivos:** `src/lib/contratos-store.ts` (novo tipo `OrcamentoPrevisto`), `src/routes/comercial.tsx`, `src/lib/financeiro-store.ts`

- Por projeto: receita + custos (materiais, MO, despesas, logística, combustível, alimentação, comissão, impostos, taxas, outros).
- Cálculo automático: custo total, margem, lucro, %margem.
- Botão **Aprovar orçamento** → grava data/hora/usuário, lança no Financeiro como `Orçado futuro` / `A realizar`.

## Entrega 4 — Envio para Engenharia + DASH do projeto
**Arquivos:** `src/routes/comercial.tsx`, `src/routes/engenharia.tsx`, novo `src/lib/projeto-execucao-store.ts`

- Botão **Enviar para Engenharia** liberado só com contrato aprovado + projeto criado + orçamento aprovado.
- DASH do projeto na Engenharia com status operacionais (Em projeto, Aguardando, Executando, Standby, Finalizado).
- Abas dentro da DASH:
  - **Materiais Utilizados** (lançamento manual → custo realizado + baixa estoque opcional + financeiro `Realizado`).
  - **Despesas Realizadas** (combustível, frete, MO, etc → custo realizado + financeiro).
- Trava: lançar custo exige projeto vinculado.

## Entrega 5 — Resultado Gerencial + Finalização + Alertas
**Arquivos:** `src/routes/comercial.tsx`, `src/routes/engenharia.tsx`, `src/routes/dashboard.tsx`

- Visão **Resultado Gerencial** por contrato/projeto: previsto × realizado × a realizar, margem prevista × real, desvio em R$ e %.
- Alertas: custo > orçado, margem abaixo do previsto, despesa sem projeto, etc.
- **Finalizar projeto** com checklist (potência entregue, datas, equipe, custos revisados). Se potência < contratada → exige justificativa.
- Atualização incremental dos módulos (sem reload geral).

---

## Pergunta antes de começar

Confirma que posso seguir nessa ordem (1 → 5), commitando cada entrega para você testar antes da próxima? Ou prefere que eu faça **tudo de uma vez** num único bloco grande (mais arriscado, mais difícil de reverter se algo quebrar)?

Sugiro fortemente entregar por partes — esse fluxo toca Comercial, Engenharia, Financeiro e Estoque ao mesmo tempo.
