# D15.1.a.0.i — Diagnóstico + Mapeamento Financeiro

> **Escopo:** somente leitura. Sem migração, sem escrita, sem alteração de UI.
> **Objetivo:** mapear o estado real do Financeiro operacional (localStorage)
> contra as tabelas oficiais (Supabase) e expor lacunas, riscos e estratégia
> de persistência antes de qualquer corte de fonte.
>
> Próximo passo só liberado quando este mapa estiver aprovado:
> **D15.1.a.0.ii — Migrador Dry-Run**.

---

## 1. Inventário das 6 stores localStorage

| Store (arquivo) | Chave LS | Tipo principal | Hook reativo | Linhas | Fonte oficial hoje? |
|---|---|---|---|---|---|
| `fin-titulos-store.ts` | `ms.fin.titulos.v1` | `Titulo[]` | `useTitulos()` | 950 | ✅ (operação real) |
| `fin-renegociacao-store.ts` | `ms.fin.renegociacoes.v1` | `Renegociacao[]` | `useRenegociacoes()` | 291 | ✅ |
| `fin-rescisao-store.ts` | `ms.fin.rescisoes.v1` | `Rescisao[]` | `useRescisoes()` | 242 | ✅ |
| `fin-adiantamentos-store.ts` | `ms.fin.adiantamentos.v1` | `Adiantamento[]` | `useAdiantamentos()` | 247 | ✅ |
| `fin-compras-store.ts` | `ms.fin.compras.v1` | `Compra[]` | `useCompras()` | 117 | ✅ |
| `fin-conciliacao-store.ts` | `ms.fin.conciliacao.v1` | `ExtratoLancamento[]` | `useExtrato()` | 218 | ✅ |

> Observação importante: também existe `src/lib/financeiro-store.ts` (lançamentos de fluxo de caixa — chaves `metasun.fin.lancamentos.v1`, `metasun.fin.recorrentes.v1`, `metasun.fin.centros.v1`, `metasun.fin.naturezas.v1`). É um modelo paralelo (camada Realizado/Confirmado/Previsto/...) que convive com `titulos_financeiros` e precisa ser tratado na próxima onda — fora do escopo D15.1.a.0.

Hoje **toda a operação financeira lê do localStorage**:
`TitulosTab` → `useRepoTitulos` → `useTitulos` → cache LS.
A tabela `titulos_financeiros` no Supabase **está vazia (0 linhas)**.

---

## 2. Mapeamento store → tabela oficial

### 2.1 `Titulo` → `public.titulos_financeiros` (+ `parcelas_financeiras` + `movimentacoes_financeiras`)

| Campo local (`Titulo`) | Coluna oficial | Observações / divergências |
|---|---|---|
| `id` (string, ex. `TIT-1716...-A8X3`) | `id uuid` | **Gap:** ID local não é UUID. Migração precisa gerar UUID novo + manter `id` legado em `dados.legacy_id`. |
| `tipo` `"AP"\|"AR"` | `tipo text` | Mesma semântica (`AP`/`AR`). |
| `origem` (8 valores: `compra/comissao/mao_obra/frete/manutencao/contrato/financiamento/manual`) | `origem_tipo` (10 valores: `contrato/projeto/pedido_venda/obra/cliente/fornecedor/aditivo/estoque/manual_controlado/renegociacao`) | **DIVERGENTE.** Precisa tabela de tradução. Ex.: `compra → estoque`, `comissao/mao_obra/frete/manutencao → manual_controlado` (perda de granularidade — guardar original em `dados.origem_legacy`). |
| `status` (8 valores em snake_case lower: `previsto/comprometido/parcial/a_pagar/a_receber/pago/recebido/cancelado`) | `status` (6 valores UPPER: `PENDENTE/PARCIAL/RECEBIDO/ATRASADO/CANCELADO/RENEGOCIADO`) | **DIVERGENTE.** `a_pagar/a_receber/previsto/comprometido → PENDENTE`; `pago/recebido → RECEBIDO`; `parcial → PARCIAL`; `cancelado → CANCELADO`. Status `ATRASADO` é derivado por trigger no oficial — não vem do local. |
| `descricao` | `dados->>'descricao'` ou `observacoes` | **Gap:** não há coluna nativa `descricao`. Hoje mora em `dados` jsonb. |
| `valorOriginal` | `valor_bruto` | OK. |
| `valorPago` | derivado de `valor_bruto - saldo` ou somando `movimentacoes_financeiras` | **Não migrar campo** — é redundante. |
| `saldo` | `saldo` | OK. |
| `vencimento` (YYYY-MM-DD) | `vencimento date` | OK. |
| `vencimentoReal` (ajuste dia útil) | `dados->>'vencimento_real'` | **Gap:** sem coluna oficial. |
| `competencia` | `competencia date` | Local guarda como `YYYY-MM` (string); oficial é `date`. Converter para `YYYY-MM-01`. |
| `dataEmissao` | `dados->>'data_emissao'` | **Gap.** |
| `dataLiquidacao` | derivado da última `movimentacao` de `recebimento/baixa` | Não migrar. |
| `naturezaId/grupoId/subgrupoId/centroCustoId/tipoAplicacaoId/meioPagamentoId` | `centro_id`, `conta_id`, `forma_pagamento` + `dados` jsonb | **DIVERGENTE.** Oficial só tem `centro_id` e `conta_id`. Resto vai para `dados`. Além disso os IDs locais não são UUIDs — precisam ser resolvidos contra as tabelas de cadastro existentes (matching por nome). |
| `natureza/centroCusto` (strings legadas) | tentativa de match para `centro_id` | Se sem match → mantém só em `dados`. |
| `fornecedor` (string) | `dados->>'fornecedor_nome'` | **Gap:** não há `fornecedor_id` em `titulos_financeiros`. Hoje fornecedor está só como label. |
| `cliente` (string) | `cliente_id uuid` por matching de nome em `public.clientes`; nome fica em `dados->>'cliente_nome'` | Risco: nomes duplicados/divergentes. |
| `obraId` | `dados->>'obra_id'` ou `origem_id` quando `origem_tipo='obra'` | **Decisão:** se origem ≠ obra, vai para `dados`. |
| `contratoId` | `contrato_id uuid` | Local guarda string (ex. `CT-0142`); precisa resolver UUID na tabela `contratos`. |
| `parcelaLabel` (ex. `"1/12"`) | `parcelas_financeiras.numero` + `dados->>'parcela_label'` | **Gap estrutural:** hoje cada parcela é UM `Titulo` separado. No oficial, 1 título tem N parcelas. **Decisão de migração:** tratar cada `Titulo` local como `Titulo+1Parcela` (modelo 1:1) — não tentar reagrupar. Documentar como dívida técnica. |
| `documentoTipo/documentoNumero` | `dados->>'documento_*'` | Gap. |
| `duplicidadePermitidaPor/Em/Motivo` | `dados->>'duplicidade_*'` | Gap. |
| `comprovanteUrl` | `dados->>'comprovante_url'` | Gap. |
| `observacao` | `observacoes` | OK. |
| `anexos[]` | tabela `public.anexos` (entidade=`titulo`, entidade_id=novo UUID) | **Atenção:** anexos antigos só têm `dataUrl` (base64). Precisam upload real para Storage antes de criar registro em `anexos`. Risco de payload pesado. |
| `criadoPor/criadoEm` | `dados->>'criado_por_legacy'` + `created_at` | OK. |
| `bloqueadoFechamento` | derivado de `fechamentos_mes` | Não migrar. |
| `renegociacaoId/renegociadoEm/statusRenegociacao` | `titulo_substituto_id/renegociado_em/renegociado_por/motivo_renegociacao` + `status='RENEGOCIADO'` | Mapear via FK depois que ambos os títulos existirem. |
| `desconto` | `desconto numeric` | OK. |
| `movimentos[]` (baixas/estornos) | `public.movimentacoes_financeiras` | **CRITICAL:** insert exige flag `app.via_movimentacao='true'`. Migrador precisa setar a flag por sessão. `juros/multa/desconto` por movimento viram movimentações separadas (`tipo='juros'/'multa'/'desconto'`). `estornado=true` vira movimentação `tipo='estorno'`. |
| `rateios[]` (centro de custo / natureza / OS / projeto / observação) | **❌ NÃO EXISTE tabela oficial** | **Gap estrutural grave.** Ver §3. |

### 2.2 `Renegociacao` → `public.titulos_renegociacoes` + `titulos_renegociacao_itens`

| Campo local | Coluna oficial | Observações |
|---|---|---|
| `id` | `id uuid` | Gerar novo UUID; legacy em `observacao` ou jsonb derivado. |
| `tituloOriginalId` (1 título) | `titulos_renegociacao_itens.titulo_antigo_id` (N itens) | **DIVERGENTE.** Local é 1:N (1 reneg → N parcelas), oficial é N:1 (N títulos consolidados → 1 reneg → 1 título novo). Modelo local pode ser representado como N=1. |
| `data/motivo/observacao/usuarioId/aprovadoPor` | `created_at/motivo/observacao/user_id/user_email` | OK (resolver user_id por email). |
| `nivelAprovacao` `"auto"/"financeiro"/"diretoria"` | sem coluna | Vai para `observacao` ou jsonb derivado. **Gap.** |
| `valorOriginal/saldoNoMomento` | `valor_original_total` + `saldo_consolidado` no item | OK. |
| `jurosCalculado/jurosAplicado/multaCalculada/multaAplicada/desconto/descontoPct` | `juros_aplicado/multa_aplicada/desconto_aplicado` | **Gap:** local guarda calculado E aplicado (auditoria). Oficial só tem aplicado. Calculado vai para `observacao`. |
| `valorFinal` | `valor_renegociado_total` | OK. |
| `tipoSaida` `"parcela_unica"/"parcelado"` | derivado de `qtd_titulos_consolidados`/parcelas no novo título | Não migrar. |
| `parcelasGeradas[]` (ids dos novos títulos locais) | `titulo_novo_id` (apenas 1) | **DIVERGENTE.** Local pode gerar N novos títulos; oficial só aponta para 1. Decisão: criar 1 renegociação oficial por novo título gerado (consolidando o mesmo `titulo_antigo_id`). |
| `tipo` (faltante no local — sempre derivado de `Titulo.tipo`) | `tipo` `"receber"/"pagar"` (obrigatório) | Derivar de `Titulo.tipo` (`AR→receber`, `AP→pagar`). |
| `cliente_id` (faltante) | `cliente_id uuid` | Derivar do título original. |

### 2.3 `Rescisao` → ❌ **NÃO EXISTE tabela oficial**

| Campo local | Destino proposto |
|---|---|
| `id/contratoId/clienteNome/data/motivo/responsavel` | precisa nova tabela `rescisoes_contrato` (id, contrato_id, cliente_id, data, motivo, responsavel_user_id, ...) |
| `valorRecebido/multaTipo/multaValor/multaCalculada/devolucaoLiquida/contaDevolucao/vencimentoDevolucao` | colunas dedicadas na nova tabela |
| `titulosCancelados[]` | tabela filha `rescisoes_titulos_cancelados (rescisao_id, titulo_id, saldo_cancelado)` |
| `adiantamentosEstornados[]` | depende de §2.4 (também sem tabela) |
| `tituloDevolucaoId` | FK para `titulos_financeiros.id` (com origem_tipo=`manual_controlado` ou novo enum `rescisao`) |
| `observacao/criadoEm` | OK |

**Gap estrutural grave.** Ver §3.

### 2.4 `Adiantamento` → ❌ **NÃO EXISTE tabela oficial**

| Campo local | Destino proposto |
|---|---|
| `id/tipo (cliente|fornecedor)/contraparteId/contraparteNome/data` | nova tabela `adiantamentos (id, tipo, contraparte_id, contraparte_nome, data, ...)` |
| `valorOriginal/saldoDisponivel/contaFinanceira/meioPagamento` | colunas dedicadas |
| `contratoId/origem (manual|contrato|compra)` | colunas dedicadas |
| `abatimentos[]` (id, data, valor, tituloId, movimentoId, observacao, usuario) | tabela filha `adiantamento_abatimentos` com FK para `titulos_financeiros` e `movimentacoes_financeiras` |
| `status (ativo|consumido|estornado)/estornadoEm/estornoMotivo` | colunas dedicadas |

**Gap estrutural grave.** Adiantamento é peça operacional crítica (entrada/sinal de cliente, sinal a fornecedor) e hoje só vive em LS. Ver §3.

### 2.5 `Compra` → ❌ **NÃO EXISTE tabela oficial**

| Campo local | Destino proposto |
|---|---|
| `id (CMP-AAAA-NNN)/numeroNF/fornecedorId/fornecedorNome/tituloId/data` | nova tabela `compras_lote (id, codigo, numero_nf, fornecedor_id, titulo_id, data, ...)` |
| `itens[] (itemId, qtd, custoUnit)` | tabela filha `compras_lote_itens` (com FK para `estoque_itens`) |
| `valorTotal/status/observacao/criadoEm/criadoPor` | colunas dedicadas |

Dialoga com Estoque (entrada de compra alimenta custo médio). **Gap.** Ver §3.

### 2.6 `ExtratoLancamento` → ❌ **NÃO EXISTE tabela oficial**

| Campo local | Destino proposto |
|---|---|
| `id/contaFinanceira/data/descricao/valor (assinado)/documento` | nova tabela `extrato_bancario (id, conta_id, data, descricao, valor, documento, ...)` |
| `status (pendente|conciliado|ignorado)/tituloId/movimentoId/observacao` | colunas dedicadas |
| `importadoEm` | `created_at` |

Importação CSV existente continua válida; só passa a inserir na tabela. **Gap.** Ver §3.

---

## 3. Lacunas estruturais identificadas

### 3.1 Tabelas oficiais inexistentes (5)
1. **`adiantamentos` + `adiantamento_abatimentos`** — bloqueia Contas a Receber/Pagar com sinal.
2. **`rescisoes_contrato` + `rescisoes_titulos_cancelados`** — bloqueia ciclo de cancelamento contratual.
3. **`compras_lote` + `compras_lote_itens`** — bloqueia integração Compra → Estoque → AP.
4. **`extrato_bancario`** — bloqueia Conciliação Bancária.
5. **`titulos_rateios`** — rateio multi-CC/natureza/OS por título.

Sem essas tabelas, **D15.1.a.0 não pode ser concluído como “persistência financeira completa”** — só TitulosTab/Renegociações ganhariam fonte oficial.

### 3.2 Status divergentes
- Local: `previsto/comprometido/a_pagar/a_receber/parcial/pago/recebido/cancelado` (8 valores lower snake_case).
- Oficial: `PENDENTE/PARCIAL/RECEBIDO/ATRASADO/CANCELADO/RENEGOCIADO` (6 UPPER).
- Perda de granularidade em `previsto/comprometido` → `PENDENTE`. Documentar a fusão.

### 3.3 Origem divergente
- Local 8 valores ↔ oficial 10 valores, com overlap parcial. Necessária tabela de tradução com `origem_legacy` preservado em `dados`.

### 3.4 IDs locais não-UUID
- Todos os ids (`TIT-…`, `REN-…`, `CMP-AAAA-NNN`, `EX-…`, `ADI-…`, `RES-…`) são strings curtas. Migração precisa **gerar UUID novo** e preservar `legacy_id` em jsonb para auditoria.

### 3.5 Naturezas/Centros de Custo como string
- Local usa label livre (`"Aluguel"`, `"Administrativo"`). Oficial usa FK (`centro_id uuid`, naturezas em cadastro próprio). Migrador precisa fazer matching por nome (case-insensitive, trim) e logar matches/mismatches. Sem match → fica em `dados`.

### 3.6 Cliente/Fornecedor como string
- `Titulo.cliente`/`Titulo.fornecedor` são strings. Resolver contra `public.clientes` e (futura) `public.fornecedores`. **Não existe tabela `fornecedores` oficial hoje** — outro gap.

### 3.7 Anexos base64
- `Anexo.dataUrl` carrega arquivo inline. Migrador precisa: (a) decodificar base64, (b) upload para Storage (`anexos` bucket privado), (c) inserir registro em `public.anexos` com `entidade='titulo'`. Risco: localStorage pode ter MB de anexos pesados; alguns navegadores limitam 5–10MB total.

### 3.8 Rateios sem destino
- `Titulo.rateios[]` é estrutura rica (valor, CC, natureza, tipoTitulo, OS, projeto, observação). Sem tabela oficial. Sem ela, qualquer relatório por CC/OS após corte fica incorreto.

### 3.9 Campos calculados no client
- `valorPago`, `saldo` (no LS são persistidos mas recomputados pelo store), `vencimentoReal`, `dataLiquidacao`, `bloqueadoFechamento` — todos devem ser derivados via view/trigger, não migrados.

### 3.10 Parcelamento 1:1
- Local: cada parcela é um `Titulo` independente (`parcelaLabel="3/12"`). Oficial: 1 título → N parcelas. **Decisão pragmática:** migrar 1:1 (cada título local = título oficial com 1 parcela). Reagrupamento por inferência é arriscado. Documentar como dívida.

### 3.11 Vínculos implícitos
- `Adiantamento.abatimentos[].tituloId` aponta para id local. Migração precisa rodar em **2 passes**: (1) inserir tudo com legacy_id; (2) resolver FKs cruzadas via tabela de tradução `legacy_id → uuid`.

### 3.12 Stores paralelas
- `financeiro-store.ts` (`metasun.fin.lancamentos.v1`) é um modelo de fluxo de caixa que coexiste com Títulos. Decisão necessária: descontinuar, fundir com Títulos, ou manter como “realizado/previsto de caixa” derivado. **Não tratar em D15.1.a.0.**

### 3.13 Dados órfãos
- Renegociações apontando para títulos cancelados/inexistentes; abatimentos apontando para títulos já estornados; extrato conciliado contra movimentos que não existem mais. Dry-run precisa relatar contagens.

### 3.14 Datas inconsistentes
- `competencia` ora é `YYYY-MM`, ora `YYYY-MM-DD`; `data` em alguns places é ISO timestamp, em outros só date. Normalizar no migrador.

---

## 4. Riscos conhecidos

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| R1 | Tabelas oficiais ausentes para Adiantamento/Rescisão/Compras/Extrato/Rateio | **Alto** | Criar migration de schema antes de a.0.ii (sub-onda **a.0.i+** ou parte de a.0.ii). |
| R2 | Anexos base64 pesados estouram limite de payload | Médio | Migrador faz upload em batches; cap por arquivo (ex.: 5MB). |
| R3 | Naturezas/CC sem match preservam label só em `dados` (perda de FK) | Médio | Relatório de matching no dry-run; ação manual antes do corte. |
| R4 | Fornecedor sem tabela oficial | Médio | Criar `fornecedores` em onda separada antes do corte real. |
| R5 | Rateios sem tabela → relatórios por CC/OS quebram após corte | **Alto** | Criar `titulos_rateios` obrigatório antes do corte. |
| R6 | IDs cruzados (legacy ↔ uuid) inconsistentes | **Alto** | Migrador roda em 2 passes + tabela de tradução `legacy_id_map`. |
| R7 | Status local → oficial perde `previsto/comprometido` | Baixo | Preservar status legado em `dados.status_legacy`. |
| R8 | Movimentações exigem flag `app.via_movimentacao='true'` | Médio | RPC oficial de migração seta flag por sessão. |
| R9 | localStorage entre operadores pode divergir (não há sync) | **Alto** | Antes do corte, exportar LS de cada operador (script) e consolidar; preferir um operador-fonte. |
| R10 | Operação real continua acontecendo em LS durante migração | **Alto** | Modo `dual` (a.0.iii) com feature flag obrigatório antes do corte. |
| R11 | Renegociação local com N novos títulos não cabe no modelo oficial (1 novo título) | Médio | Criar 1 renegociação por novo título; documentar. |
| R12 | Parcelamento 1:1 vira dívida estrutural | Baixo | Aceitar e documentar; futura onda “consolidação de parcelas”. |

---

## 5. Estratégia de persistência (alto nível)

1. **a.0.i (este doc)** — diagnóstico read-only. ✅
2. **a.0.i+ (recomendado)** — migration de schema cobrindo as 5 tabelas ausentes (`adiantamentos`, `adiantamento_abatimentos`, `rescisoes_contrato`, `rescisoes_titulos_cancelados`, `compras_lote`, `compras_lote_itens`, `extrato_bancario`, `titulos_rateios`, e opcionalmente `fornecedores`). Sem dados.
3. **a.0.ii** — migrador dry-run: lê LS, resolve FKs, gera relatório (qtd, divergências, órfãos, anexos pesados, sem-match). **Não escreve.**
4. **a.0.iii** — feature flag `fin.source = local | supabase | dual` em `useRepoTitulos` (e equivalentes). Modo `dual` compara em runtime e loga divergências sem mudar UI.
5. **a.0.iv** — execução real do migrador (em produção, com export prévio dos LS dos operadores), validação de paridade via dry-run novamente, switch da flag para `supabase`, `local` fica como fallback de leitura por 1 ciclo, depois desligado.

---

## 6. Critério de aceite para liberar a.0.ii

- [x] Inventário completo das 6 stores documentado.
- [x] Mapa campo-a-campo store → tabela oficial.
- [x] Lacunas estruturais listadas (5 tabelas ausentes + rateios + fornecedores).
- [x] Riscos catalogados (R1–R12) com severidade e mitigação.
- [x] Estratégia de persistência em 5 passos definida.
- [ ] **Aprovação do usuário sobre as 5 tabelas ausentes** (criar antes do migrador ou aceitar escopo reduzido em a.0.ii).

---

## 7. Decisões pendentes (perguntar ao usuário antes de a.0.ii)

1. **Tabelas ausentes**: criar todas as 5 (adiantamentos, rescisões, compras, extrato, rateios) antes do migrador, ou começar dry-run só para Títulos+Renegociações?
2. **Fornecedores**: criar tabela oficial agora ou continuar como string em `dados`?
3. **Stores paralelas** (`financeiro-store.ts` — lançamentos de fluxo): tratar nesta onda ou em D15.1.a.0 estendido?
4. **Fonte única** durante a migração: qual operador/máquina é o LS canônico (já que LS não sincroniza entre usuários)?
