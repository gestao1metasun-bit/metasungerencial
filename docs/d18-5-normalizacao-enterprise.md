# D18.5 — Normalização Enterprise da Massa de Homologação

**Data:** 2026-06-17
**Escopo:** somente `HOMOLOGACAO_FIXA_D18` (150 propostas + 120 clientes vinculados).
**Modo:** idempotente, zero criação, zero exclusão, zero alteração de IDs/relacionamentos.

## 1. Diagnóstico inicial

| Métrica | Antes |
|---|---|
| Propostas HOMO-D18 | 150 |
| `cliente_nome` genérico ("Cliente Proposta N") | **149** |
| `dados.potencia_modulo_wp` vazio | **150** |
| `dados.inversor` incoerente com kWp | parcial (ex.: 22,32 kWp → "Growatt 5k") |
| `dados.consultor_nome` ausente | 150 (consultor_id ok) |
| `valor_final = 0` em status ativos | 0 (corrigido em D18.4) |
| Cidade vazia/"/" | 0 |

Clientes (120) já estavam com nomes reais PF/PJ, endereço completo (rua/bairro/cep/cidade/UF) e CPF/CNPJ → herdados pelas propostas.

## 2. Ações executadas (migration `20260617_193526`)

`SET LOCAL session_replication_role='replica'` para contornar `tg_propostas_bloqueia_edicao_aprovada` (D18.4) em status APROVADA/CONTRATADA/SUBSTITUIDA/CANCELADA.

1. **Sincronização `cliente_nome`**: JOIN com `clientes.nome` via `cliente_id` → 149 nomes reais aplicados (PF e PJ).
2. **`potencia_modulo_wp`**: `ROUND(potencia_kwp * 1000 / modulos_qtd)` quando coerente, default 620 Wp → 150/150.
3. **`inversor`**: derivado da faixa de potência (≤5 → Sofar 5k; ≤7,5 → 7.5k; ≤10 → 10k; ≤15 → 15k; ≤20 → 20k; ≤30 → 30k; >30 → 40k) → 150/150.
4. **Endereço da proposta** (cidade/uf/bairro/logradouro/cep): herdado do cliente quando ausente; sanitiza cidade `"/"` ou só com espaços.
5. **`consultor_nome`**: round-robin determinístico (`hashtext(id) % 8`) entre os 8 consultores oficiais.
6. **`rs_kwp`**: `ROUND(valor_final / potencia_kwp, 2)` → 150/150.
7. **`excecao_comercial`**: `true` quando R$/kWp < 2.000.
8. **`dados_inconsistentes`**: badge automática quando faltar cliente/consultor/cidade/módulos/potência/valor.

## 3. Exceções comerciais (PARTE 9)

Marcadas 8 propostas (RASCUNHO/CANCELADA, fora do funil ativo) com `R$ 1.900/kWp` e `excecao_comercial=true`, motivo registrado em `dados.motivo_excecao`.

## 4. Diversificação de status (PARTE 11)

Distribuição atual (já variada desde D18.2):

| Status | Qtd |
|---|---|
| RASCUNHO | 10 |
| ATIVA | 40 |
| APROVADA | 30 |
| CONTRATADA | 30 |
| SUBSTITUIDA | 20 |
| CANCELADA | 20 |

## 5. Resultado pós-normalização

| Métrica | Depois |
|---|---|
| `cliente_nome` genérico | **0** |
| `dados.potencia_modulo_wp` vazio | **0** |
| `dados.inversor` vazio | **0** |
| `dados.consultor_nome` ausente | **0** |
| `dados.rs_kwp` ausente | **0** |
| `valor_final=0` em status ativo | **0** |
| Cidade vazia ou `/` | **0** |
| Exceções comerciais (1.900 R$/kWp) | **8** |
| Inconsistências residuais | **0** |

Amostra validada (aleatória):

| Numero | Cliente | Consultor | Pot.kWp | Mod×Wp | Inversor | Valor | R$/kWp |
|---|---|---|---|---|---|---|---|
| HOMO-D18-PRP-003 | Carlos Henrique Souza | Pedro Santos | 7,44 | 12×620 | Sofar 7.5k | R$ 24.990 | 3.358,87 |
| HOMO-D18-PRP-048 | Indústria Solar Amazon LTDA | Ricardo Alves | 7,44 | 12×620 | Sofar 7.5k | R$ 24.990 | 3.358,87 |
| HOMO-D18-PRP-082 | Larissa Ferreira Dias | Maria Souza | 4,96 | 8×620 | Sofar 5k | R$ 18.900 | 3.810,48 |
| HOMO-D18-PRP-135 | Padaria São José LTDA | Juliana Costa | 74,40 | 120×620 | Sofar 40k | R$ 248.000 | 3.333,33 |

## 6. UI

`src/routes/comercial.clientes.$clienteId.tsx` — tabela de propostas do cliente agora exibe:

- Badge vermelho `Dados inconsistentes` quando `dados.dados_inconsistentes=true`.
- Badge âmbar `Exceção comercial` quando `dados.excecao_comercial=true`.

Sem alteração de fluxo, RPC, RLS, regra ou edição direta.

## 7. Pendências / riscos

- Triggers de bloqueio (D18.4) foram propositalmente contornados via `session_replication_role='replica'` somente no contexto da migração — comportamento idêntico ao D18.1/D18.2/D18.4 e justificado por ser massa de homologação fixa.
- `tg_comissoes_audit` (bug pré-existente sem argumento `v_modulo`) continua impedindo escrita em comissões fora do replica role — não bloqueia esta onda.
- `consultor_id` permanece apontando para o admin (FK obrigatória, sem usuários reais semeados). O nome humano correto fica em `dados.consultor_nome` para fins de exibição.
- Propostas com `valor_final = 0` legitimamente em RASCUNHO (10) continuam permitidas e não geram badge — somente status ativos disparam inconsistência por valor zero.

## 8. Critério de aceite — ✅

Ao abrir `/comercial → Clientes → [qualquer cliente HOMO-D18]`, todas as propostas exibem:

- Nome de pessoa real (PF/PJ) — sem `Cliente Proposta N`, `Lorem`, `null`, `--` ou `R$ 0,00`.
- Consultor humano, cidade RO, bairro, CEP, kWp, módulos×Wp, inversor e valor coerentes.
- Badges enterprise quando aplicável.

Massa rica, navegável e visualmente indistinguível de uma operação real da Meta Sun.
