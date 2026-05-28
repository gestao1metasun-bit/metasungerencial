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
import { Checkbox } from "@/components/ui/checkbox";
import { ActionsMenu } from "@/components/app/ActionsMenu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { EnterpriseRecordToolbar, RowActions } from "@/components/app/enterprise";
import { toast } from "sonner";

import {
  useLeads, criarLead, setLeadStatus, trocarOrigemLead, trocarConsultorLead,
  findLeadByDoc, findLeadByTelefoneRecent, type Lead,
} from "./store";
import {
  LEAD_STATUS, LEAD_STATUS_LABEL, LEAD_STATUS_OPTIONS,
  ORIGEM_LEAD_LABEL, ORIGEM_LEAD_OPTIONS,
  PROPOSTA_STATUS_LABEL,
  statusClass, type LeadStatus, type OrigemLead,
} from "@/lib/status-catalog";
import { useConsultoresAtivos, formatTelefoneBR } from "@/lib/consultores-store";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { HistoricoTimeline } from "@/components/app/HistoricoTimeline";
import {
  usePropostas, criarPropostaParaLead, aprovarPropostaDoLead,
  marcarPropostaNaoAprovada, cancelarPropostaComMotivo,
  fmtBRL, calcPrecificacao, calcDimensionamento, type PropostaFV,
  formatDoc, isDocValido, formatCEP, buscarCEPViaCEP,
} from "@/modules/propostas/store";
import {
  useContratos, criarContratoDeProposta, anexarContratoAssinado,
  enviarContratoParaEngenharia, cancelarContrato, propostaTemContratoVinculado,
} from "@/lib/contratos-store";
import {
  findClienteByDoc, addClienteFull, updateClienteFull, useClientesFull,
} from "@/lib/clientes-store";

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
    <div className="space-y-3">
      {/* D17.UI Fase 1 — Comercial: barra Enterprise RM/TOTVS oficial */}
      <EnterpriseRecordToolbar
        entityType="propostas"
        selectedIds={detalhe ? [detalhe.id] : []}
        availableActions={["novo", "atualizar", "filtroAvancado", "colunas", "exportar"]}
        searchPlaceholder="Buscar lead…"
        search={busca}
        onSearchChange={setBusca}
        onAction={(a) => {
          if (a === "novo") setNovoOpen(true);
          else if (a === "atualizar") toast.info("Lista de leads atualizada.");
          else if (a === "exportar") toast.info("Exportação CSV disponível em D17.UI.2.");
          else if (a === "colunas") toast.info("Gestor de colunas chega no próximo turno (LeadsPage).");
          else if (a === "filtroAvancado") toast.info("Use os filtros abaixo (status / origem / consultor).");
        }}
      />
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
              <TableHead className="w-[80px]">Opções</TableHead>
              <TableHead>Nº</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Consumo (kWh)</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell>
                  <ActionsMenu label={l.numero}>
                    <DropdownMenuItem onSelect={() => setDetalhe(l)}>
                      <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                    </DropdownMenuItem>
                  </ActionsMenu>
                </TableCell>
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
  // Form básico
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PF");
  const [telefone, setTelefone] = useState("");
  const [consumo, setConsumo] = useState("");
  const [consultorId, setConsultorId] = useState<string>("");
  const [origem, setOrigem] = useState<OrigemLead | "">("");
  const [observacao, setObservacao] = useState("");
  // Endereço
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  // Estado de dedup
  const [clienteExistenteId, setClienteExistenteId] = useState<string | null>(null);
  const [leadExistenteNumero, setLeadExistenteNumero] = useState<string | null>(null);
  const [docInvalido, setDocInvalido] = useState(false);
  // Bloqueio de telefone repetido nos últimos 90 dias
  const [telefoneBloqueio, setTelefoneBloqueio] = useState<{ numero: string; nome: string } | null>(null);

  function onTelChange(v: string) {
    const masked = formatTelefoneBR(v);
    setTelefone(masked);
    const dup = findLeadByTelefoneRecent(masked, 90);
    setTelefoneBloqueio(dup ? { numero: dup.numero, nome: dup.nome } : null);
  }

  const reset = () => {
    setNome(""); setDoc(""); setTipoPessoa("PF"); setTelefone(""); setConsumo("");
    setConsultorId(""); setOrigem(""); setObservacao("");
    setCep(""); setRua(""); setNumero(""); setBairro(""); setCidade(""); setUf("");
    setClienteExistenteId(null); setLeadExistenteNumero(null); setDocInvalido(false);
    setTelefoneBloqueio(null);
  };

  // Auto-detecta duplicidade ao digitar/colar CPF/CNPJ
  function onDocChange(v: string) {
    const masked = formatDoc(v, tipoPessoa);
    setDoc(masked);
    const dig = masked.replace(/\D/g, "");
    setClienteExistenteId(null);
    setLeadExistenteNumero(null);
    setDocInvalido(false);
    if (dig.length !== 11 && dig.length !== 14) return;
    if (!isDocValido(masked)) { setDocInvalido(true); return; }
    // Lead já cadastrado?
    const leadExist = findLeadByDoc(masked);
    if (leadExist) setLeadExistenteNumero(leadExist.numero);
    // Cliente já cadastrado?
    const cli = findClienteByDoc(masked);
    if (cli) {
      setClienteExistenteId(cli.id);
      // Pré-preenche dados do cliente; endereço pode ser editado
      setNome(cli.nome);
      if (!telefone) setTelefone(formatTelefoneBR(cli.telefone || ""));
      setCep(formatCEP(cli.cep || ""));
      setRua(cli.rua || "");
      setNumero(cli.numero || "");
      setBairro(cli.bairro || "");
      setCidade(cli.cidade || "");
      setUf(cli.uf || "");
    }
  }

  async function buscarCep() {
    setBuscandoCep(true);
    try {
      const r = await buscarCEPViaCEP(cep);
      if (!r) { toast.error("CEP não encontrado."); return; }
      setRua(r.rua); setBairro(r.bairro); setCidade(r.cidade); setUf(r.uf);
    } finally { setBuscandoCep(false); }
  }

  const salvar = async () => {
    console.info("[lead-save] handler acionado", { nome, telefone, consumo, consultorId, origem, doc });
    // Gate de autenticação: sem sessão hidratada não persistimos.
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      console.error("[lead-save] abortado: sem sessão autenticada", authErr);
      toast.error("Sessão não carregada ou usuário não autenticado. Recarregue ou faça login novamente.");
      return;
    }
    if (!nome.trim() || !telefone.trim() || !consumo || !consultorId || !origem) {
      console.warn("[lead-save] abortado: campos obrigatórios faltando");
      toast.error("Preencha os campos obrigatórios."); return;
    }
    const consumoNum = Number(consumo);
    if (!Number.isFinite(consumoNum) || consumoNum <= 0) {
      toast.error("Consumo desejado inválido."); return;
    }
    // CPF/CNPJ obrigatório e válido
    if (!doc.trim()) { toast.error("Informe o CPF/CNPJ do cliente."); return; }
    if (!isDocValido(doc)) {
      toast.error(tipoPessoa === "PF" ? "CPF inválido — confira os dígitos." : "CNPJ inválido — confira os dígitos.");
      return;
    }
    if (leadExistenteNumero) {
      toast.error(`Já existe lead ${leadExistenteNumero} com este CPF/CNPJ. Abra o lead existente.`);
      return;
    }
    // Bloqueio: telefone repetido nos últimos 90 dias
    const telDup = findLeadByTelefoneRecent(telefone, 90);
    if (telDup) {
      toast.error(`Telefone já cadastrado no lead ${telDup.numero} — ${telDup.nome}. Aguarde 90 dias para novo cadastro.`);
      return;
    }
    // Cadastra ou reaproveita cliente
    let clienteId = clienteExistenteId ?? undefined;
    try {
      if (clienteId) {
        // Atualiza endereço se editado
        updateClienteFull(clienteId, {
          nome, telefone, cep: cep.replace(/\D/g, ""),
          rua, numero, bairro, cidade, uf,
        });
      } else {
        const novo = addClienteFull({
          nome, doc, telefone,
          cep: cep.replace(/\D/g, ""),
          rua, numero, bairro, cidade, uf,
        });
        clienteId = novo.id;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar cliente."); return;
    }
    console.info("[lead-save] chamando criarLead");
    const lead = criarLead({
      nome, telefone, consumoKwh: consumoNum,
      consultorId, origem: origem as OrigemLead,
      observacao, doc, clienteId,
      criadoPor: user?.email ?? undefined,
    });
    console.info("[lead-save] criarLead retornou", { id: lead.id, numero: lead.numero });
    toast.success(`Lead ${lead.numero} criado${clienteExistenteId ? " (cliente já cadastrado, endereço atualizado)" : ""}.`);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Campos com <span className="text-destructive">*</span> são obrigatórios. O CPF/CNPJ é a chave do cliente — não permite duplicidade.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Label>Tipo</Label>
            <Select value={tipoPessoa} onValueChange={(v) => { setTipoPessoa(v as "PF" | "PJ"); setDoc(""); setDocInvalido(false); setClienteExistenteId(null); setLeadExistenteNumero(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa Física</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-4">
            <Label>{tipoPessoa === "PF" ? "CPF" : "CNPJ"} <span className="text-destructive">*</span></Label>
            <Input value={doc} onChange={(e) => onDocChange(e.target.value)} placeholder={tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} />
            {docInvalido && <p className="mt-1 text-[11px] text-destructive">Dígitos verificadores inválidos.</p>}
            {leadExistenteNumero && (
              <p className="mt-1 text-[11px] text-destructive">Lead <strong>{leadExistenteNumero}</strong> já existe com este CPF/CNPJ.</p>
            )}
            {clienteExistenteId && !leadExistenteNumero && (
              <p className="mt-1 text-[11px] text-success">Cliente já cadastrado — dados preenchidos. Endereço pode ser editado.</p>
            )}
          </div>

          <div className="sm:col-span-4">
            <Label>Nome {tipoPessoa === "PJ" ? "/ Razão Social" : ""} <span className="text-destructive">*</span></Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Telefone <span className="text-destructive">*</span></Label>
            <Input value={telefone} onChange={(e) => onTelChange(e.target.value)} />
            {telefoneBloqueio && (
              <p className="mt-1 text-[11px] text-destructive">
                Telefone já cadastrado em lead <strong>{telefoneBloqueio.numero}</strong> ({telefoneBloqueio.nome}) nos últimos 90 dias. Novo cadastro bloqueado.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label>Consumo (kWh/mês) <span className="text-destructive">*</span></Label>
            <Input type="number" min={1} value={consumo} onChange={(e) => setConsumo(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Consultor <span className="text-destructive">*</span></Label>
            <Select value={consultorId} onValueChange={setConsultorId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {consultores.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Origem <span className="text-destructive">*</span></Label>
            <Select value={origem} onValueChange={(v) => setOrigem(v as OrigemLead)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {ORIGEM_LEAD_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-6 border-t pt-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Endereço (pode ser alterado)</div>
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Label>CEP</Label>
                <div className="flex gap-1">
                  <Input value={cep} onChange={(e) => setCep(formatCEP(e.target.value))} onBlur={buscarCep} placeholder="00000-000" />
                  <Button type="button" variant="outline" size="sm" onClick={buscarCep} disabled={buscandoCep}>Buscar</Button>
                </div>
              </div>
              <div className="sm:col-span-3">
                <Label>Rua</Label>
                <Input value={rua} onChange={(e) => setRua(e.target.value.toUpperCase())} />
              </div>
              <div className="sm:col-span-1">
                <Label>Nº</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value.toUpperCase())} />
              </div>
              <div className="sm:col-span-2">
                <Label>Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value.toUpperCase())} />
              </div>
              <div className="sm:col-span-3">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value.toUpperCase())} />
              </div>
              <div className="sm:col-span-1">
                <Label>UF</Label>
                <Input value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} />
              </div>
            </div>
          </div>

          <div className="sm:col-span-6">
            <Label>Observação</Label>
            <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {!user ? (
            <span className="text-xs text-destructive mr-auto">
              Sessão não autenticada — faça login para salvar o lead.
            </span>
          ) : null}
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={salvar} disabled={!!leadExistenteNumero || !user}>Salvar lead</Button>
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
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
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
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
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

  function executarAprovacao(p: PropostaFV, motivo: string, comFinanciamento: boolean, banco?: string) {
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
      possuiFinanciamento: comFinanciamento,
      financiamentoBanco: banco,
    });
    if (!r.ok) {
      toast.warning(`Proposta aprovada. Contrato pendente: complete o cadastro do cliente em Comercial → Contratos. Faltam: ${r.missing.join(", ")}.`);
      return;
    }
    const aviso = r.missing.length
      ? ` (complete o cadastro do cliente: ${r.missing.slice(0, 3).join(", ")}${r.missing.length > 3 ? "…" : ""})`
      : "";
    toast.success(
      `Proposta ${p.numero} aprovada. Contrato ${r.contratoId} gerado e obra enviada para Engenharia (Em projeto/aprovação)${comFinanciamento ? " · Financiamento marcado" : ""}.${aviso}`,
    );
  }

  return (
    <div>
      <div className="mb-2 text-sm font-semibold">Propostas deste lead</div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Opções</TableHead>
                <TableHead className="w-16">Versão</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Valor</TableHead>
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
                    <TableCell>
                      <ActionsMenu label={p.numero}>
                        <DropdownMenuItem disabled={!podeAprovar} onSelect={() => setAcao({ proposta: p, tipo: "aprovar" })}>
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!podeAprovar} onSelect={() => setAcao({ proposta: p, tipo: "recusar" })}>
                          Não aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={p.status === "CANCELADA" || p.status === "APROVADA" || !!contrato}
                          onSelect={() => setAcao({ proposta: p, tipo: "cancelar" })}
                        >
                          Cancelar proposta
                        </DropdownMenuItem>
                        {contrato && !contrato.contratoAssinadoArquivo && !contrato.cancelado && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setAnexarAlvo(contrato.id)}>
                              Anexar assinado
                            </DropdownMenuItem>
                          </>
                        )}
                        {contrato && contrato.contratoAssinadoArquivo && contrato.status !== "ENVIADO PARA ENGENHARIA" && !contrato.cancelado && (
                          <DropdownMenuItem onSelect={() => {
                            const r = enviarContratoParaEngenharia(contrato.id, usuario);
                            if (!r.ok) toast.error(r.motivo);
                            else toast.success(`Contrato ${contrato.id} enviado para engenharia.`);
                          }}>
                            Enviar p/ engenharia
                          </DropdownMenuItem>
                        )}
                        {contrato && !contrato.cancelado && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => setCancelarContratoAlvo(contrato.id)}>
                              Cancelar contrato
                            </DropdownMenuItem>
                          </>
                        )}
                      </ActionsMenu>
                    </TableCell>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

      {acao && acao.tipo === "aprovar" && (
        <AprovarPropostaDialog
          proposta={acao.proposta}
          onClose={() => setAcao(null)}
          onConfirm={(motivo, comFin, banco) => {
            executarAprovacao(acao.proposta, motivo, comFin, banco);
            setAcao(null);
          }}
        />
      )}

      {acao && acao.tipo !== "aprovar" && (
        <MotivoDialog
          titulo={
            acao.tipo === "recusar" ? `Marcar proposta ${acao.proposta.versao ?? ""} como NÃO APROVADA` :
            `Cancelar proposta ${acao.proposta.versao ?? ""}`
          }
          descricao="Esta ação fica registrada no histórico com motivo obrigatório."
          onClose={() => setAcao(null)}
          onConfirm={(motivo) => {
            if (acao.tipo === "recusar") {
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

const BANCOS_FINANCIAMENTO = ["BASA", "SICREDI", "BB", "Outro"] as const;

function AprovarPropostaDialog({
  proposta, onClose, onConfirm,
}: {
  proposta: PropostaFV;
  onClose: () => void;
  onConfirm: (motivo: string, comFinanciamento: boolean, banco?: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [comFinanciamento, setComFinanciamento] = useState(false);
  const [banco, setBanco] = useState<string>("BASA");

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar proposta {proposta.versao ?? proposta.numero}</DialogTitle>
          <DialogDescription>
            Ao aprovar, todas as outras versões deste lead serão marcadas como OBSOLETAS,
            o contrato será gerado e a obra será enviada para Engenharia (Em projeto/aprovação).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Motivo / observação <span className="text-destructive">*</span></Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3">
            <label className="flex items-start gap-2">
              <Checkbox
                checked={comFinanciamento}
                onCheckedChange={(v) => setComFinanciamento(v === true)}
                className="mt-0.5"
              />
              <div className="text-sm">
                <div className="font-medium">Possui FINANCIAMENTO bancário?</div>
                <div className="text-xs text-muted-foreground">
                  Se marcado, o contrato vai automaticamente para o módulo
                  <span className="font-medium"> Financiamentos</span>.
                </div>
              </div>
            </label>

            {comFinanciamento && (
              <div className="mt-3">
                <Label>Banco</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANCOS_FINANCIAMENTO.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!motivo.trim()) { toast.error("Informe o motivo da aprovação."); return; }
            onConfirm(motivo.trim(), comFinanciamento, comFinanciamento ? banco : undefined);
          }}>Aprovar e gerar contrato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
