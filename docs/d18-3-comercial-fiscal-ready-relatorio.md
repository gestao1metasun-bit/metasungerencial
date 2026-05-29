# D18.3 — Comercial / Faturamento / NF-Ready

**Data:** 2026-05-29 · **Status:** APLICADA · **Onda:** D18.3

## 1. Objetivo

Tornar o Comercial **Fiscal-Ready e Contábil-Ready**, preparando a base para futura integração com NF-e / NFS-e / Domínio / Alterdata / Sankhya / TOTVS / SAP — **sem emitir notas, sem calcular tributo, sem apuração**.

## 2. Entregas

### 2.1 Contratos Fiscal-Ready
Colunas adicionadas: `competencia`, `tipo_documento_fiscal`, `situacao_fiscal` (default `NAO_APLICAVEL`), `codigo_externo`, `sistema_destino`, `status_integracao` (default `PENDENTE`), `data_integracao`, `hash_integracao`, `lote_integracao_id`.
CHECKs: `tipo_documento_fiscal` ∈ {NFE,NFSE,NFCE,CTE,MDFE,RECIBO,CONTRATO,OUTRO}; `situacao_fiscal` ∈ {NAO_APLICAVEL,PENDENTE,PREPARADO,EMITIDO,CANCELADO,ERRO}; `status_integracao` ∈ {PENDENTE,ENVIADO,CONFIRMADO,ERRO,IGNORADO}. 4 índices.

### 2.2 Pedidos de Venda Fiscal-Ready
`status_faturamento` ampliado para **NAO_FATURADO / PARCIALMENTE_FATURADO / FATURADO / CANCELADO / NAO_APLICAVEL** (substitui PENDENTE legado, idempotente).
Novas colunas: `valor_faturado`, `data_faturamento`, `codigo_externo`, `sistema_destino`, `status_integracao`, `data_integracao`, `hash_integracao`, `lote_integracao_id`. 2 índices.

### 2.3 Clientes (PF/PJ + Inscrições)
`tipo_pessoa` (PF/PJ/EX, default PF), `rg`, `inscricao_estadual`, `inscricao_municipal`, `regime_tributario` (SIMPLES/LUCRO_PRESUMIDO/LUCRO_REAL/MEI/ISENTO/NAO_INFORMADO), + 5 campos de integrabilidade. Endereço já completo no schema base. 2 índices novos.

### 2.4 Produtos / Serviços Fiscal-Ready
`tipo_item` (MATERIAL/SERVICO/KIT/REVENDA/CONSUMO/IMOBILIZADO, default MATERIAL), `ncm`, `cfop_padrao`, `cst_padrao`, `origem_fiscal`, `codigo_servico_lc116`, + 3 campos de integrabilidade. 2 índices novos.

### 2.5 Títulos Financeiros — Retenções
Garantida presença das 6 colunas (`valor_iss`, `valor_inss`, `valor_irrf`, `valor_pis`, `valor_cofins`, `valor_csll`) já criadas em D18.2 — idempotente. Sem cálculo automático, sem apuração.

### 2.6 Faturamento — Camada preparatória
Nova tabela `public.faturamentos_comercial` com:
- Vínculo opcional a `pedido_venda_id`, `contrato_id`, `cliente_id`.
- Classificação: `natureza_receita_id`, `centro_resultado_id`, `centro_custo_id`, `competencia`, `tipo_documento_fiscal`.
- Situação: `PREPARADO / FATURADO / CANCELADO / ESTORNADO / ERRO`.
- Valores: bruto, desconto, acréscimo, 6 retenções, líquido.
- Campos NF preparados (sem emissão): `numero_nf`, `serie_nf`, `chave_nfe`, `data_emissao_nf`.
- Integração: `codigo_externo`, `sistema_destino`, `status_integracao`, `data_integracao`, `hash_integracao`, `lote_integracao_id`.
- Triggers: `tg_set_updated_at_generic`, `tg_bump_row_version`, `tg_audit_row('comercial','faturamento')`.
- RLS: SELECT/INSERT/UPDATE para autenticados; DELETE só admin. GRANTs explícitos. 6 índices.

### 2.7 Catálogo de Eventos Comerciais
Nova tabela `public.comercial_eventos_catalogo` documenta 10 eventos comerciais e seu mapeamento para o `evento_canonico` de `mapeamentos_contabeis` (D18.2):

| Evento | Canônico |
|---|---|
| CONTRATO_APROVADO | VENDA |
| CONTRATO_ASSINADO | VENDA |
| CONTRATO_ADITIVADO | VENDA |
| CONTRATO_CANCELADO | RESCISAO |
| PEDIDO_VENDA_APROVADO | VENDA |
| PEDIDO_VENDA_FATURADO | VENDA |
| PEDIDO_VENDA_CANCELADO | RESCISAO |
| FATURAMENTO_EMITIDO | VENDA |
| FATURAMENTO_CANCELADO | RESCISAO |
| FATURAMENTO_ESTORNADO | RESCISAO |

RLS: leitura autenticada, escrita só admin. Sem geração de partidas reais.

## 3. Restrições respeitadas
- ❌ Sem NF-e/NFS-e/NFCE/CTE/MDFE/SPED/ECD/ECF/Reinf/DCTFWeb/apuração.
- ❌ Sem cálculo tributário automático.
- ❌ Sem alteração de RLS operacional, workflow, regras de negócio, auditoria.
- ✅ Massa atual = homologação. Campos novos nullable ou com default seguro.
- ✅ Obrigatoriedade apenas para registros novos/editados pós-D18 (regra futura, não enforçada nesta onda).

## 4. Impacto técnico
- **Linter:** 137 → **139 WARN** (+2, ambos `USING(true)` de SELECT em `faturamentos_comercial` e `comercial_eventos_catalogo` — padrão D14.2 aceito). Zero ERROR.
- **Auditoria:** `faturamentos_comercial` plugado em `tg_audit_row('comercial','faturamento')`; demais alterações em tabelas existentes mantêm triggers atuais.
- **Performance:** 16 índices novos (competência, status fiscal, status integração, código externo, tipo pessoa, NCM, tipo item, FKs do faturamento).
- **Integridade:** todos os FKs novos usam `ON DELETE SET NULL`.

## 5. Maturidade

| Dimensão | Antes | Depois |
|---|---|---|
| Contábil-Ready | ~55% | **~67%** |
| Fiscal-Ready | ~0% | **~55%** |
| ERP Geral | ~98-99% | **~99%** |
| UX Enterprise | ~98% | ~98% (inalterado) |

## 6. Próximos passos
- **D18.4** Compras Contábil-Ready (materialização do módulo `ordens_compra` com FK real de fornecedor, natureza/CR/CC/competência/categoria).
- **D18.5** Estoque Contábil-Ready (uso obrigatório de `categoria_contabil` em novos lançamentos + `origem_id` em movimentos).
- **D18.6** Engenharia/OS (criar `ordens_servico` mínima ligada a CR/CC).
- **D18.7** Partidas contábeis virtuais + lotes (gerados a partir do faturamento, baixa de título, movimento de estoque para obra, comissão).

## 7. Critério de aceite — atendido
- ✅ Contratos com campos fiscais + integração.
- ✅ PV com status de faturamento ampliado + integração.
- ✅ Clientes com PF/PJ + inscrições + regime tributário.
- ✅ Produtos com NCM/CFOP/CST/origem/LC116/tipo item.
- ✅ Estrutura de faturamento criada (sem emissão).
- ✅ Retenções estruturalmente prontas.
- ✅ Eventos contábeis comerciais mapeados.
- ✅ Comercial pronto para futura emissão fiscal/integração contábil sem reconstrução estrutural.
