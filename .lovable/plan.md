# D8.0 — Estrutura Financeira Enterprise

Fundação corporativa do Financeiro **antes** de expandir Analytics (D12). Estilo TOTVS RM / Sankhya / SAP — conceitual, não visual.

## Princípios não-negociáveis

1. **Nada é apagado.** Renegociação/cancelamento/estorno geram novos status e mantêm vínculo + trilha.
2. **Status nunca editável livre** — sempre consequência de RPC oficial com flag de sessão (mesmo padrão D4.1/D5.1).
3. **Toda alteração financeira passa por RPC auditada** — log obrigatório em `audit_log` + `titulos_financeiros_historico`.
4. **Permissão granular** (`financeiro.renegociar`, `financeiro.baixar`, `financeiro.estornar`, `financeiro.cancelar`, `financeiro.alterar_venc`, `financeiro.trocar_portador`, `financeiro.consolidar`) plugada no workflow D5.1 quando exceder alçada.
5. **D8.0 entrega FUNDAÇÃO** (schema + RPCs + status oficiais + auditoria). UI rica e Analytics ficam para D8.1+ e D12.

## Estado atual (o que já existe)

- `titulos_financeiros` — tem `conta_id`, `centro_id`, status [PENDENTE/PARCIAL/RECEBIDO/ATRASADO/CANCELADO/RENEGOCIADO]. **Falta**: portador, natureza FK, banco, SUBSTITUIDO/CONSOLIDADO/ESTORNADO/PAGO/VENCIDO, vínculo de renegociação.
- `contas_financeiras` — tem código/banco/agência/conta. **Falta**: portador estruturado, tipo (caixa/banco/cartão).
- `centros_resultado` — OK.
- `movimentacoes_financeiras` — OK, baixa só via aqui (D4.1 hardening).
- `parcelas_financeiras` — OK.
- `workflow_aprovacoes` (D5.1) — pronto para plugar alçadas financeiras.
- **Não existe**: `portadores`, `naturezas_financeiras` (existe só como texto em `dados`), `bancos` cadastrais, `plano_contas`, `titulos_renegociacao`, `titulos_financeiros_historico`.

## Sub-ondas D8.0

```text
D8.0.1  Cadastros estruturais (portadores, naturezas, bancos, plano_contas)
D8.0.2  Hardening de titulos_financeiros (FKs + status novos + colunas governança)
D8.0.3  Renegociação / Consolidação (tabelas + RPCs + state machine)
D8.0.4  Governança operacional (RPCs alterar_venc/trocar_portador/estornar/cancelar)
D8.0.5  Auditoria + permissões + integração workflow D5.1
```

Cada sub-onda = 1 migration aprovada antes da próxima. UI não muda em D8.0 (vem em D8.1).

---

### D8.0.1 — Cadastros estruturais

**Migration cria**:

- `bancos` (codigo FEBRABAN, nome, ispb, ativo)
- `portadores` (codigo, nome, tipo [BANCO/CAIXA/CARTAO/GATEWAY/OUTRO], banco_id FK, conta_financeira_id FK, ativo, dados jsonb)
- `naturezas_financeiras` (codigo, nome, tipo [RECEITA/DESPESA/AMBOS], grupo, subgrupo, classificacao_contabil, ativo) — replaces texto solto em `dados.natureza`
- `plano_contas` (codigo hierárquico tipo "3.1.01", nome, nivel, pai_id FK self, tipo, natureza_id FK opcional, ativo)
- Adicionar `tipo` em `contas_financeiras` (CAIXA/BANCO/CARTAO/INTERNA)

GRANT padrão (SELECT auth, ALL service_role + admin write via RLS).
Seed mínimo: 5 bancos comuns (BB/Itaú/Bradesco/Santander/Caixa) + naturezas básicas (Venda Solar, Comissão, Compra Material, Folha, etc).

---

### D8.0.2 — Hardening de `titulos_financeiros`

**Migration adiciona colunas**:

- `portador_id uuid FK portadores`
- `natureza_id uuid FK naturezas_financeiras` (mantém texto antigo durante migração)
- `banco_id uuid FK bancos` (denormalizado p/ relatório rápido)
- `plano_conta_id uuid FK plano_contas` (opcional, p/ DRE futuro)
- `renegociado_em_id uuid FK titulos_financeiros` (aponta p/ título novo quando este foi consumido)
- `origem_renegociacao_id uuid FK titulos_renegociacao` (quando este nasceu de renegociação)
- `pago_em timestamptz`, `estornado_em timestamptz`, `estornado_por uuid`, `consolidado_em_id uuid FK self`

**Status oficiais novos** (CHECK atualizado):
`PENDENTE / PARCIAL / RECEBIDO / PAGO / VENCIDO / RENEGOCIADO / SUBSTITUIDO / CONSOLIDADO / CANCELADO / ESTORNADO / ACORDO`

Backfill: ATRASADO → VENCIDO; RECEBIDO continua para receber, PAGO entra para pagar (trigger auto-status no recebimento total).

Trigger anti-edição livre de campos críticos (`status`, `valor_bruto`, `vencimento`, `portador_id`, `natureza_id`) — só permitido com flag `app.via_rpc_financeira='true'` (mesmo padrão D4.1/D5.1).

---

### D8.0.3 — Renegociação / Consolidação

**Tabelas novas**:

- `titulos_renegociacao` (id, tipo [RENEGOCIACAO/CONSOLIDACAO/ACORDO], titulo_novo_id FK, criado_por, criado_em, motivo NOT NULL, valor_original, valor_final, juros, multa, desconto, observacao, anexo_storage_path)
- `titulos_renegociacao_origens` (renegociacao_id FK, titulo_origem_id FK, valor_consumido) — N títulos antigos → 1 novo

**RPC `fin_renegociar_titulos(p_titulos uuid[], p_novo jsonb, p_motivo text, p_tipo text)`**:
1. Valida permissão `financeiro.renegociar` + workflow se exceder alçada.
2. Calcula valor consolidado + juros/multa/desconto.
3. Cria novo `titulos_financeiros` com portador/natureza/vencimento novos.
4. Marca títulos origem como `RENEGOCIADO` (1→1) ou `SUBSTITUIDO`/`CONSOLIDADO` (N→1).
5. Insere em `titulos_renegociacao` + `titulos_renegociacao_origens`.
6. `audit_log` com snapshot antes/depois.

**View `v_renegociacao_titulos`** — exibe trilha completa N↔N para Analytics.

---

### D8.0.4 — Governança operacional (RPCs)

Cada RPC seta flag de sessão, valida permissão, dispara workflow se necessário, grava histórico:

- `fin_alterar_vencimento(p_titulo, p_novo_venc, p_motivo)` → perm `financeiro.alterar_venc`
- `fin_trocar_portador(p_titulo, p_portador_novo, p_motivo)` → perm `financeiro.trocar_portador`
- `fin_estornar_baixa(p_movimentacao_id, p_motivo)` → reverte movimentação, recalcula saldo, status volta PARCIAL/PENDENTE, registra ESTORNADO se total
- `fin_cancelar_titulo(p_titulo, p_motivo)` → bloqueado se houver movimentação não estornada
- `fin_alterar_valor(p_titulo, p_novo_valor, p_motivo)` → sempre exige workflow (alta sensibilidade)

---

### D8.0.5 — Auditoria + permissões + workflow

- `titulos_financeiros_historico` (titulo_id, acao, status_anterior, status_novo, valor_anterior, valor_novo, campo, user_id, motivo, workflow_id, created_at) — populada por trigger em UPDATE controlado por flag.
- Novas permissões em `app_permission` enum: `financeiro.renegociar`, `financeiro.baixar`, `financeiro.estornar`, `financeiro.cancelar`, `financeiro.alterar_venc`, `financeiro.trocar_portador`, `financeiro.alterar_valor`, `financeiro.consolidar`.
- Alçadas D5.1 plugadas: renegociação > X → workflow; alterar_valor sempre workflow; estorno > Y → workflow.

---

## Não escopo D8.0 (vem depois)

- Conciliação bancária extrato-OFX (D8.1)
- Borderô / remessa CNAB / retorno (D8.2)
- PIX integração (D8.3)
- DRE gerencial + previsto×realizado (D8.4)
- UI rica de renegociação multi-seleção em grid (D8.1 — esta entrega só RPC)
- Analytics financeiro executivo (D12.2 — sobre base D8 madura)
- Integração contábil real (estrutura preparada, sem export ainda)

## Critério de aceite D8.0

- [ ] 5 migrations aplicadas em sequência, cada uma aprovada
- [ ] `titulos_financeiros` tem portador/natureza/banco como FK reais
- [ ] Status oficial = 11 valores listados, validado por CHECK
- [ ] Renegociação N→1 cria vínculo rastreável e nada é apagado
- [ ] Toda alteração financeira sensível exige RPC + flag de sessão
- [ ] Auditoria grava antes/depois com workflow_id quando aplicável
- [ ] Permissões granulares ativas; workflow D5.1 pluga onde excede alçada
- [ ] UI atual de `/financeiro-titulos` continua funcionando (backfill garante)
- [ ] Nenhum dado existente perdido

## Plano de execução

Vou começar pela **D8.0.1 (cadastros estruturais)** como primeira migration. Confirma esta ordem ou prefere quebrar diferente?
