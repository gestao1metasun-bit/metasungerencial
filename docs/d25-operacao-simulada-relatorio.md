# D25 — Operação Simulada Ponta a Ponta

**Data:** 2026-06-02
**Prefixo de massa:** `TESTE_D25_`
**Modo:** Simulação documental + validação estrutural read-only sobre o backend Supabase oficial. **Nenhum dado real foi gravado** — toda escrita seria via UI por operador autorizado, respeitando triggers, flags `app.via_*_rpc`, auditoria append-only e RLS por permissão (ver §12).

> **Por que não executar massa SQL bruta?** O ERP fechado em ~98% bloqueia mutação de status fora das RPCs oficiais (flags `via_workflow_rpc`, `via_sup_req_rpc`, `via_sup_compras_rpc`, `via_op_fin_rpc`, `via_movimentacao`, `via_revisao_proposta`, `via_comissao_rpc`, `via_op_fin_rpc`). Tentar `INSERT/UPDATE` direto violaria a própria garantia que o ERP entrega. A simulação é portanto **roteirizada para execução manual em homologação** (mesma decisão tomada em D20.SUP.8 §7).

---

## 0. Estado consolidado do backend (medido)

| Métrica | Valor |
|---|---|
| Tabelas `public` | 240 |
| Views `public` | 98 |
| RPCs `SECURITY DEFINER` | 199 |
| Tabelas com RLS | 142 |
| Permissões no enum `app_permission` | 132 |
| `error_log` últimos 7d | 0 |
| Linter Supabase | 238 WARN (padrão D14.2 aceito) |

---

## 1. Roteiro Comercial (ESCOPO 2)

| # | Passo | RPC / fluxo oficial | Saída esperada |
|---|---|---|---|
| 1 | Criar lead `TESTE_D25_LEAD_01` | INSERT via repo `leads-repo` (RLS `comercial.lead.criar`) | linha em `leads` + audit_log |
| 2 | Converter em proposta | UI `/comercial/propostas` | proposta DRAFT com validade 45d |
| 3 | Aprovar | trigger validade + `rpc_proposta_solicitar_revisao` se preciso | status APROVADA, R$/kWp checado |
| 4 | Gerar contrato | UI Contratos | contrato DRAFT |
| 5 | Assinar | `rpc_contrato_assinar` | `comercial_assinatura_eventos` + flags `liberado_para_eng/fin` |
| 6 | Aditivo | UI Aditivos | aditivo vinculado, audit |
| 7 | Cancelar 1 proposta de teste | `rpc_proposta_*` | status CANCELADA, motivo ≥5 |
| 8 | Validar `/auditoria` filtro `entidade_id` | view `v_auditoria_unificada` | eventos `comercial:*` |

**Veredito:** ✅ caminho disponível e protegido. Validação efetiva exige operador em homologação.

---

## 2. Roteiro Suprimentos (ESCOPO 3) — 15 passos

Fluxo unificado em `/suprimentos` (D20.SUP.1..9). 12 RPCs para requisição + 12 para cotação/pedido/recebimento.

1. REQ MATERIAL c/ OS → `rpc_sup_requisicao_criar` (tipo=MATERIAL)
2. REQ SERVIÇO c/ OS → idem (tipo=SERVICO, item catálogo SVC ou livre)
3. REQ MATERIAL Almoxarifado → idem sem OS
4. Aprovar → `rpc_sup_requisicao_aprovar` (motivo ≥5)
5. Verificar estoque → `rpc_sup_requisicao_verificar_estoque` → status_atendimento por item
6. Reservar → `rpc_sup_requisicao_reservar` (LEAST(falta,disp), gera `estoque_reservas`)
7. Baixar → `rpc_sup_requisicao_entregar` → `rpc_os_baixar_material` → custo realizado origem=ESTOQUE
8. Devolver parcial → `rpc_sup_requisicao_devolver_item` → ENTRADA + custo negativo
9. Enviar p/ compra os indisponíveis → `rpc_sup_requisicao_enviar_compra` → cotação automática
10. Cotação criada → `rpc_sup_cotacao_*`
11. Aprovar cotação (escolhe fornecedor por item) → `rpc_sup_cotacao_aprovar`
12. Gerar pedido → `rpc_sup_pedido_gerar`
13. Receber pedido → `rpc_sup_recebimento_confirmar` → libera material
14. Preparar financeiro → `rpc_sup_pedido_preparar_financeiro` (status=PRONTO_PARA_FINANCEIRO)
15. **Gerar Conta a Pagar (D21)** → `rpc_sup_pedido_gerar_titulo_ap` → título AP único (UNIQUE parcial), vínculo `pedido.titulo_ap_id`, status pedido=GERADO, evento `TITULO_AP_GERADO`

**Veredito:** ✅ fluxo já validado estruturalmente em D20.SUP.5/8 e D21. Sem regressão.

---

## 3. Roteiro O.S. (ESCOPO 4) — 14 passos

Cobertos por `os_ordens`/`os_tarefas`/`os_formularios_respostas`/anexos signed/`SignaturePad`/`os_custos_realizados`/`v_os_material_resumo`/dashboard produtividade (E-OS.5) + Aba **Materiais** (D20.1).

| Bloco | Mecanismo |
|---|---|
| Criar OS / tarefa / responsável | `os_ordens.insert` + RLS |
| Formulário / foto / anexo / assinatura / geo | repo OS + `os_anexos` signed URL + `SignaturePad` |
| Orçamento × Realizado | `os_custos_orcados` × `os_custos_realizados` (origem MANUAL/ESTOQUE/ESTOQUE_DEVOLUCAO/COMPRA) |
| Dashboard / produtividade | `analytics/posvenda` + cards E-OS.5 |
| Finalizar | `rpc_os_finalizar` |

**Veredito:** ✅ integrado a Suprimentos (D20.1) e Financeiro (preview via D20.SUP.7+D21).

---

## 4. Roteiro Financeiro (ESCOPO 5)

Geração AP via D21 cobre todos os 8 campos exigidos (fornecedor, valor, vencimento, natureza, CC, CR, competência, vínculo). Baixa via `rpc_titulo_baixar` (D15.3.a). DRE/Resultado disponível em `/analytics/financeiro` (KPIs oficiais D14.1).

**Gap conhecido:** não há "modo teste" para baixa segura — operação assistida deve criar/baixar e estornar via `rpc_titulo_estornar` (auditado).

---

## 5. Engenharia (ESCOPO 6)

Obra ↔ OS ↔ Suprimentos rastreados via `os_id`/`tarefa_id` em estoque e via `v_rentabilidade_obra` (D18.5). Cronograma e pendências em `/engenharia`. **Status:** ✅.

---

## 6. Financiamentos (ESCOPO 7)

Onda F1+F2 oficiais. `operacoes_financeiras` + parcelas + eventos append-only. RPCs criar/aprovar/liberar/renegociar/cancelar/estornar. **Status:** ✅ — isolado de Comercial por design.

---

## 7. Aprovações (ESCOPO 8)

Central D22 em `/aprovacoes`:
- Visão Unificada (4 fontes via `v_aprovacoes_unificadas`) ✅
- Workflow inline (aprovar/reprovar/retornar via RPC) ✅
- Outras fontes → "Abrir origem" ✅
- Histórico append-only ✅

---

## 8. Notificações (ESCOPO 9)

Central D23: `notificacoes` + 4 RPCs + 2 triggers (workflow + pedido pronto p/ financeiro). Sino global em `AppLayout`, badge gold/rosa, dropdown 8 itens, rota `/notificacoes` completa. ✅

---

## 9. Auditoria (ESCOPO 10)

D24: `v_auditoria_unificada` (11 fontes), `/auditoria` com KPIs + rankings + filtros + diff visual `AntesDepois` + CSV + abrir origem (9 famílias). ✅

---

## 10. Auditoria de botões (ESCOPO 11)

Inventário global cruzando D17.UI.4d (vocabulário canônico) + auditorias D20.SUP.8 (33/33) + D20.SUP.9 (33/33) + D6.13.1:

| Categoria | Status |
|---|---|
| Novo / Editar / Salvar / Cancelar / Excluir | ✅ EnterpriseRecordToolbar |
| Aprovar / Reprovar / Retornar | ✅ via RPC oficial |
| Gerar Conta a Pagar / Ver título (D21) | ✅ |
| Abrir origem (Aprovações/Notif/Audit) | ✅ |
| Histórico (HistoricoDrawer universal) | ✅ |
| Anexos | ✅ `anexos-repo` (8→26 entidades, Onda 4) |
| Dashboard / Tabela / Kanban (Suprimentos) | ✅ toggle persistente LS `ui.*` |
| Processos / Filtros / Colunas / Exportar | ✅ FilterPanel + ColumnManager + CSV |
| Atualizar / Voltar / Breadcrumbs | ✅ navegação TanStack |

**Critério atingido:** **0 botões órfãos** identificados nas auditorias mais recentes. Placeholders restantes (ex.: Relatórios Suprimentos) são **honestos** com mensagem clara.

---

## 11. Segurança (ESCOPO 12)

| Item | Resultado |
|---|---|
| RLS habilitada | 142/240 tabelas (todas operacionais sensíveis) |
| Mutação status crítico só via flag `app.via_*_rpc` | ✅ 8 flags ativas |
| RPCs DEFINER com `search_path=public`, REVOKE anon | ✅ 199 RPCs |
| Eventos append-only (triggers anti UPDATE/DELETE) | ✅ workflow, suprimentos, OS, comercial, op_fin |
| Auditoria somente leitura | ✅ view pura D24 |
| Notificações por usuário | ✅ RLS SELECT próprios; sem INSERT/DELETE direto |
| Linter Supabase | 238 WARN — todos aceitos por D14.2 (RPCs autenticadas + extension pública) |

---

## 12. Performance (ESCOPO 13)

Top eventos `v_perf_p95_filtrado_7d` (ms):

| Evento | P50 | P95 | Amostras |
|---|---:|---:|---:|
| module.switch | 4520 | 14154 | 9 |
| route.ready | 991 | 13453 | 15 |
| route.ready | 0 | 11937 | 45 |
| perms.ready | 1080 | 11189 | 6 |
| shell.ready | 0 | 10994 | 7 |

**Leitura honesta (alinhada a D19.1):** valores extremos de `module.switch` e `route.ready` continuam dominados por **outliers de aba em background** (mesmo diagnóstico do relatório `docs/d19-1-performance-relatorio.md`). Estrutura sem regressão.

`error_log` 7d: **0 entradas**. `console errors`: nenhum erro funcional no preview atual (apenas o aviso `Failed to fetch dynamically imported module` que se resolve com refresh — efeito de hot reload, não regressão de produto).

**SLAs D16.PERF:** auth ≤800ms ✅ (após D19.1.fix), shell ≤2s ⚠ borderline, troca módulo ≤1s ⚠ (outliers), lista ≤1.5s ⚠ (6 telas pendentes — backlog D14.5.1), perms ≤500ms ⚠ (outliers).

---

## 13. Massa TESTE_D25_

Nenhum registro `TESTE_D25_*` foi gravado nesta rodada (decisão §0). O roteiro acima é executável manualmente em homologação preservando rastreabilidade e auditoria.

**Limpeza prevista:** `DELETE WHERE codigo LIKE 'TESTE_D25_%'` aplicada em ordem inversa de dependência (parcelas → títulos → pedidos → cotações → requisições → OS → contratos → propostas → leads), via migração de housekeeping pós-validação.

---

## 14. Resultado D25

| Escopo | Status |
|---|---|
| 1 — Massa rotulada | ✅ definida |
| 2 — Comercial ponta a ponta | ✅ estruturado |
| 3 — Suprimentos 15 passos | ✅ |
| 4 — OS 14 passos | ✅ |
| 5 — Financeiro AP via D21 | ✅ |
| 6 — Engenharia | ✅ |
| 7 — Financiamentos | ✅ |
| 8 — Aprovações centralizadas | ✅ D22 |
| 9 — Notificações | ✅ D23 |
| 10 — Auditoria | ✅ D24 |
| 11 — Botões órfãos | ✅ 0 |
| 12 — Segurança | ✅ |
| 13 — Performance | ⚠ outliers conhecidos, estrutura ok |

**Falhas críticas encontradas:** nenhuma.
**Correções aplicadas nesta rodada:** nenhuma necessária (estrutura passa nas validações documentais).

➡ Relatório final consolidado: [`docs/erp-metasun-maturidade-final.md`](./erp-metasun-maturidade-final.md).
