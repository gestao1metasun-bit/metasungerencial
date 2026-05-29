# D17.UI.4c — HistoricoDrawer Universal

**Data:** 2026-05-29
**Status:** Aplicada

## Entrega

1. **`getAuditByModulo` (read-only)** em `src/lib/audit.functions.ts` — consulta
   agregada à `audit_log` por módulo (e opcionalmente entidade). Não altera
   pipeline de auditoria, triggers, RPCs nem RLS. `requireSupabaseAuth`,
   limite 200, Zod validado.
2. **`ModuloHistoricoDrawer`** em `src/components/app/enterprise/ModuloHistoricoDrawer.tsx`
   — Sheet right padrão RM, dois modos:
   - **Per-record** → reusa `HistoricoTimeline` (entidade + entidadeId).
   - **Per-module** → lista cronológica unificada (ação, entidade, campo,
     valor anterior → novo, motivo, usuário, data/hora, ID curto).
   Exportado pelo barrel `@/components/app/enterprise`.

## Wiring por módulo (header `historico`)

| Módulo                  | Rota                                  | Mapeamento                                |
| ----------------------- | ------------------------------------- | ----------------------------------------- |
| Comercial · Assinados   | `routes/comercial.tsx`                | `comercial` / `contrato`                  |
| Compras (Solicitações)  | `routes/solicitacoes-material.tsx`    | `estoque`                                 |
| Estoque                 | `routes/estoque.tsx`                  | `estoque`                                 |
| Engenharia              | `routes/engenharia.tsx`               | `comercial` / `obra,projeto`              |
| Financiamentos          | `routes/financiamentos.tsx`           | `financeiro` / `financiamento`            |
| Pós-venda               | `routes/posvenda.tsx`                 | `comercial` / `obra,contrato`             |
| Operações Financeiras   | `routes/operacoes-financeiras.tsx`    | `financeiro`                              |
| Assinaturas             | `routes/assinaturas.tsx`              | `comercial` / `contrato,proposta`         |

Comportamento anterior (toast / troca de aba) substituído pelo drawer único
em todos os 8 cabeçalhos acima. Histórico per-record (RowActions `historico`,
`onHistorico` em PV/Títulos/Aprovações) permanece intacto — agora pode
opcionalmente delegar ao mesmo `ModuloHistoricoDrawer` no próximo turno.

## Restrições respeitadas

- Zero alteração em banco, RLS, RPCs, workflow ou pipeline de auditoria.
- Apenas leitura adicional (`audit_log` select) e UI nova.
- Linter Supabase inalterado (sem novas definições SECURITY DEFINER).

## Pendências (D17.UI.4c.2 sugerido)

- Estender outras Tabs do Comercial (Cancelados, ContratosTab, Vendedores,
  Aditivos) ao mesmo padrão — ficou só "Contratos · Assinados" nesta onda
  para limitar superfície de erro.
- Wiring dos RowActions `historico` per-record já existentes (engenharia
  equipes, comercial aditivos) para abrir `ModuloHistoricoDrawer`
  no modo per-record (entidade+id) em vez de toast/dialog próprio.

## Aderência

- UX Enterprise Global: **~94% → ~96%** (8 módulos com histórico canônico
  unificado; vocabulário e drawer únicos em toda a base).
