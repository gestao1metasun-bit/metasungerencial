# D15.1 Frente 4 — Planejamento Arquitetural D16 (sem implementação)

**Versão:** 1.0 · 2026-05-28
**Status:** somente arquitetura funcional. Nenhuma migração, código ou RLS
será executada nesta fase.
**Pré-requisito para iniciar D16:** operação assistida estabilizada
(critérios da Frente 3 §4).

## 1. Princípios D16

1. Reaproveitar a fundação D15 (workflow, governance, auditoria, anexos,
   idempotência, row_version, error_log).
2. Nenhum módulo novo nasce sem natureza, CR e conta padrão.
3. Compras NUNCA nasce sozinha — sempre origina-se em pedido/solicitação
   (regra de pedra já memorizada).
4. Sem fiscal/contábil. Integrabilidade via campos universais
   (`codigo_externo`, `status_integracao`, etc.).
5. Sem integrações externas nesta janela.

## 2. Módulo D16.1 — Compras

### 2.1 Fluxo funcional
```text
Solicitação Interna
   ↓ (workflow: solicitante → líder área)
Aprovação técnica/orçamentária
   ↓ (workflow: alçada por valor)
Cotação (≥ N fornecedores)
   ↓
Pedido de Compra (PC oficial)
   ↓
Recebimento (físico + nota)
   ↓
Lançamento em Estoque
   ↓
Geração de Título a Pagar (financeiro)
```

### 2.2 Entidades previstas
| Entidade | Origem | Estado oficial |
|---|---|---|
| `solicitacoes_compra` | usuário | rascunho → enviada → aprovada → cotação → pedido → cancelada |
| `cotacoes_compra` + `cotacao_itens` | solicitação aprovada | aberta → respondida → escolhida |
| `pedidos_compra` + `pedido_compra_itens` | cotação escolhida | emitido → recebido_parcial → recebido → cancelado |
| `recebimentos_compra` | pedido | pendente → conferido → divergente |
| (já existe) `boletos` / títulos AP | recebimento | reusa fundação financeira |

### 2.3 Integração com fundação D15
- Workflow: usa `workflow_aprovacoes` com novas alçadas `compras.aprovar_*`.
- Governance: cada transição registrada em `governance_matrix`.
- Anexos: notas, e-mails, PDFs via `anexos-repo` (entidade `pedido_compra`).
- Idempotência: `rpc_idempotente_*` para evitar duplicação de PC.
- Estoque: entrada via RPC oficial estoque (D10).
- Financeiro: título nasce via `rpc_lancamento_criar`.

## 3. Módulo D16.2 — Ordem de Serviço (OS)

### 3.1 Fluxo funcional
```text
Cliente → Projeto/Contrato
   ↓
Abertura de OS (tipo: instalação/manutenção/vistoria/garantia)
   ↓
Atribuição de Equipe
   ↓
Atividades + Checklist
   ↓
Execução em campo (fotos + assinatura)
   ↓
Encerramento (relatório + impacto financeiro)
```

### 3.2 Entidades previstas
| Entidade | Estado oficial |
|---|---|
| `ordens_servico` | aberta → em_execucao → aguardando_cliente → concluida → cancelada |
| `os_atividades` | pendente → em_andamento → concluida → bloqueada |
| `os_checklist` | itens com OK/NOK + observação |
| `os_evidencias` | fotos/assinaturas via storage |
| `os_apontamentos_tempo` | horas por técnico (futuro: integra payroll) |

### 3.3 Integrações
- Anexos universais (entidade `ordem_servico`).
- Pós-venda alimenta abertura automática de OS de garantia.
- Geração de título a receber em casos faturáveis (via lançamentos).

## 4. Módulo D16.3 — Formulários Operacionais

### 4.1 Tipos
1. **Instalação** — checklist por kit/sistema.
2. **Vistoria** — diagnóstico inicial / pós-obra.
3. **Entrega** — termo + assinatura do cliente.
4. **Garantia** — abertura de chamado, evidência.
5. **Pós-venda** — pesquisa de satisfação + NPS.

### 4.2 Arquitetura
- Tabela genérica `formularios_modelo` (definição) + `formularios_resposta`
  (execução), JSONB por flexibilidade, validado por schema declarativo.
- Cada resposta vincula a uma entidade (OS, contrato, projeto, cliente).
- Assinatura: storage bucket dedicado + hash imutável armazenado.
- Evidências fotográficas: storage + thumbnail + metadado EXIF resumido.

### 4.3 Reúso D15
- `anexos-repo` para fotos/PDFs.
- `error_log` para falhas de upload.
- `row_version` para conflitos de edição offline.

## 5. Ordem sugerida de execução D16

1. **D16.1 Compras** (base operacional do dia a dia).
2. **D16.2 OS** (depende de cliente/projeto/equipe — já existem).
3. **D16.3 Formulários** (transversal, depende de OS).

## 6. Itens explicitamente FORA da D16

- Fiscal/contábil completo (SPED/ECD/ECF/apuração).
- Integrações externas (Domínio, Sankhya, Bling, etc.).
- BI/analytics avançados.
- Nova arquitetura de shell.
- Refator de telas legadas que não pertençam ao fluxo de Compras/OS.

## 7. Critério de "Pronto para iniciar D16"

- Operação assistida estável (Frente 3 §4) cumprida.
- Erros `fatal` zerados por 5 dias.
- Reconciliação fechando com extrato real.
- LS crítico do financeiro removido (refator TitulosTab + hub).
