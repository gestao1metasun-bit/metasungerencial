// ============================================================================
// D22 — Aba "Visão Unificada" da Central de Aprovações.
// Consolida workflow_aprovacoes + filas operacionais (Suprimentos) em uma única
// fila. Aprovar/Reprovar direto SÓ para origem WORKFLOW (usa RPCs oficiais).
// Demais origens exigem "Abrir origem" (regra de negócio do módulo).
// ============================================================================
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X, ExternalLink, Eye, Inbox, AlertTriangle, DollarSign, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-store";
import {
  useAprovacoesUnificadas, rotaDaOrigem, type AprovacaoUnificadaRow,
} from "@/lib/repositories/aprovacoes-unificadas-repo";
import {
  useAprovarSolicitacao, useNegarSolicitacao,
} from "@/hooks/useWorkflowAprovacoes";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));
const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const MODULO_LABEL: Record<string, string> = {
  WORKFLOW: "Workflow",
  SUPRIMENTOS: "Suprimentos",
};
const TIPO_LABEL: Record<string, string> = {
  REQUISICAO: "Requisição",
  COTACAO: "Cotação",
  PEDIDO_COMPRA: "Pedido de Compra",
  compra: "Compra",
  material: "Material",
  desconto: "Desconto",
  pagamento: "Pagamento",
  cancelamento: "Cancelamento",
  proposta_excecao_rs_kwp: "Exceção R$/kWp",
};
const PRIO_TONE: Record<string, string> = {
  ALTA: "bg-rose-100 text-rose-900 border-rose-300",
  MEDIA: "bg-amber-100 text-amber-900 border-amber-300",
  NORMAL: "bg-slate-100 text-slate-700 border-slate-300",
};

export default function UnificadaTab() {
  const auth = useAuth();
  const uid = auth.user?.id ?? null;
  const navigate = useNavigate();
  const { data: rows = [], isLoading, refetch } = useAprovacoesUnificadas();

  const [busca, setBusca] = useState("");
  const [moduloFiltro, setModuloFiltro] = useState<string>("TODOS");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("TODAS");
  const [acao, setAcao] = useState<{ kind: "aprovar" | "negar"; row: AprovacaoUnificadaRow } | null>(null);
  const [motivo, setMotivo] = useState("");

  const aprovar = useAprovarSolicitacao();
  const negar = useNegarSolicitacao();

  const filtrados = useMemo(() => {
    let r = rows;
    if (moduloFiltro !== "TODOS") r = r.filter((x) => x.origem_modulo === moduloFiltro);
    if (prioridadeFiltro !== "TODAS") r = r.filter((x) => x.prioridade === prioridadeFiltro);
    if (busca.trim()) {
      const t = busca.trim().toLowerCase();
      r = r.filter((x) =>
        [x.titulo, x.descricao, x.solicitante_email, x.origem_tipo].some(
          (v) => v?.toLowerCase().includes(t),
        ),
      );
    }
    return r;
  }, [rows, busca, moduloFiltro, prioridadeFiltro]);

  const counts = useMemo(() => {
    const total = rows.length;
    const vencidas = rows.filter((r) => r.prazo_sla && new Date(r.prazo_sla) < new Date()).length;
    const valorPendente = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
    const paraMim = rows.filter((r) => r.origem_modulo === "WORKFLOW" && r.solicitante_id !== uid).length;
    return { total, vencidas, valorPendente, paraMim };
  }, [rows, uid]);

  function abrirOrigem(row: AprovacaoUnificadaRow) {
    const r = rotaDaOrigem(row);
    if (!r) return;
    navigate({ to: r.to, hash: r.hash });
  }

  async function confirmarAcao() {
    if (!acao) return;
    if (acao.row.origem_modulo !== "WORKFLOW") return;
    try {
      if (acao.kind === "aprovar") {
        await aprovar.mutateAsync({ id: acao.row.origem_id, motivo: motivo || undefined });
      } else {
        if (motivo.trim().length < 5) return;
        await negar.mutateAsync({ id: acao.row.origem_id, motivo });
      }
      setAcao(null); setMotivo("");
      void refetch();
    } catch { /* toast já é disparado nos hooks */ }
  }

  return (
    <div className="space-y-3 pt-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Aprovações pendentes" value={counts.total} icon={Inbox} />
        <StatCard label="Aguardando minha alçada" value={counts.paraMim} icon={ShieldCheck} />
        <StatCard label="Vencidas / atrasadas" value={counts.vencidas} icon={AlertTriangle} />
        <StatCard label="Valor pendente" value={fmtBRL(counts.valorPendente)} icon={DollarSign} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded border border-border/70 bg-muted/30 px-2 py-1.5">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar título, solicitante, tipo…"
          className="h-7 max-w-xs text-xs"
        />
        <Select value={moduloFiltro} onValueChange={setModuloFiltro}>
          <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os módulos</SelectItem>
            <SelectItem value="WORKFLOW">Workflow corporativo</SelectItem>
            <SelectItem value="SUPRIMENTOS">Suprimentos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas as prioridades</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Média</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()}>
          Atualizar
        </Button>
      </div>

      <div className="rounded-md border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Módulo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Solicitado</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="text-right w-[220px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && filtrados.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                Nenhuma aprovação pendente para os filtros atuais.
              </TableCell></TableRow>
            )}
            {filtrados.map((r) => {
              const vencida = r.prazo_sla && new Date(r.prazo_sla) < new Date();
              const podeAprovarInline = r.acao_via_rpc && r.solicitante_id !== uid;
              return (
                <TableRow key={r.chave}>
                  <TableCell><Badge variant="outline">{MODULO_LABEL[r.origem_modulo] ?? r.origem_modulo}</Badge></TableCell>
                  <TableCell className="text-xs">{TIPO_LABEL[r.origem_tipo] ?? r.origem_tipo}</TableCell>
                  <TableCell className="font-medium text-xs">{r.titulo}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtBRL(Number(r.valor))}</TableCell>
                  <TableCell className="text-xs">{r.solicitante_email ?? r.solicitante_id?.slice(0,8) ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={PRIO_TONE[r.prioridade] ?? PRIO_TONE.NORMAL}>
                      {r.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtData(r.data_solicitacao)} <span className="opacity-60">({r.dias_pendente}d)</span></TableCell>
                  <TableCell className={`text-xs ${vencida ? "text-rose-700 font-semibold" : "text-muted-foreground"}`}>
                    {r.prazo_sla ? fmtData(r.prazo_sla) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {podeAprovarInline && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => { setAcao({ kind: "aprovar", row: r }); setMotivo(""); }}
                            title="Aprovar (RPC oficial)">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-700 hover:bg-rose-50"
                            onClick={() => { setAcao({ kind: "negar", row: r }); setMotivo(""); }}
                            title="Reprovar (RPC oficial)">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => abrirOrigem(r)}
                        title={r.acao_via_rpc ? "Abrir detalhe" : "Abrir origem (necessária para aprovar)"}>
                        {r.acao_via_rpc ? <Eye className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!acao} onOpenChange={(o) => { if (!o) { setAcao(null); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{acao?.kind === "aprovar" ? "Aprovar solicitação" : "Reprovar solicitação"}</DialogTitle>
            <DialogDescription>
              {acao?.row.titulo} — {fmtBRL(Number(acao?.row.valor ?? 0))}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={acao?.kind === "negar" ? "Motivo (mínimo 5 caracteres) *" : "Observação (opcional)"}
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAcao(null); setMotivo(""); }}>Cancelar</Button>
            <Button
              onClick={confirmarAcao}
              disabled={(acao?.kind === "negar" && motivo.trim().length < 5) || aprovar.isPending || negar.isPending}
              className={acao?.kind === "aprovar" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
            >
              {acao?.kind === "aprovar" ? "Aprovar" : "Reprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
