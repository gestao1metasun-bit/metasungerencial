// ============================================================================
// Orçado de obras (despesas/CMV) × consumido por títulos AP vinculados (obraId)
// Lê `orcado` de cada ProjetoVinculado (contratos-store) e cruza com baixas/AP
// dos títulos para calcular o saldo orçamentário restante.
// ============================================================================
import { useMemo } from "react";
import { useContratos, type ProjetoVinculado } from "@/lib/contratos-store";
import { useTitulos, type Titulo } from "@/lib/fin-titulos-store";

export type OrcamentoObra = {
  obraId: string;
  contratoId: string;
  descricao: string;
  cidade?: string;
  orcado: number;
  consumido: number;     // baixas efetivas AP (sem estornos) + AP em aberto
  consumidoReal: number; // só baixas efetivas
  emAberto: number;      // AP em aberto (saldo)
  restante: number;      // orcado - (consumido)
  pctConsumido: number;  // 0..1
  statusObra: string;
};

export type OrcamentoTotais = {
  itens: OrcamentoObra[];
  totalOrcado: number;
  totalConsumido: number;
  totalConsumidoReal: number;
  totalEmAberto: number;
  totalRestante: number;
};

function projetosAtivos(c: ReturnType<typeof useContratos>): ProjetoVinculado[] {
  return c.flatMap((ct) => (ct.projetos ?? []).filter((p) => (p.orcado ?? 0) > 0));
}

export function calcularOrcamentoObras(
  contratos: ReturnType<typeof useContratos>,
  titulos: Titulo[],
): OrcamentoTotais {
  const projetos = projetosAtivos(contratos);

  // Indexa títulos AP por obraId
  const consumoPorObra = new Map<string, { real: number; aberto: number }>();
  titulos.forEach((t) => {
    if (t.tipo !== "AP") return;
    if (t.status === "cancelado") return;
    if (!t.obraId) return;
    const acc = consumoPorObra.get(t.obraId) ?? { real: 0, aberto: 0 };
    t.movimentos.forEach((m) => { if (!m.estornado) acc.real += m.valor; });
    if (t.saldo > 0.001) acc.aberto += t.saldo;
    consumoPorObra.set(t.obraId, acc);
  });

  const itens: OrcamentoObra[] = projetos.map((p) => {
    const c = consumoPorObra.get(p.id) ?? { real: 0, aberto: 0 };
    const orcado = Number(p.orcado ?? 0);
    const consumido = c.real + c.aberto;
    const restante = Math.max(0, orcado - consumido);
    return {
      obraId: p.id,
      contratoId: p.contratoId,
      descricao: `${p.tipo} — ${p.cidade}/${p.uf}`,
      cidade: p.cidade,
      orcado,
      consumido,
      consumidoReal: c.real,
      emAberto: c.aberto,
      restante,
      pctConsumido: orcado > 0 ? Math.min(1, consumido / orcado) : 0,
      statusObra: p.status,
    };
  }).sort((a, b) => b.orcado - a.orcado);

  const totalOrcado = itens.reduce((s, x) => s + x.orcado, 0);
  const totalConsumido = itens.reduce((s, x) => s + x.consumido, 0);
  const totalConsumidoReal = itens.reduce((s, x) => s + x.consumidoReal, 0);
  const totalEmAberto = itens.reduce((s, x) => s + x.emAberto, 0);
  const totalRestante = itens.reduce((s, x) => s + x.restante, 0);
  return { itens, totalOrcado, totalConsumido, totalConsumidoReal, totalEmAberto, totalRestante };
}

export function useOrcamentoObras(): OrcamentoTotais {
  const contratos = useContratos();
  const titulos = useTitulos();
  return useMemo(() => calcularOrcamentoObras(contratos, titulos), [contratos, titulos]);
}
