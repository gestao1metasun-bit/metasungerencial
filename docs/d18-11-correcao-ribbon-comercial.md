# D18.11 — Correção da Navegação Real do Ribbon Comercial

## Problema

Clicar em **Contratos** no ribbon de `/comercial` permanecia na própria rota
e renderizava o card "Contratos agora vivem em uma tela própria"
(`ContratosRedirectCard`), exigindo um segundo clique para chegar à listagem
oficial em `/comercial/contratos`.

## Solução

Cada botão crítico do ribbon do macro Comercial passa a navegar **direto**
para a rota oficial daquela camada. Hash legado (`#tab=contratos|comissoes`)
ainda é interceptado e redirecionado de forma transparente.

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/lib/route-tabs.ts` | `to: "/comercial/propostas"` em `orcamentos`; `to: "/comercial/comissoes"` em `comissoes`. `contratos` já tinha `to`. |
| `src/routes/comercial.tsx` | Importa `useNavigate`; novo `useEffect` que redireciona `tab=contratos` → `/comercial/contratos` e `tab=comissoes` → `/comercial/comissoes` (`replace:true`). `TabsContent value="contratos"` agora mostra apenas "Redirecionando…" no lugar do `ContratosRedirectCard`. |
| `src/modules/propostas/components/PropostaList.tsx` | `irParaContratos()` agora aponta para `/comercial/contratos` em vez de `/comercial#tab=contratos`. |

## Mapa de destinos

| Botão do ribbon | Destino anterior | Destino novo |
|---|---|---|
| Propostas | `/comercial#tab=orcamentos` | `/comercial/propostas` → redirect transparente para `/comercial#tab=orcamentos` |
| Contratos | `/comercial#tab=contratos` (card de redirect) | `/comercial/contratos` (direto) |
| Comissões | `/comercial#tab=comissoes` | `/comercial/comissoes` (direto) |
| Aditivos | `/comercial#tab=aditivos` | Inalterado — não existe rota dedicada; aba interna mantida |
| Carteira | `/comercial#tab=carteira` | Inalterado |
| Vendedores | `/comercial#tab=vendedores` | Inalterado |

## Cards / abas removidos

- **Card** `ContratosRedirectCard` — não mais renderizado. Função permanece no arquivo (legado), sem efeito visível.
- **Conteúdo** da `TabsContent value="contratos"` — substituído por placeholder "Redirecionando…" (hash legado dispara `navigate` antes de pintar).

## Redirecionamentos transparentes

- `/comercial/propostas` (`createFileRoute` + `redirect`) → `/comercial#tab=orcamentos` (workspace embarcado preservado).
- `/comercial#tab=contratos` → `/comercial/contratos` (`useEffect` em `ComercialPage`, `replace:true`).
- `/comercial#tab=comissoes` → `/comercial/comissoes` (`useEffect` em `ComercialPage`, `replace:true`).

## Validação

- Ribbon → **Contratos**: navega para `/comercial/contratos` sem passar pelo card.
- Ribbon → **Propostas**: abre workspace de propostas (via redirect estável).
- Ribbon → **Comissões**: navega para `/comercial/comissoes`.
- Deep-link/bookmark antigo `/comercial#tab=contratos`: cai automaticamente em `/comercial/contratos`.
- Nenhum botão crítico (Propostas/Contratos/Comissões) fica preso em `/comercial`.

## Riscos / pendências

- **Aditivos**: ainda sem rota dedicada (`/comercial/aditivos` não existe). O ribbon continua abrindo a aba interna `AditivosTab`. Quando a listagem oficial for criada, basta acrescentar `to: "/comercial/aditivos"` na entrada correspondente em `route-tabs.ts`.
- `ContratosRedirectCard` permanece no arquivo (deadcode tolerado por `noUnusedLocals:false`) para facilitar reuso caso volte a haver fallback informativo.

## tsc --noEmit

Sem novos erros de tipo introduzidos. Edições limitam-se a:
- adicionar `useNavigate` (export já existente em `@tanstack/react-router`);
- adicionar 2 propriedades `to` em entradas existentes de `ROUTE_TABS`;
- ajustar string literal em `irParaContratos`.
