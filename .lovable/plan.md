
# Plano — Expansão Comercial + Engenharia (Meta Sun Gerencial)

Escopo grande. Vou implementar em frontend (mock data + estado local) mantendo o visual atual. Backend (Supabase) fica fora desta iteração — quando você quiser persistência real, ativamos Lovable Cloud e migramos os dados.

## 0. Correção rápida (fora do escopo, mas necessária)
- Hydration mismatch em `PageHeader` por `new Date().toLocaleString()`. Mover para `useEffect` + state, renderizando vazio no SSR.

## 1. Módulo Comercial (`src/routes/comercial.tsx`)

**Abas:** Dashboard · Clientes · Propostas · Contratos · Vendedores · Análise Executiva

### Dashboard
- 6 cards (Gerados, Assinados, Pendentes, Cancelados, Valor Assinado, Ticket Médio) com ícone de **olho** no canto superior direito.
- Clique no olho → modal executivo com KPIs + tabela filtrada de contratos (ações: editar, mudar status, cancelar, marcar assinado).
- Painel **Top Vendedores** (qtd, valor, ticket, kWp, conversão, %).
- Gráficos: ranking vendedores, evolução mensal de propostas/contratos/assinaturas, conversão Gerados×Assinados, funil comercial, valor/kWp por mês.

### Clientes (novo CRUD)
- Tabela + modal (nome, CPF/CNPJ, telefone, email, endereço, cidade, UF, vendedor, status, obs). Busca + filtro.

### Propostas
- CRUD existente, expandido: módulos, inversor, banco, status (Em negociação / Enviada / Aguardando retorno / Fechada / Perdida). Mini gráficos.

### Contratos
- Tabela com filtros por status, busca, edição inline de status. Modal de detalhes c/ histórico simples.

### Vendedores
- Cards individuais + ranking + mini-gráfico evolução.

### Análise Executiva
- Alertas (vendedores abaixo da média, pendentes críticos, projeção, tendência).

## 2. Módulo Engenharia (`src/routes/engenharia.tsx`)

**Abas:** Dashboard · Obras Ativas · Cronograma · Pendências · Equipes · Produtividade · Finalizados

### Dashboard
- Cards com **olho** → modal listando obras daquele status com edição/alteração de status.
- Gráficos: por status, por equipe, módulos por equipe/status, evolução finalizadas, produtividade média, pendências por equipe, prazo médio.

### Obras Ativas
- Colunas: ordem, número, cliente, contrato, módulos, potência, INV, INV2, INV3, telhado (select), equipe, início, fim, status, ações.
- Status "Finalizado" remove da aba e move para Finalizados (estado local).

### Cronograma
- Cards por equipe, divididos em Executando (verde) e Aguardando (amarelo).
- Reordenação manual (botões ↑/↓) dentro da mesma equipe + status.
- Recalcula `prev_final` automaticamente via produtividade média da equipe e faixa de módulos.

### Pendências
- CRUD: equipe, cliente, problema, solução, status. Contador vermelho por equipe no cronograma e dashboard.

### Equipes
- Cards com qtd obras (executando/aguardando), módulos, produtividade média, pendências abertas. CRUD.

### Produtividade
- Tabela + gráficos: módulos/dia por equipe, ranking, média por faixa.

### Finalizados
- Lista + olho (detalhes) + botão "Retornar para ativos".

## 3. Mock data (`src/lib/mock-data.ts`)
Expandir: clientes, vendedores (com kWp/conversão/meta), propostas (mais campos), contratos (banco, obs, kWp), obras (INV2, INV3, telhado, ordem), produtividade equipe (médias por faixa).

## 4. Componentes auxiliares novos
- `src/components/app/DetailModal.tsx` — modal reutilizável dos olhinhos.
- `src/components/app/EyeButton.tsx` — botão de olho discreto.

## Detalhes técnicos
- Tudo client-side, React state + `sonner` para toasts.
- Sem mudanças de tema; usa tokens existentes (`primary`, `success`, `warning`, `destructive`, `info`).
- Gráficos com `recharts` (já instalado).
- Sem Supabase nesta etapa (você confirma quando quiser ativar).

Confirma que sigo? Ou prefere que eu **divida em 2 entregas** (1ª: Comercial, 2ª: Engenharia) para revisar antes?
