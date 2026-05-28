# Onda 0 — Plano de rollback por onda
Gerado: 2026-05-28

## Princípios

1. **Toda onda é aditiva primeiro, destrutiva por último**: criar paralelo, validar dual-read, cortar, só então remover legado.
2. **Feature flags binárias**: rollback = inverter flag, sem novo deploy.
3. **Nenhum DROP de tabela operacional sem 2 ciclos estáveis**.
4. **Snapshot LS preservado** em `docs/d15-1-a-0-ii-snapshot-20260528-1107-658dff81.json` é a verdade pré-corte.

## Por onda

| Onda | Gatilho de rollback | Ação | RTO |
|---|---|---|---|
| 0 | — | N/A (read-only) | — |
| 1 | divergência > 0 lançamentos após corte | Flag `D15_SUPABASE_READ_FINANCEIRO=false`; UI volta a `metasun.fin.lancamentos.v1`; views/RPCs ficam mas inertes | < 5 min |
| 1 (data) | importação criou duplicatas | `DELETE FROM titulos_financeiros WHERE id IN (SELECT titulo_id FROM migracao_d15_log WHERE created_at > X)`; re-rodar importer com idempotency_key corrigida | < 30 min |
| 2 | cadastro perdido após corte | Soft-delete preserva; flag `D15_SUPABASE_READ_CADASTROS=false` volta a LS | < 5 min |
| 3 | contrato/cliente bloqueado por RLS errada | Flag `D15_SUPABASE_READ_COMERCIAL=false`; revisar policy específica e re-aplicar | < 15 min |
| 4 | anexo não acessível | Policy do bucket é o único ponto; reverter migration de policy. Anexos físicos preservados no storage | < 5 min |
| 5 | trigger de auditoria com loop | `ALTER TABLE X DISABLE TRIGGER tg_audit_row_X`; investigar | < 2 min |
| 6 | conflito de versão impede salvar | Coluna `row_version` é aditiva; setar `_expected_version=NULL` na RPC ignora check. Drop só após 30 dias | < 5 min |
| 7 | rota privada quebrou para admin master | Reverter migration de RLS específica | < 10 min |
| 8 | painel saúde com query lenta | `DROP VIEW v_saude_sistema` (recriável) | < 2 min |
| 9 | teste bloqueando PR legítimo | Skip pontual com `it.skip` + ticket | < 5 min |
| 10 | descobrimos chave operacional ainda em uso | Reverter commit do `rg`-remove específico | < 10 min |

## Procedimento padrão

```bash
# 1. Identificar onda do rollback
git log --oneline | grep "Onda N"
# 2. Inverter flag (sem deploy)
psql -c "UPDATE feature_flags SET enabled=false WHERE name='D15_...';"
# 3. Notificar operadores
# 4. Investigar root cause antes de re-ativar
```

## Ponto de não-retorno

Apenas a **Onda 10** (remoção física de código LS legado) é não-reversível por feature flag.
Pré-requisitos absolutos para Onda 10:
- 2 semanas estáveis pós Onda 1, 2, 3
- 0 divergências no painel saúde (Onda 8)
- 100% dos testes (Onda 9) verdes em 5 runs consecutivas
- Snapshot LS recente como evidência final
