# C-ENT.8 — Aditivos Supabase por Projeto/Contrato — Relatório

## Migrations
- `aditivos`: +`codigo`, `projeto_id` (FK projetos), `tipo_escopo` (CHECK PROJETO/CONTRATO), `motivo`,
  `valor_anterior/novo/diferenca`, `potencia_anterior/nova/diferenca`,
  `modulos_anterior/novo/diferenca`, `inversor_anterior/novo`, `payload_alteracoes` jsonb,
  `criado_por/aprovado_por/aplicado_por`, `aprovado_em/aplicado_em`.
- CHECK `aditivos_status_check` em {RASCUNHO, EM_APROVACAO, APLICADO, CANCELADO}.
- CHECK `aditivos_projeto_requerido_check` (PROJETO ⇒ projeto_id NOT NULL).
- Índices: `idx_aditivos_contrato_id/projeto_id/status`.
- Enum `app_permission` += 3 valores: `comercial.aditivo.{visualizar,criar,cancelar}`.
- Seeds `role_permissions`: visualizar+criar+cancelar p/ admin_master e admin_geral; visualizar+criar p/ usuario.

## Tabelas usadas
- `public.aditivos` (estendida, RLS pré-existente herdada via contrato).
- `public.contratos`, `public.projetos` (atualizadas pela RPC).
- `public.eventos_timeline` (eventos via `rpc_timeline_registrar`).

## RPC criada
- `rpc_aditivo_aplicar(_payload jsonb) RETURNS uuid` — SECURITY DEFINER, search_path=public,
  EXECUTE só `authenticated`, REVOKE anon. Atômica:
  1. Valida autenticação, motivo ≥5, contrato existe e não cancelado.
  2. Se PROJETO: valida projeto pertence ao contrato e não cancelado;
     calcula diferenças; bloqueia com "Nenhuma alteração foi informada." quando nada muda.
  3. Se CONTRATO: exige descrição ≥5; alteração de valor opcional.
  4. Gera número e código `AD-{contrato}-{NNN}`; INSERT com status `APLICADO` e snapshot anterior/novo.
  5. UPDATE projeto (quando PROJETO) com novos valores; preserva os campos não informados.
  6. UPDATE contrato somando diferenças (valor sempre; potência/módulos via diferença para PROJETO ou substitui em CONTRATO).
  7. Emite 3 eventos timeline: `ADITIVO_APLICADO`, `PROJETO_ALTERADO_POR_ADITIVO` (se aplicável), `CONTRATO_ALTERADO_POR_ADITIVO`.

## Permissões criadas
- `comercial.aditivo.visualizar`
- `comercial.aditivo.criar`
- `comercial.aditivo.cancelar` (preparada; cancelamento de aditivo APLICADO bloqueado por design)

## Arquivos criados
- `src/lib/repositories/aditivos-repo.ts` — tipos + `listarAditivosPorContrato/Projeto`,
  `aplicarAditivo`, hooks `useAditivosPorContrato`, `useAditivosPorProjeto`, `useAplicarAditivoSupabase`.
- `src/components/app/contratos/NovoAditivoDialog.tsx` — diálogo de criação com radio escopo,
  select de projeto, comparativo "valores atuais", cálculo automático de Δ valor/potência/módulos,
  inversor novo, observações; aplica imediatamente via RPC.
- `src/components/app/contratos/AditivosListPanel.tsx` — tabela densa reusável (com/sem coluna Projeto).
- `docs/c-ent-8-aditivos-supabase-relatorio.md` (este arquivo).

## Arquivos alterados
- `src/routes/comercial.contratos.$contratoId.tsx` — botão "Novo Aditivo" no header (gated),
  nova aba "Aditivos (N)" gated por `comercial.aditivo.visualizar`, monta dialog.
- `src/routes/comercial.projetos.$projetoId.tsx` — nova aba "Aditivos (N)" listando aditivos do projeto.

## Hooks criados
- `useAditivosPorContrato(contratoId)`
- `useAditivosPorProjeto(projetoId)`
- `useAplicarAditivoSupabase()` — invalida `aditivos`, `contrato`, `contratos`, `projetos:contrato`,
  `projeto`, `aditivos:projeto`, `timeline:contrato`, `timeline:projeto`.

## Atualizações de contrato/projeto
- **Projeto (aditivo PROJETO):** `valor_estimado`, `potencia_kwp`, `modulos_qtde`, `inversor`
  (somente campos informados — `COALESCE(novo, atual)`).
- **Contrato:** soma `diferenca_valor`; aplica diferenças de potência/módulos; em aditivo geral
  permite substituir potência/módulos/inversor explicitamente.
- Painel `ConsumoContratoCard` atualiza automaticamente via invalidação de cache de contrato+projetos.

## Timeline emitida
- 1× `ADITIVO_APLICADO` (objeto aditivo)
- 1× `PROJETO_ALTERADO_POR_ADITIVO` (objeto projeto, somente se escopo PROJETO)
- 1× `CONTRATO_ALTERADO_POR_ADITIVO` (objeto contrato)
- Payload inclui aditivo_id, contrato_id, projeto_id, valores anterior/novo, diferenças, motivo.

## Riscos
- Aditivo APLICADO grava snapshot mas **não há reversão automática** — desfazer requer aditivo
  compensatório em onda futura.
- Soma incremental ao contrato pressupõe que `valor_total/potencia_kwp/modulos_qtde` do contrato
  estão consistentes com a soma de projetos no momento da aplicação.
- `payload_alteracoes` é livre — aditivos gerais podem registrar mudanças textuais não tipadas.

## Pendências (não escopo desta onda)
- Cancelamento de aditivo `RASCUNHO/EM_APROVACAO` (fluxo simplificado: tudo nasce APLICADO).
- Workflow multi-etapa (alçada) para aditivos acima de limite.
- PDF e assinatura digital do aditivo.
- Reversão automática / aditivo compensatório guiado.
- Recalcular financeiro do contrato (parcelas, comissão) após aditivo.
- Integração com Engenharia (obra atualizada por aditivo).

## Próxima onda recomendada
**C-ENT.9 — Reabertura controlada e Aditivo Compensatório**, OU **C-ENT.10 — Financeiro do Contrato
(impacto de aditivo em comissão e parcelas)**.
