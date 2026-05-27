import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ShieldCheck, AlertTriangle, ListChecks } from "lucide-react";
import {
  useGovernanceMatrix,
  useGovernanceGaps,
  useGovernanceResumo,
  type GovernanceRow,
} from "@/lib/repositories/use-governance-matrix";

export const Route = createFileRoute("/paineis/governanca")({
  head: () => ({ meta: [{ title: "Governança — Matriz Enterprise · Meta Sun" }] }),
  component: GovernancaPage,
});

const MODULOS = [
  "todos","financeiro","comercial","estoque","engenharia","compras","aprovacoes",
] as const;

function CritBadge({ c }: { c: string }) {
  const map: Record<string, string> = {
    critica: "bg-destructive text-destructive-foreground",
    alta: "bg-amber-500 text-white",
    media: "bg-muted text-foreground",
    baixa: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[c] ?? "bg-muted"}>{c}</Badge>;
}

function Yes({ v }: { v: boolean }) {
  return v
    ? <Check className="h-3.5 w-3.5 text-emerald-600 inline" />
    : <X className="h-3.5 w-3.5 text-muted-foreground inline" />;
}

function GovernancaPage() {
  const matrix = useGovernanceMatrix();
  const gaps = useGovernanceGaps();
  const resumo = useGovernanceResumo();

  const [modulo, setModulo] = useState<(typeof MODULOS)[number]>("todos");
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<"matriz"|"gaps"|"resumo">("matriz");

  const rows: GovernanceRow[] = matrix.data ?? [];
  const lista = useMemo(() => rows.filter(r => {
    if (modulo !== "todos" && r.modulo !== modulo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!r.acao.toLowerCase().includes(q) &&
          !r.entidade.toLowerCase().includes(q) &&
          !(r.permissao ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [rows, modulo, busca]);

  const totalGaps = gaps.data?.reduce((acc, g) => acc + g.total_gaps, 0) ?? 0;

  return (
    <div className="space-y-3">
      {/* Strip enterprise */}
      <div className="flex flex-wrap items-center gap-3 border-b pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Matriz de Governança
        </div>
        <span className="text-xs text-muted-foreground">
          D14.3 · Ações × Módulos × Perfis × Workflow × Auditoria × SLA
        </span>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Ações <b>{rows.length}</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Lacunas <b>{totalGaps}</b>
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="matriz" className="h-7 px-2 text-xs">Matriz</TabsTrigger>
            <TabsTrigger value="gaps" className="h-7 px-2 text-xs">Lacunas</TabsTrigger>
            <TabsTrigger value="resumo" className="h-7 px-2 text-xs">Resumo</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "matriz" && (
          <>
            <Tabs value={modulo} onValueChange={(v) => setModulo(v as any)}>
              <TabsList className="h-8">
                {MODULOS.map(m => (
                  <TabsTrigger key={m} value={m} className="h-7 px-2 text-xs capitalize">{m}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Input
              placeholder="Buscar ação, entidade, permissão…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 max-w-xs"
            />
            <span className="text-xs text-muted-foreground ml-auto">
              {lista.length} de {rows.length}
            </span>
          </>
        )}
      </div>

      {/* MATRIZ */}
      {tab === "matriz" && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="h-8 text-xs">Módulo</TableHead>
                <TableHead className="h-8 text-xs">Entidade</TableHead>
                <TableHead className="h-8 text-xs">Ação</TableHead>
                <TableHead className="h-8 text-xs">Perfil</TableHead>
                <TableHead className="h-8 text-xs">Permissão</TableHead>
                <TableHead className="h-8 text-xs">Criticidade</TableHead>
                <TableHead className="h-8 text-xs text-center">WF</TableHead>
                <TableHead className="h-8 text-xs text-center">Motivo</TableHead>
                <TableHead className="h-8 text-xs text-center">Audita</TableHead>
                <TableHead className="h-8 text-xs text-center">Lote</TableHead>
                <TableHead className="h-8 text-xs text-center">Estorno</TableHead>
                <TableHead className="h-8 text-xs text-right">SLA (h)</TableHead>
                <TableHead className="h-8 text-xs">Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.isLoading && (
                <TableRow><TableCell colSpan={13} className="h-16 text-center text-xs text-muted-foreground">Carregando matriz oficial…</TableCell></TableRow>
              )}
              {matrix.isError && (
                <TableRow><TableCell colSpan={13} className="h-16 text-center text-xs text-destructive">Erro: {(matrix.error as Error)?.message}</TableCell></TableRow>
              )}
              {lista.map((r, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="capitalize font-medium">{r.modulo}</TableCell>
                  <TableCell>{r.entidade}</TableCell>
                  <TableCell className="font-mono">{r.acao}</TableCell>
                  <TableCell className="capitalize">{r.perfil}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.permissao ?? "—"}</TableCell>
                  <TableCell><CritBadge c={r.criticidade} /></TableCell>
                  <TableCell className="text-center"><Yes v={r.requer_workflow} /></TableCell>
                  <TableCell className="text-center"><Yes v={r.requer_motivo} /></TableCell>
                  <TableCell className="text-center"><Yes v={r.audita} /></TableCell>
                  <TableCell className="text-center"><Yes v={r.suporta_lote} /></TableCell>
                  <TableCell className="text-center"><Yes v={r.suporta_estorno} /></TableCell>
                  <TableCell className="text-right tabular-nums">{r.sla_horas ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.observacao ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* GAPS */}
      {tab === "gaps" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="h-8 text-xs">Módulo</TableHead>
                <TableHead className="h-8 text-xs">Entidade</TableHead>
                <TableHead className="h-8 text-xs">Ação</TableHead>
                <TableHead className="h-8 text-xs">Criticidade</TableHead>
                <TableHead className="h-8 text-xs text-center">Sem WF</TableHead>
                <TableHead className="h-8 text-xs text-center">Sem motivo</TableHead>
                <TableHead className="h-8 text-xs text-center">Sem audit</TableHead>
                <TableHead className="h-8 text-xs text-center">Sem SLA</TableHead>
                <TableHead className="h-8 text-xs text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(gaps.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={9} className="h-16 text-center text-xs text-emerald-600">Nenhuma lacuna crítica detectada.</TableCell></TableRow>
              )}
              {(gaps.data ?? []).map((g, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="capitalize font-medium">{g.modulo}</TableCell>
                  <TableCell>{g.entidade}</TableCell>
                  <TableCell className="font-mono">{g.acao}</TableCell>
                  <TableCell><CritBadge c={g.criticidade} /></TableCell>
                  <TableCell className="text-center">{g.gap_workflow ? <AlertTriangle className="h-3.5 w-3.5 text-destructive inline" /> : "—"}</TableCell>
                  <TableCell className="text-center">{g.gap_motivo ? <AlertTriangle className="h-3.5 w-3.5 text-destructive inline" /> : "—"}</TableCell>
                  <TableCell className="text-center">{g.gap_auditoria ? <AlertTriangle className="h-3.5 w-3.5 text-destructive inline" /> : "—"}</TableCell>
                  <TableCell className="text-center">{g.gap_sla ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 inline" /> : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold">{g.total_gaps}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* RESUMO */}
      {tab === "resumo" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="h-8 text-xs">Módulo</TableHead>
                <TableHead className="h-8 text-xs text-right">Ações</TableHead>
                <TableHead className="h-8 text-xs text-right">Críticas</TableHead>
                <TableHead className="h-8 text-xs text-right">Altas</TableHead>
                <TableHead className="h-8 text-xs text-right">c/ WF</TableHead>
                <TableHead className="h-8 text-xs text-right">c/ Motivo</TableHead>
                <TableHead className="h-8 text-xs text-right">c/ Audit</TableHead>
                <TableHead className="h-8 text-xs text-right">c/ Lote</TableHead>
                <TableHead className="h-8 text-xs text-right">c/ Estorno</TableHead>
                <TableHead className="h-8 text-xs text-right">c/ SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resumo.data ?? []).map((r, i) => (
                <TableRow key={i} className="text-xs">
                  <TableCell className="capitalize font-medium">{r.modulo}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total_acoes}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{r.criticas}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.altas}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.com_workflow}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.com_motivo}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.com_auditoria}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.com_lote}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.com_estorno}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.com_sla}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        D14.3 · Matriz oficial em <code>governance_matrix</code>; views <code>v_governance_matrix_full</code>,
        {" "}<code>v_governance_gaps</code>, <code>v_governance_resumo</code> (security_invoker). Somente admin pode editar.
      </p>
    </div>
  );
}
