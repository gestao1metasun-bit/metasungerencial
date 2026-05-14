// Tabela operacional de Financiamentos com colunas arrastáveis (persistidas em localStorage).
// Usada nas abas "Contratos Assinados em Financiamento" e "Sem Contrato em Financiamento".
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "./StatusBadge";
import { fmtBRL } from "@/lib/mock-data";
import { GripVertical } from "lucide-react";

export type OpRow = {
  id: string;
  ordem: string;
  contratante: string;
  vendedor: string;
  valorContrato: number;
  pfpj: "PF" | "PJ" | "";
  envio: string;
  cpfCnpj: string;
  valorFinanciado: number;
  statusLiberacao: string;
  gerente: string;
  status: string;
  obs: string;
  liberacao: string;
  dataBaseLiberacao: string;
};

type ColKey =
  | "ordem" | "contratante" | "vendedor" | "valorContrato" | "pfpj" | "envio"
  | "cpfCnpj" | "valorFinanciado" | "statusLiberacao" | "gerente" | "status"
  | "obs" | "liberacao" | "dataBaseLiberacao" | "diasPrazo";

const ALL_COLS: { key: ColKey; label: string; align?: "right" | "center" }[] = [
  { key: "ordem", label: "ORDEM" },
  { key: "contratante", label: "CONTRATANTE" },
  { key: "vendedor", label: "VENDEDOR" },
  { key: "valorContrato", label: "VALOR CONTRATO", align: "right" },
  { key: "pfpj", label: "PF/PJ", align: "center" },
  { key: "envio", label: "ENVIO" },
  { key: "cpfCnpj", label: "CPF/CNPJ" },
  { key: "valorFinanciado", label: "VALOR FINANCIADO", align: "right" },
  { key: "statusLiberacao", label: "STATUS LIBERAÇÃO" },
  { key: "gerente", label: "GERENTE" },
  { key: "status", label: "STATUS" },
  { key: "obs", label: "OBS" },
  { key: "liberacao", label: "LIBERAÇÃO" },
  { key: "dataBaseLiberacao", label: "DATA BASE LIBERAÇÃO" },
  { key: "diasPrazo", label: "DIAS PRAZO", align: "center" },
];

const DEFAULT_ORDER: ColKey[] = ALL_COLS.map((c) => c.key);

export function OperacionalFinTable({
  storageKey, rows, onPatch, gerentes, statuses, liberacaoStatuses,
}: {
  storageKey: string;
  rows: OpRow[];
  onPatch: (id: string, patch: Partial<OpRow>) => void;
  gerentes: string[];
  statuses: string[];
  liberacaoStatuses: string[];
}) {
  const [order, setOrder] = useState<ColKey[]>(DEFAULT_ORDER);

  // Hidrata após montar para evitar mismatch SSR.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw) as ColKey[];
        const valid = arr.filter((k) => DEFAULT_ORDER.includes(k));
        const missing = DEFAULT_ORDER.filter((k) => !valid.includes(k));
        setOrder([...valid, ...missing]);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch {}
  }, [order, storageKey]);

  const colsByKey = useMemo(
    () => Object.fromEntries(ALL_COLS.map((c) => [c.key, c])) as Record<ColKey, (typeof ALL_COLS)[number]>,
    [],
  );

  const [dragKey, setDragKey] = useState<ColKey | null>(null);
  const move = (from: ColKey, to: ColKey) => {
    if (from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(to);
      if (fi < 0 || ti < 0) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      return next;
    });
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diasPrazo = (iso: string): number | null => {
    if (!iso) return null;
    const d = new Date(iso + "T00:00:00").getTime();
    return Math.ceil((d - today.getTime()) / 86400000);
  };

  const alignClass = (a?: "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "";

  const renderCell = (r: OpRow, key: ColKey) => {
    switch (key) {
      case "ordem": return <span className="font-mono text-xs text-primary">{r.ordem || "—"}</span>;
      case "contratante": return <span className="font-medium">{r.contratante}</span>;
      case "vendedor": return r.vendedor || "—";
      case "valorContrato": return <span className="font-mono">{fmtBRL(r.valorContrato)}</span>;
      case "pfpj": return r.pfpj || "—";
      case "envio": return <span className="text-muted-foreground text-xs">{r.envio || "—"}</span>;
      case "cpfCnpj": return <span className="text-muted-foreground text-xs">{r.cpfCnpj || "—"}</span>;
      case "valorFinanciado": return <span className="font-mono font-semibold">{fmtBRL(r.valorFinanciado)}</span>;
      case "statusLiberacao":
        return (
          <Select value={r.statusLiberacao || ""} onValueChange={(v) => onPatch(r.id, { statusLiberacao: v })}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{liberacaoStatuses.map((s) => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        );
      case "gerente":
        return (
          <Select value={r.gerente || ""} onValueChange={(v) => onPatch(r.id, { gerente: v })}>
            <SelectTrigger className="h-8 w-[150px]"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{gerentes.map((g) => <SelectItem key={g} value={g}>{g.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        );
      case "status":
        return (
          <Select value={r.status || ""} onValueChange={(v) => onPatch(r.id, { status: v })}>
            <SelectTrigger className="h-8 w-[150px]">
              <span className="truncate"><StatusBadge status={r.status || "—"} /></span>
            </SelectTrigger>
            <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        );
      case "obs":
        return <Input className="h-8 w-[200px]" value={r.obs} onChange={(e) => onPatch(r.id, { obs: e.target.value })} placeholder="—" />;
      case "liberacao":
        return <Input className="h-8 w-[150px]" value={r.liberacao} onChange={(e) => onPatch(r.id, { liberacao: e.target.value })} placeholder="—" />;
      case "dataBaseLiberacao":
        return <Input type="date" noUppercase className="h-8 w-[150px]" value={r.dataBaseLiberacao} onChange={(e) => onPatch(r.id, { dataBaseLiberacao: e.target.value })} />;
      case "diasPrazo": {
        const d = diasPrazo(r.dataBaseLiberacao);
        if (d === null) return <span className="text-muted-foreground">—</span>;
        const cls = d < 0 ? "text-destructive" : d <= 5 ? "text-warning" : d <= 15 ? "text-info" : "text-success";
        return <span className={`font-semibold ${cls}`}>{d}d</span>;
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {order.map((key) => {
              const col = colsByKey[key]; if (!col) return null;
              return (
                <TableHead
                  key={key}
                  draggable
                  onDragStart={() => setDragKey(key)}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={() => { if (dragKey) move(dragKey, key); setDragKey(null); }}
                  onDragEnd={() => setDragKey(null)}
                  className={`cursor-move select-none whitespace-nowrap ${alignClass(col.align)} ${dragKey === key ? "opacity-40" : ""}`}
                  title="Arraste para reordenar"
                >
                  <span className="inline-flex items-center gap-1">
                    <GripVertical className="h-3 w-3 text-muted-foreground/60" />
                    {col.label}
                  </span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {order.map((key) => {
                const col = colsByKey[key]; if (!col) return null;
                return (
                  <TableCell key={key} className={`whitespace-nowrap ${alignClass(col.align)}`}>
                    {renderCell(r, key)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={order.length} className="text-center text-sm text-muted-foreground py-8">
                Nenhum registro.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
