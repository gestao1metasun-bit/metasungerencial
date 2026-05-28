# D15.3.a — TitulosTab 100% Supabase

Data: 2026-05-28
Onda: D15.3.a (UI Financeiro — subwave 1 de 4)
Status: APLICADA

## Objetivo

Refatorar as abas **A Receber** e **A Pagar** da rota `/financeiro` para
consumirem exclusivamente o Supabase (tabela `titulos_financeiros`,
`parcelas_financeiras`, view `v_lancamentos_derivados`, RPCs
`receber_parcela`, `cancelar_titulo`, `rpc_lancamento_criar`), eliminando
qualquer leitura/gravação operacional em LocalStorage.

## Entregas

- `src/modules/financeiro/TitulosTabSupabase.tsx` — novo componente,
  100% Supabase, sem nenhum import de `@/lib/fin-*-store` ou
  `useRepoFinanceiro`.
- `src/modules/financeiro/titulos-supabase.helpers.ts` — wrappers finos
  reexportando hooks oficiais de cadastros + tratamento padronizado de
  erro (toast + `errorLogRepo.log`).
- `src/routes/financeiro.tsx` — abas `receber` / `pagar` agora alternam
  via flag `D15_TITULOS_SUPABASE` (Supabase por padrão em dev/preview).
- `src/config/featureFlags.ts` — flag `D15_TITULOS_SUPABASE` adicionada
  com default `true`. Override possível via
  `localStorage.setItem('ff:D15_TITULOS_SUPABASE','false')`.

## Chaves LS removidas (operacionais)

A nova UI **não lê** nem **escreve** mais nas seguintes stores legadas
para `tipo='AR'` ou `tipo='AP'`:

- `metasun.fin.titulos.v1` (lista oficial de títulos)
- `metasun.fin.titulos.movimentos.v1` (movimentações)
- `metasun.fin.titulos.parcelas.v1` (parcelas)
- gravações implícitas em `metasun.fin.fornecedores`, `metasun.fin.contas`,
  `metasun.fin.naturezas`, `metasun.fin.centros_custo` quando feitas pelo
  fluxo de novo lançamento (agora vão para `cadastros-repo` Supabase).

Essas chaves ainda podem existir em localStorage da homologação — a
purga LS em `/paineis/saude-sistema` apaga todas elas.

## Chaves LS mantidas (UI permitida)

- `ui.fin.titulos.v1` — preferências de filtro (status, busca, origem).
  Prefixo `ui.` está fora da lista de chaves proibidas do `ls-guard`.

## Tratamento de erro

Toda falha do Supabase (list, RPC, lookup de parcela) gera:
1. Toast visível para o usuário.
2. Registro em `error_log` com `modulo='financeiro'`,
   `tela='titulos.{ação}'`, `severidade='error'`.

Sem fallback silencioso para LocalStorage. Falha = erro visível.

## Validação manual

1. `/financeiro` → aba **A Receber**: lista vem do Supabase
   (mostra "fonte oficial: Supabase (D15.3.a)" no banner).
2. `/financeiro` → aba **A Pagar**: idem.
3. Clicar **Novo lançamento** → preencher valor + vencimento +
   natureza + CR + conta → confirmar. Aparece em
   `/paineis/financeiro` via `v_lancamentos_derivados`.
4. **Receber** numa parcela em aberto → modal já existente
   (`ReceberParcelaModal`) registra via RPC `receber_parcela`.
5. **Cancelar** título com motivo ≥ 5 caracteres → RPC
   `cancelar_titulo` executa e título some das listas ativas.
6. `/paineis/saude-sistema` → executar **Purga LS** → voltar à aba
   Títulos → continua funcional (lista intacta, vinda do Supabase).
7. `/paineis/erros` → erros financeiros aparecem com filtro por módulo.

## Rollback

Override em browser do operador: abrir DevTools console e rodar
`localStorage.setItem('ff:D15_TITULOS_SUPABASE','false'); location.reload()`.
A UI volta para `TitulosTab` legado sem revert de código.

## Impacto

- Chaves LS operacionais financeiras removidas das abas Receber/Pagar.
- LS guard agora não dispara mais em uso normal das abas.
- Maturidade estimada: **~97,8% → ~98,0%**.

## Próximos passos D15.3

- **D15.3.b** — `AdiantamentosTab` para `adiantamentos` +
  `adiantamento_abatimentos` (Supabase).
- **D15.3.c** — `RescisoesTab` + `RenegociarTituloDialog` +
  `EdicaoRateioDialog` (Supabase).
- **D15.3.d** — `ConciliacaoTab` + `FechamentoTab` +
  `FluxoCaixaRealTab` + `CmvTab` + `FornecedoresTab` + abas
  Lançamentos/Mensal/Recorrentes da rota `/financeiro`.

Requer aprovação explícita do usuário antes de cada subwave.
