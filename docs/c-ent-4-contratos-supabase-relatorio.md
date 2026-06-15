# C-ENT.4 — Contratos Supabase (Relatório executivo)

**Aplicada em:** 2026-06-15
**Onda:** C-ENT.4 / 16 (reestruturação Comercial Enterprise)
**Status:** APLICADA · operação assistida liberada

## Objetivo

Oficializar Contratos em Supabase, permitindo gerar contrato a partir de uma
ou mais propostas Supabase do mesmo cliente, consolidando valor global,
potência, módulos e projetos iniciais — **sem LS como fonte de verdade**.

## O que foi feito

### Migrations (3)

1. **Permissões novas** (`app_permission`):
   - `comercial.contrato.visualizar`
   - `comercial.contrato.criar`
   - `comercial.contrato.cancelar`
   - `comercial.contrato.editar_cadastro`
   (`comercial.contrato.enviar_assinatura` e `comercial.contrato.assinar` já existiam)
2. **Grants** em `role_permissions`:
   - `admin_master`/`admin_geral`: tudo
   - `usuario`: `visualizar` + `criar`
3. **Schema + RPC oficial**:
   - Tabela `public.contrato_propostas (id, contrato_id FK, proposta_id FK UNIQUE, criado_em, criado_por)` com RLS por permissão; INSERT bloqueado direto (`WITH CHECK false`) — somente via RPC SECURITY DEFINER.
   - Sequência `seq_contrato_codigo` para `CT-YYMM-XXXXX`.
   - RPC `rpc_contrato_gerar_de_propostas(uuid[]) RETURNS uuid` (SECURITY DEFINER, `search_path=public`, REVOKE anon, GRANT authenticated):
     - exige `auth.uid()` e permissão `comercial.contrato.criar`;
     - valida 1+ propostas, cliente único, status APROVADA/ASSINADA, sem cancelamento/substituição, sem contrato anterior, valor > 0;
     - cria contrato (`status=ATIVO`, etapa `RASCUNHO` em `dados`);
     - registra vínculo em `contrato_propostas`;
     - cria 1 projeto inicial por proposta (`projetos`, `tipo=Contrato`, `status=Rascunho`);
     - atualiza propostas para `CONTRATADA` via flag `app.via_revisao_proposta` (bypass controlado de `tg_propostas_bloqueia_edicao`).

### Arquivos

- **Criados**
  - `src/lib/repositories/contratos-supabase-repo.ts` (hooks `useContratosPorCliente`, `useGerarContratoDePropostas` + funções base)
  - `docs/c-ent-4-contratos-supabase-relatorio.md` (este arquivo)
- **Editados**
  - `src/modules/leads/LeadsPage.tsx` — `PropostasDoLeadPanel`: seleção múltipla de propostas elegíveis (checkbox), botão "Gerar contrato (N)" gated por `comercial.contrato.criar`, dialog de confirmação com resumo (propostas, valor total, kWp, módulos, projetos a criar), tratamento de erro via `logError`, badge "CONTRATADA" quando `contrato_id` presente.

## Fluxo Proposta → Contrato implementado

1. Usuário abre detalhe de um Lead com propostas APROVADA/ASSINADA.
2. Marca uma ou mais propostas elegíveis.
3. Clica "Gerar contrato (N)" → confirmação com resumo consolidado.
4. RPC roda atomicamente:
   - valida cliente único e estados;
   - cria contrato `ATIVO/RASCUNHO`;
   - cria vínculos em `contrato_propostas`;
   - cria N projetos iniciais;
   - move propostas para `CONTRATADA` (com `motivo_status`).
5. Toast com prefixo do ID; lista atualiza via invalidação de queries.

## Permissões usadas/criadas

| Permissão | Estado | Roles iniciais |
|---|---|---|
| `comercial.contrato.visualizar` | nova | admin_master, admin_geral, usuario |
| `comercial.contrato.criar` | nova | admin_master, admin_geral, usuario |
| `comercial.contrato.cancelar` | nova | admin_master, admin_geral |
| `comercial.contrato.editar_cadastro` | nova | admin_master, admin_geral |
| `comercial.contrato.enviar_assinatura` | já existia | — |
| `comercial.contrato.assinar` | já existia | — |

## Projetos criados automaticamente

- 1 projeto por proposta selecionada
- `tipo='Contrato'`, `status='Rascunho'`
- código = `<código do contrato>-<numero da proposta ou prefixo do id>`
- `dados.endereco_instalacao` herda de `propostas.dados.endereco_instalacao`/`endereco` se existir (confirmar depois — não bloqueia geração nesta onda)

## Usos LS removidos / restantes

- **Removidos no fluxo Lead→Contrato (LeadsPage):** o painel de propostas Supabase agora gera contrato direto no Supabase (não passa por `criarContratoDeProposta` LS).
- **Mantidos (compat):** `contratos-store` LS continua sendo usado pela aba legada de Contratos (`ContratoAssinadoTab`, `enviarContratoParaEngenharia`, `anexarContratoAssinado`). Migração total cai em onda dedicada.

## Riscos

- **Visibilidade do contrato gerado:** a listagem de contratos atualmente lê de LS (`ContratoAssinadoTab`); o contrato Supabase aparece em `public.contratos` mas ainda não no grid LS. Workspace 360º do cliente que já lê Supabase passará a enxergar (próxima onda C-ENT.5).
- **Endereço de instalação:** projetos nascem com endereço herdado da proposta se existir; confirmar/normalizar é responsabilidade da Engenharia (não bloqueia esta onda).
- **Status do contrato:** RPC nasce `ATIVO`/`RASCUNHO`. Workflow de assinatura/envio Eng/Fin continua nas RPCs existentes (`rpc_contrato_assinar`, etc.) — não tocadas nesta onda.

## Pendências técnicas

- Listagem oficial de Contratos Supabase (`/comercial/contratos` Supabase) e Workspace de Contrato (abas Resumo / Propostas origem / Projetos / Documentos / Timeline / Auditoria) — escopo da próxima onda.
- Cancelar contrato Supabase (RPC `rpc_contrato_cancelar`) — permissão já criada, RPC fica para C-ENT.5/6.
- Migração de contratos LS antigos: **não migrar** nesta onda (registrado como pendência).

## Próxima onda recomendada

**C-ENT.5 — Workspace e Listagem de Contratos Supabase**: rota
`/comercial/contratos` lendo `public.contratos`, página do contrato com as 6
abas mínimas, integração com Cliente 360º (aba Contratos por `cliente_id` +
aba Projetos via FK).

## Proibições respeitadas

- Sem financeiro/assinatura/aditivos/comissão/engenharia nesta onda.
- Sem remover store LS legada.
- Sem migrar contratos antigos.
- Sem usar proposta cancelada/substituída/já contratada.
- Sem permitir proposta em dois contratos (UNIQUE em `contrato_propostas.proposta_id` + check explícito na RPC).
- Sem criar contrato sem proposta.
- Sem criar projeto sem contrato.

## Linter

Linter +1 WARN (RPC nova SECURITY DEFINER) — padrão D14.2 aceito.
