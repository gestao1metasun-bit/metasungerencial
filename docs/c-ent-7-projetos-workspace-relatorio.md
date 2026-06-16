# C-ENT.7 — Projetos do Contrato Supabase — Relatório

## Rotas criadas
- `/comercial/projetos/$projetoId` — Workspace operacional do Projeto (`src/routes/comercial.projetos.$projetoId.tsx`).

## Componentes criados
- `src/components/app/contratos/ConsumoContratoCard.tsx` — Painel de consumo (Valor/Potência/Módulos × Global/Consumido/Saldo/% + alerta vermelho quando saldo < 0).

## Componentes reutilizados
- `DocumentosObjetoPanel` e `TimelineObjetoPanel` (C-ENT.6) com `objetoTipo="projetos"` e `objetoTipo="projeto"` respectivamente.
- `PageHeader`, `StatCard`, `Tabs`, `Badge`, `Progress`.

## Hooks criados/alterados
Em `src/lib/repositories/contratos-supabase-repo.ts`:
- `obterProjetoPorId(id)` + `useProjetoSupabaseById(id)`.
- `calcularConsumoContrato(contrato, projetos): ConsumoContrato` — utilitário puro.
- `validarLimitesProjetoNoContrato(contrato, projetosAtuais, novoProjeto, ...)` — utilitário de validação preparado para Aditivos / criação manual futura.

## Permissões criadas
Adicionadas ao enum `public.app_permission`:
- `comercial.projeto.visualizar`
- `comercial.projeto.editar_cadastro`

Concedidas via `role_permissions`:
- `admin_master` → ambas.
- `admin_geral` → ambas.
- `usuario` → apenas `comercial.projeto.visualizar`.

Gate aplicado:
- Renderização do Workspace do Projeto (`comercial.projeto.visualizar`).
- Upload de documentos no projeto (`comercial.projeto.editar_cadastro`).
- Botões "Abrir projeto" continuam navegáveis; o gate é avaliado dentro do Workspace.

## Banco — outras alterações
- `anexos.anexos_entidade_tipo_check` ampliado para incluir `'projetos'`.
- `EntidadeAnexavel` em `src/lib/repositories/anexos-repo.ts` ampliado para refletir.
- Trigger `trg_projeto_evento_criado` (AFTER INSERT em `public.projetos`):
  - Quando o projeto nasce com `contrato_id`, insere evento `PROJETO_CRIADO` em `eventos_timeline` (`objeto_tipo='projeto'`).
  - `SECURITY DEFINER`, falhas no log nunca bloqueiam a criação do projeto.

## Painel de consumo do contrato
- Exibido na aba **Resumo** e no topo da aba **Projetos** do Workspace do Contrato.
- Mostra para Valor, Potência e Módulos: global, consumido (Σ projetos), saldo, % consumido e barra de progresso.
- Saldo negativo: barra/numero em destruct + badge "Limite excedido".
- Inclui contagem de projetos.

## Validações criadas
- `validarLimitesProjetoNoContrato` retorna `{ ok, erros[] }` para qualquer fluxo futuro de criação/edição de projeto manual. Esta onda **não** cria projeto manual — apenas deixa a utilidade pronta.
- Como C-ENT.4 já criou projetos via RPC com base nas propostas vinculadas, a soma respeita o contrato por construção.

## Integração Contrato ↔ Projeto ↔ Cliente
- **Workspace do Contrato → aba Projetos**: nova coluna "Ações" com botão "Abrir" navegando para `/comercial/projetos/$projetoId`.
- **Cliente 360º → aba Projetos**: nova coluna "Ações" com link "Abrir projeto" para o Workspace; coluna Contrato segue navegando para `/comercial/contratos/$contratoId`.
- **Workspace do Projeto**: botões "Abrir contrato" e "Cliente 360º" no header executivo.

## Eventos de timeline
- Novos projetos criados a partir de contrato passam a registrar evento `PROJETO_CRIADO` automaticamente via trigger.
- Eventos de timeline anteriores não são retroagidos — projetos antigos aparecem com timeline vazia até a primeira ação registrada.

## Pendências
- Não foi implementado nenhum fluxo de edição do projeto. "Dados de execução" hoje é apenas leitura dos campos atuais.
- Aditivos (C-ENT.8) precisarão usar `validarLimitesProjetoNoContrato` ao alterar limites globais ou criar novo projeto.
- Auditoria técnica (aba Auditoria) continua sendo placeholder até a onda de Auditoria Comercial.

## Riscos
- O cálculo do consumo assume que `valor_total`, `potencia_kwp` e `modulos_qtde` do contrato representam o limite global oficial. Se Aditivos alterarem esses limites no futuro, o painel reflete automaticamente.
- O trigger de evento de timeline é defensivo (swallow exception) para não bloquear criação do projeto em caso de falha de log; o evento perdido seria visível pela ausência na timeline.
- A coluna `projetos` no CHECK de `anexos` permite uploads novos a essa entidade; documentos antigos eventualmente classificados como `projetos_contrato` permanecem inalterados.

## Proibições respeitadas
- Não criou Aditivos.
- Não criou projeto sem contrato (rotas apenas leem/expõem o que o RPC C-ENT.4 já cria).
- Não usa LS como fonte oficial.
- Não quebra Workspace do Contrato nem Cliente 360º.
- Não implementa Engenharia / Financeiro / ART / checklist / homologação.

## Próxima onda recomendada
**C-ENT.8 — Aditivos do Contrato Supabase**: nova tabela `aditivos` vinculada a `contrato_id`, RPCs `rpc_aditivo_criar` / `rpc_aditivo_aprovar` / `rpc_aditivo_cancelar`, aplicação de `validarLimitesProjetoNoContrato` ao alterar limites globais, e nova aba "Aditivos" no Workspace do Contrato.
