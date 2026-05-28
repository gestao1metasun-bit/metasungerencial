# D15.2 — Auditoria LocalStorage (oficial)

Gerada por `scripts/ls-audit.mjs` em 2026-05-28T21:40:56.217Z

- Arquivos com uso de localStorage: **47**
- Chaves distintas detectadas: **53**

## Resumo

| Classificação | Chaves | Política |
|---|---|---|
| OP_FINANCEIRO | 23 | PROIBIDO — refator para repository Supabase |
| INDETERMINADO | 9 | CLASSIFICAR manualmente |
| OP_COMERCIAL | 5 | PROIBIDO — refator |
| OP_CONTRATO | 4 | PROIBIDO — refator |
| OP_PROPOSTA | 4 | PROIBIDO — refator |
| FEATURE_FLAG_OK | 3 | MANTER |
| OP_GOVERNANCA | 2 | PROIBIDO — refator |
| AUDIT_LEGADO_MIGRAR | 1 | MIGRAR Supabase (Onda 5 já feita; remover gravação LS) |
| OP_ENGENHARIA | 1 | PROIBIDO — refator |
| OP_ESTOQUE_COMPRAS | 1 | PROIBIDO — refator |

## Detalhe

### AUDIT_LEGADO_MIGRAR — 1 chave(s) — MIGRAR Supabase (Onda 5 já feita; remover gravação LS)

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `ms.audit.v1` | 1 | 1 | src/lib/audit-store.ts |

### FEATURE_FLAG_OK — 3 chave(s) — MANTER

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `ff:${name}` | 1 | 0 | src/config/featureFlags.ts |
| `ff:<NAME>` | 0 | 1 | src/config/featureFlags.ts |
| `ff:enterprise-shell-full` | 0 | 1 | src/lib/feature-flags.ts |

### INDETERMINADO — 9 chave(s) — CLASSIFICAR manualmente

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `<EXPR:KEY(gridId>` | 1 | 1 | src/components/app/grid/useGridDensity.ts |
| `<EXPR:STORAGE_PREFIX + id>` | 1 | 1 | src/components/app/EnhancedTable.tsx |
| `<EXPR:k>` | 3 | 4 | src/lib/dev-seed.ts<br>src/lib/estoque-store.ts<br>src/lib/fin-compras-store.ts<br>src/lib/posvenda-store.ts |
| `<EXPR:key>` | 6 | 7 | src/components/app/KanbanColumns.tsx<br>src/lib/favoritos-store.ts<br>src/lib/feature-flags.ts<br>src/lib/financeiro-store.ts<br>src/modules/propostas/components/PropostaList.tsx<br>src/modules/propostas/store.ts |
| `<EXPR:raw>` | 1 | 0 | src/routes/comercial.tsx |
| `<EXPR:storageKey>` | 1 | 1 | src/components/app/OperacionalFinTable.tsx |
| `ms.fv.lastCidadeId.v1` | 1 | 2 | src/modules/propostas/store.ts |
| `ms.fv.origens-captacao.v1` | 1 | 1 | src/modules/propostas/PropostasPage.tsx |
| `ms.perfis.v1` | 1 | 2 | src/lib/perfis-store.ts |

### OP_COMERCIAL — 5 chave(s) — PROIBIDO — refator

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `ms.clientes.extra.v1` | 1 | 0 | src/lib/clientes-store.ts |
| `ms.clientes.full.v1` | 1 | 2 | src/lib/clientes-store.ts |
| `ms.consultores.v1` | 1 | 2 | src/lib/consultores-store.ts |
| `ms.equipes.v1` | 1 | 2 | src/lib/equipes-store.ts |
| `ms.gerentes.v1` | 1 | 2 | src/lib/gerentes-store.ts |

### OP_CONTRATO — 4 chave(s) — PROIBIDO — refator

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `contrato-base-overrides-v1` | 1 | 1 | src/lib/contrato-base-store.ts |
| `ms.aditivos.v1` | 1 | 1 | src/lib/aditivos-store.ts |
| `ms.contratos.lastSync` | 0 | 1 | src/lib/contratos-store.ts |
| `ms.contratos.v2` | 1 | 2 | src/lib/contratos-store.ts |

### OP_ENGENHARIA — 1 chave(s) — PROIBIDO — refator

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `ms.engenharia.obras.snapshot.v1` | 1 | 1 | src/lib/obras-snapshot-store.ts |

### OP_ESTOQUE_COMPRAS — 1 chave(s) — PROIBIDO — refator

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `ms.estoque.compras.transito.v1` | 1 | 1 | src/lib/compras-transito-store.ts |

### OP_FINANCEIRO — 23 chave(s) — PROIBIDO — refator para repository Supabase

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `metasun.fin.lancamentos.v1` | 2 | 5 | src/lib/financeiro-store.ts |
| `metasun.fin.recorrentes.v1` | 0 | 1 | src/lib/financeiro-store.ts |
| `ms.bancos.v1` | 1 | 2 | src/lib/bancos-store.ts |
| `ms.fin.adiantamentos.v1` | 1 | 1 | src/lib/fin-adiantamentos-store.ts |
| `ms.fin.centros.v2` | 2 | 2 | src/lib/fin-centros-custo-store.ts |
| `ms.fin.conciliacao.v1` | 1 | 1 | src/lib/fin-conciliacao-store.ts |
| `ms.fin.contas.v1` | 1 | 0 | src/lib/fin-contas-store.ts |
| `ms.fin.contas.v2` | 2 | 2 | src/lib/fin-contas-store.ts |
| `ms.fin.fechamentos.v1` | 1 | 0 | src/lib/fin-fechamento-store.ts |
| `ms.fin.fechamentos.v2` | 1 | 2 | src/lib/fin-fechamento-store.ts |
| `ms.fin.fornecedores.v1` | 2 | 2 | src/lib/fin-fornecedores-store.ts |
| `ms.fin.grupos.v1` | 2 | 2 | src/lib/fin-grupos-store.ts |
| `ms.fin.meios.v1` | 2 | 2 | src/lib/fin-meios-pagamento-store.ts |
| `ms.fin.naturezas.v2` | 2 | 2 | src/lib/fin-naturezas-store.ts |
| `ms.fin.parametros.v1` | 1 | 1 | src/lib/fin-parametros-financeiros-store.ts |
| `ms.fin.pendencias.v1` | 1 | 1 | src/lib/fin-pendencias.ts |
| `ms.fin.renegociacoes.v1` | 1 | 1 | src/lib/fin-renegociacao-store.ts |
| `ms.fin.rescisoes.v1` | 1 | 1 | src/lib/fin-rescisao-store.ts |
| `ms.fin.subgrupos.v1` | 2 | 2 | src/lib/fin-grupos-store.ts |
| `ms.fin.tipos-aplicacao.v1` | 2 | 2 | src/lib/fin-tipos-aplicacao-store.ts |
| `ms.fin.titulos.v1` | 1 | 1 | src/lib/fin-titulos-store.ts |
| `ms.grid.titulos.${tipo}.cols.v1` | 1 | 1 | src/modules/financeiro/TitulosTab.tsx |
| `ms.obras.finalizacao.v1` | 1 | 1 | src/lib/obras-finalizacao-store.ts |

### OP_GOVERNANCA — 2 chave(s) — PROIBIDO — refator

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `ms.usuarioAtual.v1` | 1 | 2 | src/lib/perfis-store.ts |
| `ms.usuarios.v1` | 2 | 4 | src/lib/perfis-store.ts<br>src/lib/usuarios-store.ts |

### OP_PROPOSTA — 4 chave(s) — PROIBIDO — refator

| Chave | reads | writes | arquivos |
|---|---|---|---|
| `ms.fv.proposta_config.v1` | 1 | 2 | src/modules/propostas/proposta-config-store.ts |
| `ms.fv.propostas.tabela.hidden.v2` | 1 | 1 | src/modules/propostas/components/PropostaList.tsx |
| `ms.fv.propostas.tabela.order.v2` | 1 | 1 | src/modules/propostas/components/PropostaList.tsx |
| `ms.fv.propostas.tabela.widths.v2` | 1 | 1 | src/modules/propostas/components/PropostaList.tsx |

