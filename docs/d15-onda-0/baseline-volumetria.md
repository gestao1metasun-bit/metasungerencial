# Onda 0 — Baseline de volumetria pré-corte
Gerado: 2026-05-28 às 15:50 · Read-only

## Síntese

| Categoria | Tabelas | Linhas totais |
|---|---:|---:|
| Operacional crítico (clientes/contratos/leads/propostas/PV/projetos/obras/financeiro/estoque) | 32 | **0** |
| Cadastros parciais (naturezas/contas/bancos/centros/produtos/plano_contas) | 6 | 56 |
| Seeds estáticos (cidades/role_permissions/governance_matrix/concessionarias/tarifas) | 5 | 5765 |
| Governança/auditoria (audit_log/governance_pendencias/entidade_versoes/session_log) | 4 | 26 |
| Workflow/alçadas (workflow_alcadas/aprovacoes/historico) | 3 | 11 |
| Usuários/perfis (profiles/user_roles/user_permission_overrides) | 3 | 2 |
| Outros (system_flags/period_locks/feature_flags/anexos/parecer_executivo) | 13 | 1 |

## Confirmação

**100% das tabelas operacionais críticas em ZERO.** Confirma diagnóstico D15.1.a.0.i e a hipótese central do plano: toda a operação real vive em `localStorage`.

## Evidência para paridade pós-corte

Antes de cada onda destrutiva, repetir o COUNT em todas as tabelas e gravar em `docs/d15-onda-N/volumetria-pre.md` + `volumetria-pos.md`.

Critério: nenhuma linha de cadastro/operacional desaparece sem registro em `migracao_d15_log` ou em log de soft-delete com motivo.
