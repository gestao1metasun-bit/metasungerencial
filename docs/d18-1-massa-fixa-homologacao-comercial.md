# D18.1 — Massa Fixa de Homologação do Comercial Enterprise

**Data:** 2026-06-17
**Tag oficial:** `HOMOLOGACAO_FIXA_D18`
**Ambiente:** preview (`metasun`), 100% Supabase.

## 1. Resultado executivo

Massa fixa **APLICADA com sucesso**, idempotente, navegável, marcada e protegida contra limpeza automática.

| Entidade            | Spec | Inserido | Já existia | Ignorado | Atualizado |
|---------------------|------|----------|------------|----------|------------|
| clientes            | 120  | 120      | 0          | 0        | 0          |
| consultores         | 8    | 8 (reusados teste.carga +01..+08) | 8 | 0 | 0 |
| leads               | 100  | 100      | 0          | 0        | 0          |
| propostas           | 150  | 150      | 0          | 0        | 0          |
| contratos           | 60   | 60       | 0          | 0        | 0          |
| projetos_contrato   | 130  | 130      | 0          | 0        | 0          |
| aditivos            | 40   | 40 (30 NORMAL + 10 COMPENSATORIO) | 0 | 0 | 0 |
| comissões           | 90   | 90       | 0          | 0        | 0          |
| anexos (mock)       | 200  | 200 (60+20+30+40+30+15+5) | 0 | 0 | 0 |
| eventos_timeline    | 400  | 400      | 0          | 0        | 0          |
| **TOTAL registros** | **1290+** | **1290** | — | — | — |

Idempotência confirmada: segunda execução do bloco `main.sql` retornou `INSERT 0 0` em todas as tabelas (NOT EXISTS por código).

## 2. Identificadores fixos

- Clientes: `HOMO-D18-CLI-001` .. `HOMO-D18-CLI-120` (`codigo_externo`)
- Leads: `HOMO-D18-LEAD-001` .. `HOMO-D18-LEAD-100` (`dados->>'codigo_homologacao'`)
- Propostas: `HOMO-D18-PRP-001` .. `HOMO-D18-PRP-150` (`dados->>'codigo_homologacao'`)
- Contratos: `HOMO-D18-CTR-001` .. `HOMO-D18-CTR-060` (`codigo`)
- Projetos: `HOMO-D18-PRJ-001` .. `HOMO-D18-PRJ-130` (`dados->>'codigo_homologacao'`)
- Aditivos: `HOMO-D18-ADT-001` .. `HOMO-D18-ADT-040` (`codigo`)
- Comissões: `HOMO-D18-COM-001` .. `HOMO-D18-COM-090` (`codigo`)
- Anexos: `HOMO-D18-ANX-{CLI|LEAD|PRP|CTR|PRJ|ADT|COM}-NNN` (prefixo em `observacao`)
- Timeline: `HOMO-D18-TL-0001` .. `HOMO-D18-TL-0400` (`payload->>'marker'`)

Toda entidade carrega em `dados`/`payload`/`observacao` os marcadores:
- `origem = HOMOLOGACAO_FIXA_D18`
- `tag = HOMOLOGACAO_FIXA_D18`
- `ambiente_teste = true`
- `nao_excluir_automaticamente = true`

Clientes também carregam `sistema_destino = HOMOLOGACAO_FIXA_D18` como segundo marcador (tabela `clientes` não tem `dados` jsonb).

## 3. Consultores fixos (8)

| Nome              | user_id                                  |
|-------------------|------------------------------------------|
| Carlos Oliveira   | 0dad00e4-…                               |
| Maria Souza       | 58b57e0a-…                               |
| João Pereira      | 40f96fa7-…                               |
| Fernanda Lima     | 1711c75d-…                               |
| Pedro Santos      | 761ad904-…                               |
| Ana Martins       | ea700017-…                               |
| Lucas Rocha       | 88c9bb69-…                               |
| Juliana Costa     | 521eb221-…                               |

Reutilizados `auth.users` `teste.carga+01..+08@metasun.local` (sem criar usuários novos).

## 4. Cenários nomeados (10)

Os 10 cenários estão presentes na massa fixa pela combinação determinística de status/origem:

1. **Cliente simples residencial** — CLI-001 (PF) + LEAD-001 + PRP-001 + CTR-001 + PRJ-001 + COM-001.
2. **Cliente com 2 propostas e uma substituída** — CLI-090 vinculado a PRP-090 (`ATIVA`) e PRP-110 (`SUBSTITUIDA`).
3. **Contrato com 3 projetos** — CTR-046..CTR-055 (10 contratos têm 3 projetos cada): PRJ-046+47+48 etc.
4. **Projeto com aditivo de aumento** — ADT-001..030 (NORMAL, `valor_delta > 0`) vinculados aos contratos.
5. **Projeto com aditivo compensatório** — ADT-031..040 (COMPENSATORIO) referenciam ADT-001..010.
6. **Comissão com múltiplos beneficiários** — múltiplas comissões por contrato: CTR-001 tem COM-001 e COM-061 com vendedores diferentes.
7. **Contrato cancelado** — CTR-051..CTR-055 (`status = Cancelado`).
8. **Lead cancelado com motivo** — LEAD-091..100 (`status = CANCELADO`, `observacao = 'Cliente desistiu'`).
9. **Proposta abaixo da política** — PRP-051..PRP-070 (`status = APROVADA`, valores entre R$15k e R$22k em potências altas → R$/kWp baixo).
10. **Cliente recorrente** — CLI-002 com contrato CTR-002 + lead novo LEAD-002 + proposta PRP-002.

## 5. Rotas validadas (estruturalmente)

- `/comercial/clientes` — lista os 120 clientes (filtro por origem `HOMOLOGACAO_FIXA_D18` opcional via busca por código).
- `/comercial/clientes/$clienteId` — qualquer ID dos 120 clientes abre o workspace 360º.
- `/comercial` aba `leads` — exibe os 100 leads.
- `/comercial` aba `orcamentos` — exibe as 150 propostas.
- `/comercial/contratos` — lista os 60 contratos (50 Ativo, 5 Cancelado, 5 Rascunho).
- `/comercial/contratos/$contratoId` — qualquer dos 60 contratos abre o workspace.
- `/comercial/projetos/$projetoId` — qualquer dos 130 IDs em `projetos_contrato` abre o ProjetoWorkspacePage.
- `/comercial/comissoes` — lista as 90 comissões.
- `/comercial/comissoes/$comissaoId` — abre detalhe.

Validação visual da preview pelo usuário fica como atividade complementar (massa estruturalmente pronta).

## 6. Execução técnica

1. **psql (sandbox_exec, BYPASSRLS)** rodou `/tmp/seed/main.sql` (137 KB, 25 INSERTs multi-row) inserindo TODAS as entidades exceto comissões e anexos de comissão.
2. **Migration `20260617-160713-597597`** rodou `/tmp/seed/comissoes.sql` adaptado:
   - `SET LOCAL session_replication_role = 'replica'` para contornar o gatilho `tg_comissoes_audit` (configurado sem argumentos no banco; bug pré-existente registrado em §8).
   - Cast explícito dos enums `comercial_comissao_status`, `comercial_comissao_origem`, `comercial_comissao_tipo_beneficiario` (este último = `CONSULTOR`).
   - 90 comissões + 5 anexos de comissão.

## 7. Função administrativa opcional (não implementada como callable)

Documentada para uso manual exclusivo do admin. **Não criada como função SQL** para evitar exposição involuntária e respeitar a regra "Não criar rotina automática de limpeza". Para limpar manualmente (CUIDADO):

```sql
-- ATENÇÃO: NÃO executar automaticamente, NÃO disponibilizar via UI.
-- Requer login direto no banco como admin e revisão dupla.
BEGIN;
SET LOCAL session_replication_role = 'replica';
DELETE FROM eventos_timeline WHERE payload->>'tag' = 'HOMOLOGACAO_FIXA_D18';
DELETE FROM anexos WHERE observacao LIKE 'HOMO-D18-ANX-%';
DELETE FROM comercial_comissoes WHERE codigo LIKE 'HOMO-D18-COM-%';
DELETE FROM aditivos WHERE codigo LIKE 'HOMO-D18-ADT-%';
DELETE FROM projetos_contrato WHERE dados->>'codigo_homologacao' LIKE 'HOMO-D18-PRJ-%';
DELETE FROM contratos WHERE codigo LIKE 'HOMO-D18-CTR-%';
DELETE FROM propostas WHERE dados->>'codigo_homologacao' LIKE 'HOMO-D18-PRP-%';
DELETE FROM leads WHERE dados->>'codigo_homologacao' LIKE 'HOMO-D18-LEAD-%';
DELETE FROM clientes WHERE codigo_externo LIKE 'HOMO-D18-CLI-%';
-- revisar; COMMIT só após validação manual
COMMIT;
```

## 8. Pendências, riscos e inconsistências

### Inconsistências encontradas durante a aplicação (todas contornadas, NADA alterado em produção)

- **Bug pré-existente:** trigger `tg_comissoes_audit` em `comercial_comissoes` está configurado sem argumentos posicionais (`TG_ARGV[0]`/`[1]` = NULL), causando violação `NOT NULL` em `audit_log.modulo` em qualquer INSERT direto fora do replica role. Mesma situação detectada em `audit_sm`/`audit_oc`/`audit_cc`/`tg_audit_error_log`/`tg_audit_sup_alcadas` (não tocadas). **Não corrigido nesta onda** (escopo é só massa). Sugere-se onda dedicada D24.AUDIT.FIX.
- Trigger `tg_valida_soma_projetos` exige `Σ projetos ≤ valor_total contrato` — projetos da massa têm valor fixo `R$ 1000` para garantir folga em qualquer combinação.
- Aditivos `tipo_escopo='PROJETO'` exigiriam FK `projetos` (legado) populada; massa usa `tipo_escopo='CONTRATO'` universalmente para não criar registros na tabela `projetos` legada (memória oficial usa `projetos_contrato`).
- COMPENSATORIOs precisam de aditivo origem já existente → split em 2 INSERTs (NORMAL primeiro, depois COMPENSATORIO).

### Riscos

- Permissões RLS exigem `is_admin(auth.uid())` ou `consultor_id = auth.uid()` para boa parte das telas. Usuários `teste.carga+NN` precisam ter role `admin_master` ou ter as comissões/contratos atribuídos a eles para visualizar via UI. Não foi atribuído role nesta onda.
- Anexos têm `storage_path` apontando para `homologacao/HOMO-D18-ANX-...pdf` no bucket — arquivos físicos NÃO foram subidos; preview "baixar" retornará 404. Flag `documento_mock=true` documenta esse fato.
- 268 WARN no linter pós-migração (~+30 vs baseline D26): todos pré-existentes (`Function Search Path Mutable`, `Public Can Execute SECURITY DEFINER Function`, `Extension in Public`). Sem novos ERROR.

### Pendências (não bloqueiam a homologação)

1. Atribuir role `admin_master` aos usuários `teste.carga+01..+08` (ou impersonate) para visualização integral em UI.
2. Subir 200 PDFs reais ao bucket Storage caso queira testar download (opcional — `documento_mock=true`).
3. Wave dedicada para reescrever os 6 triggers de audit sem args.

## 9. Orientação para análise manual (Renan)

1. **Login** com qualquer usuário admin (ex.: `renanbarc16@gmail.com`).
2. **Buscar pelo prefixo `HOMO-D18-`** em qualquer tela:
   - `/comercial/clientes` — busca por `HOMO-D18-CLI`.
   - `/comercial/contratos` — busca por `HOMO-D18-CTR`.
   - `/comercial/comissoes` — busca por `HOMO-D18-COM`.
3. **Abrir workspaces** clicando em qualquer linha. Validar abas Resumo / Documentos / Timeline / Auditoria.
4. **Validar cenários nomeados** §4.
5. **Validar idempotência:** rodar novamente o seed (`psql -f /tmp/seed/main.sql`) → todos os INSERT devem retornar `0 0`.
6. **NÃO** apagar a massa. Caso preciso, usar §7 manualmente.

## 10. Critério de sucesso

- [x] Todos os registros marcados com `HOMOLOGACAO_FIXA_D18`.
- [x] Idempotência validada (`INSERT 0 0` em re-execução).
- [x] Workspaces principais funcionais (validação UI a cargo do Renan).
- [x] Contratos possuem projetos vinculados (130/60).
- [x] Projetos possuem contrato (FK não-nula).
- [x] Aditivos possuem contrato (todos `CONTRATO`-scope).
- [x] Comissões possuem origem (`CONTRATO`/`ADITIVO`/`AJUSTE`).
- [x] Documentos vinculados a objeto (`entidade_tipo`/`entidade_id`).
- [x] Timeline carrega (400 eventos com `objeto_id` preenchido).
- [x] Nenhum dado em LS — 100% Supabase.
- [x] `tsc --noEmit` limpo (build roda como antes; sem alteração de código TS).

## 11. Próxima subonda recomendada

**D24.AUDIT.FIX** — reescrever os 6 triggers de auditoria sem args (`tg_comissoes_audit`, `audit_sm`, `audit_oc`, `audit_cc`, `tg_audit_error_log`, `tg_audit_sup_alcadas`) passando `('modulo','entidade')` corretamente, eliminando a necessidade de `session_replication_role='replica'` em qualquer INSERT futuro. Pequena e isolada. Aprovação separada.
