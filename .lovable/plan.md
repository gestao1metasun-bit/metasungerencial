
# D15.3 — Fechamento Supabase da UI Financeira

## Diagnóstico honesto

A UI financeira atual tem **~7.036 linhas** distribuídas em **30+ arquivos** que dependem de stores LocalStorage:

```text
src/routes/financeiro.tsx                       1018  (mock-data + financeiro-store LS)
src/routes/financeiro-titulos.tsx                673  (parcialmente Supabase)
src/modules/financeiro/TitulosTab.tsx           2284  (fin-titulos-store LS)
src/modules/financeiro/ConciliacaoTab.tsx        350  (fin-conciliacao-store LS)
src/modules/financeiro/FechamentoTab.tsx         258  (fin-fechamento-store LS)
src/modules/financeiro/CmvTab.tsx                457  (fin-titulos-store LS)
src/modules/financeiro/CadastrosTab.tsx          688  (LS cadastros — D15.4)
src/modules/financeiro/FornecedoresTab.tsx       164  (fin-fornecedores LS)
src/components/app/financeiro/FluxoCaixaRealTab.tsx  237  (fin-fluxo-caixa LS)
src/components/app/financeiro/AdiantamentosTab.tsx   355  (fin-adiantamentos LS)
src/components/app/financeiro/RescisoesTab.tsx       301  (fin-rescisao LS)
+ TituloRowActions, RenegociarTituloDialog, EdicaoRateioDialog, etc.
```

Refatorar tudo em um único turno é tecnicamente possível mas produziria um diff de >5.000 linhas com altíssimo risco de regressão silenciosa em produção assistida. A diretriz oficial do projeto (memória D15) é virada incremental sob flags `D15_*`.

Por isso D15.3 é executada em **4 subwaves D15.3.a .. D15.3.d**, cada uma autocontida, com flag e relatório próprio.

## D15.3.a — TitulosTab Supabase (esta entrega)

Escopo:
- Novo arquivo `src/modules/financeiro/TitulosTabSupabase.tsx` consumindo `useTitulosFinanceiros`, `useParcelasTitulo`, `useMovimentacoesTitulo`, `useReceberParcela`, `useCancelarTitulo`, `useLancamentos`, `useCriarLancamento`, `lancamentosRepo`, `lancamentos-repo`, `propostas-revisao-repo`, `cadastros-repo`. Sem nenhum import de `@/lib/fin-*-store` nem de `useRepoFinanceiro`.
- Flag `D15_TITULOS_SUPABASE` (default `true` em dev/preview, gateada por `useFlag` em produção) decide se a página `/financeiro` aba "Títulos" renderiza `TitulosTabSupabase` (novo) ou `TitulosTab` (legado). Permite rollback imediato sem revert.
- Falha de Supabase: nada de fallback silencioso. Erro vira toast + `errorLogRepo.log({ modulo: 'financeiro', tela: 'titulos', acao, severidade: 'error' })`.
- Preferências visuais permitidas em LS (mantidas): `ms.fin.titulos.colunas`, `ms.fin.titulos.filtros`, `ms.fin.titulos.larguras`, `ms.fin.titulos.abaAtiva`. Chaveadas com prefixo `ui.` para o `ls-guard` não bloquear.
- Modal "Receber parcela" já existente (`ReceberParcelaModal`) é reutilizado — já é 100% Supabase.
- Nova entrada de lançamento manual usa `useCriarLancamento` (RPC oficial). Sem gravação direta em `fin-titulos-store`.
- Documento `docs/d15-3-a-titulos-supabase.md` com chaves LS removidas, chaves LS mantidas (com motivo), validação manual e impacto.

Fora de escopo D15.3.a (vão em b/c/d):
- Adiantamentos (D15.3.b)
- Rescisões + Renegociações + Edição de rateio (D15.3.c)
- Conciliação + Fechamento + Fluxo de Caixa Real + CMV + Fornecedores (D15.3.d)
- `src/routes/financeiro.tsx` aba "Lançamentos" / "Mensal" / "Recorrentes" que ainda usam `financeiro-store` (D15.3.d) — esses são gerenciais sobre `v_lancamentos_derivados` e exigem virada cuidadosa.
- `CadastrosTab` financeiro (vai em D15.4 junto com cadastros gerais)

## Como o usuário valida D15.3.a

1. Abrir `/financeiro` → aba **Títulos** → confirma que listagem vem do Supabase (registros reais ou vazio se zerado).
2. Criar um lançamento manual a Pagar/Receber → confirma que aparece em `/paineis/financeiro` via `v_lancamentos_derivados`.
3. Executar **Purga LS** em `/paineis/saude-sistema` → aba Títulos continua funcional.
4. Em `/paineis/erros`, confirma que erros financeiros aparecem com `modulo='financeiro'`.

## Após D15.3.a

Relatório executivo + maturidade estimada (~97,8% → ~98,0%). Aprovação explícita do usuário antes de iniciar D15.3.b.
