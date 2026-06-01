# Onda E.OS — Gestão de Serviços / Ordens de Serviço

Replica o módulo "Painel da O.S" do sistema flow2 (visto no vídeo) dentro do
ERP Meta Sun, sob `/engenharia/gestao-servicos`. Trata-se de uma onda
estrutural completa (já reservada no roadmap D11 — Engenharia/Obras
Enterprise). Não cabe em um único turno.

## Escopo identificado no vídeo

- **Lista de O.S.** densa estilo RM/TOTVS: colunas Status, OS, Proposta, PV,
  Cliente, Valor Orçado, Título proposta, Cadastro, Prev. Início, Prev.
  Término, CPF/CNPJ, Ocorrência, Custo Orçado, Custo total, Valor em PV.
  Statuses: Vistoria Pré-Contrato, Stand-by, Novo Projeto, Elaboração de
  Projeto, Projeto Aprovado, Projeto em Análise 3/3, Finalizada, Manutenção,
  Parecer de Acesso em Aberto, etc.
- **Painel da O.S** (drill-down): Tarefas, Serviços a Faturar, Requisições
  de Equipamentos, Arquivos, Histórico, Imprimir, Dashboard da O.S, Importar
  Produtos, Baixar/Finalizar, Gerar Pedido de Venda, Criar cópia, Cancelar,
  Excluir.
- **Tarefas da O.S**: lista ordenada (Vistoria Pré-Obra, Documentação
  Completa, Elaboração de Projeto, Entrega/Retirada de Material, Aguardando
  Vistoria, Monitoramento do Sistema, Compensação, Administrativo) com
  status (Planejamento, Agendada, Finalizada), responsável (técnico) e data.
- **Tarefa expandida**: abas Planejar / Execução / Arquivos / Assinatura /
  Formulários / Mapa / Histórico. Upload de fotos/vídeos, formulários
  respondidos, geolocalização.
- **Modelos de tarefas** (templates) aplicáveis em lote a uma O.S.
- **Formulários/Checklists dinâmicos** por tarefa: campos tipados (texto,
  seleção, número, data, sim/não), obrigatoriedade, valor padrão, agrupador.
- **Cadastros auxiliares**: Área de negócio, Categorias/Equipamentos,
  Funções de técnico, Modelos de OS, Motoristas, Ocorrências, Serviços,
  Pipelines de OS, Status OS, Técnicos, Tipos de serviço, Veículos,
  Controle de ativos, Formulários.
- **Relatórios**: Manutenção, Produtos reservados, DRE de O.S.

## Como conversa com o ERP atual

- Já existem `projetos`, `obras`, `equipes_engenharia`, `instaladores_engenharia`,
  `comercial_eventos_catalogo`, `engenharia_eventos_catalogo` (D18.5), e a
  rota `/engenharia` atual. A **O.S é a unidade operacional intermediária**
  entre o contrato/PV e a obra física — hoje o ERP pula essa camada.
- Toda mutação de status segue regra D-pedra: via RPC + flag de sessão
  (`app.via_os_rpc`), auditoria em `os_eventos` append-only, soft-delete,
  `row_version`, anexos pelo AttachmentEngine universal (Onda 4).
- UI obrigatoriamente no padrão D17.UI Enterprise RM (EnterpriseRecordToolbar
  + EnterpriseDataGrid + RowActions + ColumnManager + FilterPanel +
  ServerPaginationFooter + ModuloHistoricoDrawer + vocabulário canônico).

## Plano em 5 subondas

### E.OS.1 — Foundation DB (1 turno)
- Tabelas: `os_ordens` (núcleo, com cliente_id/contrato_id/pv_id/projeto_id/
  obra_id/status/valor_orcado/datas/responsavel + integrabilidade D18),
  `os_status_catalogo` (seed dos 12+ statuses), `os_pipelines`,
  `os_tarefas` (FK os_id, ordem, status, responsavel_id, data_prevista,
  data_fim, modelo_id), `os_tarefa_modelos`, `os_formularios_definicao`
  (campos jsonb tipados), `os_formulario_respostas`, `os_servicos_faturar`,
  `os_requisicoes_equipamento`, `os_eventos` (append-only), cadastros aux
  (`os_tecnicos`, `os_veiculos`, `os_motoristas`, `os_ocorrencias`,
  `os_servicos`, `os_area_negocio`, `os_funcoes_tecnico`,
  `os_categorias_equipamento`, `os_equipamentos`).
- RLS por permissão `os.*` (visualizar/criar/editar/finalizar/cancelar/
  excluir + cadastros). Triggers row_version + audit + anti-edição de
  status. Anexos universais.
- ~14 permissões novas no enum `app_permission`.
- Sem UI, sem dados, sem flag ativa.

### E.OS.2 — RPCs oficiais (1 turno)
- `rpc_os_criar`, `rpc_os_atualizar`, `rpc_os_mudar_status`,
  `rpc_os_finalizar`, `rpc_os_cancelar`, `rpc_os_gerar_pedido_venda`,
  `rpc_os_aplicar_modelo_tarefas`, `rpc_os_tarefa_concluir`,
  `rpc_os_tarefa_atribuir`, `rpc_os_formulario_responder`.
- Todas SECURITY DEFINER, search_path=public, EXECUTE só `authenticated`,
  idempotência via `rpc_idempotente_*`, flag `app.via_os_rpc`.
- Vínculo opcional com Comercial (gerar PV a partir de O.S finalizada).

### E.OS.3 — UI lista + painel da O.S (1–2 turnos)
- Rota `/engenharia/gestao-servicos` (lista densa, EnterprisePageShell).
- Rota `/engenharia/gestao-servicos/$osId` (painel: sidebar contextual
  esquerda — Tarefas / Serviços a Faturar / Requisições / Arquivos /
  Histórico / Dashboard / Imprimir / Baixar / Gerar PV / Cópia / Cancelar /
  Excluir).
- Aba Tarefas: cards expansíveis com sub-abas (Planejar/Execução/Arquivos/
  Assinatura/Formulários/Mapa/Histórico). Adicionar por modelo.
- Server pagination + ColumnManager + filtros por status/pipeline/data.

### E.OS.4 — Cadastros + Formulários dinâmicos (1 turno)
- Telas dos 14 cadastros auxiliares.
- Construtor de Formulário/Checklist (campos tipados, validações,
  agrupadores, obrigatoriedade) + renderer no painel da tarefa.
- Modelos de tarefas (CRUD + aplicar em lote).

### E.OS.5 — Relatórios + Governança (1 turno)
- Views `v_os_resumo`, `v_os_dre`, `v_os_produtos_reservados`,
  `v_os_manutencao`.
- Painel `/paineis/gestao-servicos` (Kanban + KPIs).
- Integração D18 (eventos canônicos OS_CRIADA/OS_FINALIZADA/
  OS_TAREFA_CONCLUIDA gerando partidas virtuais).
- Adoção plena padrão D17.UI.

## Restrições e regras de pedra

- Nada de mock/LS persistente. Tudo Supabase + RPC + auditoria.
- O.S **nunca cria compra/estoque/título direto** — gera Pedido de Venda
  oficial (RPC existente) ou Solicitação de Material (fluxo já especificado).
- Status só muda via RPC; flag de sessão obrigatória.
- Sem alterar tabelas existentes de obras/projetos/contratos nesta onda
  (apenas FK opcionais saindo da O.S).
- Vocabulário canônico D17.UI.4d (Novo/Visualizar/Editar/Excluir/Finalizar/
  Histórico/Buscar).

## Próximo passo (este turno)

Aprovar este plano e **começar pela E.OS.1 (Foundation DB)** — migração
única com todas as tabelas, permissões, RLS, triggers e seeds dos catálogos
(statuses, pipelines padrão), **sem UI**.

Quer que eu siga com E.OS.1 já?
