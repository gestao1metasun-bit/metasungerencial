# D18.7 — Camada Universal de Integração Contábil/Fiscal/Financeira

**Data:** 2026-05-29  
**Status:** APLICADA  
**Maturidade Contábil-Ready:** ~95% → **~98%**  
**Maturidade Fiscal-Ready:** ~55% → **~70%**

## Objetivo
Preparar o ERP Meta Sun para integração futura com sistemas externos (Domínio, Alterdata, Sankhya, TOTVS, SAP) **sem alterar a operação atual** e **sem implementar SPED/ECD/ECF/Reinf/DCTFWeb**.

## Entregas

### 1. Lotes de Integração (expansão de `lotes_integracao_contabil`)
Novos campos:
- `tipo_lote` (CONTABIL/FISCAL/FINANCEIRO) — CHECK
- `conector_id`, `layout_id`
- `data_geracao`, `data_exportacao`, `data_integracao`, `usuario_integracao`
- `total_registros`, `payload_export` (jsonb), `mensagem_retorno`
- `status` padronizado: PENDENTE / EXPORTADO / INTEGRADO / ERRO / CANCELADO (CHECK)

Índices: `(tipo_lote, status)` e `(competencia)`.

### 2. `conectores_externos` (catálogo preparatório)
Tabela + RLS (leitura authenticated, escrita admin_master/admin_geral) + 9 seeds **inativos**:
- Domínio Contábil / Domínio Fiscal
- Alterdata Contábil / Alterdata Fiscal
- Sankhya ERP
- TOTVS RM / TOTVS Protheus
- SAP ECC / SAP S/4HANA

### 3. `layouts_exportacao` (preparatório)
Códigos, categoria (CONTABIL/FISCAL/FINANCEIRO), formato (CSV/TXT/JSON/XML/XLSX), versão, `schema_layout` jsonb. 3 seeds genéricos inativos (Contábil/Fiscal/Financeiro em JSON 1.0).

### 4. `lote_registros` (associação genérica origem→lote)
Cobre 6 origens: PARTIDA_VIRTUAL, TITULO_FINANCEIRO, MOVIMENTO_ESTOQUE, FATURAMENTO_COMERCIAL, OPERACAO_FINANCEIRA, OUTRO.  
Campos de rastreabilidade: `hash_registro`, `codigo_externo`, `status`, `mensagem_retorno`, `payload` (jsonb).  
3 índices: lote, origem composta, status.

### 5. Views consolidadas (security_invoker=on)
- `v_lotes_integracao_resumo` — agregação por tipo/status/competência
- `v_lote_registros_status` — agregação por lote/origem/status

### 6. Triggers
`tg_set_updated_at` aplicado nas 3 novas tabelas.

## Restrições respeitadas
- ❌ Sem SPED, ECD, ECF, Reinf, DCTFWeb
- ❌ Sem integração real
- ❌ Sem geração de arquivos oficiais
- ❌ Sem alteração em RLS operacional, workflow, auditoria
- ✅ Conectores e layouts nascem **inativos** (ativação manual futura por admin)

## Linter
139 WARN (estável, mesmo padrão aceito desde D14.2 — RPCs SECURITY DEFINER autenticadas + extension em public).

## Próximos (não implementados nesta onda)
- D18.8: motor de exportação (gerar arquivo a partir de layout + lote)
- D18.9: conectores reais (autenticação + retorno)
- D18.10: relatórios DRE/Balancete preparatórios
