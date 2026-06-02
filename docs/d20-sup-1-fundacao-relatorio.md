# D20.SUP.1 — Fundação Suprimentos

**Data:** 2026-06-02
**Escopo:** rota + macro nav + ribbon (fundação visual)
**Aprovado:** D20.SUP (sub-onda 1 de 8)

## Entregue

### Navegação
- Novo macro **Suprimentos** em `MACRO_MODULES` (`/suprimentos`, ícone `Boxes`, `accessKey: "estoque"`).
- Novo `MacroKey: "suprimentos"` em `nav-structure.ts`.
- Novo `NavItem` "Suprimentos (Hub)" em ordem 5 — crítica.

### Ribbon
- Nova entrada `"/suprimentos"` em `ROUTE_TABS` com 10 abas:
  Dashboard, Requisições (→ `/solicitacoes-material`), Estoque (→ `/estoque`), Compras (→ `/solicitacoes-material`), Cotações, Pedidos, Recebimentos, Entregas (→ `/estoque#tab=entregas`), Fornecedores (→ `/fornecedores`), Relatórios.
- Abas com `to:` reutilizam a navegação do ribbon (padrão D19.NAV).

### Rota
- `src/routes/suprimentos.tsx` — hub renderiza:
  - **Dashboard**: cartão "Fluxo oficial Suprimentos" (caminho com saldo / caminho sem saldo) + grade 9 cards apontando para Requisições/Estoque/Compras (status `Ativo`) e Cotações/Pedidos/Recebimentos/Relatórios (status `D20.SUP.5+`).
  - Abas `cotacoes/pedidos/recebimentos/relatorios`: placeholder honesto indicando a sub-onda futura.
- Header `D20.SUP.1 · Fundação` + ação "Nova requisição" linkando `/solicitacoes-material`.

## O que NÃO foi feito (proposital)
- Nenhuma migração de schema.
- Nenhuma RPC.
- Nenhuma alteração de RLS, workflow, auditoria ou regra.
- Telas existentes (`/estoque`, `/solicitacoes-material`, `/fornecedores`, `/engenharia`, O.S.) intactas.
- Macros `compras` e `estoque` mantidos no topo para preservar bookmarks (decisão D3 fica aberta para fundir depois).

## Decisões ainda abertas (do plano D20.SUP)
- **D1** Base da Requisição (ampliar `solicitacoes_material` vs criar `suprimentos_requisicoes`).
- **D2** Manter `os.material.baixar` como exceção controlada vs bloquear de vez.
- **D3** Sequencial SUP.1→8 (8 turnos) vs agrupado (5 turnos).

## Próximo
- **D20.SUP.2** — schema unificado de requisições (Material+Serviço) + estado canônico + RPCs `criar/enviar/cancelar`. Schema-first, depende da decisão D1.
