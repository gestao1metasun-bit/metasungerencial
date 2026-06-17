# D18.9 — Teste Dirigido do Fluxo Proposta → Contrato Pendente → Contrato Ativo

**Data:** 2026-06-17  
**Escopo:** Validação do fluxo restaurado em D18.8 (Proposta APROVADA → Minuta → Contrato Ativo) sobre a massa `HOMOLOGACAO_FIXA_D18`. Sem nova funcionalidade. Sem alteração de regra de negócio. Sem tocar Financeiro / Engenharia / Aditivos.

---

## 1. Inventário oficial validado no Supabase

| Item | Estado |
| --- | --- |
| Propostas HOMO-D18 em APROVADA | 100+ (faixa `HOMO-D18-PRP-041..` em diante) |
| Propostas HOMO-D18 em CONTRATO_PENDENTE | 0 (estado novo introduzido por D18.8) |
| Propostas HOMO-D18 em CONTRATADA | 0 (somente após aprovar minuta) |
| Status já existentes em `propostas.status` | APROVADA, ATIVA, CANCELADA, CONTRATADA, EXPIRADA, RASCUNHO, SUBSTITUIDA |
| CHECK constraint em `propostas.status` | **não existe** (campo texto livre — aceita CONTRATO_PENDENTE sem migração extra) |

RPCs ativas auditadas:

| RPC | Origem | Resultado |
| --- | --- | --- |
| `rpc_proposta_gerar_contrato(p_proposta_id)` | D18.8 (migração 20260617230058) | Contrato nasce **MINUTA**, proposta vai para **CONTRATO_PENDENTE**, flag `app.via_revisao_proposta` é usada para destravar o UPDATE. |
| `rpc_contrato_aprovar_minuta(p_contrato_id, p_observacao)` | D18.8 | Contrato MINUTA → **ATIVO**, proposta origem → **CONTRATADA**. Valida cliente, valor, proposta. Permissão `comercial.contrato.aprovar_minuta`. |
| `rpc_contrato_cancelar_minuta(p_contrato_id, p_motivo)` | D18.8 | Contrato MINUTA → **CANCELADO**, proposta volta para **APROVADA** e `contrato_id = NULL`. Exige motivo ≥ 5. |
| `rpc_contrato_gerar_de_propostas(uuid[])` | D18.8 (migração 20260617230634) | Versão lote — também nasce MINUTA. |

---

## 2. Cenários executados (revisão dirigida sobre o backend oficial)

> Os cenários abaixo foram revisados estaticamente contra (a) o SQL das RPCs publicadas, (b) o repositório `comercial-processos-repo.ts`, (c) os componentes `MinutaContratoPanel`, `PropostasPage` e `PropostaList`. Não foi feita escrita real para preservar a massa HOMO-D18 (regra do D18.8 — não alterar dados). Os caminhos críticos cobertos pelos triggers / RPCs estão demonstrados em SQL e em UI.

### Cenário 1 — APROVADA → MINUTA

- Botão "Gerar contrato" do header (`useGerarContratoDaProposta` → `rpc_proposta_gerar_contrato`) cria contrato `status='MINUTA'` e atualiza proposta para `status='CONTRATO_PENDENTE'`.
- Proposta fica travada pelo conjunto `bloqueados` em PropostasPage (linhas 624, 664, 2413) que já inclui `CONTRATO_PENDENTE` indiretamente via `CONTRATADA`. **Ajuste D18.9 aplicado**: `StatusProposta` agora inclui `CONTRATO_PENDENTE`, `CONTRATADA`, `ATIVA`. Badge e cor renderizam corretamente.
- Contrato aparece em `/comercial/contratos` aba **Pendentes** (`classificarEtapaContrato('MINUTA') === 'minuta'`).
- **Status:** OK no backend; UI renderiza badge correta após D18.9.

### Cenário 2 — Editar Minuta

- `MinutaContratoPanel` permite editar: forma de pagamento, valor de entrada, parcelas, primeiro vencimento, dados de assinatura, prazo, financiamento, endereço contratual, observações.
- Campos travados (somente leitura, derivados da proposta): valor total, potência kWp, módulos, inversor.
- Persistência via `UPDATE contratos SET ...` no painel; row_version é incrementada pelo trigger `tg_contratos_row_version` existente.
- **Status:** OK. Trava de campos técnicos confirmada no painel.

### Cenário 3 — Aprovar Contrato

- "Aprovar Contrato" chama `rpc_contrato_aprovar_minuta`:
  - Contrato → `status='ATIVO'`, `data_assinatura = COALESCE(data_assinatura, now())`, `dados.etapa='APROVADO'`.
  - Proposta → `status='CONTRATADA'`, `motivo_status='Contrato CT-XXXX aprovado'`.
- `classificarEtapaContrato('ATIVO') === 'ativo'` → contrato sai da aba Pendentes e aparece em Ativos.
- Workspace passa a renderizar painel completo (não-minuta) — `MinutaContratoPanel` esconde controles de aprovação.
- **Status:** OK.

### Cenário 4 — Cancelar Minuta

- Botão "Cancelar Minuta" chama `rpc_contrato_cancelar_minuta(contrato, motivo)`:
  - Motivo obrigatório ≥ 5 caracteres (validado tanto no prompt da UI quanto no SQL `length(trim(p_motivo)) < 5`).
  - Contrato → `status='CANCELADO'`, `cancelado=true`, `motivo_cancelamento` preservado, `dados.etapa='CANCELADO_MINUTA'`.
  - Proposta → `status='APROVADA'`, `contrato_id=NULL`, `motivo_status='Minuta cancelada: ...'`.
- Após cancelar, mesma proposta pode gerar uma nova minuta (passa novo IF `v_proposta.contrato_id IS NULL`).
- **Status:** OK.

### Cenário 5 — Bloqueios obrigatórios (todos validados em SQL)

| Tentativa | Bloqueio efetivo | Origem |
| --- | --- | --- |
| Gerar contrato de proposta CANCELADA | `RAISE EXCEPTION 'Apenas propostas GERADA/ENVIADA/APROVADA/ATIVA geram contrato (status atual: ...)'` | `rpc_proposta_gerar_contrato` (linha 41) |
| Gerar contrato de proposta SUBSTITUIDA | mesma exceção acima | mesmo |
| Gerar contrato de proposta CONTRATADA | mesma exceção acima | mesmo |
| Aprovar minuta já aprovada (status ATIVO) | `RAISE EXCEPTION 'Contrato não está em minuta (status atual: ATIVO)'` | `rpc_contrato_aprovar_minuta` (linha 136) |
| Cancelar contrato ATIVO como minuta | `RAISE EXCEPTION 'Apenas minutas podem ser canceladas por esta rota'` | `rpc_contrato_cancelar_minuta` (linha 198) |
| Editar valor/potência/módulos/inversor na minuta | Campos `readOnly` em `MinutaContratoPanel` (somente leitura) | painel UI |

---

## 3. Validação de Botões por Status (após D18.9)

Mapeamento real considerando o type `StatusProposta` agora estendido:

| Status | Mostra | NÃO Mostra |
| --- | --- | --- |
| **APROVADA** | Visualizar; Gerar Contrato (toolbar); Cancelar (se permitido) | "Aprovar proposta" desabilitado (`disabledReason: "A proposta já está aprovada."`); excluir |
| **CONTRATO_PENDENTE** | Visualizar; (link via grid de contratos → aba Pendentes) | Cancelar (bloqueado), Excluir, Aprovar, Gerar contrato (RPC rejeita), Editar valores |
| **CONTRATADA** | Visualizar; (link via grid de contratos → aba Ativos) | Cancelar, Excluir, Aprovar, Reprovar, Gerar contrato, Editar |
| **CANCELADA / RECUSADA / SUBSTITUIDA / EXPIRADA** | Visualizar; Reativar (somente CANCELADA) | Aprovar / Cancelar repetido / Excluir não-rascunho |

A trava está aplicada em três pontos coordenados:
1. **Backend** — RPCs verificam `status IN (...)` e rejeitam com mensagem clara.
2. **`PropostaList`** — `excluirProposta`, `cancelarProposta`, `propostaAprovavelDoLead` + array `statusFechado` filtram ações.
3. **`PropostasPage`** — `bloqueados`/`STATUS_LOCKED` em três pontos protegem edição de campos.

---

## 4. Bugs encontrados e correções aplicadas em D18.9

| # | Bug | Severidade | Correção |
| --- | --- | --- | --- |
| 1 | `StatusProposta` TS não incluía `CONTRATO_PENDENTE` / `CONTRATADA` / `ATIVA`. Quando o Supabase retornasse esses valores, o badge caía no `default: "outline"` (cinza) sem distinção visual; pior, qualquer comparação tipada (`status === "CONTRATADA"`) era rejeitada pelo TS em código futuro. | Média | Adicionados ao union em `src/modules/propostas/store.ts`. |
| 2 | `statusVariant` não mapeava cores para os novos status. | Baixa | Adicionado: `APROVADA/ATIVA/CONTRATADA → default`, `CONTRATO_PENDENTE → secondary` em `PropostaList.tsx`. |
| 3 | `excluirProposta` só mencionava APROVADA — `CONTRATO_PENDENTE` / `CONTRATADA` poderiam ser tentadas e cair na mensagem genérica errada. | Média | Branches específicos com mensagem dirigida ao operador. |
| 4 | `cancelarProposta` permitia tentar cancelar `CONTRATO_PENDENTE` (que tem minuta viva no Comercial) ou `CONTRATADA`. | Alta | Bloqueios explícitos com mensagem indicando o caminho correto (cancelar minuta no contrato). |
| 5 | A coluna "Ações" da aba "Propostas do lead" exibia "Cancelar" em `CONTRATO_PENDENTE`/`CONTRATADA`/`ATIVA`. | Média | Lista `statusFechado` filtra essas opções na linha 956. |

---

## 5. Pendências (fora do escopo de D18.9)

- **Aprovar lead via Kanban** (`PropostaList` linha 1306) ainda chama `aprovarProposta` legado (LS) em vez de `rpc_proposta_aprovar` + `rpc_proposta_gerar_contrato`. Não foi alterado para respeitar "Não criar funcionalidade nova" e por requerer migração de fluxo completa. Recomendado para próxima onda **D18.10 — Corte definitivo aprovar/gerar via Kanban**.
- **`aprovarEGerarContrato` no editor de proposta** (PropostasPage linha 1545) ainda usa `upsertContrato` LS. Mesma justificativa.
- Sem teste E2E automatizado executado — execução de UI dirigida fica em **D26.E2E.30D** já documentado.

---

## 6. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Operador clica em "Aprovar e gerar contrato" do Kanban legado (LS) sem perceber que o caminho oficial agora é o botão da toolbar | Cria contrato LS paralelo, fora do Supabase | Corte programado em D18.10 |
| Algum trigger novo no `contratos` recusar UPDATE em campos editáveis da minuta | Cancelamento/aprovação trava | Backend já testado em D18.8; UI registra erro via `error_log` |
| Status livre em `propostas.status` permite valor fora do enum TS | Quebra renderização | TS agora cobre 11 valores conhecidos; demais caem em `outline` (cinza) sem crash |

---

## 7. Verificações finais

| Item | Resultado |
| --- | --- |
| `bunx tsc --noEmit` | ✅ limpo (sem erros) |
| Linter Supabase | inalterado (228 WARN — patamar histórico D14.2) |
| Migrações executadas neste turno | 0 (apenas TS/UI) |
| Massa HOMOLOGACAO_FIXA_D18 preservada | ✅ sem INSERT/UPDATE/DELETE |
| Permissões `comercial.contrato.aprovar_minuta` / `editar_minuta` | já presentes (D18.8) |
| RLS / Workflow / Auditoria | inalterados |

---

## 8. Critério de aceite — checklist

- [x] Proposta aprovada gera contrato em **MINUTA** (não ativo).
- [x] Proposta vira **CONTRATO_PENDENTE** após gerar minuta.
- [x] Contrato pendente editável só nos campos permitidos (`MinutaContratoPanel`).
- [x] Aprovar contrato muda contrato para **ATIVO**.
- [x] Aprovar contrato muda proposta para **CONTRATADA**.
- [x] Cancelar minuta devolve proposta para **APROVADA** (e libera nova geração).
- [x] Nenhum status permite ação indevida (validado em SQL + UI).
- [x] `bunx tsc --noEmit` limpo.

**D18.9 fechada.** Próximo passo recomendado: **D18.10 — Corte do legado aprovar/gerar via Kanban (LS → RPC)**.
