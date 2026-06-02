# Comercial Meta Sun — Padrão RM TOTVS (D27.COM)

Escopo: tornar o módulo Comercial o **mais completo** do ERP, no padrão RM TOTVS adaptado para operação fotovoltaica. Atua em **Leads, Propostas, Contratos, Aditivos, Projetos**.

> Regra de pedra: tudo via RPC oficial + permissão + auditoria. ZERO atalho. Comercial nunca toca regra de Eng/Fin/Estoque diretamente — apenas dispara via RPCs já existentes (`rpc_contrato_assinar`, `rpc_engenharia_libera`, `rpc_financeiro_libera`, comissão D5.1, etc.).

---

## Subondas

### D27.COM.1 — Toolbar Enterprise Unificada (FRONT)
Aplicar a mesma `EnterpriseRecordToolbar` em **Leads / Propostas / Contratos / Aditivos** com botões canônicos:

```
+ Novo ▾ | ✏ Editar | 📄 Duplicar | ❌ Excluir | 🔄 Atualizar
🔍 Busca | 🎯 Filtros | 📎 Anexos | 📜 Histórico | ⚙ Processos
📤 Excel | 📄 PDF | 🖨 Imprimir | ✉ Enviar
```

- **+ Novo**: dropdown contextual (Nova Proposta / Novo Contrato / Novo Cliente / Novo Lead / Novo Aditivo)
- Botões mudos = banidos. Sem ação real → não aparece.
- Vocabulário D17.UI.4d (Novo/Visualizar/Excluir/Atualizar/Histórico).

### D27.COM.2 — Processos Engine Comercial
Reorganizar `ProcessosMenu` em **4 grupos contextuais** conforme entidade ativa:

**LEAD**: Converter / Ganho / Perdido / Reativar / Agendar Visita / Agendar Ligação / Criar Proposta
**PROPOSTA**: Aprovar (→ Contrato) / Reprovar / Duplicar / Gerar Contrato / Enviar Assinar / Cancelar / Reabrir
**CONTRATO**: Editar / Gerar Aditivo / Cancelar / Reabrir / **Enviar Engenharia** / **Enviar Financiamento** / **Enviar Financeiro** / **Gerar Comissão**
**ADITIVO**: Criar / Aprovar / Cancelar / Gerar Financeiro / Enviar Engenharia
**PROJETO** (dentro do contrato): Adicionar / Duplicar / Excluir / Aprovar / Reprovar / Enviar Engenharia

Cada item ⇒ RPC oficial já existente OU placeholder honesto com toast "chega em D27.COM.X" — NUNCA botão mudo.

### D27.COM.3 — Seleção em Lote (Estilo RM)
- Checkbox de seleção já existe em Propostas (D26.1.x). Estender para **Contratos** e **Leads**.
- Barra de seleção com ações em lote: Enviar Engenharia / Enviar Financiamentos / Exportar / Imprimir / Alterar Consultor / Alterar Status / Cancelar / Reabrir.

### D27.COM.4 — Painel Executivo Comercial
Rota `/comercial#tab=painel` (nova aba). Cards canônicos com **olhinho clicável** (drill-down):

- Contratos Gerados | Assinados | Pendentes | Cancelados
- Valor Total | Ticket Médio | kWp Vendido | kWh Contratado | Conversão %

View `v_comercial_painel_executivo` (security_invoker) — só leitura, agrega o que já existe.

### D27.COM.5 — Tabela Principal Contratos (colunas RM)
Colunas: Contrato | Cliente | Cidade | Consultor | Data | Status | Financiamento | Valor Contrato | Valor Recebido | Saldo | Qtd Projetos | kWp.
Sem coluna "Ações" / "Opções" (padrão D26.1.x). Ações via RowActions inline (lápis/X/olho/clipe/relógio) + toolbar.

### D27.COM.6 — Fluxo Completo Visual (diferencial RM)
Botão **"🔀 Fluxo Completo"** no header de cada contrato. Abre Drawer (Sheet right) com pipeline visual:

```
Lead → Proposta → Contrato → Financiamento → Projeto → Engenharia → Estoque → Financeiro → Faturamento
```

Cada etapa colorida: 🟢 Concluído / 🟡 Em andamento / 🔴 Pendente. Lê das views já oficiais (`v_governance_matrix_full`, `v_eventos_canonicos_catalogo`, `v_os_*`, `v_lancamentos_derivados`).

### D27.COM.7 — Anexos & Histórico universais
- **Anexos**: `AttachmentEngine` (D15 anexos-repo) cobrindo categorias: RG / CPF / CNH / Comprovante Residência / Conta Energia / Projeto / ART / Contrato Assinado / Fotos / PDF.
- **Histórico**: `ModuloHistoricoDrawer` universal (D17.UI.4c) — quem criou/alterou/quando/antes/depois (já existe via `v_auditoria_unificada` D24).

### D27.COM.8 — Exclusão Lógica padronizada
- Status canônico **ATIVO / CANCELADO / EXCLUÍDO** (soft-delete já existe via `deleted_at`).
- Toda exclusão pede **motivo ≥5 chars** + grava usuário/data/motivo em `comercial_*_eventos` ou `audit_log`.

---

## Backend (mínimo, reusa o que existe)

| Item | Origem |
|---|---|
| Lead→Proposta→Contrato | RPCs D15 + C2 |
| Aprovar Proposta → Contrato | `rpc_proposta_aprovar` + `rpc_contrato_gerar` |
| Enviar Engenharia | `rpc_engenharia_libera` (C5) |
| Enviar Financeiro | `rpc_financeiro_libera` (C5) |
| Gerar Comissão | C6 já oficial |
| Aditivo | RPC nova `rpc_aditivo_*` (D27.COM.AD) — só schema, sem fiscal |
| Painel Executivo | view nova `v_comercial_painel_executivo` |
| Fluxo Completo | view nova `v_comercial_fluxo_completo` |

---

## Ordem proposta de execução

1. **D27.COM.1** — Toolbar unificada nas 4 telas (1 turno, só front)
2. **D27.COM.2** — ProcessosMenu reorganizado por entidade (1 turno, só front)
3. **D27.COM.4 + .5** — Painel Executivo + tabela RM (1 turno, view + UI)
4. **D27.COM.6** — Fluxo Completo visual (1 turno, view + drawer)
5. **D27.COM.3** — Seleção em lote estendida (1 turno, só front)
6. **D27.COM.7** — Anexos + Histórico universais (1 turno, só front, reusa engines)
7. **D27.COM.AD** — Aditivos backend (1 turno, migração + RPC + UI mínima)

**Aprovação necessária**: começo por D27.COM.1 + D27.COM.2 (toolbar + processos) no próximo turno?

ZERO alteração em RLS / workflow / auditoria / regra fiscal existente. Linter atual 230 WARN preservado.
