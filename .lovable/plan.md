## Aditivos Contratuais — Implementação Oficial

Implementar módulo completo de aditivos para contratos assinados, com fluxo, trava operacional, consolidação automática e permissões.

### 1. Store de Aditivos (`src/lib/aditivos-store.ts`)

Novo store (localStorage, padrão do projeto) com:

**Tipo `Aditivo`:**
- `id`, `contratoId`, `numero` (sequencial por contrato: ADT-001, ADT-002...)
- `tipo`: `"acumulativo" | "substitutivo"`
- `impactoFinanceiro`: `boolean`
- `categoria`: `"troca_inversor" | "troca_modulo" | "troca_telhado" | "ajuste_tecnico" | "alteracao_operacional" | "financeiro" | "outro"`
- `descricao`, `motivo`
- `status`: `"CRIADO" | "AGUARDANDO_ASSINATURA" | "ASSINADO" | "AGUARDANDO_APROVACAO" | "APROVADO" | "REPROVADO" | "CANCELADO"`
- `alteracoes`: objeto com deltas — `modulos?`, `inversores?`, `potenciaKwp?`, `valor?`, `endereco?`, `estruturaTecnica?`, `observacoesTecnicas?`
- `distribuicaoProjetos`: `Array<{ projetoId, deltaModulos, deltaValor }>` (calculada automaticamente, editável)
- `anexoAssinadoUrl?`, `dataCriacao`, `dataAssinatura?`, `dataAprovacao?`
- `criadoPor`, `aprovadoPor?`, `reprovadoMotivo?`

**Funções:**
- `criarAditivo(contratoId, dados)` → registra audit
- `enviarParaAssinatura(id)`, `anexarAssinado(id, url)`, `enviarParaAprovacao(id)`
- `aprovarAditivo(id, usuario)` → aplica alterações no contrato (consolidação automática) e distribui nos projetos
- `reprovarAditivo(id, motivo)` → libera trava, descarta alterações pendentes
- `getAditivosByContrato(contratoId)`, `getAditivoAtivo(contratoId)` (último substitutivo válido)
- `temAditivoPendente(contratoId)` → boolean (qualquer status != APROVADO/REPROVADO/CANCELADO)
- `getCamposBloqueados(contratoId)` → retorna áreas impactadas pelo aditivo pendente

### 2. Consolidação Automática

Ao aprovar:
- Soma deltas no `ContratoFull` (módulos, inversores, kWp, valor)
- Se substitutivo: marca aditivos anteriores como `oculto: true` operacionalmente
- Se acumulativo: soma sobre estado consolidado atual
- Distribuição proporcional automática em projetos (regra de 3 sobre módulos atuais), com possibilidade de override manual antes de aprovar
- Registra audit completo (campo, valor anterior, valor novo)

### 3. Trava Operacional Parcial

Função `podeExecutarAcao(contratoId, acao)` onde `acao` ∈ `"finalizar_obra" | "liberar_estoque" | "faturar" | "gerar_financeiro" | "concluir_etapa_critica" | "consolidar"`.

- Se houver aditivo pendente que impacte a área → bloqueia
- Áreas não impactadas continuam livres
- Hook `useAditivoLock(contratoId)` para consumir em telas

### 4. UI — Componentes Novos

**`src/components/app/AditivoBadge.tsx`**: badge vermelho "CONTRATO COM ADITIVO PENDENTE" reutilizável (contrato, projeto, obra, dashboard).

**`src/components/app/AditivoDialog.tsx`**: dialog multi-step:
1. Tipo (acumulativo/substitutivo) + impacto financeiro (sim/não) + categoria
2. Alterações (campos dinâmicos conforme categoria)
3. Distribuição nos projetos (preview automático + edição manual)
4. Revisão + criação

**`src/components/app/AditivosPanel.tsx`**: lista de aditivos do contrato com timeline de status, ações conforme status:
- CRIADO → "Enviar para assinatura"
- AGUARDANDO_ASSINATURA → "Anexar assinado"
- ASSINADO → "Enviar para aprovação"
- AGUARDANDO_APROVACAO → "Aprovar" / "Reprovar" (só Financeiro/Diretoria)

### 5. Integração com Telas Existentes

**`src/routes/comercial.tsx` (Contratos)**:
- Botão "Novo aditivo" no detalhe do contrato (só visível para contratos APROVADOS/ASSINADOS)
- Aba "Aditivos" mostrando AditivosPanel
- Badge de aditivo pendente na lista e no detalhe
- Exibir valores/módulos consolidados (não os originais)

**`src/routes/engenharia.tsx`**:
- Badge de aditivo pendente em obras/projetos do contrato afetado
- Bloquear botões "Finalizar etapa crítica" e "Liberar estoque" quando aditivo pendente impacta área

**`src/routes/financeiro.tsx`** + **`src/routes/financiamentos.tsx`**:
- Bloquear "Faturar" / "Gerar financeiro" com tooltip explicativo
- Badge na linha

**`src/routes/dashboard.tsx`**:
- Card "Aditivos pendentes" com contagem e link

### 6. Permissões

Em `src/lib/auth-store.ts`, helper `podeGerenciarAditivos()` → `true` para perfis Financeiro, Diretoria, Admin Master, Admin Geral. Botões de criar/aprovar/reprovar ficam ocultos para outros perfis.

### 7. Regra: Contrato Assinado Não Volta

Remover/desabilitar qualquer botão "voltar etapa" / "reabrir comercial" em contratos com status assinado. Substituir por CTA "Criar aditivo".

### 8. Auditoria

Toda ação de aditivo registra via `pushAudit()` com entidade `"contrato"` e detalhe descrevendo o aditivo (criação, assinatura, aprovação, reprovação, consolidação, distribuição).

---

### Arquivos novos
- `src/lib/aditivos-store.ts`
- `src/components/app/AditivoBadge.tsx`
- `src/components/app/AditivoDialog.tsx`
- `src/components/app/AditivosPanel.tsx`

### Arquivos editados
- `src/lib/contratos-store.ts` (campo `aditivosConsolidados`, helpers de consolidação)
- `src/lib/auth-store.ts` (permissão `podeGerenciarAditivos`)
- `src/routes/comercial.tsx` (aba + botão + badge + bloqueio de "voltar")
- `src/routes/engenharia.tsx` (badge + bloqueios)
- `src/routes/financeiro.tsx` (bloqueios + badge)
- `src/routes/financiamentos.tsx` (bloqueios + badge)
- `src/routes/dashboard.tsx` (card de pendências)

### Persistência

Mantenho localStorage (padrão atual do ERP — alinhado com a auditoria, que recomenda migração futura para Supabase). Quando a migração para banco acontecer, este store entra no mesmo lote.

### Confirmações que preciso antes de codar
Vou seguir as regras como descritas, **a menos que** você queira ajustar:
- Distribuição automática proporcional aos módulos **já existentes** em cada projeto (e não por área/potência). OK?
- "Concluir etapas críticas" = últimas 3 etapas do kanban de engenharia (Vistoria final, Comissionamento, Entrega). OK?
- Aditivo substitutivo oculta os anteriores **apenas operacionalmente** (continuam visíveis no histórico). OK?