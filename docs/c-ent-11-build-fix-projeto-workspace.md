# Hotfix — Build quebrado em `comercial.projetos.$projetoId`

## Arquivo corrigido
- `src/routes/comercial.projetos.$projetoId.tsx`

## Causa do erro
Na correção anterior, o `export { ProjetoWorkspacePage }` foi removido por engano
sob a hipótese de que o code-splitter do TanStack rejeitaria o export. Na prática
o plugin desta versão do projeto **exige** que o identificador passado em
`component:` exista como **export nomeado** — ele gera um chunk virtual com
`export { ProjetoWorkspacePage }` e falha em pre-transform com:

> Export 'ProjetoWorkspacePage' is not defined. (28:9)

O padrão idêntico em `comercial.contratos.$contratoId.tsx`
(`export function ContratoWorkspacePage()`) confirma a convenção do projeto.

## Alteração feita
Linha 60 — `function ProjetoWorkspacePage()` → `export function ProjetoWorkspacePage()`.
Nada mais foi tocado (zero mudança de regra, JSX, hooks, RPC, permissão).

## Validação
- **Vite**: nenhum novo erro para o arquivo após o fix (último erro 15:02, edit 15:03+).
- **HTTP**: `GET /src/routes/comercial.projetos.$projetoId.tsx` → 200.
- **Rota**: `/comercial/projetos/$projetoId` volta a renderizar sem overlay.

## Status
C-ENT.11.d **não** foi iniciada. Build restaurado.
