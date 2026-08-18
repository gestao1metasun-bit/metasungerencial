/**
 * ChartKit — primitivos de gráfico reutilizáveis do ERP Meta Sun.
 *
 * Regras:
 *  - só tokens semânticos (var(--chart-*), var(--muted-foreground)…);
 *  - estados vazio/carregando explícitos (nunca gráfico "fantasma" com zeros);
 *  - tipografia densa padrão enterprise (10–12px).
 */
import type { ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";

export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const AXIS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
} as const;

export const compactBRL = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};

const fullBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function tooltipStyle() {
  return {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: "0.5rem",
      fontSize: 11.5,
      color: "var(--popover-foreground)",
    },
    labelStyle: { color: "var(--muted-foreground)", fontSize: 11 },
  };
}

/* ─────────────────────────── Container ─────────────────────────── */

export function ChartCard({
  title, subtitle, actions, height = 240, empty, loading, children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  height?: number;
  empty?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div style={{ height }} className="w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
            Carregando dados…
          </div>
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <span className="text-[12.5px] font-medium text-foreground">Sem dados no período</span>
            <span className="text-[11px] text-muted-foreground">
              O gráfico aparece assim que houver movimento registrado.
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {children as any}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/* ─────────────────────────── Evolução ─────────────────────────── */

export type SerieDef = { key: string; label: string; color?: string };

export function TrendArea({
  data, series, xKey = "label", money = true,
}: {
  data: Record<string, any>[];
  series: SerieDef[];
  xKey?: string;
  money?: boolean;
}) {
  return (
    <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey={xKey} tickLine={false} axisLine={false} {...AXIS} />
      <YAxis
        tickLine={false} axisLine={false} width={money ? 58 : 34} {...AXIS}
        tickFormatter={(v) => (money ? compactBRL(Number(v)) : String(v))}
      />
      <Tooltip formatter={(v: any) => (money ? fullBRL(Number(v)) : v)} {...tooltipStyle()} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      {series.map((s, i) => (
        <Area
          key={s.key} type="monotone" dataKey={s.key} name={s.label}
          stroke={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]}
          strokeWidth={2} fill={`url(#grad-${s.key})`}
        />
      ))}
    </AreaChart>
  );
}

export function TrendLine({
  data, series, xKey = "label", money = false,
}: {
  data: Record<string, any>[];
  series: SerieDef[];
  xKey?: string;
  money?: boolean;
}) {
  return (
    <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey={xKey} tickLine={false} axisLine={false} {...AXIS} />
      <YAxis tickLine={false} axisLine={false} width={money ? 58 : 34} {...AXIS}
        tickFormatter={(v) => (money ? compactBRL(Number(v)) : String(v))} />
      <Tooltip formatter={(v: any) => (money ? fullBRL(Number(v)) : v)} {...tooltipStyle()} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      {series.map((s, i) => (
        <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} dot={false}
          stroke={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} strokeWidth={2} />
      ))}
    </LineChart>
  );
}

/* ─────────────────────────── Ranking ─────────────────────────── */

export function RankBars({
  data, valueKey = "valor", labelKey = "label", money = true, color,
}: {
  data: Record<string, any>[];
  valueKey?: string;
  labelKey?: string;
  money?: boolean;
  color?: string;
}) {
  return (
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
      <XAxis type="number" tickLine={false} axisLine={false} {...AXIS}
        tickFormatter={(v) => (money ? compactBRL(Number(v)) : String(v))} />
      <YAxis type="category" dataKey={labelKey} width={130} tickLine={false} axisLine={false} {...AXIS} />
      <Tooltip cursor={{ fill: "var(--muted)" }} formatter={(v: any) => (money ? fullBRL(Number(v)) : v)} {...tooltipStyle()} />
      <Bar dataKey={valueKey} radius={[0, 4, 4, 0]} maxBarSize={22}>
        {data.map((_, i) => (
          <Cell key={i} fill={color ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
        ))}
      </Bar>
    </BarChart>
  );
}

/* ─────────────────────────── Distribuição ─────────────────────────── */

export function Donut({
  data, valueKey = "valor", labelKey = "label", money = true,
}: {
  data: Record<string, any>[];
  valueKey?: string;
  labelKey?: string;
  money?: boolean;
}) {
  return (
    <PieChart>
      <Pie
        data={data} dataKey={valueKey} nameKey={labelKey}
        innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="var(--card)"
      >
        {data.map((d: any, i) => (
          <Cell key={i} fill={d.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(v: any) => (money ? fullBRL(Number(v)) : v)} {...tooltipStyle()} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
    </PieChart>
  );
}

/* ─────────────────────────── Funil (CSS puro) ─────────────────────────── */

export function FunnelBars({
  steps,
}: {
  steps: { label: string; qtd: number; hint?: string }[];
}) {
  const max = Math.max(1, ...steps.map((s) => s.qtd));
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      {steps.map((s, i) => {
        const pct = Math.round((s.qtd / max) * 100);
        const conv = i === 0 || steps[0].qtd === 0 ? null : Math.round((s.qtd / steps[0].qtd) * 100);
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[12px]">
              <span className="truncate text-foreground">{s.label}</span>
              <span className="shrink-0 font-mono font-semibold text-foreground">
                {s.qtd}
                {conv !== null && <span className="ml-1.5 text-[10.5px] font-normal text-muted-foreground">{conv}%</span>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(3, pct)}%`, background: CHART_PALETTE[i % CHART_PALETTE.length] }}
              />
            </div>
            {s.hint && <div className="mt-0.5 text-[10.5px] text-muted-foreground">{s.hint}</div>}
          </div>
        );
      })}
    </div>
  );
}
