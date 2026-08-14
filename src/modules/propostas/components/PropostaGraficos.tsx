/**
 * Gráficos da proposta — composição financeira, custos por tipo e ganho do consultor.
 * Somente apresentação: recebe valores já calculados pela PropostasPage.
 */
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LinhaCustoLike = { nome: string; tipo: string; total: number };

const CORES = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

function brl(v: number) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PropostaGraficos({
  custoTotal,
  lucroBruto,
  valorFinal,
  comissaoValor,
  bonusValor,
  custos,
}: {
  custoTotal: number;
  lucroBruto: number;
  valorFinal: number;
  comissaoValor: number;
  bonusValor: number;
  custos: LinhaCustoLike[];
}) {
  const composicao = [
    { nome: "Custo total", valor: Math.max(0, custoTotal) },
    { nome: "Lucro bruto", valor: Math.max(0, lucroBruto) },
    { nome: "Comissão", valor: Math.max(0, comissaoValor) },
    { nome: "Bônus", valor: Math.max(0, bonusValor) },
  ];

  const porTipo = Object.values(
    custos.reduce<Record<string, { nome: string; valor: number }>>((acc, l) => {
      const k = l.tipo || "OUTRO";
      acc[k] = acc[k] ?? { nome: k, valor: 0 };
      acc[k].valor += Number(l.total) || 0;
      return acc;
    }, {}),
  ).filter((d) => d.valor > 0);

  const semDados = valorFinal <= 0 && custoTotal <= 0;

  if (semDados) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Preencha o dimensionamento e a precificação para ver os gráficos.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-md border p-3">
        <div className="mb-2 text-xs font-semibold text-foreground">Composição do valor final</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={composicao} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => brl(Number(v))} />
              <Tooltip formatter={(v) => brl(Number(v))} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {composicao.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <div className="mb-2 text-xs font-semibold text-foreground">Custos por tipo</div>
        <div className="h-56">
          {porTipo.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem custos lançados.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porTipo} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={80}>
                  {porTipo.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => brl(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
