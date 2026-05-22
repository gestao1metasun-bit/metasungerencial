# Plano — Evolução do Financeiro Meta Sun

Objetivo: preparar a base do financeiro para integração futura com Alterdata/Domínio (contábil, fiscal, SPED, DRE), **sem** transformar o ERP em sistema contábil. Mantém velocidade operacional e simplicidade.

A entrega é dividida em **6 fases incrementais**. Cada fase é navegável e testável isoladamente, e nenhuma quebra o que já existe.

---

## Fase 1 — Cadastros estruturais (base de tudo)

Criar/expandir stores em `src/lib/` (LocalStorage, padrão do projeto):

- **`fin-grupos-store.ts`** — Grupos e Subgrupos financeiros
  - Grupos fixos (seed): `Receita`, `Custo Direto`, `Custo Indireto`, `Despesa Administrativa`, `Despesa Comercial`, `Imobilizado`, `Financeiro/Patrimonial`
  - Subgrupos livres, vinculados a um grupo
- **`fin-naturezas-store.ts`** — substitui `naturezas` do `financeiro-store.ts`
  - Campos: `codigo`, `nome`, `grupoId`, `subgrupoId`, `tipo` (Pagar/Receber), `centroCustoPadrao`, `permiteVinculoObra`, `permiteVinculoEstoque`, `tipoAplicacaoPadrao`, `contaContabilFutura` (texto livre), `ativo`
  - Migração automática das naturezas atuais → mapeadas para grupos
- **`fin-centros-custo-store.ts`** — substitui `centros` atuais
  - Seed novo: Engenharia, Comercial, Financeiro, Estoque, Administrativo, Diretoria, Marketing, Pós-venda
- **`fin-meios-pagamento-store.ts`** (novo)
  - Seed: PIX, Boleto, Cartão crédito, Cartão débito, Transferência, Dinheiro, Reembolso
- **`fin-tipos-aplicacao-store.ts`** (novo)
  - Seed: Instalação, Manutenção, Garantia, Adequação, Retorno técnico, Uso interno, Administrativo
- **`fin-contas-store.ts`** (já existe) — adicionar seed: Sicredi, Basa, BB, Caixa interno, Cartão Itaú, Cartão Sicredi, Nubank PJ

Aba **Cadastros** do Financeiro ganha 6 sub-abas: Grupos, Naturezas, Centros, Meios de Pagamento, Tipos de Aplicação, Contas. CRUD completo em cada.

---

## Fase 2 — Status financeiro de 4 estágios

Hoje o sistema tem `Camada` (Realizado/Confirmado/Previsto/A realizar/Orçado futuro). Vamos **adicionar** um campo paralelo `statusFin` no `Lancamento` e em `Titulo`:

`Previsto → Comprometido → Pagar → Pago` (+ `Parcial`, `Cancelado`)

Regras:
- **Previsto**: planejamento (orçamento de obra, recorrente futuro). Não gera obrigação.
- **Comprometido**: obrigação assumida (pedido de compra aprovado, contrato assinado). Aparece em "compromissos".
- **Pagar**: título existe, vencimento ativo. Aparece em "contas a pagar/receber".
- **Pago**: quitado.

Transições registradas em `audit-store` automaticamente. UI: nova coluna + badge colorido na tabela de Lançamentos e Títulos. Dashboard ganha quadro **Previsto × Comprometido × Pagar × Pago** por categoria.

---

## Fase 3 — Lançamento financeiro padronizado

Refazer `NovoLancamentoDialog` para exigir todos os campos obrigatórios:

`tipo` · `naturezaId` (puxa grupo/subgrupo) · `centroCustoId` · `contaFinanceiraId` · `meioPagamentoId` · `obra/projeto/contrato` (opcional, conforme natureza) · `fornecedor/cliente` · `valor` · `vencimento` · `statusFin` · `tipoAplicacaoId` · `observacao` · `anexo`

- Selects em cascata: Natureza → preenche grupo/subgrupo/centro padrão/tipo aplicação padrão.
- Validação: natureza marcada como `permiteVinculoObra` exige obra.
- Anexo: apenas referência (nome + base64 leve ou URL — padrão atual do projeto).

---

## Fase 4 — Fluxo Compra → Estoque → Obra → CMV

Essa é a mudança conceitual mais importante. Hoje "Material OB-0231" é lançado direto como custo da obra. Vamos corrigir:

```text
Compra Fornecedor
   │
   ├─► Título a Pagar (financeiro)
   └─► Entrada de Estoque (não vira custo ainda)
              │
              ▼
        Saída para Obra (gera CMV / custo real da obra)
              │
              ├─► Devolução → estorna custo + retorna estoque
              └─► Entrega parcial permitida
```

Implementação:
- Reuso de `estoque-store` (já existe). Adicionar tipos de movimento: `ENTRADA_COMPRA`, `SAIDA_OBRA`, `DEVOLUCAO_OBRA`, `RESERVA`, `LIBERA_RESERVA`.
- **Reserva** reduz `disponível` mas não move `físico` nem gera custo.
- **Saída para Obra** é o evento que escreve custo no painel da obra (`obras-snapshot-store`).
- Compra cria automaticamente: 1 título a pagar + 1 entrada de estoque pendente.
- Nova aba **Movimentações de Estoque** dentro de Estoque (não no financeiro).
- Painel de obra mostra `Material comprometido` (reservado) × `Material consumido` (saída efetiva).

---

## Fase 5 — Manutenção/Pós-venda na mesma obra

Regra: pós-venda **nunca** cria nova obra. Diferenciação ocorre por:
- `tipoAplicacao` = Manutenção / Garantia / Retorno técnico
- `natureza` = Material manutenção, Mão de obra manutenção, Frete manutenção, Receita manutenção (seed novo)

Painel da obra ganha aba **Pós-venda** que filtra lançamentos por `tipoAplicacao ∈ {Manutenção, Garantia, Retorno}`. DRE da obra separa Instalação × Manutenção automaticamente.

---

## Fase 6 — Auditoria, fechamento, integração futura

- **Fechamento mensal** (já existe por conta): adicionar capability `financeiro.fechar_mes` em `perfis-store` — só "Gerente Financeiro" / "Admin Master" reabrem. Bloqueio passa a valer também para movimentação de estoque com data dentro do mês fechado.
- **Estoque entregue não edita**: forçar correção via Devolução/Estorno. Botão "Editar" da movimentação fica desabilitado quando `tipoMov ∈ {SAIDA_OBRA, ENTRADA_COMPRA}` e existe contrapartida financeira.
- **Auditoria**: toda transição de status, fechamento, devolução e estorno → `pushAudit`.
- **Export contábil** (preparação só): botão "Exportar para contábil" gera CSV/JSON normalizado com `contaContabilFutura`, `centroCusto`, `naturezaCodigo`, `valor`, `data`, `historico`. Formato pronto para Alterdata/Domínio importarem mais tarde — não é integração ao vivo agora.

---

## O que NÃO entra agora (decisão consciente)

- Plano de contas completo BR-GAAP / SPED — só guardamos `contaContabilFutura` como texto.
- DRE contábil — mantemos DRE gerencial atual; só melhora a classificação.
- Integração API com Alterdata/Domínio — só preparamos o export.
- Permanece em **LocalStorage** (padrão do projeto). Migração para Lovable Cloud pode ser fase 7 quando o usuário decidir.

---

## Confirmação necessária

Esse é um trabalho grande — recomendo fortemente **fazer fase por fase**, validando cada uma antes de seguir. Comece por **Fase 1 (cadastros)** que é a fundação de tudo o que vem depois.

**Responda confirmando:**
1. Sigo fase a fase (recomendado) ou tudo de uma vez?
2. Posso começar pela **Fase 1** agora?
3. Algum cadastro/seed que listei está errado ou faltando algum item específico da Meta Sun?
