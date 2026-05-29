# D18.4 — Compras / Estoque / Movimentações Contábil-Ready

**Data:** 2026-05-29
**Status:** APLICADA
**Escopo:** preparar Compras, Estoque, Movimentações, CMV e Engenharia para integração contábil/fiscal externa futura, sem implementar SPED, escrituração, apuração, emissão ou conectores reais.

## 1. Entregas estruturais

### 1.1 Compras Contábil-Ready

`solicitacoes_material` e `ordens_compra` ganharam o mesmo bloco contábil + integrabilidade:

- `fornecedor_id` → FK `public.fornecedores`
- `natureza_financeira_id` → FK `public.naturezas_financeiras`
- `centro_resultado_id` → FK `public.centros_resultado`
- `centro_custo_id` → FK `public.centros_custo`
- `conta_financeira_id` → FK `public.contas_financeiras`
- `competencia` (date)
- `categoria_contabil` (CHECK canônico 6 valores)
- Integrabilidade: `codigo_externo`, `sistema_destino`, `status_integracao` (PENDENTE/ENVIADO/CONFIRMADO/ERRO/IGNORADO), `hash_integracao`
- Índices por fornecedor, natureza, CR, CC, competência

Os campos legados `fornecedor_nome` / `fornecedor_doc` em `ordens_compra` permanecem para compat; novos lançamentos devem preferir `fornecedor_id`.

### 1.2 Estoque Contábil-Ready

`produtos` já possuía `categoria_contabil` + `tipo_item` (D18.2). Mantido inalterado:

- `categoria_contabil` CHECK: `REVENDA | MATERIAL_INSTALACAO | CONSUMO | FERRAMENTA | IMOBILIZADO | SERVICO`
- `tipo_item` CHECK: `MATERIAL | SERVICO | KIT | REVENDA | CONSUMO | IMOBILIZADO`

### 1.3 Movimentações Contábil-Ready

`estoque_movimentos` já tinha `origem_tipo`, `centro_resultado_id`, `centro_custo_id`, `categoria_contabil`. D18.4 adiciona:

- `origem_id` (uuid) — referência genérica à origem (OC, solicitação, ajuste, inventário…)
- `hash_integracao` (text)
- `codigo_externo`, `sistema_destino`, `status_integracao` (CHECK canônico)
- Índices: `(origem_tipo, origem_id)` e `status_integracao`

Já registra (campos existentes): `user_id`, `created_at`, `origem_tipo`, CR, CC.

### 1.4 Catálogo de eventos contábeis de Estoque

Nova tabela `public.estoque_eventos_catalogo`:

| evento | evento_canonico |
|---|---|
| COMPRA_RECEBIDA | COMPRA |
| ENTRADA_ESTOQUE | ENTRADA_ESTOQUE |
| SAIDA_ESTOQUE | SAIDA_ESTOQUE |
| CONSUMO_OBRA | CONSUMO_OBRA |
| AJUSTE_ESTOQUE | AJUSTE_ESTOQUE |
| INVENTARIO | INVENTARIO |

CHECK canônico aceita também `TRANSFERENCIA` e `DEVOLUCAO` para evolução futura. RLS: leitura `authenticated`, escrita `is_admin`.

### 1.5 CMV preparatório

Nova view `public.v_cmv_preparado` (`security_invoker = on`) traduz cada `estoque_movimentos` em:

- `evento_canonico` derivado do tipo + presença de obra
- `valor_cmv_preparado` = `custo_total` quando saída/baixa/entrega, zero caso contrário
- Carrega `categoria_contabil` e `tipo_item` do produto, CR/CC, `origem_tipo/origem_id`, `status_integracao`, `hash_integracao`

A view oficial `v_cmv_oficial` (preexistente) continua sendo a verdade operacional; `v_cmv_preparado` é a camada de **mapeamento contábil-ready** para futura integração.

### 1.6 Vínculo Engenharia → Estoque → Centro de Custo

Já garantido pelos campos existentes em `estoque_movimentos` (`obra_id`, `centro_custo_id`) e reforçado pelo evento canônico `CONSUMO_OBRA` na nova view. Nenhuma mudança operacional.

## 2. Restrições respeitadas

- Sem SPED, ECD, ECF, EFD, apuração ou escrituração oficial.
- Sem emissão fiscal e sem conector externo real.
- Sem alteração de RLS operacional, workflow, auditoria ou regras de negócio.
- Todos os novos campos são **opcionais** (compat 100% com operação atual).

## 3. Linter

137 → 139 WARN. Os 2 incrementos são do mesmo padrão já documentado em D14.2 / D18.3 (SECURITY DEFINER + função `tg_set_updated_at_generic` herdada).

## 4. Maturidade

| Indicador | Antes | Depois |
|---|---|---|
| Contábil-Ready | ~67% | **~80%** |
| Fiscal-Ready | ~55% | ~55% (intacto) |
| ERP Global | ~99% | ~99% |

## 5. Próximas ondas

- D18.5 — Engenharia / OS contábil-ready (vincular formalmente ordens de serviço a centros de custo + eventos contábeis).
- D18.6 — Financeiro contábil-ready (rateio de títulos, partidas virtuais).
- D18.7 — Partidas contábeis virtuais + lotes de integração.
