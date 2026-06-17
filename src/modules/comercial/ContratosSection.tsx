/**
 * Comercial — Seção de Contratos Unificados (3 grupos).
 * Extraído de `src/routes/comercial.tsx` em C-ENT.11.a (split puro).
 * ZERO mudança de comportamento. As tabs internas (ContratosTab/ContratoAssinadoTab/
 * ContratosCanceladosTab) seguem residindo em comercial.tsx e são repassadas via props.
 */
import { useMemo, useState, type ReactNode } from "react";
import { ColunasButton, ColunasManager, KanbanGeneric, useKanbanColumns, type KCol, type KItem } from "@/components/app/KanbanColumns";
import { fmtBRL } from "@/lib/mock-data";
import { valorContrato, type Contrato, type Vendedor } from "./_shared";

type GrupoKey = "aberto" | "contrato" | "fechado";

const CONTRATOS_KANBAN_DEFAULTS: Record<GrupoKey, KCol[]> = {
  aberto: [
    { id: "col-gerar", titulo: "Gerar contrato", ativo: true, tone: "bg-warning/10 text-warning border-warning/40" },
    { id: "col-aguardando", titulo: "Aguardando assinatura", ativo: true, tone: "bg-info/10 text-info border-info/40" },
  ],
  contrato: [
    { id: "col-ass-pend", titulo: "Assinado · aguardando aprovação", ativo: true, tone: "bg-amber-500/10 text-amber-600 border-amber-500/40" },
    { id: "col-ass-eng", titulo: "Aprovado · enviado à Engenharia", ativo: true, tone: "bg-success/10 text-success border-success/40", locked: true },
  ],
  fechado: [
    { id: "col-cancelado", titulo: "Cancelado", ativo: true, tone: "bg-destructive/10 text-destructive border-destructive/40" },
  ],
};

function defaultColContrato(c: Contrato, grupo: GrupoKey): string {
  if (grupo === "aberto") {
    return (c.status === "Pendente" && c.contratoRedigido && !c.cancelado) ? "col-aguardando" : "col-gerar";
  }
  if (grupo === "contrato") {
    return c.assinadoAprovado ? "col-ass-eng" : "col-ass-pend";
  }
  return "col-cancelado";
}

function ContratosKanbanView({ contratos, grupo }: { contratos: Contrato[]; grupo: GrupoKey }) {
  const [manage, setManage] = useState(false);
  const { cols, setCols, assign, setAssign } = useKanbanColumns(
    `ms.contratos.kanban.${grupo}`,
    CONTRATOS_KANBAN_DEFAULTS[grupo],
  );

  const items: KItem<Contrato>[] = useMemo(() => {
    const base = grupo === "aberto"
      ? contratos.filter((c) => c.status === "Pendente" && !c.cancelado)
      : grupo === "contrato"
        ? contratos.filter((c) => c.status === "Assinado" && !c.cancelado)
        : contratos.filter((c) => c.cancelado === true);
    return base.map((c) => ({ key: c.id, data: c, defaultColId: defaultColContrato(c, grupo) }));
  }, [contratos, grupo]);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColunasButton onClick={() => setManage(true)} />
      </div>
      <KanbanGeneric
        cols={cols}
        items={items}
        assign={assign}
        setAssign={setAssign}
        columnMinWidth={260}
        renderCard={(c) => (
          <div className="rounded-md border bg-card p-2.5 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[11px] font-semibold text-muted-foreground">{c.id}</div>
              <div className="text-xs font-semibold tabular-nums">{fmtBRL(valorContrato(c))}</div>
            </div>
            <div className="mt-1 truncate text-sm font-medium">{c.cliente}</div>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{c.vendedor || "—"}</span>
              <span className="font-mono">{c.propostaNumero ?? ""}</span>
            </div>
          </div>
        )}
      />
      <ColunasManager open={manage} onOpenChange={setManage} cols={cols} setCols={setCols} />
    </div>
  );
}

/**
 * ContratosUnificadosTab — Toggle entre Pendentes / Em contrato / Fechado.
 * Recebe as 3 sub-tabs por props para preservar import sites legados.
 */
export function ContratosUnificadosTab({
  contratos, setContratos, vendedoresList,
  renderAberto, renderContrato, renderFechado,
}: {
  contratos: Contrato[];
  setContratos: (v: Contrato[]) => void;
  vendedoresList: Vendedor[];
  renderAberto: (args: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void }) => JSX.Element;
  renderContrato: (args: { contratos: Contrato[]; setContratos: (v: Contrato[]) => void; vendedoresList: Vendedor[] }) => JSX.Element;
  renderFechado: (args: { contratos: Contrato[] }) => JSX.Element;
}) {
  const aRedigir = contratos.filter((c) => c.status === "Pendente" && !c.contratoRedigido && !c.cancelado).length;
  const aguardando = contratos.filter((c) => c.contratoRedigido && c.status === "Pendente" && !c.cancelado).length;
  const assinados = contratos.filter((c) => c.status === "Assinado" && !c.cancelado).length;
  const cancelados = contratos.filter((c) => c.cancelado === true).length;
  const emAberto = aRedigir + aguardando;
  const fechado = cancelados;

  const [sub, setSub] = useState<GrupoKey>("aberto");
  const [view, setView] = useState<"tabela" | "kanban">("tabela");

  const btn = (key: GrupoKey, label: string, count: number, tone: string) => (
    <button
      type="button"
      onClick={() => setSub(key)}
      className={
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
        (sub === key
          ? `${tone} shadow-sm`
          : "border-border bg-background text-muted-foreground hover:bg-muted")
      }
    >
      <span>{label}</span>
      <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-background/60 px-1.5 text-xs font-bold tabular-nums">
        {count}
      </span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {btn("aberto", "Pendentes", emAberto, "border-warning/40 bg-warning/10 text-warning")}
          {btn("contrato", "Em contrato", assinados, "border-success/40 bg-success/10 text-success")}
          {btn("fechado", "Fechado", fechado, "border-destructive/40 bg-destructive/10 text-destructive")}
        </div>
        <div className="inline-flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setView("tabela")}
              className={"rounded px-2.5 py-1 text-xs font-semibold transition-colors " + (view === "tabela" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              Tabela
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={"rounded px-2.5 py-1 text-xs font-semibold transition-colors " + (view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              Kanban
            </button>
          </div>
        </div>
      </div>

      {view === "kanban"
        ? <ContratosKanbanView contratos={contratos} grupo={sub} />
        : sub === "aberto"
          ? renderAberto({ contratos, setContratos })
          : sub === "contrato"
            ? renderContrato({ contratos, setContratos, vendedoresList })
            : renderFechado({ contratos })}
    </div>
  );
}
