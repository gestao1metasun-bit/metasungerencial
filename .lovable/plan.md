## Visão geral

Implementar a governança comercial do ERP Meta Sun: enums de status canônicos, módulo de **Leads** novo, refatoração de **Propostas** (vinculadas a lead, multi-versão), **Contratos** (gerar/assinar/enviar engenharia), cadeia de dependência Lead→Proposta→Contrato→Engenharia, histórico/auditoria em todas as ações sensíveis, e controle de permissões (Admin Master / Gerente Comercial / Consultor).

Por ser uma mudança grande, proponho **dividir em 4 entregas** sequenciais, validando cada uma antes de seguir. Tudo continua em store local (localStorage), seguindo o padrão atual do projeto — sem migração para Supabase agora.

---

## Entrega 1 — Fundação (status + auditoria + leads)

**1.1 Enums de status canônicos** — `src/lib/status-catalog.ts` (novo)
- `PROPOSTA_STATUS` (11 valores), `CONTRATO_STATUS` (7 valores), `LEAD_STATUS` (`LEAD_CADASTRADO`, `EM_ATENDIMENTO`, `PROPOSTA_SOLICITADA`, `CONVERTIDO_EM_CONTRATO`, `PERDIDO`).
- Helpers: `labelStatus()`, `colorStatus()`, `nextAllowed()` (transições válidas).
- Substituir todas as strings soltas de status nos stores existentes pelos enums.

**1.2 Módulo de auditoria** — `src/lib/audit-store.ts` (novo)
- `AuditEntry { id, entidade, entidadeId, acao, usuario, data, campo?, valorAnterior?, valorNovo?, motivo? }`.
- `pushAudit(entry)`, `getHistorico(entidade, entidadeId)`.
- Componente `<HistoricoTimeline entidade entidadeId />` reaproveitável.

**1.3 Permissões** — extender `src/lib/auth-store.ts`
- Helpers: `isAdminMaster()`, `isGerenteComercial()`, `canChangeOrigemLead()`, `canChangeConsultorLead()`, `canReabrirProposta()`.

**1.4 Módulo Leads** — `src/modules/leads/` (novo)
- `store.ts`: `Lead { id, nome, telefone, consumoKwh, consultorId, origem, observacao?, status, criadoEm, criadoPor }`. Origem = enum `ORIGEM_LEAD` (10 opções).
- `LeadList.tsx`: tabela com busca/filtro por status/origem/consultor + colunas reordenáveis (mesmo padrão de Propostas).
- `LeadForm.tsx`: dialog "Novo Lead" com validação dos 5 obrigatórios.
- `LeadDetail.tsx`: ficha do lead com aba histórico, botão **Solicitar Proposta**, botões protegidos para alterar origem/consultor (com motivo obrigatório → grava audit).
- Rota `/comercial` ganha aba **Leads**.

---

## Entrega 2 — Propostas refatoradas

**2.1 Refatorar `src/modules/propostas/store.ts`**
- Adicionar `leadId` (obrigatório), `numero` (sequencial por lead: P01, P02…), `responsavelGeracao`, `dataSolicitacao`.
- Status passa a usar `PROPOSTA_STATUS`.
- Toda mutação chama `pushAudit` (campo, antes, depois).
- Multi-proposta por lead (já suportado, garantir que nenhuma sobrescreva).

**2.2 Tela Propostas** — `src/modules/propostas/components/PropostaList.tsx`
- Filtro por status novo, coluna "Lead", clique abre detalhe.
- Tela detalhe: aba **Histórico** (timeline de auditoria).
- Botão **Aprovar Proposta**: se o lead tem >1 proposta, modal com lista para escolher; ao confirmar:
  - aprovada → `APROVADA`
  - demais → `OBSOLETA`
  - lead → `CONVERTIDO_EM_CONTRATO`
  - dispara fluxo de geração de contrato (Entrega 3).

**2.3 Solicitar Proposta a partir do Lead**
- Modal puxa dados do lead (nome, telefone, consumo, consultor, origem) — read-only.
- Permite preencher: observação, tipo de sistema, cidade, concessionária, anexos.
- Cria proposta com status `AGUARDANDO_GERACAO`; lead vai pra `PROPOSTA_SOLICITADA`.

---

## Entrega 3 — Contratos + dependência

**3.1 Refatorar `src/lib/contratos-store.ts`**
- Status passa a usar `CONTRATO_STATUS`.
- `Contrato.propostaId` e `Contrato.leadId` obrigatórios.
- `contratoAssinadoArquivo?: { nome, dataUrl, anexadoPor, anexadoEm }`.
- Auditoria em todas as mutações.

**3.2 Validação pré-contrato** — função `validarDadosFinalizacao(propostaId)`
- Checa cliente completo (nome, doc, telefone, endereço, cidade, UF, concessionária), proposta aprovada, valor, módulos, potência, inversor, estrutura.
- Se faltar, abre `ComplementacaoCadastralDialog` com os campos pendentes.

**3.3 Botão Gerar Contrato** (na proposta aprovada)
- Após validar, cria contrato com status `CONTRATO_GERADO`, copia dados da proposta, trava a proposta para edição livre, marca proposta como `CONVERTIDA_EM_CONTRATO`.

**3.4 Tela Contratos** — `/comercial?tab=contratos`
- Tabela: número, cliente, consultor, proposta vinculada, valor, status, ações.
- Detalhe: dois botões separados — **Visualizar Contrato** e **Anexar Contrato Assinado** (upload PDF/imagem). Anexar → status `CONTRATO_ASSINADO`, grava audit.

**3.5 Envio automático para Engenharia**
- Ao status virar `CONTRATO_ASSINADO` (ou regra: ao gerar contrato — confirmar abaixo), criar registro em `engenharia-store` (`ObraAtiva`) vinculado ao contrato. Status do contrato → `ENVIADO_PARA_ENGENHARIA`.

**3.6 Cadeia de dependência (travas)**
- `podeExcluirContrato(id)` → false se houver obra vinculada ativa.
- `podeReabrirProposta(id)` → só Admin Master + sem contrato/obra dependente.
- Mensagens de bloqueio conforme spec.
- Ao reabrir proposta: motivo obrigatório, status volta para `EM_ELABORACAO`, audit completo.

---

## Entrega 4 — Comparativo Contratado vs Executado

**4.1** Estender `engenharia-store` para guardar `executado: { modulos, potenciaModulo, inversores, estrutura, telhado }` separado dos dados contratados.

**4.2** Componente `<ContratadoVsExecutado contratoId />` exibido na obra e no contrato — tabela lado a lado com diferenças destacadas.

**4.3** Engenharia pode editar dados executados sem alterar o contrato.

---

## Detalhes técnicos consolidados

```text
src/
├── lib/
│   ├── status-catalog.ts          (novo) enums + helpers
│   ├── audit-store.ts             (novo) histórico universal
│   ├── auth-store.ts              (estender) helpers de permissão
│   ├── contratos-store.ts         (refatorar) enum + audit + dependências
│   └── engenharia-store.ts        (estender) campo `executado`
├── modules/
│   ├── leads/                     (novo) store + páginas
│   │   ├── store.ts
│   │   ├── LeadsPage.tsx
│   │   └── components/{LeadList,LeadForm,LeadDetail,SolicitarPropostaDialog}.tsx
│   └── propostas/
│       └── store.ts               (refatorar) leadId + numero + audit
├── components/app/
│   ├── HistoricoTimeline.tsx      (novo)
│   └── ContratadoVsExecutado.tsx  (novo)
└── routes/
    └── comercial.tsx              (estender) abas Leads, Propostas, Contratos
```

Padrão de cada ação (vale para todas):
- valida → muta store → `pushAudit` → toast → atualiza UI.
- Permissão checada antes da ação; mensagem de bloqueio padronizada.

---

## Pontos para confirmar antes de começar

1. **Quando dispara "ENVIADO PARA ENGENHARIA"?** A spec diz "quando proposta for aprovada e contrato for gerado" (item 15) e também menciona "anexar contrato assinado" (item 14). Proponho: cria a obra ao **gerar contrato** (item 15 literal), e ao **anexar assinado** muda status para `CONTRATO_ASSINADO`. Confirma?
2. **Faço as 4 entregas em sequência nesta mesma conversa**, validando build a cada uma? Ou prefere que eu entregue as 4 de uma vez?
3. **Origem do lead — campo `motivo` da alteração** é texto livre obrigatório?

Após sua aprovação, começo pela Entrega 1.
