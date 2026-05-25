
# Prioridade 2 — Persistência real do funil comercial

## Diagnóstico antes do plano

Investiguei o estado atual dos stores:

- `src/modules/leads/store.ts` (209 linhas) — 100% localStorage (`ms.leads.v1`).
- `src/modules/propostas/store.ts` (1.155 linhas) — 100% localStorage. Carrega cidades, concessionárias, módulos, inversores, distribuidores, parâmetros, custos, propostas, tarifas, histórico. As propostas vivem em `ms.fv.propostas.v1` junto com helpers pesados de cálculo síncronos.
- `src/lib/contratos-store.ts` (1.104 linhas) — também 100% localStorage. `criarContratoPendenteDeProposta` é chamado por `PropostaList.tsx` no fluxo "Aprovar e gerar contrato".
- `src/lib/clientes-store.ts` (136 linhas) — também 100% localStorage, apesar da tabela `clientes` já existir no Supabase.
- Tabelas Supabase **já existentes** com RLS por `consultor_id`: `clientes`, `contratos`, `projetos`, `obras`, `aditivos`. **Não existe** tabela `leads` nem `propostas`.

Conclusão: o "funil comercial" inteiro (Lead → Proposta → Contrato → Cliente) hoje vive em `localStorage`. As tabelas Supabase de Contratos/Clientes existem mas **não são lidas/escritas em lugar nenhum** — são órfãs.

## Escopo desta fase (o que ENTRA)

Persistir o trecho mínimo do funil que desbloqueia o Cenário 1:

1. Criar tabela `leads` no Supabase (com RLS por consultor).
2. Criar tabela `propostas` no Supabase com colunas operacionais + `dados jsonb` para o snapshot técnico/comercial pesado (1.155 linhas de tipos não cabem em colunas individuais sem refactor de meses).
3. Substituir backend de `leads/store.ts` e da fatia de **propostas** dentro de `propostas/store.ts` por um repositório Supabase, mantendo a mesma API (`useLeads`, `usePropostas`, `criarLead`, `upsertProposta`, etc.) para não tocar nos ~30 consumidores.
4. Os outros stores dentro de `propostas/store.ts` (cidades, módulos, inversores, custos, tarifas, parâmetros, distribuidores) **continuam locais** — são catálogo/configuração, não funil, e fogem do escopo declarado.
5. Validar que `aprovarPropostaDoLead` + `criarContratoPendenteDeProposta` continuam funcionando — mas **contratos seguem em localStorage** (1.104 linhas, fora do escopo "Lead/Proposta" pedido).

## Escopo fora desta fase (NÃO entra)

- Migração de `contratos-store.ts` para Supabase (precisa ser sua próxima frente).
- Migração de `clientes-store.ts` (já tem tabela mas não está sendo usada).
- Catálogos da proposta (módulos/inversores/custos/cidades/tarifas).
- Onda 4 financeira, estoque, engenharia, analytics.

Implicação operacional importante: como contratos ainda vivem em localStorage, o **contrato gerado pela aprovação não persistirá entre sessões** mesmo depois desta fase. Apenas o Lead e a Proposta sobreviverão. Para o Cenário 1 ser 100% ponta a ponta entre sessões, contratos precisarão de uma Prioridade 3.

## Arquitetura

```text
UI (LeadsPage, PropostaList, etc.)
        │  imports inalterados
        ▼
src/modules/leads/store.ts                 src/modules/propostas/store.ts
  useLeads / criarLead / ...                  usePropostas / upsertProposta / ...
        │                                                 │
        ▼                                                 ▼
src/lib/repositories/leads-repo.ts        src/lib/repositories/propostas-repo.ts
  hydrate(): Promise<Lead[]>                hydrate(): Promise<PropostaFV[]>
  insert / update / patch                   insert / update / patch
        │                                                 │
        └─────────► supabase.from("leads") / .from("propostas")
                    (browser client, RLS aplica como o usuário logado)
```

Padrão: **cache síncrono em memória** (mantém `useSyncExternalStore` e os helpers de cálculo síncronos funcionando) + **hidratação assíncrona** no primeiro acesso via `supabase.auth.onAuthStateChange` + **write-through assíncrono** após cada mutação. `localStorage` deixa de ser fonte oficial; passa a ser apenas fallback de leitura inicial enquanto a hidratação termina (evita flash de tela vazia).

## Etapas de execução

1. **Migração SQL** (`supabase--migration`):
   - Tabela `public.leads`: campos do tipo `Lead` mapeados para colunas tipadas + `dados jsonb` para extras + `consultor_id`, `cliente_id`, `created_at`, `updated_at`, `deleted_at`.
   - Tabela `public.propostas`: colunas operacionais (`numero`, `status`, `cliente_id`, `consultor_id`, `lead_id`, `valor_final`, `contrato_id`, datas, `versao`) + `dados jsonb` com a `PropostaFV` completa.
   - Índices em `(consultor_id, status)`, `(lead_id)`, `(cliente_id)`.
   - RLS espelhando o padrão existente: `select/insert/update` se `consultor_id = auth.uid() OR is_admin(auth.uid())`, `delete` só admin.
   - Triggers `tg_set_updated_at_generic` em ambas as tabelas.

2. **Repositórios novos**:
   - `src/lib/repositories/leads-repo.ts` — `listAll()`, `insert(row)`, `updatePatch(id, patch)`, mapeadores Lead ↔ row.
   - `src/lib/repositories/propostas-repo.ts` — idem, com serialização `PropostaFV` → colunas + `dados`.

3. **Refactor dos stores existentes** (mantendo a API pública):
   - `src/modules/leads/store.ts`: `read()` continua síncrono retornando cache; adicionar `hydrateFromSupabase()` chamado no boot; `criarLead`/`setLeadStatus`/`atualizarLead`/`trocarOrigemLead`/`trocarConsultorLead` viram async (com versão síncrona otimista que atualiza cache imediatamente e dispara `await` ao Supabase em background; em caso de erro, reverte cache e dispara toast).
   - Fatia de propostas em `src/modules/propostas/store.ts`: substituir `propsS = makeStore(...)` por uma variante "supabase-backed" do `makeStore`, deixando os outros catálogos intactos.

4. **Boot/hidratação**:
   - Adicionar listener `onAuthStateChange` em `src/components/app/AppLayout.tsx` (ou hook dedicado `useFunnelHydration`) que chama `hydrateLeads()` + `hydratePropostas()` quando há sessão e limpa o cache no logout.

5. **Validação manual**:
   - Criar lead → refresh → lead persiste.
   - Criar proposta → refresh → proposta persiste.
   - Aprovar proposta → contrato é gerado (em localStorage por ora) e proposta muda status no Supabase.
   - Login com outro consultor → não vê leads/propostas do primeiro.
   - Admin → vê tudo.

6. **Relatório final** com:
   - Tabelas criadas e RLS aplicada.
   - Stores migradas vs. ainda em localStorage.
   - Resultado dos testes de permissão.
   - Status do build.
   - Recomendação sobre Cenário 1 (vai precisar de Prioridade 3 para contratos antes de teste ponta a ponta completo).

## Riscos / decisões a confirmar

- **Contratos seguem em localStorage** nesta fase. Você confirmou que o foco é "Lead + Proposta". Mantenho assim, mas o Cenário 1 ainda terá uma quebra na etapa de Contrato/Assinatura entre sessões.
- **Otimismo nas mutações**: vou aplicar otimismo (cache primeiro, Supabase em background) para não introduzir latência perceptível nem refatorar 30+ call sites. Se uma escrita falhar (ex.: RLS rejeitou), reverto e mostro toast. Alternativa seria tornar todas as APIs assíncronas — refactor grande, mais lento, fora do escopo desta sessão.
- **`PropostaFV` em `jsonb`**: aceita evolução de schema sem migração, mas perde filtros SQL tipados. Adequado para esta fase; depois pode-se promover campos quentes para colunas.

## Próximo passo após aprovação

Executar a migração SQL como primeiro passo (precisa da sua aprovação no diálogo da migração) e seguir com os repositórios e refactor de stores na mesma sessão.
