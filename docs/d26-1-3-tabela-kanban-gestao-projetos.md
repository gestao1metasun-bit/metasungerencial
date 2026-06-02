# D26.1.3 — Correção Tabela/Kanban em Gestão de Projetos

**Data:** 2026-06-02  
**Escopo:** `src/routes/engenharia.tsx` → `GestaoProjetosTab` (linha 2024).  
**Tipo:** Fix cirúrgico de UI. **ZERO** alteração de banco, RLS, RPC, regra, workflow, auditoria.

---

## 1. Bug identificado

Na aba **Engenharia → Gestão de Projetos**, o toggle `Por contrato / Kanban / Tabela`
parecia quebrado:

| Visão | Sintoma antes | Causa raiz |
|-------|---------------|------------|
| **Tabela** | Mostrava só projetos pendentes; quando o usuário já tinha aprovado tudo, ficava completamente vazia sem mensagem → "Tabela não funciona" | `flat` filtrava `p.enviadoEngenharia && !p.aprovado` (linha 2042 antiga) |
| **Kanban** | Coluna "Enviados para Engenharia" sempre vazia, mesmo após aprovações | `enviadosGlob: typeof flat = []` (linha 2045 antiga) hardcoded |
| **Por contrato** | OK (filtragem própria no laço interno) | — |

O `useState<"contrato" \| "kanban" \| "tabela">` e os `onClick` dos botões já funcionavam — o bug era de **dados**, não de toggle.

---

## 2. Correção aplicada

**Arquivo:** `src/routes/engenharia.tsx`, `GestaoProjetosTab`.

### 2.1. `flat` agora inclui todos os projetos enviados à Engenharia

```ts
// ANTES
const flat: ... = [];
liberados.forEach((c) => (c.projetos ?? []).forEach((p) => {
  if (p.enviadoEngenharia && !p.aprovado) flat.push({ p, c });
}));
const pendentesGlob = flat;
const enviadosGlob: typeof flat = [];   // ❌ sempre vazio

// DEPOIS (D26.1.3)
const flat: ... = [];
liberados.forEach((c) => (c.projetos ?? []).forEach((p) => {
  if (p.enviadoEngenharia) flat.push({ p, c });
}));
const pendentesGlob = flat.filter(({ p }) => !p.aprovado);
const enviadosGlob  = flat.filter(({ p }) => !!p.aprovado);
```

A visão **Por contrato** continua intacta (laço próprio com filtro `enviadoEngenharia && !aprovado` na linha ~2186), preservando o fluxo operacional original.

### 2.2. Empty-state explícito na Tabela

Quando `flat.length === 0`, a Tabela agora mostra:

> Nenhum projeto enviado à Engenharia ainda. Use a visão **Por contrato** para enviar projetos.

Antes: tabela completamente em branco (sem header útil, sem mensagem) — usuário concluía "o botão não funciona".

### 2.3. Kanban

Já tratava `col.items.length === 0` com placeholder "—" por coluna. Não precisou mudar — o bug aparente era resolvido só com (2.1).

---

## 3. Auditoria de botões — Gestão de Projetos

| Botão | Status |
|-------|--------|
| **Por contrato** | ✅ funcional (default) |
| **Kanban** | ✅ funcional, mostra pendentes e enviados |
| **Tabela** | ✅ funcional, mostra todos enviados + empty-state quando vazio |
| **Adicionar projeto** (Por contrato) | ✅ abre `NovoProjetoDialog` |
| **Editar projeto** (todas as visões) | ✅ abre `EditProjetoDialog` |
| **Enviar p/ Engenharia** (RowActions / Card Kanban) | ✅ chama `updateProjeto` + toast |
| **Remover projeto** (overflow) | ✅ confirm + `removeProjeto` |

Nenhum botão mudo nesta aba.

---

## 4. Restrições respeitadas

- ✅ Sem migração / RLS / RPC / regra de negócio alterada.
- ✅ Sem mexer em Suprimentos / Financeiro / O.S.
- ✅ Sem motor novo.
- ✅ Sem ícone decorativo mudo reintroduzido.
- ✅ Visão "Por contrato" (fluxo original) preservada.

---

## 5. Critério de aceite

| Critério | Status |
|----------|--------|
| Clicar em **Tabela** mostra a tabela corretamente | ✅ |
| Clicar em **Kanban** mostra Kanban correto (com ambas colunas funcionais) | ✅ |
| Filtros / busca preservados ao alternar (não há busca neste tab — N/A) | ✅ |
| Console sem erro | ✅ |
| Nenhum botão visível mudo | ✅ |

**APROVADA.** Pronto para próxima sub-onda (D26.1.4 anti-mute transversal, ou D26.1.2 Processos Comercial).
