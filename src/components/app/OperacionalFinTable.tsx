// Tabela operacional de Financiamentos com colunas arrastáveis (persistidas em localStorage).
// Visualização é somente leitura — edição/vinculação acontecem pelo botão Opções (coluna 1).
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { ActionsMenu } from "./ActionsMenu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fmtBRL } from "@/lib/mock-data";
import { GripVertical, SquarePen, Link2 } from "lucide-react";

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
  /** Data limite (ISO yyyy-mm-dd) calculada a partir da faixa de previsão escolhida no edit dialog. */
  previsao: string;
};

type ColKey =
  | "ordem" | "contratante" | "vendedor" | "valorContrato" | "pfpj" | "envio"
  | "cpfCnpj" | "valorFinanciado" | "statusLiberacao" | "gerente" | "status"
  | "obs" | "liberacao" | "previsao" | "acoes";

const ALL_COLS: { key: ColKey; label: string; align?: "right" | "center" }[] = [
  { key: "acoes", label: "AÇÕES", align: "center" },
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
  { key: "previsao", label: "PREVISÃO", align: "center" },
];

const DEFAULT_ORDER: ColKey[] = ALL_COLS.map((c) => c.key);

export function OperacionalFinTable({
  storageKey, rows, onEdit, onVincular,
}: {
  storageKey: string;
  rows: OpRow[];
  onEdit?: (id: string) => void;
  /** Quando definido, exibe a ação "Vincular contrato" no menu de Ações. */
  onVincular?: (id: string) => void;
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
  const diasRest = (iso: string): number | null => {
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
      case "statusLiberacao": return <span className="text-xs">{(r.statusLiberacao || "—").toUpperCase()}</span>;
      case "gerente": return <span className="text-xs">{(r.gerente || "—").toUpperCase()}</span>;
      case "status": return <StatusBadge status={r.status || "—"} />;
      case "obs": return <span className="text-xs text-muted-foreground">{r.obs || "—"}</span>;
      case "liberacao": return <span className="text-xs">{r.liberacao || "—"}</span>;
      case "previsao": {
        const d = diasRest(r.previsao);
        if (d === null) return <span className="text-muted-foreground">—</span>;
        // Faixas: ≤7 destructive, ≤10 warning, ≤15 info, ≤30 success, ≤60 muted-foreground, restante muted
        const cls =
          d <= 7 ? "text-destructive" :
          d <= 10 ? "text-warning" :
          d <= 15 ? "text-info" :
          d <= 30 ? "text-success" :
          "text-muted-foreground";
        return <span className={`font-semibold ${cls}`}>{d}d</span>;
      }
      case "acoes":
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Editar"
            onClick={() => onEdit?.(r.id)}
            disabled={!onEdit}
          >
            <SquarePen className="h-3.5 w-3.5" />
          </Button>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table className="text-xs [&_th]:h-8 [&_th]:px-2 [&_td]:py-1 [&_td]:px-2">
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

/** Faixas de previsão disponíveis (em dias). Use para popular selects nos diálogos de edição. */
export const PREVISAO_FAIXAS = [7, 10, 15, 30, 60, 90] as const;

/** Converte uma faixa em dias para uma data ISO (yyyy-mm-dd) somando à data base (default: hoje). */
export function previsaoFromDias(dias: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
