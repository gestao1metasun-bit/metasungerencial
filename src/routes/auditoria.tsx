// D24 — Central de Auditoria Enterprise Unificada (/auditoria).
// Consome v_auditoria_unificada (security_invoker, read-only).
// Sem motor novo, sem edição, sem exclusão.
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { RefreshCw, Download } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, ExternalLink, AlertTriangle, Activity, Users, Layers } from "lucide-react";
import {
  useAuditoriaUnificada, exportarCsvAuditoria, rotaDaOrigemAuditoria,
  CRITICIDADE_TONE, MODULO_LABEL,
  type AuditoriaFiltros, type AuditoriaRow, type AuditoriaCriticidade,
} from "@/lib/repositories/auditoria-repo";
import { AntesDepois } from "@/components/app/auditoria/AntesDepois";
import { toast } from "sonner";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [{ title: "Auditoria — Meta Sun" }, { name: "description", content: "Auditoria corporativa unificada do ERP." }],
  }),
  component: AuditoriaPage,
});

function fmtData(iso: string) {
  try { return new Date(iso).toLocaleString("pt-BR"); } catch { return iso; }
}

function AuditoriaPage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<AuditoriaFiltros>({ limit: 500 });
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<AuditoriaRow | null>(null);

  const f: AuditoriaFiltros = useMemo(
    () => ({ ...filtros, busca: busca.trim() || undefined }),
    [filtros, busca],
  );
  const { data = [], isLoading, refetch, isFetching } = useAuditoriaUnificada(f);

  const kpis = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const inicio = hoje.toISOString();
    const evHoje = data.filter((r) => r.data_hora >= inicio).length;
    const criticas = data.filter((r) => r.criticidade === "CRITICA").length;
    const altas = data.filter((r) => r.criticidade === "ALTA").length;
    const porUser = new Map<string, number>();
    const porModulo = new Map<string, number>();
    for (const r of data) {
      const u = r.usuario_email ?? r.usuario_id ?? "(sistema)";
      porUser.set(u, (porUser.get(u) ?? 0) + 1);
      porModulo.set(r.modulo, (porModulo.get(r.modulo) ?? 0) + 1);
    }
    const topUsers = [...porUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topModulos = [...porModulo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { evHoje, criticas, altas, topUsers, topModulos };
  }, [data]);

  const modulosDisponiveis = useMemo(
    () => Array.from(new Set(data.map((r) => r.modulo))).sort(),
    [data],
  );

  function exportar() {
    if (data.length === 0) { toast.info("Nada a exportar com os filtros atuais."); return; }
    const blob = exportarCsvAuditoria(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} eventos exportados.`);
  }

  function abrirOrigem(r: AuditoriaRow) {
    const rota = rotaDaOrigemAuditoria(r);
    if (!rota) { toast.info("Sem rota de origem mapeada para este evento."); return; }
    const [path, hash] = rota.split("#");
    navigate({ to: path, hash: hash ?? undefined });
  }

  return (
    <div className="space-y-3 p-2">
      <PageHeader
        title="Auditoria Corporativa"
        description="Visão consolidada e somente leitura de todas as alterações do ERP."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Activity} label="Eventos hoje" value={kpis.evHoje} />
        <KpiCard icon={AlertTriangle} label="Críticos" value={kpis.criticas} tone="rose" />
        <KpiCard icon={AlertTriangle} label="Alta criticidade" value={kpis.altas} tone="amber" />
        <KpiCard icon={Layers} label="Total carregado" value={data.length} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Usuários mais ativos</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {kpis.topUsers.length === 0 && <div className="text-muted-foreground">Sem dados.</div>}
            {kpis.topUsers.map(([u, n]) => (
              <div key={u} className="flex justify-between"><span className="truncate">{u}</span><b>{n}</b></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Layers className="h-4 w-4" /> Módulos mais alterados</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {kpis.topModulos.length === 0 && <div className="text-muted-foreground">Sem dados.</div>}
            {kpis.topModulos.map(([m, n]) => (
              <div key={m} className="flex justify-between"><span>{MODULO_LABEL[m] ?? m}</span><b>{n}</b></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <EnterpriseRecordToolbar
        onRefresh={() => refetch()}
        onExport={exportar}
        isRefreshing={isFetching}
      />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
        <Input
          placeholder="Buscar ação, observação, módulo…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="md:col-span-2"
        />
        <Select
          value={filtros.modulo ?? "_all"}
          onValueChange={(v) => setFiltros((s) => ({ ...s, modulo: v === "_all" ? undefined : v }))}
        >
          <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os módulos</SelectItem>
            {modulosDisponiveis.map((m) => (
              <SelectItem key={m} value={m}>{MODULO_LABEL[m] ?? m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filtros.criticidade ?? "_all"}
          onValueChange={(v) => setFiltros((s) => ({ ...s, criticidade: v === "_all" ? undefined : (v as AuditoriaCriticidade) }))}
        >
          <SelectTrigger><SelectValue placeholder="Criticidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas</SelectItem>
            <SelectItem value="CRITICA">Crítica</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="BAIXA">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="ID da entidade"
          value={filtros.entidadeId ?? ""}
          onChange={(e) => setFiltros((s) => ({ ...s, entidadeId: e.target.value || undefined }))}
        />
        <Input
          placeholder="E-mail do usuário"
          value={filtros.usuarioEmail ?? ""}
          onChange={(e) => setFiltros((s) => ({ ...s, usuarioEmail: e.target.value || undefined }))}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Crit.</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && data.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum evento encontrado.</TableCell></TableRow>
            )}
            {data.map((r) => (
              <TableRow key={r.id} className="text-sm">
                <TableCell className="whitespace-nowrap font-mono text-xs">{fmtData(r.data_hora)}</TableCell>
                <TableCell><Badge variant="outline">{MODULO_LABEL[r.modulo] ?? r.modulo}</Badge></TableCell>
                <TableCell>
                  <div className="font-medium">{r.entidade_tipo}</div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">{r.entidade_id}</div>
                </TableCell>
                <TableCell><span className="font-semibold">{r.acao}</span></TableCell>
                <TableCell><Badge className={CRITICIDADE_TONE[r.criticidade]}>{r.criticidade}</Badge></TableCell>
                <TableCell className="truncate max-w-[180px]">{r.usuario_email ?? r.usuario_id ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.origem}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" title="Visualizar" onClick={() => setSelected(r)}>
                    <Eye className="h-4 w-4 text-sky-600" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Abrir origem" onClick={() => abrirOrigem(r)}>
                    <ExternalLink className="h-4 w-4 text-indigo-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.acao} <span className="text-muted-foreground text-sm">— {selected?.entidade_tipo}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><b>Módulo:</b> {MODULO_LABEL[selected.modulo] ?? selected.modulo}</div>
                <div><b>Origem:</b> {selected.origem}</div>
                <div><b>Data:</b> {fmtData(selected.data_hora)}</div>
                <div><b>Criticidade:</b> {selected.criticidade}</div>
                <div className="col-span-2"><b>Usuário:</b> {selected.usuario_email ?? selected.usuario_id ?? "—"}</div>
                <div className="col-span-2"><b>Entidade ID:</b> <span className="font-mono">{selected.entidade_id}</span></div>
                {selected.observacao && <div className="col-span-2"><b>Observação:</b> {selected.observacao}</div>}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Antes → Depois</div>
                <AntesDepois antes={selected.antes} depois={selected.depois} />
              </div>
              {selected.payload && Object.keys(selected.payload).length > 0 && (
                <details className="rounded-md border p-2">
                  <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-foreground">Payload bruto</summary>
                  <pre className="mt-2 max-h-64 overflow-auto text-[11px]">{JSON.stringify(selected.payload, null, 2)}</pre>
                </details>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
                <Button onClick={() => { abrirOrigem(selected); setSelected(null); }}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Abrir origem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "rose" | "amber";
}) {
  const color =
    tone === "rose" ? "text-rose-600"
    : tone === "amber" ? "text-amber-600"
    : "text-slate-700";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-xl font-semibold ${color}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
