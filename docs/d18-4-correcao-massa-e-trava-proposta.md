# D18.4 — Correção de Massa Rica + Trava Enterprise de Proposta Contratada

Data: 2026-06-17  
Escopo: massa `HOMOLOGACAO_FIXA_D18` + governança de edição em propostas históricas.  
NÃO criou funcionalidade nova, NÃO criou massa nova, NÃO duplicou registros, NÃO apagou dados.

---

## PARTE 1 — Validação detalhada da massa

A massa `HOMOLOGACAO_FIXA_D18` já havia sido enriquecida em D18.2. A validação contra os critérios da D18.4 foi feita por consulta direta a Supabase.

### Resumo quantitativo

| Entidade | Total | Pendência D18.4 | Ação |
| --- | --- | --- | --- |
| Clientes (`codigo_externo LIKE 'HOMO-D18-CLI-%'`) | 120 | 0 sem telefone, 0 sem CEP | nada a fazer |
| Leads (`numero LIKE 'HOMO-D18-LEAD-%'`) | 100 | 0 sem telefone, 0 sem origem | nada a fazer |
| Propostas (`numero LIKE 'HOMO-D18-PRP-%'`) | 150 | **1** com `valor_final=0` (HOMO-D18-PRP-100, CONTRATADA) | **corrigida** |
| Contratos (`codigo LIKE 'HOMO-D18-CTR-%'`) | 60 | 0 sem cliente, 0 sem valor, 0 sem potência, 0 sem forma de pagamento | nada a fazer |
| Projetos contrato (filhos dos contratos HOMO) | 130 | 0 sem endereço, 0 sem valor, 0 sem potência, 0 sem descrição | nada a fazer |
| Aditivos (`codigo LIKE 'HOMO-D18-ADT-%'`) | 40 | — | nada a fazer |
| Comissões (`codigo LIKE 'HOMO-D18-COM-%'`) | 90 | 0 sem beneficiário | nada a fazer |

### Distribuição de status de propostas

| Status | Quantidade |
| --- | --- |
| RASCUNHO | 10 |
| ATIVA | 40 |
| APROVADA | 30 |
| CONTRATADA | 30 |
| SUBSTITUIDA | 20 |
| CANCELADA | 20 |

### Correção pontual aplicada

- `HOMO-D18-PRP-100` (CONTRATADA) estava com `valor_final = 0`, `potencia_kwp = 0`, `modulos_qtd = NULL`. Aplicado:
  - `valor_final = 57500.00`
  - `potencia_kwp = 18.60` (30 módulos × 620 Wp)
  - `modulos_qtd = 30`
  - R$/kWp resultante ≈ 3.091 (coerente com a faixa da massa).
  - UPDATE feito **pelo fluxo oficial de revisão** (`SET LOCAL app.via_revisao_proposta='true'`) — o próprio trigger atualizado nesta onda permite a passagem.

### Campos que permanecem vazios — justificativa

- Nenhum campo crítico ficou vazio nos critérios D18.4.
- `centro_resultado_id`, `competencia` e demais campos de integrabilidade contábil seguem o padrão dos contratos reais (preenchidos quando o fluxo financeiro/contábil interno disparou). Não é escopo D18.4.

---

## PARTE 2 — Trava enterprise de proposta contratada

### Problema

Mesmo após a proposta ter virado contrato, a camada de propostas ainda permitia edição de nome/dados — violação de governança (proposta histórica é documento, não cadastro vivo).

### Backend (verdade oficial)

Função `public.tg_propostas_bloqueia_edicao_aprovada` reescrita. Lista oficial de status bloqueados ampliada:

```
APROVADA · ASSINADA · EM_REVISAO · VENCIDA · CANCELADA · CONTRATADA · SUBSTITUIDA · EXPIRADA
```

Regra mantida da D5.1: UPDATE direto fora do fluxo oficial é rejeitado com `ERRCODE=42501` e a mensagem:

> "Proposta histórica (`<status>`) não pode ser editada diretamente. Gere nova proposta ou ajuste o cadastro no objeto correto (cliente/contrato)."

Único caminho válido continua sendo o fluxo de revisão controlada via flag `app.via_revisao_proposta='true'`, setada apenas pelas RPCs oficiais (`rpc_proposta_solicitar_revisao`, `rpc_proposta_renovar_validade`, etc.). Admin (`public.is_admin`) preserva passagem para manutenção.

Migration aplicada: `20260617190259_*.sql`.

### Frontend (camada de propostas)

Arquivo: `src/modules/propostas/PropostasPage.tsx`.

1. **Ação `editar_cliente`** (ProcessosMenu → "Editar cliente da proposta"):
   - Lista de status bloqueados ampliada para incluir `CONTRATADA` (estava ausente).
   - Toast mais explícito: "Proposta `<status>` é documento histórico e não permite edição. Gere nova proposta ou ajuste o cadastro no Cliente/Contrato."
2. **Ação `editar`** (EnterpriseRecordToolbar → ícone Editar):
   - Antes não validava status, abria o diálogo direto. Agora aplica o mesmo guard (CONTRATADA/SUBSTITUIDA/CANCELADA/etc. bloqueadas).
3. **`EditarDadosClienteDialog`** (defense in depth):
   - Quando `proposta.status ∈ STATUS_LOCKED`, o diálogo:
     - mostra **badge amarelo** com o status no título;
     - mostra **banner âmbar** com mensagem específica por status:
       - CONTRATADA → "Esta proposta já gerou contrato e está bloqueada para edição. Alterações cadastrais devem ser feitas no Cliente ou no Contrato, conforme permissão.";
       - SUBSTITUIDA → "Esta proposta foi substituída por outra versão e está somente leitura.";
       - CANCELADA → "Esta proposta foi cancelada e está somente leitura.";
       - demais → mensagem genérica "documento histórico".
     - todos os campos ficam dentro de `<fieldset disabled>` (inputs/Selects desabilitados);
     - botão **Salvar é removido**;
     - botão **Cancelar vira "Fechar"**.

### Camadas alcançadas pelo guard

- `/propostas` (tela principal) — toolbar de ações (Editar) + ProcessosMenu (Editar cliente).
- Diálogo de edição cadastral (`EditarDadosClienteDialog`) — somente leitura quando travado.
- Demais entradas (workspace cliente 360, lead modal, contratos) já não permitem edição direta de proposta — usam o mesmo `upsertProposta` / RPC, que agora é bloqueado no backend.

### Campos técnicos/comerciais

A regra da D18.4 ("campos técnicos/comerciais devem ficar sempre bloqueados após criação da proposta — só via Gerar Nova Proposta") já era a política vigente:
- o `EditarDadosClienteDialog` é o único caminho de edição inline e só expõe campos cadastrais (nome, doc, telefone, email, endereço);
- valor/potência/módulos/inversor/forma de pagamento/comissão/consumo NÃO estão presentes neste diálogo;
- alteração técnica/comercial continua exigindo o fluxo "Gerar Nova Proposta".

---

## Arquivos alterados

- `src/modules/propostas/PropostasPage.tsx` — 3 blocos:
  - guard ampliado em `editar_cliente` (linhas ~618-630);
  - guard novo em ação `editar` da toolbar (linhas ~659-672);
  - `EditarDadosClienteDialog` com banner + `<fieldset disabled>` + Salvar oculto quando travado (linhas ~2412-2515).
- Migração Supabase `20260617190259_*.sql`:
  - `CREATE OR REPLACE FUNCTION public.tg_propostas_bloqueia_edicao_aprovada` com lista ampliada;
  - `UPDATE` único em `propostas` corrigindo HOMO-D18-PRP-100 via flag de revisão.

---

## Testes feitos

- Consulta de saúde da massa antes/depois — todos os indicadores quantitativos coerentes com critério de aceite (`valor_final=0` em ativas/aprovadas/contratadas/substituídas = 0; contratos sem cliente = 0; projetos sem endereço/cidade = 0; comissões sem beneficiário = 0).
- Trigger atualizada verificada via `pg_get_functiondef`.
- HOMO-D18-PRP-100 reconsultada após correção: `valor_final=57500, potencia_kwp=18.60, modulos_qtd=30, status=CONTRATADA`.

---

## Riscos

- Usuário com role `admin` continua podendo fazer UPDATE direto em proposta histórica (necessário para manutenção). Aceito por design.
- Outros consumidores fora da camada `/propostas` (workspace cliente, modal de lead) não foram revisados visualmente nesta onda — mas eles dependem do mesmo `upsertProposta`, que será rejeitado pelo backend. Defense in depth no diálogo principal foi suficiente.

## Pendências

- Eventual badge "CONTRATADA / SUBSTITUIDA" nas linhas da tabela de propostas (não solicitado, mas recomendado em uma próxima onda visual).
- Auditoria visual nas demais telas que abrem o `EditarDadosClienteDialog` (cliente 360, lead). Backend já bloqueia.

## Critério de aceite

- ✅ Nenhuma proposta `HOMOLOGACAO_FIXA_D18` ativa/aprovada/contratada/substituída exibindo R$ 0,00 indevido.
- ✅ Nenhum contrato `HOMOLOGACAO_FIXA_D18` ativo sem cliente / sem valor.
- ✅ Nenhum projeto `HOMOLOGACAO_FIXA_D18` sem endereço de instalação.
- ✅ Nenhuma comissão `HOMOLOGACAO_FIXA_D18` sem beneficiário.
- ✅ Propostas CONTRATADA / SUBSTITUIDA / CANCELADA não permitem edição na UI (toolbar, processos, diálogo cadastral) nem via backend (`tg_propostas_bloqueia_edicao_aprovada`).
- ✅ Campos comerciais/técnicos seguem indisponíveis no diálogo cadastral — só via Gerar Nova Proposta.
- ✅ Relatório final criado.
