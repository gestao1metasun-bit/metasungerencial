# C-ENT.1.h — Cobertura LS de Clientes (Relatório Oficial)

Data: 2026-06-15
Onda: C-ENT.1.h (auditoria pura + guard-rails). NÃO remove `cliente-store.ts`.

## 1. Resumo executivo

- **Backend oficial**: `public.clientes` + RLS + RPCs (`rpc_cliente_buscar_similar`).
- **Repo oficial**: `src/lib/repositories/clientes-supabase-repo.ts`
  (`useClientesSupabase`, `useClienteSupabaseById`, `useConsultoresMap`,
  `criarClienteSupabase`, `atualizarClienteSupabase`, `clienteRowToRecord`).
- **Componentes oficiais**: `ClienteAutocompleteSupabase`,
  `ClienteCadastroSupabaseDialog`, `ClienteDuplicidadeAlert`,
  `Open360Button`.
- **Store legado**: `src/lib/clientes-store.ts` (`ms.clientes.full.v1`).
  Marcado com header **LEGADO** e constante exportada
  `CLIENTE_STORE_LEGADO` para varredura.

Maturidade da migração de clientes nesta onda: **~70%** (Comercial Enterprise
está cobertinho; Leads/Financeiro/Engenharia/PropostasPage ainda dependem do LS).

## 2. Classificação por uso

Legenda:
- **A** Já coberto por Supabase — pode ser migrado agora
- **B** Depende de migração futura (lógica acoplada ao LS)
- **C** Compat técnica temporária (write-through)
- **D** Seed/dev/teste

| Arquivo | Símbolo LS | Categoria | Notas |
|---|---|---|---|
| `src/lib/clientes-store.ts` | Origem | — | Marcado LEGADO. Mantido. |
| `src/lib/repositories/clientes-supabase-repo.ts` | `addClienteFull`, `updateClienteFull` | **C** | Write-through único e centralizado. Comentado como compat temporária. |
| `src/lib/repositories/clientes-backfill.ts` | `ClienteRecord` (tipo) | **C** | Usa tipo apenas. Backfill lê via `useClientesFull` (admin). |
| `src/routes/comercial.clientes.backfill.tsx` | `useClientesFull` | **C/D** | Página admin-only de backfill LS→Supabase (C-ENT.1.g). |
| `src/routes/comercial.clientes.index.tsx` | `ClienteRecord` (tipo) | **A** | Só typing. Já 100% Supabase. |
| `src/routes/comercial.tsx` (autocomplete L1688-1697) | — | **A** | Já lê `useClientesSupabase` + `clienteRowToRecord`. |
| `src/routes/comercial.tsx` (L1808) | `updateClienteFull` | **B** | Write-back de endereço no contrato. Migração requer `atualizarClienteSupabase` async dentro de fluxo síncrono. Próxima onda. |
| `src/routes/comercial.tsx` (L3523) | `findClienteByDoc` | **B** | Check síncrono de duplicidade pré-submit. Substituir por `rpc_cliente_buscar_similar` exige refactor para async. Próxima onda. |
| `src/routes/comercial.tsx` (`ClientePicker` L3343) | — | **A** | Já wrapper de `ClienteAutocompleteSupabase`. |
| `src/routes/comercial.tsx` (`NovoClienteDialog` L3362) | — | **A** | Wrapper de `ClienteCadastroSupabaseDialog`. |
| `src/components/app/comercial/ClienteAutocompleteSupabase.tsx` | `ClienteRecord` (tipo) | **C** | Compat tipo de retorno. |
| `src/components/app/comercial/ClienteCadastroSupabaseDialog.tsx` | `ClienteRecord` (tipo) | **C** | Compat tipo de retorno. |
| `src/modules/leads/LeadsPage.tsx` | `findClienteByDoc`, `addClienteFull`, `updateClienteFull`, `useClientesFull` | **B** | Acoplado a criação de cliente a partir de Lead. Onda **C-ENT.2 — Leads Supabase**. |
| `src/modules/financeiro/TitulosTab.tsx` | `useClientesFull`, `addClienteFull`, `DuplicateClienteError` | **B** | Cadastro de cliente embutido em fluxo de título. Onda **F-ENT.CLIENTES**. |
| `src/components/app/financeiro/AdiantamentosTab.tsx` | `useClientesAll` | **B** | Seletor simples. Onda **F-ENT.CLIENTES**. |
| `src/modules/propostas/PropostasPage.tsx` | `useClientesFull`, `addClienteFull` | **B** | Filtro + criação ad-hoc. Onda **Propostas Enterprise**. |
| `src/modules/propostas/components/PropostaList.tsx` | `findClienteByDoc` | **B** | Verificação sync de existência. Onda **Propostas Enterprise**. |
| `src/routes/engenharia.tsx` | `addCliente`, `useClientesAll` | **B** | Seletor + criação durante criação de obra. Onda **E-ENT.CLIENTES**. |
| `src/lib/dev-seed.ts` | `addClienteFull`, `ClienteRecord` | **D** | Seed de desenvolvimento. Não roda em produção. |
| `src/lib/repositories/cadastros-repo.ts` | Comentário | — | Apenas referência em comentário; sem import. |

### Totais

- **A (já coberto)**: 5 ocorrências em Comercial Enterprise (rota índice,
  autocomplete, picker, dialog novo, alerta).
- **B (depende de onda futura)**: 8 ocorrências (Leads, Financeiro x2,
  Engenharia, Propostas x2, Comercial x2 — write-back + dup sync).
- **C (compat técnica)**: 4 (write-through repo, backfill, tipos em
  componentes).
- **D (seed)**: 1 (`dev-seed`).

## 3. Mudanças aplicadas nesta onda (guard-rails)

- Header **LEGADO** + constante `CLIENTE_STORE_LEGADO` em
  `src/lib/clientes-store.ts` com roadmap explícito de remoção.
- Comentário `// LEGADO LS — pendente <onda>` adicionado nos 7 call-sites
  remanescentes:
  - `src/modules/leads/LeadsPage.tsx` → **C-ENT.2**
  - `src/modules/financeiro/TitulosTab.tsx` → **F-ENT.CLIENTES**
  - `src/components/app/financeiro/AdiantamentosTab.tsx` → **F-ENT.CLIENTES**
  - `src/routes/engenharia.tsx` → **E-ENT.CLIENTES**
  - `src/modules/propostas/PropostasPage.tsx` → Propostas Enterprise
  - `src/modules/propostas/components/PropostaList.tsx` → Propostas Enterprise
  - `src/routes/comercial.tsx` → write-back + dup sync (próxima sub-onda)
- Write-through LS centralizado em
  `src/lib/repositories/clientes-supabase-repo.ts` (linhas 250 e 295) — único
  ponto de gravação espelhada. Comentário de compat temporária mantido.

## 4. Fluxos validados (regressão zero esperada)

- `/comercial/clientes` lista oficial Supabase: **OK** (sem mudança).
- `/comercial/clientes/$clienteId` Workspace 360º: **OK** (sem mudança).
- `/comercial` NovoClienteDialog → Supabase: **OK** (sem mudança).
- `ClienteAutocompleteSupabase` busca Supabase: **OK** (sem mudança).
- Alerta de duplicidade (`rpc_cliente_buscar_similar`): **OK** (sem mudança).
- Backfill admin `/comercial/clientes/backfill`: **OK** (sem mudança).
- Fluxos legados (Leads, Financeiro, Engenharia, Propostas): **OK** —
  imports apenas ganharam comentário de aviso.

## 5. Imports LS removidos / restantes

- **Removidos**: 0 (decisão consciente — nenhuma migração agressiva nesta onda).
- **Restantes**: 9 imports diretos de `@/lib/clientes-store` (lista no §2).

## 6. Riscos

- **Médio**: `comercial.tsx#L3523` faz dup-check síncrono via LS. Se LS
  divergir do Supabase (cliente criado em outra sessão), pode permitir
  duplicidade. Mitigação atual: `criarClienteSupabase` ainda barra duplicidade
  no servidor via constraint/RPC.
- **Baixo**: `comercial.tsx#L1808` atualiza só LS no write-back de contrato.
  Endereço pode divergir entre LS e Supabase. Já existe `atualizarClienteSupabase`
  para migração direta na próxima sub-onda.
- **Baixo**: Leads/Financeiro/Engenharia ainda criam clientes só no LS. Esses
  registros não aparecem em `/comercial/clientes` até backfill admin rodar.
  Mitigado por `/comercial/clientes/backfill`.

## 7. Próximas ondas recomendadas

1. **C-ENT.2 — Leads Supabase** (alta prioridade, alto impacto comercial).
2. **Comercial write-back/dup-sync → async** (sub-onda C-ENT.1.i, baixo esforço).
3. **F-ENT.CLIENTES** — Financeiro (TitulosTab + AdiantamentosTab).
4. **E-ENT.CLIENTES** — Engenharia.
5. **Propostas Enterprise** — PropostasPage + PropostaList.
6. **Cut-off**: depois das 5 ondas acima, remover write-through, deletar
   `cliente-store.ts`, eliminar tipo `ClienteRecord` em favor de `ClienteRow`.

## 8. Proibições respeitadas

- ✅ `cliente-store.ts` NÃO removido.
- ✅ Write-through NÃO removido.
- ✅ Leads, Financeiro, Engenharia, Propostas NÃO migrados.
- ✅ Sem novo seletor duplicado.
- ✅ Build não quebrado (tipagem `app_permission` intacta).
