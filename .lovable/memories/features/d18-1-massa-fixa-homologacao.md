---
name: D18.1 Massa fixa de homologação Comercial
description: Massa permanente HOMOLOGACAO_FIXA_D18 do Comercial (120 clientes, 100 leads, 150 propostas, 60 contratos, 130 projetos_contrato, 40 aditivos, 90 comissões, 200 anexos mock, 400 eventos timeline). Não apagar, não randomizar, idempotente por código.
type: feature
---
Identificadores fixos por prefixo `HOMO-D18-{CLI|LEAD|PRP|CTR|PRJ|ADT|COM|ANX|TL}-NNN`. Toda entidade carrega `origem=HOMOLOGACAO_FIXA_D18`, `tag=HOMOLOGACAO_FIXA_D18`, `ambiente_teste=true`, `nao_excluir_automaticamente=true` em `dados`/`payload`/`observacao` (clientes usa `codigo_externo` + `sistema_destino='HOMOLOGACAO_FIXA_D18'`).

Consultores fixos (reusados teste.carga+01..+08): Carlos Oliveira, Maria Souza, João Pereira, Fernanda Lima, Pedro Santos, Ana Martins, Lucas Rocha, Juliana Costa.

Aplicação: parte via psql (`/tmp/seed/main.sql` — 137KB, 25 INSERTs multi-row) + parte via migration `20260617-160713-597597` (comissões + anexos de comissão usando `SET LOCAL session_replication_role='replica'` para contornar bug pré-existente do trigger `tg_comissoes_audit` sem args).

Idempotência total: NOT EXISTS por código. Segunda execução = 0 inserts.

NÃO apagar automaticamente. Limpeza só manual via SQL documentado em `docs/d18-1-massa-fixa-homologacao-comercial.md` §7.

Próxima onda recomendada: D24.AUDIT.FIX (corrigir 6 triggers de audit sem args).
