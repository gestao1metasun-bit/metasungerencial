/**
 * Comercial — utilitários e tipos compartilhados.
 * Extraído de `src/routes/comercial.tsx` em C-ENT.11.a (split puro, ZERO mudança funcional).
 * Mantém comportamento idêntico aos helpers originais.
 */
import * as React from "react";
import { Card } from "@/components/ui/card";
import { EyeButton } from "@/components/app/EyeButton";
import type { ContratoFull } from "@/lib/contratos-store";
import { vendedores as vendedoresSeed, propostas as propostasSeed } from "@/lib/mock-data";

/* ---------------- Tipos ---------------- */
export type Contrato = ContratoFull;
export type Vendedor = (typeof vendedoresSeed)[number];
export type Proposta = (typeof propostasSeed)[number];
export type VolumeMes = { id: string; mes: string; ano: number; qtd: number; valor: number };

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const volumeSeed: VolumeMes[] = [
  { id: "V-01", mes: "Jan", ano: 2026, qtd: 18, valor: 1240000 },
  { id: "V-02", mes: "Fev", ano: 2026, qtd: 22, valor: 1580000 },
  { id: "V-03", mes: "Mar", ano: 2026, qtd: 28, valor: 1920000 },
  { id: "V-04", mes: "Abr", ano: 2026, qtd: 33, valor: 2410000 },
  { id: "V-05", mes: "Mai", ano: 2026, qtd: 26, valor: 1850000 },
];

/* ---------------- Máscaras / formatadores ---------------- */
export const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function maskDoc(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function maskTel(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^\((\d{2})\) (\d{4})(\d)/, "($1) $2-$3");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^\((\d{2})\) (\d{5})(\d)/, "($1) $2-$3");
}

export const isDocValid = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 11 || d.length === 14;
};

export const isTelValid = (v: string) => onlyDigits(v).length === 11;

export function fmtDataBR(v?: string | null): string {
  if (!v) return "—";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  return s;
}

/** Normaliza ID legado "CT-YYYY-NNNN" para o padrão "NNN/YYYY". */
export function fmtContratoId(id: string): string {
  const m = id.match(/^CT-(\d{4})-(\d+)$/);
  if (m) return `${String(m[2]).slice(-3).padStart(3, "0")}/${m[1]}`;
  return id;
}

/** Valor consolidado do contrato (valor direto OU soma dos projetos vinculados). */
export function valorContrato(c: Contrato): number {
  if (Number(c.valor) > 0) return Number(c.valor);
  return (c.projetos ?? []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
}

/** Helper local: pega email/nome do usuário autenticado para auditoria. */
export function useAuthCurrent(): { user: string } {
  if (typeof window === "undefined") return { user: "sistema" };
  try {
    const raw = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (raw) {
      const data = JSON.parse(localStorage.getItem(raw) || "{}");
      const email = data?.user?.email || data?.currentSession?.user?.email;
      if (email) return { user: email };
    }
  } catch {}
  return { user: "operador" };
}

/* ---------------- KPIs (cards reutilizados em várias abas) ---------------- */
export function KpiBlock({
  tone, icon: Icon, label, main, sub, extra, onView,
}: {
  tone: "primary" | "success" | "warning" | "destructive" | "info";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  main: React.ReactNode;
  sub?: string;
  extra?: string;
  onView?: () => void;
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          {onView && <EyeButton onClick={onView} />}
        </div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneClass}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-2 text-2xl font-bold leading-tight">{main}</div>
      {sub && <div className="mt-0.5 text-sm font-medium text-muted-foreground">{sub}</div>}
      {extra && <div className="mt-1 text-[11px] text-muted-foreground">{extra}</div>}
    </Card>
  );
}

export function KpiSmall({
  icon: Icon, label, value, positive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 text-base font-bold ${positive === undefined ? "" : positive ? "text-success" : "text-destructive"}`}>{value}</div>
    </Card>
  );
}
