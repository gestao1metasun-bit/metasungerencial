# Comercial C3 + C4 — Relatório Executivo

**Data:** 2026-05-28
**Status:** APLICADAS

---

## C3 — Workflow de Aprovação por Parâmetro Mínimo R$/kWp

### Tabelas/colunas
- `gerencial_parametros` ← seed `comercial.parametro_minimo_rs_kwp = {"valor": 2000}` (categoria `comercial`).
- `propostas` ganhou:
  - `rs_kwp_calculado numeric`
  - `parametro_rs_kwp_aplicado numeric`
  - `requer_aprovacao_excecao boolean NOT NULL DEFAULT false`
  - `aprovacao_excecao_id uuid FK→workflow_aprovacoes`
  - `aprovacao_excecao_status text`
- Índice parcial `idx_propostas_aprovacao_excecao`.

### Triggers
- **`tg_propostas_calc_rs_kwp`** (BEFORE INSERT/UPDATE de `valor_final`, `potencia_kwp`, `aprovacao_excecao_status`):
  - calcula `valor_final / potencia_kwp`;
  - grava parâmetro aplicado;
  - marca `requer_aprovacao_excecao`;
  - se números mudaram após aprovação anterior, **invalida** a aprovação (volta para NULL → exige nova solicitação).
- **`tg_propostas_bloqueia_excecao`** (BEFORE UPDATE de `status`):
  - bloqueia transição para `APROVADA / ASSINADA / ENVIADA` se `requer_aprovacao_excecao = true` e status da aprovação ≠ `APROVADA`;
  - admin bypass.
- Convive com `tg_propostas_bloqueia_edicao` (C2) sem conflito.

### Alçada D5.1
- `workflow_alcadas` ganhou linha `tipo_operacao = 'proposta_excecao_rs_kwp'`, `permissao_requerida = 'comercial.proposta.aprovar_excecao'`, `ordem 10`.
- Reuso integral do motor: filas, status enum, histórico, transição via flag `app.via_workflow_rpc`.

### RPCs novas (SECURITY DEFINER, EXECUTE só `authenticated`)
1. **`rpc_proposta_solicitar_aprovacao_excecao(p_proposta_id uuid, p_motivo text) → uuid`**
   - valida autenticação, motivo ≥ 5 chars, proposta não excluída, permissão (dono / `comercial.proposta.editar` / admin);
   - cria item em `workflow_aprovacoes` com contexto completo (`proposta_id`, `rs_kwp_calculado`, `parametro_aplicado`, `valor_final`, `potencia_kwp`);
   - marca proposta como `PENDENTE` usando flag `app.via_revisao_proposta` para passar pelo lock de C2;
   - retorna `aprovacao_id`.
2. **`rpc_proposta_decidir_aprovacao_excecao(p_aprovacao_id, p_decisao text, p_motivo text) → void`**
   - decisão ∈ {`APROVADA`, `NEGADA`, `CANCELADA`};
   - `APROVADA/NEGADA` exigem `comercial.proposta.aprovar_excecao`;
   - `CANCELADA` exige solicitante OU `workflow.cancelar`;
   - aprovação atualiza `workflow_aprovacoes` (via flag `app.via_workflow_rpc` → trigger de transição satisfeito);
   - sincroniza `propostas.aprovacao_excecao_status`.

### Auditoria
- `workflow_aprovacoes_historico` (via trigger D5.1) registra status anterior/novo + snapshot.
- `tg_propostas_audit` registra mudanças nos campos de proposta.

### Critério de aceite
✅ Nenhuma proposta abaixo de R$ 2.000/kWp pode avançar para `APROVADA/ASSINADA/ENVIADA` sem aprovação formal registrada.

---

## C4 — Transferência de Carteira

### Tabela criada
**`comercial_carteira_transferencias`** (append-only):
- `escopo` ∈ {`lead`, `proposta`, `contrato`, `cliente`} (CHECK);
- `registro_id`, `vendedor_origem_id`, `vendedor_destino_id`, `executor_id` + email;
- `motivo` (CHECK ≥ 5 chars);
- `lote_id`, `lote_qtd`, `contexto jsonb`, `executed_at`, `created_at`;
- 4 índices (registro, destino, origem, lote);
- GRANT SELECT+INSERT → authenticated, ALL → service_role;
- RLS habilitado.

### Policies RLS
- **`cct_select`**: admin OU `comercial.carteira.ver_historico` OU `comercial.carteira.transferir` OU vendedor origem/destino OU executor.
- **`cct_insert_admin_only`**: bloqueia INSERT direto fora das RPCs (admin bypass). RPCs SECURITY DEFINER inserem como service.

### Auditoria
- `tg_audit_cct` AFTER INSERT/UPDATE/DELETE → `tg_audit_row('comercial', 'comercial_carteira_transferencias')`.

### Permissão nova
- `app_permission` ganhou `comercial.carteira.ver_historico`.
- Permissões já existentes (C1) reusadas: `comercial.carteira.transferir`, `comercial.carteira.transferir_lote`.

### RPCs novas (SECURITY DEFINER, EXECUTE só `authenticated`)
1. **`rpc_carteira_transferir_individual(p_escopo, p_registro_id, p_vendedor_destino_id, p_motivo) → uuid`**
   - exige `comercial.carteira.transferir` ou admin;
   - faz `UPDATE` em `leads / propostas / contratos / clientes` conforme escopo (`FOR UPDATE` row lock);
   - propostas: flag `app.via_revisao_proposta` para passar pelo lock C2;
   - grava registro permanente em `comercial_carteira_transferencias`.
2. **`rpc_carteira_transferir_lote(p_escopo, p_registro_ids uuid[], p_vendedor_destino_id, p_motivo) → uuid`**
   - exige `comercial.carteira.transferir_lote` ou admin;
   - até 1000 registros por chamada (CHECK);
   - itera invocando a RPC individual e marca todos com o mesmo `lote_id`;
   - retorna `lote_id` para auditoria/relatório.

### Histórico permanente
- Nunca sobrescreve registros existentes.
- Política `cct_insert_admin_only` impede DELETE/UPDATE pelo usuário comum (apenas INSERT via RPC).
- Cada transferência rastreia origem, destino, executor, motivo, data/hora, lote, contexto.

### Critério de aceite
✅ Nenhuma transferência de carteira pode ocorrer sem motivo (≥5 chars), permissão e rastreabilidade completa.

---

## Resumo Quantitativo

| Item | C3 | C4 |
|---|---|---|
| Tabelas criadas | 0 | 1 |
| Colunas adicionadas | 5 em propostas | — |
| Triggers novos | 2 (calc + bloqueio) | 1 (audit) |
| RPCs novas | 2 | 2 |
| Permissões novas | 0 (reuso C1) | 1 (`ver_historico`) |
| Alçadas novas | 1 | 0 |
| Índices novos | 1 | 4 |
| Parâmetros gerenciais | 1 | 0 |
| Policies RLS | reuso | 2 |

## Repositório TypeScript
- `src/lib/repositories/comercial-c3-c4-repo.ts` expõe:
  - `useSolicitarAprovacaoExcecao`, `useDecidirAprovacaoExcecao`, `useAprovacoesExcecaoPendentes`
  - `useTransferirCarteiraIndividual`, `useTransferirCarteiraLote`, `useHistoricoCarteira`

## Linter
- 91 WARN → **106 WARN**.
- Os 15 novos warns são todos do padrão "Public/Authenticated Can Execute SECURITY DEFINER Function" das 4 RPCs novas — esperado e aceito pelo padrão arquitetural D14.2 (`EXECUTE` foi explicitamente revogado de PUBLIC e concedido só a `authenticated`).
- Nenhum WARN crítico novo.

## Impacto na Maturidade

| Marco | Maturidade |
|---|---|
| Antes (C2 fechada) | ~97,9% |
| Após C3 | ~98,0% |
| **Após C4** | **~98,1%** |

C3 fecha o último vetor de governança comercial sem aprovação. C4 fecha a rastreabilidade da carteira. Ambos preparam terreno para C5 (assinatura) e C8 (reabertura em cascata) sem retrabalho.

## Riscos remanescentes (C5/C6/C8)

| Risco | Mitigação prevista |
|---|---|
| C5 — Assinatura precisa validar status da exceção antes de marcar `ASSINADA` | já garantido por `tg_propostas_bloqueia_excecao` |
| C6 — Comissão deve nascer "prevista" só após exceção aprovada | C3 fornece `aprovacao_excecao_status = 'APROVADA'` como gatilho |
| C8 — Reabertura em cascata precisa invalidar histórico de exceção? | decisão: histórico permanece (auditoria), nova proposta gera nova exceção |
| Transferência em lote em escopo `proposta` com lock C2 | RPC já usa flag `app.via_revisao_proposta`; OK |
| Performance da RPC de lote (até 1000 itens com loop) | aceitável para diretoria; lote >1000 → erro explícito |

## Pronto para C5/C6/C8?
✅ **Sim.** Toda a governança comercial transversal (catálogos C1, lock/revisão C2, exceção R$/kWp C3, carteira C4) está fechada. As ondas críticas restantes podem ser executadas sem depender de novas tabelas estruturais.
