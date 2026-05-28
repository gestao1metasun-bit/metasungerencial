# D15.3.b — Adiantamentos 100% Supabase · Relatório Executivo

**Data:** 2026-05-28  
**Status:** APLICADO  
**Subwave:** 2/4 da D15.3 (UI Financeiro)  
**Maturidade:** ~98,0% → **~98,2%**

---

## 1. Objetivo

Eliminar a dependência operacional de LocalStorage do fluxo de Adiantamentos
(cliente e fornecedor) e fixar o Supabase como única fonte de verdade para
criação, abatimento, estorno e consulta histórica.

## 2. Entregas

### 2.1 Backend (1 migração)

| Item | Tipo | Origem |
| --- | --- | --- |
| `v_adiantamentos_enriquecido` | View `security_invoker=on` | Nova — junta nomes de cliente/fornecedor/conta + contagem de abatimentos |
| `rpc_adiantamento_estornar(_adiantamento_id, _motivo, _request_id)` | RPC `SECURITY DEFINER` | Nova — exige motivo ≥5 chars, bloqueia se houver abatimentos, audita via `fn_audit_lancamento` |

RPCs já existentes reutilizadas sem alteração:
- `rpc_adiantamento_registrar`  → criação
- `rpc_adiantamento_abater`     → abatimento contra parcela

`EXECUTE` revogado de `PUBLIC, anon`; concedido apenas a `authenticated`. Tabela
`adiantamentos` continua sob as policies de D15.1.a.0.i+ (permissões
`financeiro.visualizar` / `.movimentar` / `.editar`).

### 2.2 Repositório oficial

- **`src/lib/repositories/adiantamentos-repo.ts`** (novo)
  - `adiantamentosRepo.listar(tipo?)`
  - `adiantamentosRepo.listarParcelasCompativeis(ad)`
  - `adiantamentosRepo.registrar / abater / estornar`
  - Hooks: `useAdiantamentosSupabase`, `useParcelasCompativeis`,
    `useRegistrarAdiantamento`, `useAbaterAdiantamento`, `useEstornarAdiantamento`
  - Idempotência obrigatória (`request_id` via `idempotencia-repo`).
  - Invalida queries `adiantamentos`, `lancamentos`, `titulos`, `saude-sistema`.

### 2.3 Componente refatorado

- **`src/modules/financeiro/AdiantamentosTabSupabase.tsx`** (novo)
  - Lista, criação, abatimento, estorno — 100% via RPCs.
  - Combos de cliente/fornecedor/conta consomem `cadastros-repo` (Supabase).
  - Erro = `toast` + `errorLogRepo.log({ modulo:'financeiro', tela:'adiantamentos' })`.
  - Sem fallback silencioso.

### 2.4 Wiring

- `src/config/featureFlags.ts` — adicionada flag `D15_ADIANTAMENTOS_SUPABASE`
  (default **true**).
- `src/routes/financeiro.tsx` — aba **Adiantamentos** agora renderiza
  `AdiantamentosTabSupabase` quando a flag está ligada; legado
  `AdiantamentosTab` permanece intocado como rollback imediato.

## 3. LocalStorage — antes × depois

| Chave | Antes | Depois |
| --- | --- | --- |
| `ms.fin.adiantamentos.v1` | Lida e gravada como verdade operacional pelo `fin-adiantamentos-store` (`useAdiantamentos`, `registrar*`, `abater*`, `estornar*`). | **Não acessada** pela nova aba. O store legado só é tocado se a flag for desligada (rollback) ou pelo `fin-rescisao-store` (consumidor remanescente, fora do escopo D15.3.b — será coberto em D15.3.c). |
| `ui.fin.adiantamentos.v1` | — | **Mantida** (UI): `tipo` da aba ativa + texto do filtro. Permitida pelo `ls-guard` (prefixo `ui.`). |

Nenhuma chave LS operacional é lida ou gravada pela tela quando
`D15_ADIANTAMENTOS_SUPABASE=true`. A purga LS executada via
`/paineis/saude-sistema` permanece segura: o componente Supabase continua
operando normalmente após a purga (a chave `ms.fin.adiantamentos.v1` é
limpada, sem impacto, pois nada lê dela).

## 4. Compatibilidade & integrações preservadas

- **Auditoria:** toda transição grava em `audit_log` via
  `fn_audit_lancamento('financeiro','adiantamento',…)` e o trigger
  `tg_audit_adiantamentos`.
- **`row_version`:** mantido pelas RPCs/triggers existentes.
- **RLS:** `adiantamentos`, `adiantamento_abatimentos` e
  `v_adiantamentos_enriquecido` filtram por permissão/owner via
  `security_invoker`.
- **`error_log`:** falhas operacionais aparecem em `/paineis/erros`
  filtrando `modulo='financeiro'` e `tela='adiantamentos'`.
- **`fin-rescisao-store`:** segue funcionando — continua usando o store LS
  legado de adiantamentos. Será trocado em D15.3.c, sem regressão.

## 5. Critério de aceite

> "Nenhuma operação de adiantamento pode depender de LocalStorage para
> leitura ou gravação operacional."

✅ Atendido. Todas as operações da aba (listar, criar, abater, estornar,
buscar parcelas compatíveis) atravessam Supabase. Apenas preferências
visuais ficam em LS sob prefixo `ui.`.

## 6. Validação

1. `/financeiro` → aba **Adiantamentos** → dados vêm da view Supabase
   (lista vazia em ambiente atual, como esperado para homologação).
2. Criar adiantamento de cliente → grava via `rpc_adiantamento_registrar`,
   aparece na lista e em `v_lancamentos_derivados` (origem
   `ADIANTAMENTO`).
3. Abater contra parcela → cria `movimentacoes_financeiras` (tipo
   `BAIXA_ADIANTAMENTO`) e `adiantamento_abatimentos`; saldo da parcela
   e do adiantamento são atualizados pelo banco.
4. Estornar adiantamento sem abatimentos → status passa a `ESTORNADO`,
   motivo registrado.
5. Tentar estornar adiantamento com abatimentos → RPC rejeita com
   `adiantamento possui abatimentos`.
6. Executar **Purga LS legado** em `/paineis/saude-sistema` → aba
   continua 100% funcional.

## 7. Confirmação final

- **Adiantamentos UI ficou 100% Supabase?** ✅ Sim, sob flag default ligada.
- **Há gravação operacional fora do Supabase nesta aba?** Não.
- **LS residual?** Apenas `ui.fin.adiantamentos.v1` (preferências visuais).
- **Maturidade:** ~98,0% → **~98,2%**.

## 8. Próximo

- **D15.3.c — Rescisões / Renegociações / Edição de rateio.** Inclui o
  consumidor remanescente de `fin-adiantamentos-store` no
  `fin-rescisao-store`, que será trocado pelo repo Supabase oficial.

## 9. Arquivos

**Novos**
- `supabase/migrations/<timestamp>_d15_3_b_adiantamentos_supabase.sql`
- `src/lib/repositories/adiantamentos-repo.ts`
- `src/modules/financeiro/AdiantamentosTabSupabase.tsx`
- `docs/d15-3-b-adiantamentos-supabase.md`

**Editados**
- `src/config/featureFlags.ts` (+ flag `D15_ADIANTAMENTOS_SUPABASE`)
- `src/routes/financeiro.tsx` (switch na aba Adiantamentos)
