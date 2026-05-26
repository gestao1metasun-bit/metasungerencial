/**
 * Aba "Projetos (Supabase)" do contrato — Onda A.
 *
 * Substitui em nada a aba legada `ProjetosManager` (localStorage).
 * Esta aba opera EXCLUSIVAMENTE em `projetos_contrato` no Supabase,
 * usando as RPCs já existentes:
 *   - aprovar_projeto
 *   - cancelar_projeto
 *   - enviar_projeto_para_engenharia
 *   - recalcular_saldo_contrato
 *
 * Frontend NÃO duplica regra de domínio — apenas chama RPC e reflete estado.
 *
 * Pré-condição: `contratoUuid` precisa ser UUID (contratos persistidos no
 * Supabase). Para contratos legados ainda só locais, a aba renderiza um
 * aviso e nada quebra.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, CheckCircle2, XCircle, Send, Pencil, RefreshCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchByContrato, criarProjeto, atualizarProjeto, aprovarProjeto, cancelarProjeto,
  enviarParaEngenharia, recalcularSaldoContrato, isUuid,
  type ProjetoContratoRow, type SaldoContrato,
} from "@/lib/repositories/projetos-contrato-repo";
import {
  PROJETO_STATUS_LABEL, PROJETO_STATUS_BADGE,
  isProjetoEditavel, podeAprovar, podeCancelar, podeEnviarEngenharia,
  type ProjetoContratoStatus,
} from "@/lib/projetosContratoStatus";

const TAG_UI = "[projetos-ui]";

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function StatusBadge({ status }: { status: ProjetoContratoStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${PROJETO_STATUS_BADGE[status]}`}
    >
      {PROJETO_STATUS_LABEL[status]}
    </span>
  );
}

export function ProjetosContratoSupabaseTab({
  contratoUuid,
  contratoValorTotal,
}: {
  contratoUuid: string;
  contratoValorTotal?: number;
}) {
  const [rows, setRows] = useState<ProjetoContratoRow[]>([]);
  const [saldo, setSaldo] = useState<SaldoContrato | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valido = isUuid(contratoUuid);

  const recarregar = useCallback(async () => {
    if (!valido) return;
    setLoading(true);
    setErr(null);
    console.info(TAG_UI, "recarregar", { contratoUuid });
    const [r1, r2] = await Promise.all([
      fetchByContrato(contratoUuid),
      recalcularSaldoContrato(contratoUuid),
    ]);
    if (r1.error) setErr(r1.error);
    else if (r1.data) setRows(r1.data);
    if (!r2.error && r2.data) setSaldo(r2.data);
    setLoading(false);
  }, [contratoUuid, valido]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  if (!valido) {
    return (
      <Card className="p-6 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Contrato ainda não sincronizado no Supabase.</p>
            <p className="text-muted-foreground mt-1">
              Esta aba opera em <code className="font-mono text-xs">projetos_contrato</code> e exige
              um contrato com UUID. O ID atual <span className="font-mono">{contratoUuid || "(vazio)"}</span> é local.
              Use a aba <b>3. Projetos</b> para a operação legada.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saldo do contrato */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiBox label="Valor total" valor={saldo?.total ?? contratoValorTotal ?? 0} />
          <KpiBox label="Distribuído (ativos)" valor={saldo?.somado ?? 0} />
          <KpiBox label="Aprovado" valor={saldo?.aprovado ?? 0} tone="success" />
          <KpiBox label="Saldo restante" valor={saldo?.saldo ?? 0} tone={(saldo?.saldo ?? 0) < 0 ? "destructive" : "primary"} />
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {rows.length} projeto(s) · UUID contrato <span className="font-mono">{contratoUuid.slice(0, 8)}…</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void recarregar()} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <CriarProjetoDialog
            contratoUuid={contratoUuid}
            ordemProxima={(rows.at(-1)?.ordem ?? 0) + 1}
            onDone={recarregar}
          />
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {err}
        </div>
      )}

      {/* Tabela */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">kWp</TableHead>
              <TableHead className="text-right">Módulos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Obra</TableHead>
              <TableHead>Aprovado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  {loading ? "Carregando…" : "Nenhum projeto. Clique em \"Novo projeto\" para criar."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => (
              <ProjetoRow key={p.id} p={p} onChanged={recarregar} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function KpiBox({ label, valor, tone }: { label: string; valor: number; tone?: "success" | "primary" | "destructive" }) {
  const toneCls =
    tone === "success" ? "text-success" :
    tone === "destructive" ? "text-destructive" :
    tone === "primary" ? "text-primary" :
    "text-foreground";
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-base font-semibold ${toneCls}`}>{fmtBRL(valor)}</div>
    </div>
  );
}

function ProjetoRow({ p, onChanged }: { p: ProjetoContratoRow; onChanged: () => void }) {
  const editavel = isProjetoEditavel(p.status);
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{p.ordem}</TableCell>
      <TableCell className="max-w-[260px]">
        <div className="truncate font-medium">{p.descricao || "—"}</div>
        <div className="text-[11px] text-muted-foreground font-mono">{p.id.slice(0, 8)}…</div>
      </TableCell>
      <TableCell className="text-right font-mono">{fmtBRL(p.valor)}</TableCell>
      <TableCell className="text-right font-mono">{p.potencia_kwp ?? "—"}</TableCell>
      <TableCell className="text-right font-mono">{p.modulos_qtd ?? "—"}</TableCell>
      <TableCell><StatusBadge status={p.status} /></TableCell>
      <TableCell className="font-mono text-[11px]">
        {p.obra_id ? p.obra_id.slice(0, 8) + "…" : "—"}
      </TableCell>
      <TableCell className="text-[11px] text-muted-foreground">
        {p.aprovado_em ? new Date(p.aprovado_em).toLocaleDateString("pt-BR") : "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {editavel && <EditarProjetoDialog projeto={p} onDone={onChanged} />}
          {podeAprovar(p.status) && <AprovarBtn projetoId={p.id} onDone={onChanged} />}
          {podeEnviarEngenharia(p.status) && <EnviarEngenhariaBtn projetoId={p.id} onDone={onChanged} />}
          {podeCancelar(p.status) && <CancelarBtn projetoId={p.id} onDone={onChanged} />}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Ações ──────────────────────────────────────────────────────────────────

function AprovarBtn({ projetoId, onDone }: { projetoId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost" size="sm" className="text-success"
      disabled={busy}
      title="Aprovar projeto"
      onClick={async () => {
        if (!window.confirm("Aprovar este projeto?\n\nApós aprovado, dados estruturais ficam bloqueados.")) return;
        setBusy(true);
        const r = await aprovarProjeto(projetoId);
        setBusy(false);
        if (r.error) { toast.error("Falha ao aprovar: " + r.error); return; }
        toast.success("Projeto aprovado.");
        onDone();
      }}
    >
      <CheckCircle2 className="h-4 w-4" />
    </Button>
  );
}

function EnviarEngenhariaBtn({ projetoId, onDone }: { projetoId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost" size="sm" className="text-info"
      disabled={busy}
      title="Enviar para Engenharia"
      onClick={async () => {
        if (!window.confirm("Enviar projeto à Engenharia?\n\nUma OBRA será criada automaticamente.")) return;
        setBusy(true);
        const r = await enviarParaEngenharia(projetoId);
        setBusy(false);
        if (r.error) { toast.error("Falha: " + r.error); return; }
        toast.success("Projeto enviado. Obra criada: " + r.data.slice(0, 8) + "…");
        onDone();
      }}
    >
      <Send className="h-4 w-4" />
    </Button>
  );
}

function CancelarBtn({ projetoId, onDone }: { projetoId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive" title="Cancelar projeto">
          <XCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar projeto</DialogTitle>
          <DialogDescription>Informe o motivo (mínimo 3 caracteres). Esta ação fica registrada em auditoria.</DialogDescription>
        </DialogHeader>
        <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo do cancelamento…" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Voltar</Button>
          <Button
            variant="destructive"
            disabled={busy || motivo.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              const r = await cancelarProjeto(projetoId, motivo);
              setBusy(false);
              if (r.error) { toast.error("Falha: " + r.error); return; }
              toast.success("Projeto cancelado.");
              setOpen(false);
              setMotivo("");
              onDone();
            }}
          >
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogos de criação / edição ────────────────────────────────────────────

type FormState = {
  descricao: string;
  valor: number;
  potencia_kwp: number;
  modulos_qtd: number;
  inv1: string;
  telhado_tipo: string;
  endereco_logradouro: string;
  endereco_cidade: string;
  endereco_uf: string;
};

const FORM_EMPTY: FormState = {
  descricao: "", valor: 0, potencia_kwp: 0, modulos_qtd: 0,
  inv1: "", telhado_tipo: "", endereco_logradouro: "", endereco_cidade: "", endereco_uf: "",
};

function CriarProjetoDialog({
  contratoUuid, ordemProxima, onDone,
}: { contratoUuid: string; ordemProxima: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<FormState>(FORM_EMPTY);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setF(FORM_EMPTY); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> Novo projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo projeto do contrato</DialogTitle>
          <DialogDescription>Ordem #{ordemProxima}. Será criado como RASCUNHO.</DialogDescription>
        </DialogHeader>
        <FormFields f={f} setF={setF} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={busy || !f.descricao.trim() || f.valor <= 0}
            onClick={async () => {
              setBusy(true);
              const r = await criarProjeto({
                contrato_id: contratoUuid,
                descricao: f.descricao,
                valor: f.valor,
                ordem: ordemProxima,
                potencia_kwp: f.potencia_kwp || null,
                modulos_qtd: f.modulos_qtd || null,
                inv1: f.inv1 || null,
                telhado_tipo: f.telhado_tipo || null,
                endereco: {
                  logradouro: f.endereco_logradouro,
                  cidade: f.endereco_cidade,
                  uf: f.endereco_uf,
                },
              });
              setBusy(false);
              if (r.error) { toast.error("Falha: " + r.error); return; }
              toast.success("Projeto criado.");
              setOpen(false);
              setF(FORM_EMPTY);
              onDone();
            }}
          >
            Criar projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarProjetoDialog({ projeto, onDone }: { projeto: ProjetoContratoRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const endereco = (projeto.endereco ?? {}) as Record<string, string>;
  const [f, setF] = useState<FormState>({
    descricao: projeto.descricao ?? "",
    valor: Number(projeto.valor) || 0,
    potencia_kwp: Number(projeto.potencia_kwp) || 0,
    modulos_qtd: Number(projeto.modulos_qtd) || 0,
    inv1: projeto.inv1 ?? "",
    telhado_tipo: projeto.telhado_tipo ?? "",
    endereco_logradouro: endereco.logradouro ?? "",
    endereco_cidade: endereco.cidade ?? "",
    endereco_uf: endereco.uf ?? "",
  });
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Editar"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar projeto</DialogTitle>
          <DialogDescription>Edição permitida apenas em RASCUNHO/PENDENTE.</DialogDescription>
        </DialogHeader>
        <FormFields f={f} setF={setF} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await atualizarProjeto(projeto.id, {
                descricao: f.descricao,
                valor: f.valor,
                potencia_kwp: f.potencia_kwp || null,
                modulos_qtd: f.modulos_qtd || null,
                inv1: f.inv1 || null,
                telhado_tipo: f.telhado_tipo || null,
                endereco: {
                  logradouro: f.endereco_logradouro,
                  cidade: f.endereco_cidade,
                  uf: f.endereco_uf,
                },
              });
              setBusy(false);
              if (r.error) { toast.error("Falha: " + r.error); return; }
              toast.success("Projeto atualizado.");
              setOpen(false);
              onDone();
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormFields({ f, setF }: { f: FormState; setF: (v: FormState) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1.5 md:col-span-2">
        <Label>Descrição</Label>
        <Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Valor (R$)</Label>
        <Input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) || 0 })} />
      </div>
      <div className="space-y-1.5">
        <Label>Telhado</Label>
        <Input value={f.telhado_tipo} onChange={(e) => setF({ ...f, telhado_tipo: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Potência (kWp)</Label>
        <Input type="number" step="0.01" value={f.potencia_kwp} onChange={(e) => setF({ ...f, potencia_kwp: Number(e.target.value) || 0 })} />
      </div>
      <div className="space-y-1.5">
        <Label>Módulos</Label>
        <Input type="number" value={f.modulos_qtd} onChange={(e) => setF({ ...f, modulos_qtd: Number(e.target.value) || 0 })} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>Inversor 1</Label>
        <Input value={f.inv1} onChange={(e) => setF({ ...f, inv1: e.target.value })} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>Endereço — Logradouro</Label>
        <Input value={f.endereco_logradouro} onChange={(e) => setF({ ...f, endereco_logradouro: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Cidade</Label>
        <Input value={f.endereco_cidade} onChange={(e) => setF({ ...f, endereco_cidade: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>UF</Label>
        <Input maxLength={2} value={f.endereco_uf} onChange={(e) => setF({ ...f, endereco_uf: e.target.value.toUpperCase() })} />
      </div>
    </div>
  );
}
