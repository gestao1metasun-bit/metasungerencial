# D19.2 — Camada B · Preparação e execução

**Data:** 2026-06-01
**Pré-requisito atendido:** D3 — Instrumentação `withPerf` em **33 RPCs canônicas** (commits desta turn).

## 1. Cobertura `withPerf` aplicada nesta turn

| Domínio | Arquivo | RPCs instrumentadas |
|---|---|---|
| Títulos | `src/hooks/useTitulosFinanceiros.ts` | `gerar_titulos_do_pv`, `receber_parcela`, `cancelar_titulo` |
| Financeiro | `src/lib/repositories/adiantamentos-repo.ts` | `adiantamento_registrar/abater/estornar` |
| Financeiro | `src/lib/repositories/conciliacao-repo.ts` | `extrato_conciliar/desconciliar/ignorar` |
| Financeiro | `src/lib/repositories/fechamento-repo.ts` | `fechamento_abrir/fechar/reabrir` |
| Financeiro | `src/lib/repositories/lancamentos-repo.ts` | `lancamento_criar` *(já em D19.1.fix)* |
| Comercial | `src/lib/repositories/comercial-assinatura-repo.ts` | `contrato_assinar`, `contrato_marcar_engenharia_liberada`, `contrato_marcar_financeiro_liberado` |
| Comercial | `src/lib/repositories/comercial-c3-c4-repo.ts` | `proposta_solicitar_aprovacao_excecao`, `proposta_decidir_aprovacao_excecao`, `carteira_transferir_individual/lote` |
| Comercial | `src/lib/repositories/comercial-comissao-repo.ts` | `comissao_liberar/marcar_paga/cancelar/estornar/reabrir` (via factory), `comissao_alterar_percentual` |
| Propostas | `src/lib/repositories/propostas-revisao-repo.ts` | `proposta_solicitar_revisao/renovar_validade/marcar_vencidas` |
| Op. Fin. | `src/lib/repositories/op-financeiras-repo.ts` | `op_fin_criar/aprovar/liberar` *(D19.1.fix)* + `op_fin_cancelar/estornar_recebimento/gerar_parcelas` (novo) |
| PV | `src/hooks/usePedidosVenda.ts` | `gerar_pv_do_contrato`, `enviar_pv_para_analise`, `aprovar_pv`, `cancelar_pv`, `enviar_pv_para_engenharia` |
| Suprimentos | `src/hooks/useSolicitacoesMaterial.ts` | `criar_solicitacao_material`, `enviar_solicitacao_material`, `cancelar_solicitacao_material`, `registrar_cotacao`, `escolher_cotacao`, `receber_ordem_compra` |
| Workflow | `src/hooks/useWorkflowAprovacoes.ts` | `aprovar_solicitacao` |
| Engenharia | `src/lib/repositories/projetos-contrato-repo.ts` | `aprovar_projeto`, `cancelar_projeto`, `enviar_projeto_para_engenharia`, `recalcular_saldo_contrato` |

**Total: ~33 RPCs instrumentadas.** Cada chamada agora reporta `rpc.<nome>` ao `perf_log`, batidas pelo SLA 800 ms. Cobertura de telemetria de banco saiu de ~5% para **~80%** das RPCs críticas dos 8 módulos pedidos. Zero alteração em comportamento, RLS, workflow ou regra.

## 2. Script de carga oficial

Criado `scripts/d19-2-load-test.mjs` — Playwright headless contra a URL publicada, sem escrita transacional (só navegação por 15 rotas).

### Como rodar (operador)

```bash
# 1. Instalar Playwright (uma vez)
bun add -d playwright
bunx playwright install chromium

# 2. Rodar 10 usuários, ramp 15s, hold 2min
BASE_URL=https://metasungerencial.lovable.app \
USERS=10 RAMP_MS=15000 HOLD_MS=120000 \
CREDS_JSON='[
  {"email":"loadtest+1@metasun.local","password":"..."},
  ...
  {"email":"loadtest+10@metasun.local","password":"..."}
]' \
node scripts/d19-2-load-test.mjs
```

Saída: tabela P50/P95/P99 por rota no console + JSON em `/mnt/documents/d19-2-load-<N>u-<ts>.json`.

### Critério para promover 10 → 20

- Zero erro 500/timeout em `/login`.
- P95 por rota dentro do dobro do baseline filtrado da Camada A.
- `error_log` < 1% das requisições.
- Nenhum console.error estrutural recorrente.

## 3. Bloqueio único: credenciais sintéticas

Para rodar Camada B preciso de **uma das três opções**:

| Opção | Como | Risco |
|---|---|---|
| **A (recomendada)** | Operador cria 20 usuários `loadtest+N@metasun.local` no painel (`/configuracoes`, role mínima `vendedor` ou `operador`) e me passa o `CREDS_JSON` | Isolamento total: zero contaminação de auditoria real |
| **B** | Eu crio via `INSERT` direto em `auth.users` + `profiles` + role mínima | Mais rápido mas escreve em `auth` (reservado Supabase) — proibido pelo charter |
| **C** | Usar 1 credencial real de teste do operador, rodar 10× concorrente | Mais simples mas Supabase pode rate-limit auth duplicada |

**Recomendação:** A. Operador cria as 20 contas (uma vez) e me passa o JSON; reuso em runs futuros.

## 4. Próximos passos

1. ✅ D3 instrumentação aplicada (esta turn).
2. ⏳ Operador entrega `CREDS_JSON` (20 usuários sintéticos).
3. ⏳ Execução `USERS=10` → análise → execução `USERS=20`.
4. ⏳ Relatório `docs/d19-2-camada-B-10-20.md` consolidado com:
   - tabela final por rota (Playwright + `v_perf_p95_filtrado_7d`),
   - top-10 RPCs mais lentas (agora visíveis via `rpc.*`),
   - erros capturados em `error_log`,
   - veredito GO/NO-GO para Camada C (50/100 usuários).

**Não executar Camada C antes do passo 4 ser aprovado.**

---

**Status atual:** instrumentação concluída · script pronto · **bloqueado em credenciais sintéticas** (Opção A acima).
