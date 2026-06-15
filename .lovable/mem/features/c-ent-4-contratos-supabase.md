---
name: C-ENT.4 — Contratos Supabase
description: Geração oficial Supabase de contrato a partir de 1+ propostas do mesmo cliente (vínculo N:N, projetos iniciais, propostas→CONTRATADA via RPC).
type: feature
---
APLICADA 2026-06-15. Onda 4/16 da reestruturação Comercial Enterprise (plano em `.lovable/plan.md` C-ENT.1..8).

**Permissões novas (4):** `comercial.contrato.{visualizar,criar,cancelar,editar_cadastro}` no enum app_permission + grants (admin_master/admin_geral tudo, usuario visualizar+criar).

**Schema:**
- `public.contrato_propostas (id, contrato_id FK→contratos, proposta_id FK→propostas UNIQUE, criado_em, criado_por)` — UNIQUE garante "1 proposta = 1 contrato". RLS leitura por permissão (`comercial.contrato.visualizar` OR `comercial.proposta.visualizar`), INSERT WITH CHECK false (só via RPC).
- Sequência `public.seq_contrato_codigo` (start 1000) → código `CT-YYMM-XXXXX`.

**RPC oficial `rpc_contrato_gerar_de_propostas(p_proposta_ids uuid[]) RETURNS uuid`** (SECURITY DEFINER, search_path=public, REVOKE anon, GRANT authenticated):
- exige auth + permissão `comercial.contrato.criar`;
- valida 1+ propostas, cliente único, status APROVADA/ASSINADA, sem cancelamento, sem `contrato_id`, sem vínculo prévio, valor>0;
- INSERT contrato (`status=ATIVO`, `dados.etapa=RASCUNHO`, totais valor/potência/módulos);
- INSERT contrato_propostas;
- INSERT 1 projeto por proposta (`projetos`, `tipo=Contrato`, `status=Rascunho`, herda endereço da proposta);
- UPDATE propostas `status='CONTRATADA'` + `contrato_id` via flag `app.via_revisao_proposta` (bypass `tg_propostas_bloqueia_edicao`).

**UI:** novo repo `src/lib/repositories/contratos-supabase-repo.ts` (`useContratosPorCliente`, `useGerarContratoDePropostas`). `PropostasDoLeadPanel` em `src/modules/leads/LeadsPage.tsx` ganhou:
- coluna checkbox (só elegíveis APROVADA/ASSINADA sem `contrato_id`);
- botão "Gerar contrato (N)" gated `comercial.contrato.criar` com tooltips;
- dialog de confirmação com resumo (propostas, valor total, kWp, módulos, projetos);
- badge "CONTRATADA" no row quando `contrato_id` presente;
- erros canalizados via `logError`.

**LS:** fluxo Lead→Contrato em LeadsPage agora 100% Supabase. `contratos-store` LS preservado por compat (ContratoAssinadoTab/aba Contratos legada). Sem migração de contratos antigos nesta onda.

**Riscos/pendências:**
- Listagem oficial `/comercial/contratos` Supabase + workspace do contrato (6 abas) → C-ENT.5;
- RPC `rpc_contrato_cancelar` (permissão já criada) → C-ENT.5/6;
- Aba Contratos do Cliente 360º hoje lê LS — passa a refletir Supabase via `useContratosPorCliente` quando o consumidor for migrado.

**Linter:** +1 WARN (RPC nova SECURITY DEFINER, padrão D14.2). Maturidade C-ENT global avança 1 ponto.

Doc: `docs/c-ent-4-contratos-supabase-relatorio.md`.
