# Módulo Comercial — Onda C1 (Relatório Executivo)

**Data:** 2026-05-28
**Status:** APLICADA
**Escopo:** Catálogos configuráveis + Permissões + Seeds + RLS
**Não cobre:** assinatura, comissão, reabertura, disparo paralelo (C2+)

---

## 4 decisões oficiais fechadas pelo Renan (registradas)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Comissão | Parametrizável (global, por vendedor, futura por faixa/meta). Base = valor líquido. Nasce "prevista" na assinatura, vira "liberada" só por regra financeira configurável. **Nunca paga automático**. |
| 2 | Reabertura | Permitida apenas via RPC dedicada, com permissão específica + motivo + auditoria + validação em cascata. **Sem limite de dias agora** — só permissão + estado operacional. |
| 3 | Transferência de carteira | Individual = gestor comercial ou admin. **Lote = diretoria/admin OU workflow de aprovação**. Sempre registra origem+destino+motivo+usuário+data+quantidade. |
| 4 | Disparo paralelo Eng+Fin | Mantém `liberado_para_contrato` por compatibilidade. Evolui para flags semânticas: `contrato_assinado`, `liberado_para_engenharia`, `liberado_para_financeiro`, `pendente_*`. |

---

## O que foi criado

### Tabelas (4)
| Tabela | Linhas semeadas | Permissões de escrita |
|--------|-----------------|----------------------|
| `comercial_pipeline_etapas` | 12 | `comercial.editar` ou admin |
| `lead_origens` | 12 | `comercial.editar` ou admin |
| `motivos_perda` | 8 (1 com obs obrigatória) | `comercial.editar` ou admin |
| `motivos_ganho` | 8 | `comercial.editar` ou admin |

Todas com: `row_version`, soft-delete (`deleted_at/by/reason`), trigger de auditoria (`tg_audit_row('comercial', tabela)`), trigger de bump (`tg_bump_row_version`).

### Permissões adicionadas ao enum `app_permission` (14)
```
comercial.lead.criar
comercial.lead.editar
comercial.proposta.criar
comercial.proposta.editar
comercial.proposta.revisar
comercial.proposta.aprovar_excecao
comercial.carteira.transferir
comercial.carteira.transferir_lote
contrato.cancelar
contrato.reabrir
comercial.pipeline.configurar
comercial.parametro.configurar
comercial.comissao.visualizar
comercial.comissao.liberar
```
> Já existiam: `comercial.aprovar/cancelar/editar/visualizar`, `contrato.assinar/gerar`.

### Parâmetro gerencial
- `comercial.parametro_minimo_rs_kwp = 2000` (R$/kWp mínimo para aprovação automática).

### Repositório TypeScript
- `src/lib/repositories/comercial-catalogos-repo.ts` — `usePipelineEtapas`, `useLeadOrigens`, `useMotivosPerda`, `useMotivosGanho`, `useToggleCatalogoAtivo`.

---

## O que NÃO foi feito (próximas ondas)

- **C2** — Lock proposta + RPCs revisão + validade 45 dias.
- **C3** — Workflow alçada parâmetro mínimo R$/kWp (reusa D5.1).
- **C4** — Transferência de carteira (individual + lote via workflow).
- **C5** — Assinatura por permissão + disparo paralelo Eng/Fin com flags semânticas.
- **C6** — Entidade `comissoes` (prevista → liberada).
- **C7** — Cancelamento via RPC.
- **C8** — Reabertura em cascata (crítica).
- **C9** — Visita técnica + documentos + histórico humano.
- **C10** — UI Enterprise (Pipeline visual / Kanban).

---

## Validações

- ✅ Migration aplicada sem erro (REV2 corrigiu `TG_ARGV` da auditoria).
- ✅ Seeds idempotentes (ON CONFLICT DO NOTHING) — re-execução segura.
- ✅ RLS habilitada nas 4 tabelas.
- ✅ Permissões adicionadas com `IF NOT EXISTS` — re-execução segura.
- ✅ Linter Supabase: 91 WARN (estável, todos aceitos D14.2).

## Riscos remanescentes

| Risco | Mitigação |
|-------|-----------|
| Pipeline mutável pode quebrar relatórios que esperam etapas fixas | C10 vai validar; por ora pipeline é só visual/configurável. |
| Permissões novas ainda não usadas em RLS de tabelas existentes | Por design — entram em uso a partir de C2. |
| `parametros_gerenciais` pode não existir em ambiente legado | Bloco DO/IF EXISTS garante idempotência. |

## Impacto na maturidade

- **Antes:** ~97,5% (D15.1 pré-produção).
- **Depois:** ~97,7% (catálogos do Comercial saem do LS / mocks).
- Comercial ainda **não está apto para C5 (assinatura paralela)** — exige C2/C3/C4 fechados.

## Próximo passo

Aguardando aprovação para **C2 — Lock de proposta + RPC de revisão + validade automática**.
