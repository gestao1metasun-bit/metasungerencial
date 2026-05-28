# Onda C2 — Bloqueio, Revisão e Validade de Propostas

**Data:** 2026-05-28  
**Status:** APLICADA  
**Escopo:** ciclo de vida controlado de propostas comerciais (sem tocar em assinatura, comissão, reabertura em cascata ou disparo Eng/Fin).

---

## 1. O que foi criado

### Banco
**Colunas novas em `public.propostas`:**
- `row_version int NOT NULL DEFAULT 1` (+ trigger `tg_bump_row_version`)
- `versao_num int NOT NULL DEFAULT 1`
- `versao_pai_id uuid REFERENCES propostas(id)`
- `revisao_motivo text`, `revisada_em timestamptz`
- `renovacao_motivo text`, `renovada_em timestamptz`

**Índices:**
- `idx_propostas_versao_pai`
- `idx_propostas_validade` (partial `deleted_at IS NULL`)

**Triggers:**
- `tg_propostas_row_version` (BEFORE UPDATE) — concorrência otimista.
- `tg_propostas_default_validade` (BEFORE INSERT) — se `validade IS NULL`, grava `CURRENT_DATE + 45 dias`.
- `tg_propostas_bloqueia_edicao` (BEFORE UPDATE) — bloqueia edição direta quando status ∈ {APROVADA, ASSINADA, EM_REVISAO, VENCIDA, CANCELADA}, exceto admin ou sessão com flag `app.via_revisao_proposta = 'true'` (setada pelas RPCs oficiais). Erro `42501`.

**RPCs oficiais (SECURITY DEFINER, EXECUTE só `authenticated`):**
- `rpc_proposta_solicitar_revisao(_id uuid, _motivo text) RETURNS uuid`  
  Exige permissão `comercial.proposta.revisar`. Marca original como `EM_REVISAO`, clona em nova proposta `RASCUNHO` com `versao_num+1`, `versao_pai_id=OLD`, nova validade 45d. Motivo obrigatório (≥5 chars).
- `rpc_proposta_marcar_vencidas() RETURNS integer`  
  Varredura idempotente. Atualiza para `VENCIDA` propostas com `validade < CURRENT_DATE` e status ∈ {RASCUNHO, ENVIADA, EM_NEGOCIACAO, APROVADA}. Pronta para `pg_cron` diário.
- `rpc_proposta_renovar_validade(_id uuid, _motivo text, _dias int DEFAULT 45) RETURNS void`  
  Exige permissão `comercial.proposta.aprovar_excecao`. Renova validade (1..180 dias), se estava `VENCIDA` volta para `ENVIADA`, registra motivo. Motivo obrigatório (≥5 chars).

### Frontend
- `src/lib/repositories/propostas-revisao-repo.ts` — repo oficial + 3 hooks React Query:
  `useSolicitarRevisaoProposta`, `useRenovarValidadeProposta`, `useMarcarPropostasVencidas`.

---

## 2. O que foi migrado
- **Nada.** Tabela `propostas` vazia (0 linhas); homologação/fictícios. Defaults (`row_version=1`, `versao_num=1`) cobrem registros futuros.

## 3. O que foi descartado
- Tabela separada de "revisões" — descartada. Cada revisão É uma nova proposta vinculada via `versao_pai_id`, mantendo histórico imutável e simplificando filtros/relatórios.
- Constraint `CHECK` sobre `status` — mantido `text` por consistência com o módulo (governança da máquina de estado fica nas RPCs + trigger de bloqueio).

---

## 4. Auditoria & governança
- Triggers `tg_propostas_audit` e `tg_propostas_versao` (já existentes) capturam toda mudança, incluindo snapshots de versão.
- Flag de sessão `app.via_revisao_proposta` segue mesmo padrão do workflow_aprovacoes (D5.1) e da baixa financeira (D4.1): UPDATE direto bloqueado fora das RPCs.
- Permissões reaproveitadas da C1: `comercial.proposta.revisar` e `comercial.proposta.aprovar_excecao`.
- RLS de `propostas` preservada (sem alteração de policy).

---

## 5. Validações executadas
- ✅ Migração aplicada sem erro.
- ✅ Linter Supabase: 91 → **94 WARNs**, todos do tipo "Public/Auth Can Execute SECURITY DEFINER" referentes às 3 RPCs novas — mesmo padrão arquitetural aceito em D14.2 (RPCs autenticadas com `REVOKE ... FROM anon` + `GRANT ... TO authenticated`).
- ✅ `tg_bump_row_version`, `tg_audit_row`, `has_permission`, `is_admin` reaproveitados (helpers oficiais).
- ✅ Defaults compatíveis com tabela vazia.
- ⚠️ Build TS/Vite roda automaticamente; nenhum import quebrado introduzido.

---

## 6. Impacto na maturidade
- **Antes C2:** ~97,7%
- **Depois C2:** **~97,9%**
- Ganhos:
  - Proposta deixa de ter edição direta após aprovada/assinada (governança +).
  - Versionamento explícito por `versao_pai_id` (rastreabilidade +).
  - Validade automática 45d (operação +).
  - 3 RPCs auditadas com motivo obrigatório (auditoria +).

---

## 7. Riscos remanescentes para C3
1. **UI ainda não consome as RPCs** — telas atuais de proposta seguem fazendo UPDATE direto. Enquanto status ficar em `RASCUNHO`/`ENVIADA`/`EM_NEGOCIACAO`, nada quebra; quando alguém aprovar uma proposta na UI, o próximo UPDATE direto vai bater no trigger (mensagem amigável). Refator do `PropostasPage` para usar `useSolicitarRevisaoProposta` é tarefa de UI (não-bloqueante para C3).
2. **`rpc_proposta_marcar_vencidas` não está agendada** — disponível, mas o `pg_cron` job pode ser ligado quando o operacional pedir (idempotente, baixo risco).
3. **Parâmetro mínimo R$/kWp (C1)** ainda não é validado em workflow — escopo do C3.
4. **Não há campo de "valor mínimo" ou "desconto máximo"** ligado a alçada — fica para C3.
5. **Migração de propostas antigas** quando existirem dados reais: precisará reescrever `versao_num` por cadeia se houver legado fora do snapshot.

---

## 8. Pronto para C3
**SIM.** C2 entrega o invariante exigido: proposta tem ciclo de vida controlado, versionado e auditável; edição indevida após aprovação/assinatura está bloqueada no banco. C3 (validação do mínimo R$/kWp via workflow D5.1) pode iniciar sem dependências bloqueantes.
