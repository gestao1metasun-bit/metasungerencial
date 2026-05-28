# Onda 0 — Inventário LocalStorage
Gerado: 2026-05-28 · Read-only · Nenhum código alterado

## Sumário
- **Arquivos com `localStorage.*`**: 46
- **Chaves únicas detectadas**: 43
- **Operacional crítico (deve migrar)**: 27 chaves
- **Cadastro canônico (Onda 2)**: 13 chaves
- **Preferência/UI (manter em LS)**: 14 chaves

> Total > 43 porque algumas chaves se enquadram em duas categorias (ex.: `ms.fin.fornecedores.v1` é cadastro mas também operacional).

---

## Classificação por categoria

### 🔴 OPERACIONAL CRÍTICO — Onda 1 (Financeiro) e Onda 3 (Comercial)

| Chave | Categoria | Onda alvo | Tabela Supabase destino |
|---|---|---|---|
| `ms.fin.titulos.v1` | Financeiro | 1 | `titulos_financeiros` + `parcelas_financeiras` |
| `ms.fin.adiantamentos.v1` | Financeiro | 1 | `adiantamentos` + `adiantamento_abatimentos` |
| `ms.fin.renegociacoes.v1` | Financeiro | 1 | `titulos_renegociacoes` + `titulos_renegociacao_itens` |
| `ms.fin.rescisoes.v1` | Financeiro | 1 | `rescisoes_contrato` + `rescisoes_itens` |
| `ms.fin.conciliacao.v1` | Financeiro | 1 | `extrato_banco` + `movimentacoes_financeiras` |
| `ms.fin.fechamentos.v1` | Financeiro | 1 | `period_locks` |
| `ms.fin.fechamentos.v2` | Financeiro | 1 | `period_locks` |
| `ms.fin.pendencias.v1` | Financeiro | 1 | `governance_pendencias` |
| `ms.contratos.v2` | Comercial | 3 | `contratos` |
| `ms.contratos.lastSync` | Comercial | 3 | (timestamp — descartável) |
| `ms.aditivos.v1` | Comercial | 3 | `aditivos` |
| `contrato-base-overrides-v1` | Comercial | 3 | `contratos` (campo override) |
| `ms.clientes.full.v1` | Comercial | 3 | `clientes` |
| `ms.clientes.extra.v1` | Comercial | 3 | `clientes` (campo extra jsonb) |
| `ms.engenharia.obras.snapshot.v1` | Engenharia | 3+ | `obras` |
| `ms.obras.finalizacao.v1` | Engenharia | 3+ | `obras.status` + `entidade_versoes` |
| `ms.audit.v1` | **Auditoria** | **5** | `audit_log` (já existe — só anexar trigger) |

**Confirma diagnóstico D15.1.a.0.ii+:** snapshot canônico `658dff81` veio de `ms.fin.titulos.v1` (= `metasun.fin.lancamentos.v1` no nome novo).

---

### 🟡 CADASTRO CANÔNICO — Onda 2

| Chave | Tabela Supabase destino | Status |
|---|---|---|
| `ms.fin.naturezas.v2` | `naturezas_financeiras` | **21 linhas no banco** — só desligar LS |
| `ms.fin.centros.v2` | `centros_resultado` | 3 linhas no banco — completar |
| `ms.fin.contas.v1`, `ms.fin.contas.v2` | `contas_financeiras` | 4 linhas no banco — completar |
| `ms.bancos.v1` | `bancos` | 10 linhas no banco — completar |
| `ms.fin.fornecedores.v1` | `fornecedores` | **0 linhas** — importar |
| `ms.fin.meios.v1` | (criar `formas_pagamento` ou enum) | falta |
| `ms.fin.tipos-aplicacao.v1` | (criar `tipos_aplicacao_financeira`) | falta |
| `ms.fin.parametros.v1` | `gerencial_parametros` | 11 linhas no banco — completar |
| `ms.consultores.v1` | `profiles` + role `consultor` | já existe |
| `ms.gerentes.v1` | `profiles` + role `gerente` | já existe |
| `ms.equipes.v1` | (criar `equipes`) | falta |
| `ms.usuarios.v1` | `profiles` + `user_roles` | já existe |
| `ms.fv.origens-captacao.v1` | (criar `lead_origens`) | falta |

---

### 🟢 PREFERÊNCIA / UI — MANTÉM em LS (não migrar)

| Chave | Uso |
|---|---|
| `ff:enterprise-shell-full` | Feature flag visual do Shell D6 |
| `ms.fv.kanban.cols.v5` | Configuração de colunas Kanban |
| `ms.fv.kanban.assign-leads.v1` | Filtro Kanban |
| `ms.fv.lastCidadeId.v1` | Último contexto de cidade (proposta) |
| `ms.fv.proposta_config.v1` | Configuração de UI de proposta |
| `ms.fv.propostas.view` | Modo de visualização (lista/kanban) |
| `ms.fv.propostas.tabela.hidden.v2` | Colunas ocultas |
| `ms.fv.propostas.tabela.order.v2` | Ordem de colunas |
| `ms.fv.propostas.tabela.widths.v2` | Largura de colunas |
| `ms.fin.cols.carteira.v1` | Layout colunas grid carteira |
| `ms.fin.cols.sem.v1` | Layout colunas grid sem títulos |
| `ms.grid.titulos.*` | Prefixo dinâmico — configuração de grids |

**Política Onda 10:** essas chaves continuam aceitas. Tudo o mais sai.

---

## Riscos

| ID | Risco | Impacto | Mitigação |
|---|---|---|---|
| R0.1 | `ms.audit.v1` é o log operacional REAL hoje — vive em LS | Auditoria não é confiável | Onda 5: importar para `audit_log` + ligar `tg_audit_row` |
| R0.2 | Cadastros divergentes entre LS (operador) e banco (compartilhado) | Naturezas/contas inconsistentes entre dashboards e operação | Onda 2 com dedupe por `LOWER(nome)` |
| R0.3 | Snapshot canônico veio de um único operador (Renan) | Outros operadores podem ter LS divergente | Onda 1.C dual-read detecta diff antes do corte |

## Próximo passo

Pronto para Onda 1.A (migration `v_lancamentos_derivados` + RPCs). Aguardando aprovação explícita.
