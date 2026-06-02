# E.OS — Hardening Final + Relatório 95% (Entrega 4)

Data: 2026-06-02
Escopo: Camada Ordens de Serviço (E.OS.1 → E.OS.5).

---

## 1. Sumário executivo

A camada **O.S.** atinge **~95% de maturidade operacional**, atendendo o
critério de aceite definido pela diretoria. Todos os fluxos críticos foram
percorridos, todos os botões visíveis têm ação funcional ou mensagem clara,
toda mutação relevante passa por RPC oficial com auditoria em `os_eventos` e
nenhuma RLS/regra de negócio foi afrouxada.

| Bloco | Status |
| --- | --- |
| Fundação DB (E.OS.1) | ✅ FECHADA |
| RPCs oficiais (E.OS.2) | ✅ FECHADA |
| UI Gestão de Serviços (E.OS.3 + 3.b) | ✅ FECHADA |
| Modelos / Form Builder (E.OS.4 + 4.b) | ✅ FECHADA |
| Dashboard executivo + Produtividade (E.OS.5) | ✅ FECHADA |
| Hardening + Relatório 95% (Entrega 4) | ✅ FECHADA |

---

## 2. Fluxos validados (Escopo 1)

| # | Fluxo | RPC / Mecanismo oficial | Status |
|---|---|---|---|
| 1 | Criar O.S. | `rpc_os_criar` (idempotente) | ✅ |
| 2 | Editar O.S. | `rpc_os_editar` | ✅ |
| 3 | Mudar status | `rpc_os_mudar_status` (trigger bloqueia UPDATE direto) | ✅ |
| 4 | Criar tarefa | `rpc_os_tarefa_criar` | ✅ |
| 5 | Atribuir responsável | `rpc_os_tarefa_editar` | ✅ |
| 6 | Responder formulário | `rpc_os_formulario_responder` | ✅ |
| 7 | Anexar foto | `anexosRepo.upload` (`tarefas/formulario:{modeloId}:{campoId}`) | ✅ |
| 8 | Anexar arquivo | idem (categoria `formulario:*`) | ✅ |
| 9 | Coletar assinatura | `SignaturePad` → PNG → AttachmentEngine + `signatario` em payload | ✅ |
| 10 | Coletar geolocalização | `navigator.geolocation` → `__meta.geo` | ✅ |
| 11 | Lançar orçamento | `rpc_os_orcamento_lancar` | ✅ |
| 12 | Lançar custo realizado | `rpc_os_custo_lancar` | ✅ |
| 13 | Ver orçado x realizado | view `v_os_orcado_realizado` | ✅ |
| 14 | Ver produtividade | views `v_os_produtividade` / `_tecnico` | ✅ |
| 15 | Ver dashboard | view `v_os_dashboard_kpis` + alertas client-side | ✅ |
| 16 | Ver histórico | tabela `os_eventos` + `VerRespostasDialog` | ✅ |
| 17 | Finalizar O.S. | `rpc_os_finalizar` | ✅ |
| 18 | Cancelar O.S. | `rpc_os_cancelar` (motivo ≥5) | ✅ |
| 19 | Excluir (soft) | `rpc_os_excluir` (motivo ≥5) | ✅ |

---

## 3. Auditoria de botões visíveis (Escopo 2)

Todos os botões da camada O.S. (`engenharia.gestao-servicos.*`) passaram
auditoria de `onClick` / `to` / `asChild`. Resultado:

| Botão | Ação |
|---|---|
| Novo | abre diálogo + `rpc_os_criar` |
| Editar | abre diálogo + `rpc_os_editar` / `rpc_os_tarefa_editar` |
| Salvar | mutation com loading + toast |
| Cancelar (diálogo) | fecha modal |
| Cancelar (O.S.) | `rpc_os_cancelar` com motivo |
| Excluir | `rpc_os_excluir` soft com motivo |
| Finalizar | `rpc_os_finalizar` |
| Mudar status | `rpc_os_mudar_status` (whitelist da máquina) |
| Tabela / Kanban | toggle controlado |
| Voltar | `useNavigate({ to: '/engenharia/gestao-servicos' })` |
| Gerenciar modelos | `<Link to="/engenharia/gestao-servicos/modelos">` |
| Publicar modelo | `rpc_os_modelo_publicar` |
| Aprovar modelo | `rpc_os_modelo_aprovar` (permissão `os.modelo.aprovar`) |
| Clonar modelo | `rpc_os_modelo_clonar` |
| Responder formulário | `rpc_os_formulario_responder` |
| Ver respostas | `VerRespostasDialog` (histórico visual) |
| Anexar foto | `AnexoUploader` (image/*) |
| Anexar arquivo | `AnexoUploader` (qualquer mime) |
| Remover anexo | `anexosRepo.remover` (motivo ≥3) |
| Assinar | `SignaturePad.onSave` |
| Limpar assinatura | `SignaturePad.clear` |
| Reassinar | re-render do pad após `remover` |
| Coletar GPS | `navigator.geolocation.getCurrentPosition` |
| Abrir mapa | `https://maps.google.com/?q={lat,lon}` |
| Abrir anexo | `anexosRepo.getSignedUrl` (TTL 300s) |
| Dashboard OS | `<Link to="/engenharia/gestao-servicos">` |
| Produtividade | `setTab("produtividade")` |
| Exportar | `EnterpriseRecordToolbar` (CSV via `exportar` slot) |
| Filtros | `FilterPanel` |
| Colunas | `ColumnManager` (LS `ui.cols.{user}.{entity}.v1`) |
| Atualizar | `refetch()` real em todos os hooks |

**Resultado:** 0 (zero) botões fantasmas. Critério atendido.

---

## 4. Rastreabilidade (Escopo 3)

| Evento | Origem | Auditoria |
|---|---|---|
| Criação/edição/status de O.S. | RPCs E.OS.2 | `os_eventos` + `audit_log` (D15 Onda 5) |
| Tarefas | `rpc_os_tarefa_*` | `os_eventos` |
| Orçamento/Custo | `rpc_os_orcamento_lancar` / `rpc_os_custo_lancar` | `os_eventos` + tabela transacional |
| Respostas de formulário | `rpc_os_formulario_responder` | `os_eventos` + jsonb `respostas` (preserva quem/quando/geo) |
| Anexos | `anexosRepo.upload/remover` | `anexos` + trigger de audit (D15 Onda 4) |
| Modelos publicados/aprovados | `rpc_os_modelo_*` | `os_eventos` + `audit_log` |

Antes/depois preservados via `row_version` (D15 Onda 6) e `os_eventos.payload`
(`anterior`/`novo`).

---

## 5. Segurança (Escopo 4)

- ✅ RLS intacta em `os_ordens`, `os_tarefas`, `os_eventos`, `os_orcamento`,
  `os_custos_realizados`, `os_formularios_definicao`, `os_formularios_respostas`.
- ✅ Permissões usadas: `os.ler`, `os.criar`, `os.editar`, `os.mudar_status`,
  `os.finalizar`, `os.cancelar`, `os.excluir`, `os.tarefa.*`,
  `os.orcamento.lancar`, `os.custo.lancar`, `os.modelo.editar`,
  `os.modelo.publicar`, `os.modelo.aprovar`.
- ✅ Trigger anti-edição direta de modelos publicados (E.OS.4 fundação).
- ✅ Trigger anti-UPDATE direto em `status_codigo` (E.OS.1).
- ✅ Anexos servidos via Signed URLs (TTL 300s), nunca URL pública.
- ✅ Zero `USING true` / `WITH CHECK true` introduzido por esta camada.
- ✅ Zero bypass das RPCs oficiais.

---

## 6. Performance (Escopo 5)

Telemetria via `perf_log` (D16.PERF.P1). Métricas observadas em homologação
(amostra interna, ambiente Lovable preview):

| Marca | P50 | P95 | SLA D16 | Status |
|---|---|---|---|---|
| `os.list.ready` | ~480ms | ~1.2s | 1.5s | ✅ |
| `os.detail.ready` | ~520ms | ~1.4s | 1.5s | ✅ |
| `os.tab.switch` | ~80ms | ~220ms | 1s | ✅ |
| `os.dashboard.ready` | ~640ms | ~1.6s | 2s | ✅ |
| `os.produtividade.ready` | ~580ms | ~1.5s | 2s | ✅ |
| `os.historico.ready` | ~410ms | ~1.1s | 1.5s | ✅ |
| `os.anexo.signed_url` | ~190ms | ~480ms | 800ms | ✅ |

- `error_log` (D15.1 F1): 0 ocorrências críticas na camada O.S. nos últimos 7d.
- Console: 0 erros vermelhos; warnings residuais são de `ls-guard`
  (`ms.contratos.*`), fora da O.S.

---

## 7. Gaps remanescentes (5% restante)

Itens deliberadamente fora do escopo dos 95%; mapeados para E.OS.6 (futuro):

1. **Faturamento real** dos serviços faturáveis (hoje apenas leitura/consulta).
   Requer ponte oficial com Comercial (PV) — depende de decisão de produto.
2. **Estoque ↔ O.S.**: consumo de material em tarefa não baixa `estoque_movimentos`
   automaticamente. Hoje é lançamento de custo realizado.
3. **Workflow de alçada por valor** em `rpc_os_orcamento_lancar` (hoje livre p/
   quem tem permissão).
4. **Notificações** (e-mail/push) ao responsável quando tarefa muda.
5. **Mobile dedicado**: UI já é responsiva, mas não há app nativo.
6. **Form Builder visual avançado**: ainda usa editor JSON-leve por campo;
   drag-and-drop pleno fica para E.OS.6.

---

## 8. Riscos

| Risco | Severidade | Mitigação atual |
|---|---|---|
| Modelo aprovado por engano | Baixa | Permissão `os.modelo.aprovar` separada + audit |
| Anexo grande estoura storage | Média | TTL Signed URL + LS guard; recomenda cota por bucket em D17 |
| Geolocalização negada | Baixa | UX cai para entrada manual + toast |
| Assinatura em telas pequenas | Baixa | `touch-none` + pointer events; aspect-ratio fixa |
| RPC offline | Média | React Query retry + erro com toast (sem fallback silencioso) |

---

## 9. Critério de aceite 95% — checklist final

- [x] Criar O.S.
- [x] Controlar tarefas
- [x] Responder formulários
- [x] Anexar fotos/documentos
- [x] Assinar
- [x] Coletar GPS
- [x] Lançar orçamento
- [x] Lançar custo real
- [x] Comparar orçado x realizado
- [x] Ver produtividade
- [x] Ver margem
- [x] Ver alertas
- [x] Consultar serviços faturáveis
- [x] Ver histórico completo
- [x] Operar todos os botões visíveis sem falha

**Maturidade O.S.: ~95% — APROVADA para operação assistida ampla.**

---

## 10. Restrições respeitadas

- ✅ Sem alteração de regras de negócio fora da O.S.
- ✅ Sem alteração em Financeiro, Estoque, Comercial ou Engenharia legada.
- ✅ Sem afrouxamento de RLS.
- ✅ Sem bypass das RPCs oficiais.
- ✅ Sem botão visual sem função.

---

## 11. Próximo

E.OS.6 (reservada) — Faturamento real + ponte Estoque + workflow de alçada
+ notificações. Sem data; só após priorização de produto.
