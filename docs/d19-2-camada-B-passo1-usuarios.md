# D19.2 Camada B — Passo 1/6 · Usuários sintéticos criados

**Data:** 2026-06-01
**Status:** ✅ 20/20 contas criadas com sucesso · 0 erros.

## Resumo

| Item | Valor |
|---|---|
| Total criado | **20** |
| Padrão de email | `teste.carga+NN@metasun.local` (NN = 01..20) |
| Role atribuída | `usuario` (read-only operacional, **sem destrutivos**) |
| Profile `cargo` | `TESTE_CARGA` (marcador) |
| `user_metadata` | `{ loadtest:true, ambiente:'HOMOLOGACAO' }` |
| Permissões herdadas | 13 (`*.visualizar`/`*.atender`/`workflow.solicitar`/`workflow.cancelar`/`estoque.movimentar`/`comercial.editar`/`contrato.gerar`) — suficientes para navegar nas 15 rotas, **proibido** assinar/aprovar/cancelar/excluir/conciliar |
| Arquivo de credenciais | `/mnt/documents/d19-2-loadtest-credentials.json` |
| Método | `supabase.auth.admin.createUser()` (API oficial, **zero INSERT direto em `auth.*`**) |
| Script reaproveitável | `scripts/d19-2-create-users.mjs` (idempotente: reseta senha se email já existir) |

## Garantias

- ✅ Não usa Admin Master.
- ✅ Não contamina auditoria operacional (cargo `TESTE_CARGA` permite filtro/expurgo posterior).
- ✅ Senha forte randômica por usuário (`LoadTest!` + 8 bytes base64url).
- ✅ Idempotente — re-rodar o script só rotaciona senhas, não duplica linhas.
- ✅ Zero alteração em RLS, workflow, regras de negócio ou dados reais.

## CREDENTIALS_JSON

Arquivo disponível em `/mnt/documents/d19-2-loadtest-credentials.json` — formato compatível direto com `scripts/d19-2-load-test.mjs`:

```bash
# extração rápida do array credentials → CREDS_JSON
CREDS_JSON=$(node -e "console.log(JSON.stringify(require('/mnt/documents/d19-2-loadtest-credentials.json').credentials.map(c=>({email:c.email,password:c.password}))))")
```

<presentation-artifact path="d19-2-loadtest-credentials.json" mime_type="application/json"></presentation-artifact>

## Próximos passos (na ordem aprovada)

| # | Passo | Status |
|---|---|---|
| 1 | Criar 20 usuários sintéticos | ✅ **CONCLUÍDO (esta turn)** |
| 2 | Otimização P0 (cache lookups + lazy abas + paginação pendente + prefetch) | ⏳ próxima turn |
| 3 | Camada B · 10 usuários simultâneos | ⏳ requer P0 + `bun add -d playwright && bunx playwright install chromium` |
| 4 | Análise 10u | ⏳ |
| 5 | Camada B · 20 usuários simultâneos | ⏳ condicional a 10u estável |
| 6 | Relatório consolidado + recomendação Camada C | ⏳ |

**Aguardando autorização explícita para iniciar Passo 2 (P0)** — escopo grande (8+ módulos, hooks de cache, lazy import de abas, paginação server-side residual). Sugiro abrir Passo 2 em turn dedicada para manter rastreabilidade.
