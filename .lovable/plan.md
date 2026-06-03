## D27.COM.3 — Operacionalização dos botões do Comercial

O escopo descrito é grande (10 processos × Propostas/Contratos/Aditivos × individual + lote). Auditoria das RPCs já disponíveis no banco:

**✅ Já existem:**
- `rpc_contrato_assinar`, `rpc_contrato_marcar_engenharia_liberada`, `rpc_contrato_marcar_financeiro_liberado`
- `rpc_proposta_solicitar_revisao`, `rpc_proposta_marcar_vencidas`, `rpc_proposta_renovar_validade`
- `rpc_proposta_solicitar_aprovacao_excecao`, `rpc_proposta_decidir_aprovacao_excecao`
- `rpc_comissao_liberar/marcar_paga/cancelar/estornar/reabrir/alterar_percentual`

**❌ Faltam (precisam migração + RPC nova):**
1. `rpc_proposta_aprovar` (status → APROVADA, auditoria)
2. `rpc_proposta_reprovar` (motivo, status → REPROVADA)
3. `rpc_proposta_cancelar` / `rpc_proposta_reabrir` (motivo)
4. `rpc_proposta_gerar_contrato` (copia cliente/projetos/valores/módulos/inversores)
5. `rpc_contrato_gerar_aditivo`
6. `rpc_contrato_enviar_engenharia` (cria obra ATIVA status EM_PROJETO_APROVACAO copiando dados)
7. `rpc_contrato_enviar_financiamento` (cria pendência financiamento, gated por `possui_financiamento=true`)
8. `rpc_comissao_gerar_de_contrato` (faixas R$/kWp: 2.00-2.10=3%, 2.11-2.30=4%, 2.31-2.44=5%, ≥2.45=6%)
9. `rpc_proposta_enviar_assinatura` (registra solicitação, status AGUARDANDO_ASSINATURA)
10. Tabela `financiamentos_pendencias` (não existe)
11. Tabela `comercial_assinatura_solicitacoes` (não existe)

## Plano em 3 sub-ondas

### D27.COM.3.a — Backend Crítico (prioridade absoluta) — esta entrega
Criar as 5 RPCs prioritárias + 1 tabela:
- `rpc_proposta_aprovar(p_id, p_observacao)` — single + variant em lote chamando em loop server-side
- `rpc_proposta_gerar_contrato(p_id)` — atômica, copia tudo, vincula `propostas.contrato_id`
- `rpc_contrato_enviar_engenharia(p_id)` — cria `obras` ATIVA + idempotência
- `rpc_contrato_enviar_financiamento(p_id)` — cria `financiamentos_pendencias`
- `rpc_comissao_gerar_de_contrato(p_id)` — calcula faixa R$/kWp e insere em `comercial_comissoes` PREVISTA

Toda RPC: SECURITY DEFINER, search_path=public, REVOKE anon, GRANT authenticated, auditoria em audit_log, idempotente, valida permissão.

### D27.COM.3.b — Wire UI nos 5 botões prioritários
- Repo `comercial-processos-repo.ts` (hooks React Query para as 5 RPCs com toast + invalidate)
- `PropostasPage.tsx`: `ribbonRmComercial({ aprovar, gerarContrato, ... })` chama hooks reais com a proposta atualmente selecionada/vista; lote percorre seleção
- `comercial.tsx` aba Contratos Assinados: `enviarEngenharia`, `enviarFinanciamento`, `gerarComissao` chamam hooks reais com o contrato selecionado
- Botões desabilitam quando não aplicável (sem seleção, status incompatível, financiamento=false, etc.) com tooltip

### D27.COM.3.c — Secundários (próximo turno)
- Reprovar / Cancelar / Reabrir / Aditivo / Enviar Assinatura
- Processos em lote para todos
- Botões "alterar consultor/cidade/canal/origem" em lote

## Decisão necessária antes de migrar

Confirme o seguinte para D27.COM.3.a (precisa do seu OK porque cria 5 RPCs + 1 tabela e ativa fluxo cross-módulo Comercial→Engenharia→Financiamentos):

1. **Aprovação direta** (sem workflow): a `rpc_proposta_aprovar` muda status direto para APROVADA sem passar por `workflow_aprovacoes`. A exceção R$/kWp (workflow D5.1 oficial) continua intacta. OK?
2. **Gerar contrato**: contrato nasce em status `EM_ABERTO` e a proposta vira `CONVERTIDA_EM_CONTRATO` (segue spec C5). Confirma esses estados?
3. **Enviar Engenharia**: criar obra direta em status `EM_PROJETO_APROVACAO` (regra operacional Meta Sun) sem equipe, sem cronograma. OK?
4. **Comissão**: gerar em status PREVISTA usando vendedor do contrato e R$/kWp calculado. Reaproveita trigger `tg_assinatura_cria_comissao`? (se sim, este botão vira "Recalcular comissão" em vez de "Gerar"). Quer manter como "Gerar" idempotente (se já existe PREVISTA, retorna a existente)?
5. **Lote**: tamanho máximo por chamada? Sugestão: 100 registros (igual padrão D20.SUP.4).

Responda OK aos 5 ou ajuste, e eu envio a migração da D27.COM.3.a.