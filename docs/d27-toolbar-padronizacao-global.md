# D27 — Padronização global da Toolbar Operacional (RM/TOTVS)

**Data:** 2026-06-02 · **Escopo:** UI/UX transversal · **Zero** alteração em banco, RLS, RPC, workflow, auditoria ou regras.

## O que mudou

Alteração cirúrgica única no componente compartilhado `EnterpriseRecordToolbar`
(`src/components/app/enterprise/EnterpriseRecordToolbar.tsx`). Como esse
componente já é a toolbar oficial dos 11 módulos operacionais, a mudança
cascateia automaticamente para todos sem tocar tela a tela.

### Antes
```
[Novo][Editar][Salvar][Excluir][Cancelar] | [Atualizar][Visualizar] | [Buscar] | [Anexos][Histórico][Processos▼][Filtros: Todos▼]  ⟶  [Exportar][Imprimir] | [Colunas]
```

### Depois (padrão RM/TOTVS oficial)
```
[Novo][Editar][Salvar][Excluir][Cancelar] | [Atualizar][Visualizar] | [Anexos][Histórico][Processos▼][Filtros: Todos▼]  ⟶  [Colunas][Exportar][Imprimir] | [Buscar →]
```

- **Busca** movida para a extrema direita da linha operacional (largura ampliada de 44 → 56).
- **Filtros** e **Processos** permanecem na mesma linha, à esquerda, agrupados.
- **Colunas / Exportar / Imprimir** ficam no cluster direito imediatamente antes da busca.
- Nenhuma ação removida — apenas reordenadas.

## Módulos impactados automaticamente

Todos os módulos que adotam `EnterpriseRecordToolbar` já recebem o novo padrão:

| Módulo | Telas principais |
|---|---|
| Comercial | Leads, Propostas, Contratos, Carteira, Comissões |
| Suprimentos | Requisições, Cotações, Pedidos, Recebimentos, Alçadas, Itens |
| Financeiro | Títulos, Adiantamentos, Renegociações, Conciliação, Lançamentos |
| O.S. / Engenharia | Gestão de Serviços, Obras, Materiais da O.S. |
| Aprovações | Visão Unificada, Workflow |
| Notificações | Central |
| Auditoria | /auditoria |
| Financiamentos | Tela principal |
| Cadastros / Configurações | Telas que já usam o barrel enterprise |

## O que NÃO entrou nesta onda

Os itens abaixo do pedido D27 não são alterações de toolbar — exigem auditoria
tela a tela e ficam como sub-ondas seguintes:

1. **D27.1** — Auditoria de botões mudos por módulo (mensagem "Função em implantação").
2. **D27.2** — Bug "Tabela" não funciona em Gestão de Projetos (corrigir toggle Tabela/Kanban).
3. **D27.3** — Consolidar processos contextuais por módulo (Comercial primeiro: Aprovar/Reprovar/Retornar/Gerar contrato/Aditivo/Cancelar/Enviar p/ assinatura).
4. **D27.4** — Padronizar placeholder de busca por contexto (`Buscar contrato, cliente…`, `Buscar requisição…`, etc.) — cada tela já passa `searchPlaceholder` próprio, basta revisar os textos.

## Restrições respeitadas
- ✅ Sem migração, sem RLS, sem RPC nova, sem permissão nova.
- ✅ Sem regra de negócio alterada.
- ✅ Sem perda de função — apenas reposicionamento visual.
- ✅ Compatível com todas as telas existentes (assinatura do componente intacta).

## Critério de aceite atendido
- [x] Busca à direita em todas as telas operacionais com toolbar enterprise.
- [x] Filtros e Processos na mesma linha operacional.
- [x] Colunas/Exportar agrupados antes da busca.
- [x] Nenhuma assinatura quebrada → build limpo.
