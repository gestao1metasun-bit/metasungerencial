## Objetivo

Adicionar ao módulo Financeiro uma camada **madura de renegociação** sobre os títulos existentes, sem quebrar o histórico atual (`Movimento`, baixas, estornos, fechamento). Toda renegociação fica auditada e o título original **nunca é apagado**.

Permanece tudo client-side (Zustand + localStorage), seguindo o padrão atual de `fin-titulos-store.ts`. Migração para Supabase fica para fase futura (Fase E já mapeada).

---

## Fase 1 — Parâmetros Financeiros (configuração)

Novo store `src/lib/fin-parametros-financeiros-store.ts`:

```ts
ParametrosFinanceiros {
  jurosTipo: "percentual" | "fixo";
  jurosModo: "diario" | "mensal";
  jurosValor: number;            // ex: 1 (% a.m.)
  multaTipo: "percentual" | "fixo";
  multaValor: number;            // ex: 2 (%)
  carenciaDias: number;          // dias sem cobrança
  toleranciaAtrasoDias: number;  // não aplica multa
  limiteDescontoSemAprovacao: number; // %
  limiteDescontoDiretoria: number;     // % acima exige diretoria
}
```

UI: nova aba `/financeiro` → **Parâmetros Financeiros** (grupo Estrutura).

## Fase 2 — Modelo de Renegociação

Estender `fin-titulos-store.ts` (sem migração destrutiva):

```ts
type Renegociacao = {
  id: string;
  tituloOriginalId: string;
  data: string;                 // ISO
  valorOriginal: number;
  jurosCalculado: number;
  jurosAplicado: number;        // após ajuste
  multaCalculada: number;
  multaAplicada: number;
  desconto: number;
  descontoPct: number;
  valorFinal: number;
  motivo: string;
  usuarioId: string;
  aprovadoPor?: string;         // se exigiu diretoria
  nivelAprovacao: "auto" | "financeiro" | "diretoria";
  tipoSaida: "parcela_unica" | "parcelado";
  parcelasGeradas: string[];    // ids dos novos títulos
  observacao?: string;
};

// no Titulo:
renegociacaoId?: string;        // título-filho aponta para origem
renegociadoEm?: string;         // título-pai marcado como renegociado
statusRenegociacao?: "ativo" | "renegociado" | "renegociacao";
```

Regras:
- Título original recebe `statusRenegociacao = "renegociado"` e fica **bloqueado para baixa direta** (saldo zerado contabilmente, mas registro preservado).
- Novos títulos nascem com `renegociacaoId` referenciando a renegociação.
- Histórico em `audit_log` (já existente via `pushAudit`).

## Fase 3 — Cálculo canônico

Novo `src/lib/fin-calculo-encargos.ts`:

```ts
calcularEncargos(titulo, dataRef, params) → {
  diasAtraso, jurosSugerido, multaSugerida, valorComEncargos
}
```

Usado por: simulação, baixa com atraso, renegociação.

## Fase 4 — UI Simulador / Modal de Renegociação

Novo `src/components/app/financeiro/RenegociarTituloDialog.tsx`:

- Sumário: valor original, dias de atraso, juros calc, multa calc.
- Inputs: ajustar juros (R$ ou %), ajustar multa, conceder desconto, motivo (obrigatório, min 5 chars).
- Toggle **parcelar**: nº parcelas, 1º vencimento, intervalo (dias/mês) → preview.
- Indicador de aprovação: chip "auto / requer financeiro / requer diretoria" conforme `% desconto`.
- Botão **Simular** (não persiste) e **Confirmar renegociação**.

Entradas no menu de ações da linha do título (aba Operação).

## Fase 5 — Indicadores

Nova aba `/analytics` ou card no DRE:
- Valor renegociado no período
- Desconto concedido (R$ e %)
- Recuperação de inadimplência
- Top clientes com renegociações
- Alerta: consultor/usuário com % de desconto acima da média

Métricas calculadas client-side a partir das renegociações.

## Fora do escopo (Fase futura)

- Persistência Supabase de títulos/renegociações.
- Workflow de aprovação assíncrono (notificação ao diretor).
- Integração com boletos/banco.
- Movimentação automática de juros/multa em contas de receita.

---

## Arquivos a criar / editar

**Criar**
- `src/lib/fin-parametros-financeiros-store.ts`
- `src/lib/fin-calculo-encargos.ts`
- `src/lib/fin-renegociacao-store.ts` (operações: simular, confirmar, listar histórico)
- `src/components/app/financeiro/RenegociarTituloDialog.tsx`
- `src/components/app/financeiro/RenegociacaoHistoricoList.tsx`
- `src/components/app/financeiro/ParametrosFinanceirosForm.tsx`

**Editar**
- `src/lib/fin-titulos-store.ts` → adicionar campos `statusRenegociacao`, `renegociacaoId`, helpers `marcarRenegociado`, `criarTitulosRenegociacao`.
- `src/routes/financeiro.tsx` → novas abas “Renegociações” (Controle) e “Parâmetros Financeiros” (Estrutura); ação “Renegociar” na lista de títulos.
- `src/lib/route-tabs.ts` → registrar abas.

## Confirmação

Pode seguir com a **Fase 1 + Fase 2 + Fase 4** nesta rodada (parâmetros, modelo, modal funcional com simulação e parcelamento)? A Fase 5 (indicadores no analytics) entra na próxima rodada.