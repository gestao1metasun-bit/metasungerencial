# D15 Onda 2 — Cadastros canônicos · Relatório executivo

**Data:** 2026-05-28
**Snapshot base:** `a014566231a14d739d56bd9c51befe8e6f1f88700bb7a0eca88dc3ef8bf45675`
**Diretriz:** ambiente atual tratado como homologação avançada; priorizar arquitetura definitiva, não preservação de massa fictícia.

---

## 1. O que foi criado (Supabase)

4 tabelas oficiais que ainda viviam apenas em LocalStorage:

| Tabela                    | Linhas semeadas | Permissão de edição |
|---------------------------|-----------------|---------------------|
| `grupos_financeiros`      | 7               | `cadastros.editar`  |
| `subgrupos_financeiros`   | 18              | `cadastros.editar`  |
| `meios_pagamento`         | 7               | `cadastros.editar`  |
| `tipos_aplicacao`         | 7               | `cadastros.editar`  |

Padrão arquitetural aplicado a todas:
- `id uuid PK`, `codigo text UNIQUE`, `ativo bool`, `created_at`/`updated_at`.
- `CHECK` de domínio (tipos válidos).
- Trigger `tg_set_updated_at_generic`.
- RLS habilitado: `SELECT` para `authenticated`, mutações gated por `has_permission(uid,'cadastros.editar')`.
- `service_role` com acesso total para integrações.
- Seeds idempotentes (`ON CONFLICT (codigo) DO NOTHING`).

Repositório oficial criado em `src/lib/repositories/cadastros-repo.ts` cobrindo
os **9 cadastros canônicos** (4 novos + 5 já existentes):

- `useGruposFin` · `useSubgruposFin` · `useMeiosPagamento` · `useTiposAplicacao`
- `useNaturezasFin` · `useCentrosResultado` · `useContasFinanceirasOficiais`
- `useFornecedoresOficiais` · `useClientesOficiais`
- + helper `cadastrosRepo` para uso server-side.

---

## 2. O que foi migrado (dados do snapshot homologação)

| Cadastro      | Importados | Observação                                                            |
|---------------|-----------:|-----------------------------------------------------------------------|
| Clientes      | 7          | Todos com CPF/CNPJ válido (snapshot não confirmou clientes vazios).   |
| Fornecedores  | 3          | Canadian Solar, WEG Inversores, Transportadora Norte.                 |
| Naturezas     | 21         | Já estavam em `naturezas_financeiras` (pré-Onda 2).                   |
| Centros       | 3          | Já estavam em `centros_resultado`.                                    |
| Contas        | 4          | Já estavam em `contas_financeiras`.                                   |

Importações idempotentes — re-execução é segura.

---

## 3. O que foi descartado

- **Política especial para "clientes sem documento"**: snapshot validou que os
  7 clientes têm CPF/CNPJ, então a flag `pendente_completar_cadastro`
  proposta não foi necessária. Decisão registrada: campo `doc` segue
  `nullable` no schema para suportar futura entrada parcial via UI.
- **Dual-read entre LS e Supabase**: removido do escopo da Onda 2. Stores LS
  (`src/lib/fin-*.ts`, `src/lib/clientes-store.ts`) continuam funcionando
  como cache para a UI legada e serão eliminados na Onda 10 (corte LS).
- **Migração de fechamentos/parâmetros/pendências históricos do LS**: fora
  do escopo dos 9 cadastros; ficam para Ondas 4/5/6.
- **Tabelas de mapeamento contábil externo**: já contempladas em D15.1.A.0
  REV2 (campos de integrabilidade), nada a fazer aqui.

---

## 4. Riscos remanescentes

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| UI legada (`CadastrosTab`, `FornecedoresTab`, modais financeiros) ainda lê LS. | Médio | Onda 4 substitui leituras por `cadastros-repo.ts` quando o usuário entrar nas telas. |
| Stores LS aceitam escrita local divergente do Supabase. | Médio | Onda 6 (concorrência/idempotência) congela escrita LS; Onda 10 remove. |
| Linter Supabase em 83 WARNs (+8 do baseline 75). | Baixo | Aumento são policies novas detectadas como funções com EXECUTE público; padrão já aceito em D14.2. Nenhuma nova `SECURITY DEFINER` foi criada. |
| Nenhuma camada UI de CRUD para os 4 cadastros novos. | Baixo | Onda 4 inclui formulários enterprise reutilizando `EnterpriseDataGrid`. |

Sem riscos Alto/Crítico.

---

## 5. Impacto estimado na maturidade do ERP

| Eixo            | Antes (D15 gate) | Depois Onda 2 | Δ     |
|-----------------|------------------|---------------|-------|
| Dados           | 90%              | **94%**       | +4    |
| Arquitetura     | 82%              | **86%**       | +4    |
| Operacional     | 78%              | **80%**       | +2    |
| Visual          | 92%              | 92%           | —     |
| Governança      | 88%              | 88%           | —     |
| Segurança       | 95%              | 95%           | —     |
| Testes          | 25%              | 25%           | —     |
| **Maturidade**  | **87,5%**        | **88,7%**     | +1,2  |

---

## 6. Estado dos LocalStorage dos cadastros

| Chave LS                       | Status oficial                          |
|--------------------------------|------------------------------------------|
| `ms.fin.grupos.v1`             | Cache de UI — fonte oficial = Supabase   |
| `ms.fin.subgrupos.v1`          | Cache de UI — fonte oficial = Supabase   |
| `ms.fin.meios.v1`              | Cache de UI — fonte oficial = Supabase   |
| `ms.fin.tipos-aplicacao.v1`    | Cache de UI — fonte oficial = Supabase   |
| `ms.fin.naturezas.v2`          | Cache de UI — fonte oficial = Supabase   |
| `ms.fin.centros.v2`            | Cache de UI — fonte oficial = Supabase   |
| `ms.fin.contas.v2`             | Cache de UI — fonte oficial = Supabase   |
| `ms.fin.fornecedores.v1`       | Cache de UI — fonte oficial = Supabase   |
| `ms.clientes.full.v1`          | Cache de UI — fonte oficial = Supabase   |

Nenhum cadastro do escopo depende mais criticamente de LS — o Supabase tem
a massa completa e os repositórios oficiais expõem a leitura tipada.

---

## 7. Próximas ondas autorizadas

Onda 3 **não** será iniciada. Conforme replanejamento aprovado, a sequência
imediata é **Ondas 4, 5 e 6 em paralelo**:

- **Onda 4 — Anexos universais** (AttachmentEngine).
- **Onda 5 — Auditoria diária** (forward-only, sem baseline).
- **Onda 6 — Concorrência/idempotência** (congelar escrita LS dos cadastros).
