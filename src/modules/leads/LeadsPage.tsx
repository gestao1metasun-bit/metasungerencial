import { useMemo, useState } from "react";
import { Plus, Search, Eye, Send, History as HistoryIcon, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import {
  useLeads, criarLead, setLeadStatus, trocarOrigemLead, trocarConsultorLead,
  type Lead,
} from "./store";
import {
  LEAD_STATUS, LEAD_STATUS_LABEL, LEAD_STATUS_OPTIONS,
  ORIGEM_LEAD_LABEL, ORIGEM_LEAD_OPTIONS,
  PROPOSTA_STATUS_LABEL,
  statusClass, type LeadStatus, type OrigemLead,
} from "@/lib/status-catalog";
import { useConsultoresAtivos, formatTelefoneBR } from "@/lib/consultores-store";
import { useAuth } from "@/lib/auth-store";
import { HistoricoTimeline } from "@/components/app/HistoricoTimeline";
import {
  usePropostas, criarPropostaParaLead, aprovarPropostaDoLead,
  marcarPropostaNaoAprovada, cancelarPropostaComMotivo,
  fmtBRL, calcPrecificacao, calcDimensionamento, type PropostaFV,
} from "@/modules/propostas/store";
import {
  useContratos, criarContratoDeProposta, anexarContratoAssinado,
  enviarContratoParaEngenharia, cancelarContrato, propostaTemContratoVinculado,
} from "@/lib/contratos-store";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch { return iso; }
}

export function LeadsPage() {
  const leads = useLeads();
  const consultores = useConsultoresAtivos();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("TODOS");
  const [filtroConsultor, setFiltroConsultor] = useState<string>("TODOS");
  const [novoOpen, setNovoOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<Lead | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads.filter((l) => {
      if (filtroStatus !== "TODOS" && l.status !== filtroStatus) return false;
      if (filtroOrigem !== "TODOS" && l.origem !== filtroOrigem) return false;
      if (filtroConsultor !== "TODOS" && l.consultorId !== filtroConsultor) return false;
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.telefone.toLowerCase().includes(q) ||
        l.numero.toLowerCase().includes(q)
      );
    });
  }, [leads, busca, filtroStatus, filtroOrigem, filtroConsultor]);

  const consultorNome = (id: string) =>
    consultores.find((c) => c.id === id)?.nome ?? id;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, número…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-72 pl-8"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {LEAD_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas as origens</SelectItem>
              {ORIGEM_LEAD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os consultores</SelectItem>
              {consultores.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button onClick={() => setNovoOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo Lead
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Consumo (kWh)</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtrados.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.numero}</TableCell>
                <TableCell className="text-xs">{fmtDate(l.criadoEm)}</TableCell>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell className="text-xs">{l.telefone}</TableCell>
                <TableCell className="text-right">{l.consumoKwh.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs">{consultorNome(l.consultorId)}</TableCell>
                <TableCell className="text-xs">{ORIGEM_LEAD_LABEL[l.origem] ?? l.origem}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${statusClass(l.status)} font-medium`}>
                    {LEAD_STATUS_LABEL[l.status] ?? l.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDetalhe(l)}>
                    <Eye className="mr-1 h-4 w-4" /> Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NovoLeadDialog open={novoOpen} onClose={() => setNovoOpen(false)} />
      {detalhe && (
        <LeadDetailDialog
          lead={detalhe}
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}

/* =================== Novo Lead =================== */

function NovoLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const consultores = useConsultoresAtivos();
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [consumo, setConsumo] = useState("");
  const [consultorId, setConsultorId] = useState<string>("");
  const [origem, setOrigem] = useState<OrigemLead | "">("");
  const [observacao, setObservacao] = useState("");

  const reset = () => {
    setNome(""); setTelefone(""); setConsumo("");
    setConsultorId(""); setOrigem(""); setObservacao("");
  };

  const salvar = () => {
    if (!nome.trim() || !telefone.trim() || !consumo || !consultorId || !origem) {
      toast.error("Preencha todos os campos obrigatórios antes de salvar o lead.");
      return;
    }
    const consumoNum = Number(consumo);
    if (!Number.isFinite(consumoNum) || consumoNum <= 0) {
      toast.error("Consumo desejado inválido.");
      return;
    }
    const lead = criarLead({
      nome, telefone, consumoKwh: consumoNum,
      consultorId, origem: origem as OrigemLead,
      observacao,
      criadoPor: user?.email ?? undefined,
    });
    toast.success(`Lead ${lead.numero} criado.`);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Campos com <span className="text-destructive">*</span> são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome do lead <span className="text-destructive">*</span></Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Telefone <span className="text-destructive">*</span></Label>
            <Input value={telefone} onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))} />
          </div>
          <div>
            <Label>Consumo desejado (kWh/mês) <span className="text-destructive">*</span></Label>
            <Input
              type="number" min={1} value={consumo}
              onChange={(e) => setConsumo(e.target.value)}
            />
          </div>
          <div>
            <Label>Consultor responsável <span className="text-destructive">*</span></Label>
            <Select value={consultorId} onValueChange={setConsultorId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {consultores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origem do lead <span className="text-destructive">*</span></Label>
            <Select value={origem} onValueChange={(v) => setOrigem(v as OrigemLead)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {ORIGEM_LEAD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Observação</Label>
            <Textarea
              rows={3} value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={salvar}>Salvar lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =================== Detalhe + ações =================== */

function LeadDetailDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const consultores = useConsultoresAtivos();
  const { user, role } = useAuth();
  const isAdminMaster = role === "admin_master";
  const isGerente = role === "admin_master" || role === "admin_geral";

  const [trocaOrigemOpen, setTrocaOrigemOpen] = useState(false);
  const [trocaConsultorOpen, setTrocaConsultorOpen] = useState(false);
  const [solicitarOpen, setSolicitarOpen] = useState(false);

  const podeSolicitarProposta =
    lead.status === LEAD_STATUS.LEAD_CADASTRADO ||
    lead.status === LEAD_STATUS.EM_ATENDIMENTO;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead.nome} — {lead.numero}</DialogTitle>
          <DialogDescription>
            Criado em {fmtDate(lead.criadoEm)} • Status atual:{" "}
            <Badge variant="outline" className={`${statusClass(lead.status)} ml-1 font-medium`}>
              {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone" value={lead.telefone} />
          <Field label="Consumo desejado" value={`${lead.consumoKwh.toLocaleString("pt-BR")} kWh/mês`} />
          <Field
            label="Consultor"
            value={consultores.find((c) => c.id === lead.consultorId)?.nome ?? lead.consultorId}
            actionLabel={isGerente ? "Alterar" : undefined}
            onAction={() => setTrocaConsultorOpen(true)}
            locked={!isGerente}
          />
          <Field
            label="Origem"
            value={ORIGEM_LEAD_LABEL[lead.origem] ?? lead.origem}
            actionLabel={isAdminMaster ? "Alterar" : undefined}
            onAction={() => setTrocaOrigemOpen(true)}
            locked={!isAdminMaster}
          />
          {lead.observacao && (
            <div className="sm:col-span-2">
              <Field label="Observação" value={lead.observacao} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!podeSolicitarProposta}
            onClick={() => setSolicitarOpen(true)}
            title={!podeSolicitarProposta ? "Disponível apenas para leads em atendimento ou cadastrados." : undefined}
          >
            <Send className="mr-1 h-4 w-4" /> Solicitar Proposta
          </Button>
          {lead.status === LEAD_STATUS.LEAD_CADASTRADO && (
            <Button
              variant="outline"
              onClick={() => {
                setLeadStatus(lead.id, LEAD_STATUS.EM_ATENDIMENTO, user?.email);
                toast.success("Lead movido para EM ATENDIMENTO.");
              }}
            >
              Mover para EM ATENDIMENTO
            </Button>
          )}
        </div>

        <PropostasDoLeadPanel lead={lead} usuario={user?.email ?? "—"} />

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <HistoryIcon className="h-4 w-4 text-primary" /> Histórico
          </div>
          <HistoricoTimeline entidade="lead" entidadeId={lead.id} />
        </div>

        {trocaOrigemOpen && (
          <TrocaOrigemDialog
            lead={lead}
            usuario={user?.email ?? "—"}
            onClose={() => setTrocaOrigemOpen(false)}
          />
        )}
        {trocaConsultorOpen && (
          <TrocaConsultorDialog
            lead={lead}
            usuario={user?.email ?? "—"}
            onClose={() => setTrocaConsultorOpen(false)}
          />
        )}
        {solicitarOpen && (
          <SolicitarPropostaDialog
            lead={lead}
            usuario={user?.email ?? "—"}
            onClose={() => setSolicitarOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, value, actionLabel, onAction, locked,
}: {
  label: string; value: string;
  actionLabel?: string; onAction?: () => void; locked?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-sm font-medium">{value}</div>
        </div>
        {actionLabel && (
          <Button size="sm" variant="ghost" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {locked && !actionLabel && (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Somente admin" />
        )}
      </div>
    </div>
  );
}

function TrocaOrigemDialog({
  lead, usuario, onClose,
}: { lead: Lead; usuario: string; onClose: () => void }) {
  const [novaOrigem, setNovaOrigem] = useState<OrigemLead>(lead.origem);
  const [motivo, setMotivo] = useState("");

  const salvar = () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da alteração da origem.");
      return;
    }
    if (novaOrigem === lead.origem) {
      toast.info("A origem não foi alterada.");
      onClose();
      return;
    }
    trocarOrigemLead(lead.id, novaOrigem, usuario, motivo.trim());
    toast.success("Origem do lead alterada.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar origem do lead</DialogTitle>
          <DialogDescription>Restrita ao Admin Master. Toda alteração fica no histórico.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nova origem</Label>
            <Select value={novaOrigem} onValueChange={(v) => setNovaOrigem(v as OrigemLead)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGEM_LEAD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo <span className="text-destructive">*</span></Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar}>Salvar alteração</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrocaConsultorDialog({
  lead, usuario, onClose,
}: { lead: Lead; usuario: string; onClose: () => void }) {
  const consultores = useConsultoresAtivos();
  const [novoId, setNovoId] = useState(lead.consultorId);
  const [motivo, setMotivo] = useState("");

  const salvar = () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da troca de consultor.");
      return;
    }
    if (novoId === lead.consultorId) {
      toast.info("Consultor não foi alterado.");
      onClose();
      return;
    }
    trocarConsultorLead(lead.id, novoId, usuario, motivo.trim());
    toast.success("Consultor alterado.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar consultor responsável</DialogTitle>
          <DialogDescription>Restrita a Gerente Comercial / Admin Master. Toda alteração fica no histórico.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Novo consultor</Label>
            <Select value={novoId} onValueChange={setNovoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {consultores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo <span className="text-destructive">*</span></Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar}>Salvar alteração</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =================== Solicitar Proposta =================== */

function SolicitarPropostaDialog({
  lead, usuario, onClose,
}: { lead: Lead; usuario: string; onClose: () => void }) {
  const consultores = useConsultoresAtivos();
  const [observacao, setObservacao] = useState("");
  const consultorNome = consultores.find((c) => c.id === lead.consultorId)?.nome ?? lead.consultorId;

  const confirmar = () => {
    const proposta = criarPropostaParaLead({
      leadId: lead.id,
      leadNumero: lead.numero,
      clienteNome: lead.nome,
      clienteTelefone: lead.telefone,
      consumoKwh: lead.consumoKwh,
      consultorNome,
      observacao: observacao.trim() || undefined,
      usuario,
    });
    setLeadStatus(lead.id, LEAD_STATUS.PROPOSTA_SOLICITADA, usuario);
    toast.success(
      `Proposta ${proposta.numero} (${proposta.versao}) criada — ${PROPOSTA_STATUS_LABEL.AGUARDANDO_GERACAO}.`,
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Solicitar proposta</DialogTitle>
          <DialogDescription>
            Os dados do lead já foram preenchidos no cadastro. Basta confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Lead" value={`${lead.numero} — ${lead.nome}`} />
          <Field label="Telefone" value={lead.telefone} />
          <Field label="Consumo" value={`${lead.consumoKwh} kWh/mês`} />
          <Field label="Consultor" value={consultorNome} />
          <Field label="Origem" value={ORIGEM_LEAD_LABEL[lead.origem] ?? lead.origem} />
        </div>

        <div>
          <Label>Observação para o orçamentista (opcional)</Label>
          <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar}>Confirmar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =================== Propostas vinculadas ao Lead =================== */

function mapStatusLegacyToCanonical(s: PropostaFV["status"]): string {
  switch (s) {
    case "RASCUNHO": return "AGUARDANDO_GERACAO";
    case "GERADA": return "PROPOSTA_GERADA";
    case "ENVIADA": return "ENVIADA_AO_CONSULTOR";
    case "APROVADA": return "APROVADA";
    case "RECUSADA": return "NAO_APROVADA";
    case "VENCIDA": return "OBSOLETA";
    case "CANCELADA": return "CANCELADA";
    default: return s as string;
  }
}

function PropostasDoLeadPanel({ lead, usuario }: { lead: Lead; usuario: string }) {
  const todas = usePropostas();
  const contratos = useContratos();
  const propostas = useMemo(
    () => todas.filter((p) => p.leadId === lead.id)
      .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || "")),
    [todas, lead.id],
  );
  const [acao, setAcao] = useState<{ proposta: PropostaFV; tipo: "aprovar" | "recusar" | "cancelar" } | null>(null);
  const [anexarAlvo, setAnexarAlvo] = useState<string | null>(null);
  const [cancelarContratoAlvo, setCancelarContratoAlvo] = useState<string | null>(null);

  if (propostas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Nenhuma proposta vinculada ainda. Use <span className="font-medium">Solicitar Proposta</span> para gerar a P01.
      </div>
    );
  }

  function executarAprovacao(p: PropostaFV, motivo: string) {
    aprovarPropostaDoLead(p.id, usuario, motivo);
    const dim = calcDimensionamento(p);
    const r = criarContratoDeProposta({
      propostaId: p.id,
      propostaNumero: p.numero,
      leadId: lead.id,
      leadNumero: lead.numero,
      cliente: p.clienteNome,
      clienteId: p.clienteId,
      clienteFull: undefined,
      vendedor: p.consultor ?? p.criadoPor ?? "—",
      valor: calcPrecificacao(p).valorFinal,
      kwp: dim.potenciaFinalKwp,
      modulos: dim.qtdFinal,
      potencia: dim.potenciaFinalKwp,
      obs: p.obsCliente,
      usuario,
    });
    if (!r.ok) {
      toast.warning(`Proposta aprovada. Contrato pendente: complete o cadastro do cliente em Comercial → Contratos. Faltam: ${r.missing.join(", ")}.`);
      return;
    }
    toast.success(`Proposta ${p.numero} aprovada. Contrato ${r.contratoId} gerado.`);
  }

  return (
    <div>
      <div className="mb-2 text-sm font-semibold">Propostas deste lead</div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Versão</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propostas.map((p) => {
              const canonical = mapStatusLegacyToCanonical(p.status);
              const valor = calcPrecificacao(p).valorFinal;
              const podeAprovar = p.status !== "APROVADA" && p.status !== "CANCELADA" && p.status !== "VENCIDA";
              const contrato = contratos.find((c) => c.propostaId === p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.versao ?? "—"}</TableCell>
                  <TableCell className="text-xs">{p.numero}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusClass(canonical)} text-[10px]`}>
                      {PROPOSTA_STATUS_LABEL[canonical as keyof typeof PROPOSTA_STATUS_LABEL] ?? canonical}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {contrato ? (
                      <div className="flex flex-col">
                        <span className="font-mono">{contrato.id}</span>
                        <span className="text-[10px] text-muted-foreground">{contrato.status}</span>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs">{valor > 0 ? fmtBRL(valor) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="ghost" disabled={!podeAprovar}
                        onClick={() => setAcao({ proposta: p, tipo: "aprovar" })}>
                        Aprovar
                      </Button>
                      <Button size="sm" variant="ghost" disabled={!podeAprovar}
                        onClick={() => setAcao({ proposta: p, tipo: "recusar" })}>
                        Não aprovar
                      </Button>
                      <Button size="sm" variant="ghost"
                        disabled={p.status === "CANCELADA" || p.status === "APROVADA" || !!contrato}
                        title={contrato ? "Existe contrato vinculado — cancele o contrato antes." : ""}
                        onClick={() => setAcao({ proposta: p, tipo: "cancelar" })}>
                        Cancelar
                      </Button>
                      {contrato && !contrato.contratoAssinadoArquivo && !contrato.cancelado && (
                        <Button size="sm" variant="outline"
                          onClick={() => setAnexarAlvo(contrato.id)}>
                          Anexar assinado
                        </Button>
                      )}
                      {contrato && contrato.contratoAssinadoArquivo && contrato.status !== "ENVIADO PARA ENGENHARIA" && !contrato.cancelado && (
                        <Button size="sm" variant="outline"
                          onClick={() => {
                            const r = enviarContratoParaEngenharia(contrato.id, usuario);
                            if (!r.ok) toast.error(r.motivo);
                            else toast.success(`Contrato ${contrato.id} enviado para engenharia.`);
                          }}>
                          Enviar p/ engenharia
                        </Button>
                      )}
                      {contrato && !contrato.cancelado && (
                        <Button size="sm" variant="ghost" className="text-destructive"
                          onClick={() => setCancelarContratoAlvo(contrato.id)}>
                          Cancelar contrato
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {acao && (
        <MotivoDialog
          titulo={
            acao.tipo === "aprovar" ? `Aprovar proposta ${acao.proposta.versao ?? ""}` :
            acao.tipo === "recusar" ? `Marcar proposta ${acao.proposta.versao ?? ""} como NÃO APROVADA` :
            `Cancelar proposta ${acao.proposta.versao ?? ""}`
          }
          descricao={
            acao.tipo === "aprovar"
              ? "Ao aprovar esta versão, todas as outras versões deste lead serão marcadas como OBSOLETAS."
              : "Esta ação fica registrada no histórico com motivo obrigatório."
          }
          onClose={() => setAcao(null)}
          onConfirm={(motivo) => {
            if (acao.tipo === "aprovar") {
              executarAprovacao(acao.proposta, motivo);
            } else if (acao.tipo === "recusar") {
              marcarPropostaNaoAprovada(acao.proposta.id, usuario, motivo);
              toast.success(`Proposta ${acao.proposta.numero} marcada como NÃO APROVADA.`);
            } else {
              cancelarPropostaComMotivo(acao.proposta.id, usuario, motivo);
              toast.success(`Proposta ${acao.proposta.numero} cancelada.`);
            }
            setAcao(null);
          }}
        />
      )}

      {anexarAlvo && (
        <AnexarAssinadoDialog
          contratoId={anexarAlvo}
          onClose={() => setAnexarAlvo(null)}
          onConfirm={(arquivo) => {
            anexarContratoAssinado(anexarAlvo, arquivo, usuario);
            toast.success(`Contrato ${anexarAlvo} marcado como ASSINADO.`);
            setAnexarAlvo(null);
          }}
        />
      )}

      {cancelarContratoAlvo && (
        <MotivoDialog
          titulo={`Cancelar contrato ${cancelarContratoAlvo}`}
          descricao="Cancelar o contrato bloqueia novas obras vinculadas. Não é possível cancelar se houver obra em andamento operacional."
          onClose={() => setCancelarContratoAlvo(null)}
          onConfirm={(motivo) => {
            const r = cancelarContrato(cancelarContratoAlvo, motivo, usuario);
            if (!r.ok) toast.error(r.motivo ?? "Não foi possível cancelar.");
            else toast.success(`Contrato ${cancelarContratoAlvo} cancelado.`);
            setCancelarContratoAlvo(null);
          }}
        />
      )}
    </div>
  );
}

function MotivoDialog({
  titulo, descricao, onClose, onConfirm,
}: { titulo: string; descricao?: string; onClose: () => void; onConfirm: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        <div>
          <Label>Motivo <span className="text-destructive">*</span></Label>
          <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!motivo.trim()) { toast.error("Informe o motivo."); return; }
            onConfirm(motivo.trim());
          }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnexarAssinadoDialog({
  contratoId, onClose, onConfirm,
}: { contratoId: string; onClose: () => void; onConfirm: (arquivo: string) => void }) {
  const [arquivo, setArquivo] = useState("");
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar contrato assinado — {contratoId}</DialogTitle>
          <DialogDescription>
            Informe o nome do arquivo (PDF) recebido. Após anexar, o contrato passa para
            <span className="font-medium"> CONTRATO ASSINADO</span> e libera o envio para engenharia.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Arquivo / referência <span className="text-destructive">*</span></Label>
          <Input value={arquivo} onChange={(e) => setArquivo(e.target.value)} placeholder="contrato-assinado-001-2026.pdf" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!arquivo.trim()) { toast.error("Informe a referência do arquivo."); return; }
            onConfirm(arquivo.trim());
          }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
