
# Grade financeira enterprise (Contas a Pagar / Receber / Títulos)

Inspiração: TOTVS RM / Sankhya. Operação + Controladoria + Auditoria + Rastreabilidade na mesma grade, com ocultar/exibir, ordenar, filtrar, totalizar, exportar, imprimir e visões salvas.

## Premissa estrutural

A grade atual do `TitulosTab` já tem visões (Operacional/Cobrança/Diretoria/Fiscal/Auditoria), filtros, processos e ações. O que falta é **profundidade de colunas + column chooser real + totalizadores no rodapé respeitando filtro/seleção + saved views persistidas**.

Regra inegociável (memória do projeto): **não criar coluna mock**. Coluna só entra se o dado existe (ou se a fase de schema correspondente foi rodada antes).

---

## Fase 1 — Colunas que JÁ existem no banco (sem migração)

Expor como colunas opcionais via column chooser. Default por visão.

**Identificação / negócio**
- Seleção · Flag · Status · Tipo (AP/AR) · Código do título · Número do documento · Parcela
- Cliente/Fornecedor · CPF/CNPJ · Contrato · Pedido de Venda · Obra · Origem
- Descrição · Observação · Categoria/Natureza · Centro de resultado · Competência

**Datas e valores**
- Emissão · Vencimento · Vencimento real · Data de baixa · Data conciliação
- Valor original · Juros · Multa · Desconto · Valor pago/recebido · Saldo em aberto

**Pagamento**
- Forma de pagamento · Conta financeira · Banco (via `contas_financeiras.banco`)

**Auditoria básica (via `audit_log` e campos atuais)**
- Criado por · Criado em · Última alteração · Cancelado por · Cancelado em · Motivo cancelamento
- Renegociado por · Renegociado em · Título substituto · Origem da renegociação
- Anexos (badge com contagem real de `anexos`) · Histórico (badge `audit_log`)

**Workflow vinculado (via `ordens_compra.workflow_fin_id` + `workflow_aprovacoes`)**
- Workflow vinculado · Aprovação necessária · Aprovador · Data aprovação

Entrega:
- Refatorar `TitulosTab` para usar `EnterpriseDataGrid` com definição declarativa de colunas (`columns: ColumnDef[]`), cada uma com `key`, `label`, `group`, `defaultVisible`, `width`, `align`, `format`, `aggregator?`.
- Column chooser (popover na toolbar) agrupado por: **Identificação · Datas · Valores · Pagamento · Controladoria · Governança · Auditoria · Bancária · Fiscal**.
- Persistir layout (colunas visíveis + ordem + largura) por usuário em `localStorage` chave `ms.grid.titulos.layout.v1` (Fase 4 migra para Postgres).

---

## Fase 2 — Totalizadores e filtros prioritários

**Rodapé sticky com totais** (Σ quantidade, valor original, juros, multa, desconto, pago/recebido, saldo) respeitando:
- filtros aplicados (chips + busca + visão);
- seleção quando houver linhas marcadas (modo "Σ seleção" vs "Σ total");
- tipo (AP vs AR).

**Filtros prioritários** (já listados no pedido) ganham chips dedicados no `FiltrosSheet`:
- Status, Cliente/Fornecedor, Vencimento (range), Competência (range YYYY-MM), Banco, Conta financeira, Centro de resultado, Natureza, Obra, Contrato, Vendedor/Responsável, Conciliação (sim/não), Forma de pagamento, Renegociado, Vencido, Com anexo / Sem anexo.

Filtro "Com anexo / Sem anexo" usa `EXISTS` em `anexos` (já temos o engine D6.13.4).

---

## Fase 3 — Schema novo (migrações controladas)

Aqui o banco precisa crescer. Cada bloco é uma migração separada, aprovada individualmente.

### 3.1 Operação bancária (boleto / PIX)
Nova tabela `titulos_cobranca_bancaria` 1:1 com `titulos_financeiros`:
- portador, carteira_cobranca, convenio, agencia, conta, nosso_numero, linha_digitavel, codigo_barras, url_boleto, status_boleto, remessa_id, retorno_id, data_retorno, ocorrencia_bancaria, pix_copia_cola, pix_qrcode, status_pagamento.
- RLS espelhando `titulos_financeiros` (via `EXISTS`).
- Trigger de auditoria.

### 3.2 Controladoria contábil
Adicionar em `titulos_financeiros`:
- `plano_contas_id` · `conta_contabil_id` · `unidade_filial_id` · `classificacao_gerencial` · `historico_contabil_sugerido`.
Tabelas novas: `plano_contas`, `unidades_filial`, `contas_contabeis`.

### 3.3 Documento fiscal
Adicionar em `titulos_financeiros`:
- `documento_fiscal_modelo` · `documento_fiscal_serie` · `documento_fiscal_numero` · `chave_nfe` · `chave_nfse`.

Cada bloco só é executado se o usuário priorizar (essas tabelas tocam DRE/contabilidade — escopo grande, fora de D6.13.x).

---

## Fase 4 — Saved Views reais (D6.13.5)

Promove a memória local atual ("preset" Operacional/Cobrança/...) para entidade Postgres versionada.

Nova tabela `grid_saved_views`:
- escopo: `entidade` (`titulos_financeiros`, etc.), `user_id` (null = global compartilhada).
- payload: colunas visíveis, ordem, larguras, filtros, ordenação, densidade, agrupamento.
- visões padrão semeadas: Operacional, Cobrança, Diretoria, Fiscal/Contábil, Auditoria, Renegociação, Conciliação, Vencidos, A vencer, Pagos/Recebidos.
- compartilhamento: admin pode publicar visão global; usuário pode duplicar e personalizar.

Esta fase é a entrega oficial **D6.13.5 — Saved Views / Advanced Filters** que já estava no roadmap (`mem://features/d6-13-enterprise-core-framework`).

---

## Ordem proposta de execução

1. **Fase 1** (sem migração, alto impacto visual) — column chooser + grupos + colunas reais que já existem.
2. **Fase 2** (sem migração) — rodapé totalizador + filtros prioritários novos + filtro com/sem anexo.
3. **Fase 4** (1 migração leve) — `grid_saved_views` + 10 visões padrão.
4. **Fase 3** (migrações pesadas) — só depois que controladoria/banco forem priorizados como onda própria (D8 reservada).

---

## O que preciso confirmar antes de codar

1. **Começamos pela Fase 1 + 2** (sem migração, entrega rápida e visível) e deixamos Saved Views (4) para a sequência?
2. Confirma que **Fase 3 (boleto/PIX/contábil/fiscal) fica reservada** até D8 entrar, em vez de criar campos vazios agora? (Recomendo fortemente que sim — evita mock e respeita a regra do projeto.)
3. Posso reaproveitar `EnterpriseDataGrid` existente e estender com `columns[]` declarativo, ou prefere uma nova primitiva `FinancialGrid`?
