# Onda C6 — Comissão Enterprise (Relatório Executivo)

**Data:** 2026-05-28  
**Status:** APLICADA  
**Migrações:** `..._onda_c6_enum_perms.sql` + `..._onda_c6_comissoes.sql`

## Diretriz obrigatória respeitada
- Comissão **NÃO** é paga automaticamente.
- Comissão nasce **PREVISTA** a partir de `comercial_assinatura_eventos`.
- Sem integração com folha, sem integração financeira externa.
- Apenas ciclo corporativo de comissão prevista/liberada/paga/cancelada/estornada.

## Entidades criadas

### `public.comercial_comissoes`
Comissão oficial do ERP — uma linha por contrato assinado (gerada pelo trigger de assinatura), com possibilidade futura de múltiplas linhas por contrato (vendedor secundário).

Campos críticos: `contrato_id`, `assinatura_evento_id`, `vendedor_id`, `vendedor_nome`, `percentual`, `valor_base`, `valor_calculado`, `status` (`comercial_comissao_status`), marcos (`prevista_em`, `liberada_em`, `paga_em`, `cancelada_em`, `estornada_em`), motivos, `row_version`, soft-delete, e o pacote de **integrabilidade externa** (`codigo_externo`, `sistema_destino`, `status_integracao`, `hash_remessa`, `lote_integracao_id`, `natureza_id`, `centro_resultado_id`, `competencia`, `conta_contabil_mapeavel`) seguindo a constraint do D15.

### `public.comercial_comissao_eventos`
Log append-only de toda transição (CRIADA / LIBERADA / MARCADA_PAGA / CANCELADA / ESTORNADA / PERCENTUAL_ALTERADO / REABERTA). RLS bloqueia UPDATE/DELETE — apenas SELECT + INSERT.

## Enum
- `public.comercial_comissao_status` = `PREVISTA | LIBERADA | PAGA | CANCELADA | ESTORNADA`

## Permissões novas (`app_permission`)
- `comercial.comissao.ver`
- `comercial.comissao.liberar`
- `comercial.comissao.marcar_paga`
- `comercial.comissao.cancelar`
- `comercial.comissao.estornar`
- `comercial.comissao.alterar_percentual`

## Triggers
- `tg_comissoes_bump_rv` — bump `row_version`.
- `tg_comissoes_audit` — auditoria forward-only via `tg_audit_row`.
- `tg_comissoes_bloqueia_edicao` — recusa UPDATE direto fora da flag de sessão `app.via_comissao_rpc='true'` (exceto admin).
- `tg_assinatura_cria_comissao` — AFTER INSERT em `comercial_assinatura_eventos` insere a comissão PREVISTA com `percentual = contratos.comissao_pct`, `valor_base = contratos.valor_total`, `valor_calculado = base * pct / 100`, herda `vendedor_id = consultor_id` e `vendedor_nome = vendedor`. Idempotente por `assinatura_evento_id`.

## RPCs SECURITY DEFINER (`EXECUTE` só `authenticated`)
| RPC | De → Para | Permissão | Motivo |
|-----|-----------|-----------|--------|
| `rpc_comissao_liberar` | PREVISTA → LIBERADA | `comercial.comissao.liberar` | opcional |
| `rpc_comissao_marcar_paga` | LIBERADA → PAGA | `comercial.comissao.marcar_paga` | opcional |
| `rpc_comissao_cancelar` | PREVISTA/LIBERADA → CANCELADA | `comercial.comissao.cancelar` | ≥5 chars |
| `rpc_comissao_estornar` | PAGA → ESTORNADA | `comercial.comissao.estornar` | ≥5 chars |
| `rpc_comissao_alterar_percentual` | recalcula `valor_calculado` em PREVISTA/LIBERADA | `comercial.comissao.alterar_percentual` | ≥5 chars |
| `rpc_comissao_reabrir` | CANCELADA/ESTORNADA → PREVISTA | **admin** | ≥5 chars |

Todas usam a flag `app.via_comissao_rpc` para passar pelo bloqueio do trigger e gravam o evento correspondente em `comercial_comissao_eventos` (usuário, permissão, antes/depois de status, valor e percentual).

## Auditoria
- Linha em `comercial_comissao_eventos` por transição (usuário, permissão, status anterior/novo, valores anteriores/novos, motivo, metadata).
- `tg_audit_forward_only` (Onda 5) também grava em `audit_log` global.
- Toda alteração de percentual recalcula valor e registra ambos os pares (valor e %).

## Repositório
`src/lib/repositories/comercial-comissao-repo.ts`:
- `useComissoesPorContrato(contratoId)`
- `useComissaoEventos(comissaoId)`
- `useLiberarComissao`, `useMarcarComissaoPaga`, `useCancelarComissao`, `useEstornarComissao`, `useReabrirComissao`
- `useAlterarPercentualComissao`

## Impacto
- **Linter:** 111 → 121 WARN. Os +10 são RPCs SECURITY DEFINER (`0028`) — padrão aceito desde D14.2 (RPCs com REVOKE de anon + EXECUTE só authenticated).
- **Maturidade:** ~98,3% → **~98,5%** (+0,2).
- **Compatibilidade:** Nada quebra. Contratos antigos sem `comissao_pct` geram comissão PREVISTA com valor 0 (pode ser ajustado via `rpc_comissao_alterar_percentual`).

## Suporte a regras pedidas
| Regra | Atendida? | Como |
|-------|-----------|------|
| Nasce PREVISTA | ✅ | Trigger `tg_assinatura_cria_comissao` |
| Não nasce LIBERADA/PAGA | ✅ | Default `PREVISTA`, transições só via RPC |
| Auditoria completa | ✅ | `comercial_comissao_eventos` + `audit_log` |
| Cancelamento | ✅ | `rpc_comissao_cancelar` |
| Reabertura futura | ✅ | `rpc_comissao_reabrir` (admin) |
| Estorno futuro | ✅ | `rpc_comissao_estornar` (PAGA → ESTORNADA) |
| Pagamento parcial futuro | ⏳ | Estrutura preparada (linha por contrato pode evoluir para N linhas com `valor_parcial` em C6.1) |
| Múltiplos vendedores | ⏳ | Schema permite N linhas/contrato; gatilho cria 1 hoje. Expansão = C6.1 |
| % global e individual | ✅ (% individual no contrato) / ⏳ (% global de parâmetro = C6.1) | Hoje lê `contratos.comissao_pct`; parâmetro global a integrar em C6.1 |

## Riscos remanescentes para C7/C8
- **C7 (Cobrança/Comunicação):** sem impacto direto — comissão não é cobrança de cliente.
- **C8 (Reabertura em cascata):** requer revisar o que acontece com comissão PAGA quando contrato é reaberto. Política sugerida: bloquear reabertura de contrato com comissão PAGA até estorno (ou estornar automaticamente sob alçada). Decidir em C8.

## Critério de aceite
✅ Toda comissão nasce PREVISTA com origem em evento de assinatura, é auditável, rastreável, suporta liberação/pagamento manuais com permissão e motivo, e cancelamento/estorno/reabertura controlados.

**C6 fechada — aguardando aprovação para C7 (Cobrança Assistida) ou C8 (Reabertura em cascata).**
