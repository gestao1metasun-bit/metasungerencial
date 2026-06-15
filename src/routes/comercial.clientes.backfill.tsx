/**
 * C-ENT.1.g — Utilitário admin de Backfill LS → Supabase (clientes).
 *
 * Acesso: apenas admin (admin_master / admin_geral). NÃO linkado na navegação.
 * Fluxo: 1) Analisar (dry-run)  →  2) Revisar  →  3) Executar (apenas CRIAR).
 *
 * Garantias:
 *  - LS não é tocado.
 *  - Clientes Supabase existentes não são alterados.
 *  - Duplicidades possíveis NÃO são auto-resolvidas.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, PlayCircle, ShieldAlert, FlaskConical, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useIsAdmin } from "@/lib/auth-store";
import { useClientesFull } from "@/lib/clientes-store";
import {
  analisarBackfill,
  executarBackfill,
  type BackfillSummary,
  type BackfillExecResult,
  type BackfillItemStatus,
} from "@/lib/repositories/clientes-backfill";
import { toast } from "sonner";

export const Route = createFileRoute("/comercial/clientes/backfill")({
  head: () => ({ meta: [{ title: "Backfill LS → Supabase — Meta Sun ERP" }] }),
  component: BackfillPage,
});

const STATUS_BADGE: Record<BackfillItemStatus, { label: string; cls: string }> = {
  CRIAR: { label: "Criar", cls: "bg-emerald-100 text-emerald-800" },
  JA_EXISTE: { label: "Já existe", cls: "bg-slate-100 text-slate-700" },
  POSSIVEL_DUPLICIDADE: { label: "Possível duplicidade", cls: "bg-amber-100 text-amber-800" },
  INVALIDO: { label: "Inválido", cls: "bg-rose-100 text-rose-800" },
  JA_TEM_UUID: { label: "ID já é UUID", cls: "bg-indigo-100 text-indigo-800" },
};

function BackfillPage() {
  const admin = useIsAdmin();
  const ls = useClientesFull();
  const lsById = useMemo(() => Object.fromEntries(ls.map((c) => [c.id, c])), [ls]);

  const [analyzing, setAnalyzing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [summary, setSummary] = useState<BackfillSummary | null>(null);
  const [result, setResult] = useState<BackfillExecResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [filter, setFilter] = useState<BackfillItemStatus | "ALL">("ALL");

  if (!admin) {
    return (
      <>
        <PageHeader title="Backfill de Clientes" subtitle="Utilitário administrativo" />
        <Card className="mx-auto mt-8 max-w-xl border-amber-300 bg-amber-50 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-600" />
          <h2 className="mt-3 font-semibold">Acesso restrito</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta rotina é exclusiva para administradores do ERP.
          </p>
          <div className="mt-4">
            <Link to="/comercial/clientes"><Button variant="outline" size="sm">Voltar</Button></Link>
          </div>
        </Card>
      </>
    );
  }

  const onAnalisar = async () => {
    setAnalyzing(true);
    setResult(null);
    try {
      const s = await analisarBackfill(ls);
      setSummary(s);
      toast.success(`Dry-run concluído: ${s.criar} a criar, ${s.jaExiste} já existem, ${s.possivelDuplicidade} possíveis duplicidades`);
    } catch (e) {
      toast.error(`Falha no dry-run: ${(e as Error).message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const onExecutar = async () => {
    if (!summary) return;
    setConfirmOpen(false);
    setExecuting(true);
    try {
      const r = await executarBackfill(summary, lsById);
      setResult(r);
      toast.success(`Backfill concluído: ${r.criados} criados, ${r.falhas} falhas`);
    } catch (e) {
      toast.error(`Falha na execução: ${(e as Error).message}`);
    } finally {
      setExecuting(false);
    }
  };

  const itens = useMemo(() => {
    if (!summary) return [];
    return filter === "ALL"
      ? summary.itens
      : summary.itens.filter((i) => i.status === filter);
  }, [summary, filter]);

  return (
    <>
      <PageHeader
        title="Backfill LS → Supabase (Clientes)"
        subtitle="Utilitário administrativo · C-ENT.1.g"
        actions={
          <Link to="/comercial/clientes">
            <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          </Link>
        }
      />

      <Card className="p-4 border-amber-300 bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Esta rotina é segura por construção.</p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>Nenhum dado é apagado do LocalStorage.</li>
              <li>Clientes já existentes em Supabase <b>não</b> são alterados.</li>
              <li>Possíveis duplicidades <b>não</b> são auto-resolvidas — exigem análise manual.</li>
              <li>Apenas registros classificados como <b>Criar</b> são inseridos.</li>
              <li>Cada inserido recebe <code>codigo_externo=backfill_ls:&lt;id&gt;</code> e <code>sistema_destino=LEGADO_LS</code>.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-4 mt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm">
            <b>{ls.length}</b> cliente(s) encontrado(s) em LS (<code>ms.clientes.full.v1</code>).
          </div>
          <div className="ml-auto flex gap-2">
            <Button onClick={onAnalisar} disabled={analyzing || executing} size="sm">
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
              {summary ? "Reanalisar (dry-run)" : "Analisar (dry-run)"}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!summary || summary.criar === 0 || executing}
              variant="default"
              size="sm"
            >
              {executing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Executar criação ({summary?.criar ?? 0})
            </Button>
          </div>
        </div>
      </Card>

      {summary && (
        <Card className="p-4 mt-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-sm">
            <Box label="Total LS" value={summary.totalLs} />
            <Box label="Já em Supabase" value={summary.jaExiste} accent="text-slate-700" />
            <Box label="A criar" value={summary.criar} accent="text-emerald-700" />
            <Box label="Possível dup." value={summary.possivelDuplicidade} accent="text-amber-700" />
            <Box label="Inválidos" value={summary.invalido} accent="text-rose-700" />
            <Box label="UUID já" value={summary.jaTemUuid} accent="text-indigo-700" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {(["ALL", "CRIAR", "POSSIVEL_DUPLICIDADE", "JA_EXISTE", "INVALIDO", "JA_TEM_UUID"] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={filter === k ? "default" : "outline"}
                onClick={() => setFilter(k)}
              >
                {k === "ALL" ? "Todos" : STATUS_BADGE[k].label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {summary && (
        <Card className="mt-3 overflow-hidden">
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Doc</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Similar (top 1)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                      Nenhum item neste filtro.
                    </TableCell>
                  </TableRow>
                )}
                {itens.map((it) => {
                  const top = it.similares[0];
                  const b = STATUS_BADGE[it.status];
                  return (
                    <TableRow key={it.lsId}>
                      <TableCell><Badge className={b.cls}>{b.label}</Badge></TableCell>
                      <TableCell className="font-medium">{it.nome}</TableCell>
                      <TableCell className="text-xs">{it.doc || "—"}</TableCell>
                      <TableCell className="text-xs">{it.telefone || "—"}</TableCell>
                      <TableCell className="text-xs">{it.email || "—"}</TableCell>
                      <TableCell className="text-xs">{it.motivo}</TableCell>
                      <TableCell className="text-xs">
                        {top ? `${top.nome} · score ${top.score} · ${top.motivo}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-4 mt-3 border-emerald-300 bg-emerald-50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">Execução concluída</p>
              <p className="mt-1 text-emerald-900/90">
                Tentados: <b>{result.tentados}</b> · Criados: <b>{result.criados}</b> ·
                Falhas: <b>{result.falhas}</b> · Duração: {result.duracaoMs} ms
              </p>
              {result.erros.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-rose-700">Ver {result.erros.length} erro(s)</summary>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5 text-xs">
                    {result.erros.map((e, i) => (
                      <li key={i}><b>{e.nome}</b> ({e.lsId}): {e.mensagem}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="mt-2 text-xs text-emerald-900/80">
                Recomendado: revise <Link to="/comercial/clientes" className="underline">/comercial/clientes</Link>,
                confira se os registros aparecem e valide algumas amostras no Workspace 360º.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar execução do backfill</DialogTitle>
            <DialogDescription>
              Serão inseridos <b>{summary?.criar ?? 0}</b> cliente(s) novo(s) em <code>public.clientes</code>.
              Clientes existentes <b>não</b> serão alterados e LS <b>não</b> será tocado. Confirma?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={onExecutar}><PlayCircle className="mr-2 h-4 w-4" /> Executar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Box({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className={`text-2xl font-semibold ${accent ?? ""}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
