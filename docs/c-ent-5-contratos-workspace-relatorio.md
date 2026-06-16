# C-ENT.5 — Workspace e Listagem de Contratos Supabase

Data: 2026-06-16

## Objetivo
Criar a tela oficial de Contratos Supabase + o Workspace do Contrato, usando
`public.contratos`, `public.contrato_propostas` e `public.projetos` como
fonte oficial. Mantém compatibilidade total com o fluxo legado em LS.

## Migrações aplicadas
- `rpc_contrato_cancelar(_id uuid, _motivo text, _observacao text DEFAULT NULL)`
  - SECURITY DEFINER, `search_path=public`, REVOKE anon / GRANT authenticated.
  - Exige `is_admin` ou permissão `comercial.contrato.cancelar`.
  - Motivo obrigatório (≥5 chars). Bloqueia se já `CANCELADO`.
  - Atualiza `status='CANCELADO'`, `cancelado=true`, grava motivo+observacao
    em `motivo_cancelamento`. **Não exclui** contrato, propostas ou projetos.

## Permissões usadas (já existiam em C-ENT.4)
- `comercial.contrato.visualizar`
- `comercial.contrato.cancelar`

## Rotas criadas
- `/comercial/contratos` — `src/routes/comercial.contratos.index.tsx`
- `/comercial/contratos/$contratoId` — `src/routes/comercial.contratos.$contratoId.tsx`

> Reconhecidas automaticamente pelo TanStack Router Vite plugin; `routeTree.gen.ts`
> regenerado sem edição manual.

## Abas implementadas (Workspace do Contrato)
1. **Resumo** — Dados do contrato + card "Composição do Contrato" (totais
   contrato vs. consolidado de propostas).
2. **Propostas origem** — leitura via `contrato_propostas` + `propostas`, somente leitura.
3. **Projetos** — leitura por `projetos.contrato_id`.
4. **Documentos** — placeholder honesto (próximas ondas).
5. **Timeline** — placeholder honesto (próximas ondas).
6. **Auditoria** — placeholder honesto (próximas ondas).

Ações contextuais no header: Voltar à lista, Abrir Cliente 360º, Cancelar
contrato (somente se permissão + não cancelado). Sem botões para Aditivo,
Assinatura real, Financeiro completo ou Enviar Engenharia (escopo futuro).

## Arquivos criados
- `supabase/migrations/<ts>_<hash>.sql` (rpc_contrato_cancelar)
- `src/routes/comercial.contratos.index.tsx`
- `src/routes/comercial.contratos.$contratoId.tsx`
- `src/components/app/contratos/CancelarContratoDialog.tsx`
- `docs/c-ent-5-contratos-workspace-relatorio.md` (este arquivo)

## Arquivos alterados
- `src/lib/repositories/contratos-supabase-repo.ts` — adicionados tipos
  `ContratoSupabaseListItem`, `PropostaDoContrato`, `ProjetoSupabase` e
  hooks `useContratosSupabase`, `useContratoSupabaseById`,
  `usePropostasDoContrato`, `useProjetosPorContrato`, `useProjetosPorCliente`,
  `useCancelarContratoSupabase`.
- `src/routes/comercial.clientes.$clienteId.tsx` — aba **Projetos**
  adicionada ao Cliente 360º + ação **Abrir contrato** na aba Contratos
  (link `/comercial/contratos/$contratoId`).

## Hooks criados
| Hook | Fonte | Uso |
|---|---|---|
| `useContratosSupabase` | `contratos` + enrich clientes/profiles/projetos | Listagem oficial |
| `useContratoSupabaseById` | `contratos` | Workspace |
| `useContratosPorCliente` | `contratos` por `cliente_id` | Cliente 360º (já existia) |
| `usePropostasDoContrato` | `contrato_propostas` + `propostas` | Aba Propostas origem |
| `useProjetosPorContrato` | `projetos` por `contrato_id` | Aba Projetos |
| `useProjetosPorCliente` | `projetos` por `cliente_id` | Cliente 360º |
| `useGerarContratoDePropostas` | RPC `rpc_contrato_gerar_de_propostas` | (já existia) |
| `useCancelarContratoSupabase` | RPC `rpc_contrato_cancelar` | Cancelamento oficial |

Invalida `["contratos-supabase"]`, `["contratos-supabase","id",id]`,
`["contratos","by-cliente"]`, `["cliente-360"]` após cancelamento.

## Estados de tela
Todas as telas tratam: loading (`Loader2`), erro (`isError + message`),
vazio (placeholder com ícone), acesso negado (`ShieldAlert`), não encontrado
(card de fallback com link de retorno).

## Integração com Cliente 360º
- Aba **Contratos**: já listava `useContratosPorCliente`. Adicionada ação
  "Abrir contrato" → `/comercial/contratos/$contratoId`.
- Aba **Projetos** (nova): lista `projetos` Supabase por `cliente_id` com
  contrato origem clicável.

## Riscos
- **Conflito visual** com lista legada `/comercial?tab=contratos` (LS):
  ainda coexistem; usuário pode ter dúvida sobre fonte oficial. Próxima
  onda deve consolidar.
- **`projetos_count` por contrato** consultado em segundo round-trip; com
  volume grande, considerar view materializada (próxima onda).
- **Cancelamento não reverte propostas/projetos** (regra oficial). Usuário
  deve entender que `contrato_propostas` permanece intacto.
- `useTabFromHash` já usado em outras telas; depende de hash `#tab=...`.

## Pendências
- Documentos do contrato (anexos universais — C-ENT.6).
- Timeline operacional unificada (eventos contrato/propostas/projetos).
- Aditivo, assinatura real e financeiro completo (ondas dedicadas).
- Migrar listagem legada `/comercial?tab=contratos` para usar Supabase
  como fonte oficial.

## Próxima onda recomendada
**C-ENT.6 — Documentos & Timeline do Contrato**: anexos universais via
`anexos` + view de timeline unificada (`audit_log` + `comercial_assinatura_eventos`).

## Proibições respeitadas
- Sem financeiro completo, aditivo ou assinatura real.
- Sem edição de proposta/projeto.
- Sem desfazer propostas contratadas.
- Sem remover store legado.
- Sem LS como fonte oficial.
