# D27.COM.1 + D27.COM.2 — Toolbar Enterprise + Processos por Entidade

Aplicado em 2026-06-02. Plano oficial: `.lovable/plan.md`.

## Escopo

Padrão RM TOTVS adaptado para Comercial Meta Sun. **Só frontend.** Zero
migração, zero alteração de RLS/RPC/workflow/auditoria/regra.

## Alterações

### 1) `EnterpriseRecordToolbar` (transversal)
- Action enum ampliado: **+`duplicar`**, **+`enviar`**.
- Ícones (`Copy`, `Mail`) e labels canônicos D17.UI.4d adicionados.
- `showAction` por modo (`single`/`multi`) inclui as novas ações.
- Render injeta `duplicar` ao lado de `editar` e `enviar` ao lado de `imprimir`.
- Tons canônicos: `duplicar=info` (azul) · `enviar=success` (verde).

### 2) `src/modules/propostas/PropostasPage.tsx`
- Toolbar com TODAS as ações da spec: Novo, Editar, Duplicar, Excluir,
  Atualizar, Anexos, Histórico, Auditoria, Exportar, Imprimir, Enviar,
  Filtros, Colunas.
- Processos agora cobrem o ciclo completo de **PROPOSTA**: aprovar→contrato,
  reprovar, duplicar, gerar contrato, enviar assinar, cancelar, reabrir.
- Processos em lote: alterar consultor, alterar status, exportar CSV.
- Itens ainda sem RPC oficial mostram toast honesto apontando a sub-onda
  futura (D27.COM.2b / .3 / .6 / .7) — nenhum botão mudo.

### 3) `src/modules/leads/LeadsPage.tsx`
- Toolbar com as mesmas ações canônicas + ações específicas de LEAD.
- Processos cobrem o ciclo de **LEAD**: converter, ganho, perdido, reativar,
  agendar visita/ligação, criar proposta.
- Processos em lote: alterar consultor, alterar origem, exportar CSV
  (toasts honestos por enquanto, já que os setters estão em escopo
  diferente da árvore).

### 4) `src/routes/comercial.tsx` — Contratos Assinados (linha 398)
- Toolbar enriquecida com Processos canônicos de **CONTRATO**: editar,
  gerar aditivo, cancelar, reabrir, enviar engenharia, enviar
  financiamentos, enviar financeiro, gerar comissão, enviar assinar.
- Processos em lote: enviar eng/fin, alterar consultor/status,
  exportar CSV.

### 5) `src/routes/comercial.tsx` — Aditivos (linha 5560)
- Toolbar enriquecida com Processos de **ADITIVO**: criar, aprovar,
  cancelar, gerar financeiro, enviar engenharia.

## O que NÃO foi feito (próximas sub-ondas)

| Sub-onda | Entrega |
|---|---|
| D27.COM.2b | Wire real dos processos via RPCs existentes (`rpc_proposta_aprovar`, `rpc_contrato_gerar`, `rpc_engenharia_libera`, `rpc_financeiro_libera`, etc.) |
| D27.COM.3 | Seleção em lote estendida a Contratos e Leads (Propostas já tem) |
| D27.COM.4+5 | Painel Executivo + tabela RM de contratos |
| D27.COM.6 | Fluxo Completo visual (drawer pipeline colorido) |
| D27.COM.7 | AttachmentEngine + ModuloHistoricoDrawer universais |
| D27.COM.AD | Aditivos backend (migração + RPCs) |

## Aceite

- Build limpo (TypeScript) ✅
- Sem mudança em RLS / workflow / auditoria / regra ✅
- Vocabulário canônico D17.UI.4d preservado ✅
- Nenhum botão mudo: ação real OU toast honesto ✅
- Toolbar idêntica em Leads / Propostas / Contratos / Aditivos ✅
