// Página principal do módulo Propostas Fotovoltaicas.
// Movida de src/routes/propostas.tsx durante reorganização modular.
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Eye, FileText, Printer, Copy, CheckCircle2, Send,
  XCircle, Sparkles, Calculator, Users, MapPin, Zap, Sun, Wrench, DollarSign,
  Receipt, AlertTriangle, Save, FileSearch, Settings as SettingsIcon, Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useTabFromHash } from "@/lib/route-tabs";
import { useClientesFull, addClienteFull } from "@/lib/clientes-store";
import { upsertContrato } from "@/lib/contratos-store";
import {
  type PropostaFV, type StatusProposta, type LinhaCusto, type CidadeFV,
  type ConcessionariaFV, type ModuloFV, type InversorFV, type DistribuidorFV,
  type ParametroFV, type CustoFV, type TarifaEnergia,
  useCidadesFV, useConcessionarias, useModulosFV, useInversoresFV,
  useDistribuidoresFV, useParametrosFV, useCustosFV, usePropostas,
  useTarifasEnergia,
  upsertCidadeFV, removeCidadeFV, upsertConcessionariaFV, removeConcessionariaFV,
  upsertModuloFV, removeModuloFV, upsertInversorFV, removeInversorFV,
  upsertDistribuidorFV, removeDistribuidorFV, upsertParametroFV, removeParametroFV,
  upsertCustoFV, removeCustoFV, upsertProposta, removeProposta,
  novaPropostaVazia, proximoNumeroProposta, calcDimensionamento, calcPrecificacao,
  calcResultado, gerarCustosSugeridos, sugerirParametro, potenciaInversores,
  consumoEfetivo, somaMensal, fmtBRL, fmtNum, validarParaGeracao,
  buscarTarifa, getLastCidadeId, setLastCidadeId, addHistoricoIrradiacao,
} from "@/modules/propostas/store";
import { useUsuarioAtual } from "@/lib/perfis-store";
import { useConsultoresAtivos, upsertConsultor, novoConsultorVazio, formatTelefoneBR, type Consultor } from "@/lib/consultores-store";
import { X as XIcon } from "lucide-react";

import { PropostaList, statusVariant } from "./components/PropostaList";
import { PropostaImpressao } from "./components/PropostaImpressao";
import { AjudaTab } from "./components/AjudaTab";
import { CrudTarifas } from "./components/CrudTarifas";

export { PropostasPage };

/** Aplica os dados de uma cidade (irradiação, meses, concessionária etc.) numa proposta.
 *  Quando `markDefault` é true, mantém o flag `cidadeIsDefault` para a UI mostrar o chip cinza. */
function aplicarCidadeNaProposta(p: PropostaFV, c: CidadeFV, _markDefault: boolean): PropostaFV {
  const meses = [
    ["JAN", c.irradiacaoJaneiro], ["FEV", c.irradiacaoFevereiro], ["MAR", c.irradiacaoMarco],
    ["ABR", c.irradiacaoAbril], ["MAI", c.irradiacaoMaio], ["JUN", c.irradiacaoJunho],
    ["JUL", c.irradiacaoJulho], ["AGO", c.irradiacaoAgosto], ["SET", c.irradiacaoSetembro],
    ["OUT", c.irradiacaoOutubro], ["NOV", c.irradiacaoNovembro], ["DEZ", c.irradiacaoDezembro],
  ] as const;
  const validos = meses.filter(([, v]) => typeof v === "number") as [string, number][];
  let mesMaior = c.mesMaiorIrradiacao;
  let mesMenor = c.mesMenorIrradiacao;
  let irrMax: number | undefined;
  let irrMin: number | undefined;
  if (validos.length) {
    const sorted = [...validos].sort((a, b) => a[1] - b[1]);
    irrMin = sorted[0][1]; mesMenor = mesMenor ?? sorted[0][0];
    irrMax = sorted[sorted.length - 1][1]; mesMaior = mesMaior ?? sorted[sorted.length - 1][0];
  }
  return {
    ...p,
    cidadeId: c.id,
    cidade: c.cidade,
    estado: c.estado,
    concessionaria: c.concessionariaPadrao ?? p.concessionaria,
    irradiacaoMedia: c.irradiacaoMedia ?? p.irradiacaoMedia,
    mesMaior, mesMenor,
    irradiacaoMaxima: irrMax ?? p.irradiacaoMaxima,
    irradiacaoMinima: irrMin ?? p.irradiacaoMinima,
    fonteIrradiacao: c.fonteDados ?? "BASE INTERNA",
    grupoTarifario: c.grupoTarifarioPadrao ?? p.grupoTarifario,
    tarifa: c.tarifaPadrao ?? p.tarifa,
  };
}

/* =========================== PÁGINA =========================== */

function PropostasPage() {
  const [tab, setTab] = useTabFromHash("/propostas");
  const propostas = usePropostas();
  const [editando, setEditando] = useState<PropostaFV | null>(null);
  const [vendoId, setVendoId] = useState<string | null>(null);
  const [leadDraft, setLeadDraft] = useState<PropostaFV | null>(null);

  const propostaVisualizada = vendoId ? propostas.find((p) => p.id === vendoId) ?? null : null;

  const cidadesAll = useCidadesFV();
  function novaProposta() {
    const numero = proximoNumeroProposta(propostas);
    let p = novaPropostaVazia(numero);
    // Aplica última cidade selecionada como padrão (vem cinza, com X para limpar)
    const lastId = getLastCidadeId();
    const cidadeDefault = lastId ? cidadesAll.find((c) => c.id === lastId) : undefined;
    if (cidadeDefault) p = aplicarCidadeNaProposta(p, cidadeDefault, true);
    setLeadDraft(p);
  }

  return (
    <>
      <PageHeader
        title="Propostas Fotovoltaicas"
        subtitle="Crie propostas guiadas com cálculo automático de potência, preço e margem."
        actions={
          <Button onClick={novaProposta} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Proposta
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="lista">Propostas</TabsTrigger>
          <TabsTrigger value="cadastros">Cadastros</TabsTrigger>
          <TabsTrigger value="ajuda">Como funciona</TabsTrigger>
        </TabsList>
        <TabsContent value="lista" className="mt-5">
          <PropostaList
            propostas={propostas}
            onEditar={setEditando}
            onVisualizar={(id) => setVendoId(id)}
            onNova={novaProposta}
          />
        </TabsContent>
        <TabsContent value="cadastros" className="mt-5">
          <CadastrosFV />
        </TabsContent>
        <TabsContent value="ajuda" className="mt-5">
          <AjudaTab />
        </TabsContent>
      </Tabs>

      {leadDraft && (
        <LeadModal
          proposta={leadDraft}
          onCancel={() => setLeadDraft(null)}
          onContinuar={(p) => { setLeadDraft(null); setEditando(p); }}
        />
      )}

      {editando && (
        <PropostaSheet
          proposta={editando}
          onClose={() => setEditando(null)}
          onVisualizar={(id) => { setVendoId(id); setEditando(null); }}
          onGerada={() => setEditando(null)}
        />
      )}
      {propostaVisualizada && (
        <PropostaImpressao proposta={propostaVisualizada} onClose={() => setVendoId(null)} />
      )}
    </>
  );
}

/* =========================== LEAD MODAL =========================== */

function LeadModal({
  proposta, onCancel, onContinuar,
}: {
  proposta: PropostaFV;
  onCancel: () => void;
  onContinuar: (p: PropostaFV) => void;
}) {
  const consultores = useConsultoresAtivos();
  const [nome, setNome] = useState(proposta.clienteNome ?? "");
  const [telefone, setTelefone] = useState(formatTelefoneBR(proposta.clienteTelefone ?? ""));
  const [consultor, setConsultor] = useState(proposta.consultor ?? "");
  const [endereco, setEndereco] = useState(proposta.clienteEndereco ?? "");
  const [novoOpen, setNovoOpen] = useState(false);

  const upper = (v: string) => v.toUpperCase();

  function continuar() {
    if (!nome.trim() || !telefone.trim() || !consultor.trim()) {
      toast.error("Preencha Nome, Telefone e selecione um Consultor.");
      return;
    }
    const tel = telefone.replace(/\D/g, "");
    if (tel.length < 10 || tel.length > 11) {
      toast.error("Telefone inválido. Use DDD + número (10 ou 11 dígitos).");
      return;
    }
    onContinuar({
      ...proposta,
      clienteNome: upper(nome.trim()),
      clienteTelefone: formatTelefoneBR(telefone),
      consultor: upper(consultor.trim()),
      clienteEndereco: endereco.trim() ? upper(endereco.trim()) : "",
      criadoPor: upper(consultor.trim()),
    });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Lead — {proposta.numero}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="text-xs">Nome do lead *</Label>
            <Input value={nome} onChange={(e) => setNome(upper(e.target.value))} placeholder="NOME COMPLETO" />
          </div>
          <div>
            <Label className="text-xs">Telefone *</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))}
              placeholder="(00) 9 0000-0000"
              inputMode="numeric"
              maxLength={20}
            />
          </div>
          <div>
            <Label className="text-xs">Consultor de venda *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={consultor} onValueChange={setConsultor}>
                  <SelectTrigger><SelectValue placeholder="Selecione o consultor" /></SelectTrigger>
                  <SelectContent>
                    {consultores.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum consultor cadastrado.</div>
                    )}
                    {consultores.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setNovoOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Cadastrar
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Endereço (opcional)</Label>
            <Input value={endereco} onChange={(e) => setEndereco(upper(e.target.value))} placeholder="RUA, NÚMERO, BAIRRO, CIDADE" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Voltar</Button>
          <Button onClick={continuar}>Continuar</Button>
        </DialogFooter>
      </DialogContent>

      <ConsultorRapidoModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        onCreated={(c: { nome: string }) => { setConsultor(c.nome); setNovoOpen(false); toast.success("Consultor cadastrado."); }}
      />
    </Dialog>
  );
}

function ConsultorRapidoModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: { nome: string }) => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  function salvar() {
    const n = nome.trim().toUpperCase();
    if (!n) { toast.error("Informe o nome do consultor."); return; }
    const novo = novoConsultorVazio();
    novo.nome = n;
    novo.telefone = telefone ? formatTelefoneBR(telefone) : "";
    novo.email = email.trim().toLowerCase();
    upsertConsultor(novo);
    setNome(""); setTelefone(""); setEmail("");
    onCreated({ nome: n });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Cadastrar Consultor</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} placeholder="NOME COMPLETO" />
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))} placeholder="(00) 9 0000-0000" inputMode="numeric" />
          </div>
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================== LISTA =========================== */
// PropostaList foi extraído para ./components/PropostaList.tsx

/* =========================== SHEET DE EDIÇÃO =========================== */

function PropostaSheet({
  proposta, onClose, onVisualizar, onGerada,
}: {
  proposta: PropostaFV;
  onClose: () => void;
  onVisualizar: (id: string) => void;
  onGerada?: () => void;
}) {
  const [p, setP] = useState<PropostaFV>(proposta);
  const cidades = useCidadesFV();
  const concessionarias = useConcessionarias();
  const modulos = useModulosFV();
  const inversores = useInversoresFV();
  const distribuidores = useDistribuidoresFV();
  const parametros = useParametrosFV();
  const custos = useCustosFV();
  const tarifasEnergia = useTarifasEnergia();
  const clientes = useClientesFull();
  const { perfil } = useUsuarioAtual();
  const ehAdmin = !!perfil?.isAdminMaster;

  const dim = calcDimensionamento(p);
  const pre = calcPrecificacao(p);
  const res = calcResultado(p);
  const potTotalInv = potenciaInversores(p, inversores);

  // sincroniza qtd final em modulosQtd
  useEffect(() => {
    if (p.modulosQtd !== dim.qtdFinal) update("modulosQtd", dim.qtdFinal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim.qtdFinal]);

  // sugere parâmetro automaticamente quando muda potência ou tipo
  useEffect(() => {
    const sug = sugerirParametro(dim.potenciaFinalKwp, p.tipoInstalacao, parametros);
    if (sug && (!p.parametroPorKwp || p.parametroPorKwp === 0)) {
      update("parametroPorKwp", sug.valorPorKwp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim.potenciaFinalKwp, p.tipoInstalacao, parametros.length]);

  function update<K extends keyof PropostaFV>(k: K, v: PropostaFV[K]) {
    setP((cur) => ({ ...cur, [k]: v, atualizadoEm: new Date().toISOString().slice(0, 10) }));
  }

  async function buscarCep(cepDigits: string) {
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      if (!r.ok) { toast.error("Falha ao consultar CEP."); return; }
      const d = await r.json();
      if (d?.erro) { toast.error("CEP não encontrado."); return; }
      setP((cur) => ({
        ...cur,
        clienteRua: (d.logradouro ?? "").toUpperCase(),
        clienteBairro: (d.bairro ?? "").toUpperCase(),
        clienteCidade: (d.localidade ?? "").toUpperCase(),
        clienteUf: (d.uf ?? "").toUpperCase(),
        atualizadoEm: new Date().toISOString().slice(0, 10),
      }));
    } catch {
      toast.error("Erro de rede ao consultar CEP.");
    }
  }

  function selecionarCliente(id: string) {
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setP((cur) => ({
      ...cur,
      clienteId: c.id,
      clienteNome: c.nome,
      clienteDoc: c.doc,
      clienteTelefone: c.telefone,
      clienteEmail: c.email ?? "",
      clienteEndereco: [c.rua, c.numero, c.bairro].filter(Boolean).join(", "),
      cidade: cur.cidade || c.cidade || "",
      estado: cur.estado || c.uf || "",
    }));
  }

  function selecionarCidade(id: string) {
    const c = cidades.find((x) => x.id === id);
    if (!c) return;
    setLastCidadeId(c.id);
    setP((cur) => {
      const nova = aplicarCidadeNaProposta(cur, c, false);
      // Lookup de tarifa oficial
      const tarifa = buscarTarifa(tarifasEnergia, {
        concessionaria: nova.concessionaria,
        uf: nova.estado,
        cidade: nova.cidade,
        grupo: nova.grupoTarifario,
        modalidade: nova.modalidadeTarifaria,
      });
      if (tarifa) nova.tarifa = tarifa.tarifaKwh;
      return nova;
    });
  }

  function limparCidade() {
    setLastCidadeId(null);
    setP((cur) => ({
      ...cur,
      cidadeId: undefined,
      cidade: "",
      estado: "",
      mesMaior: undefined,
      mesMenor: undefined,
      irradiacaoMaxima: undefined,
      irradiacaoMinima: undefined,
      fonteIrradiacao: undefined,
    }));
  }

  function selecionarModulo(id: string) {
    const m = modulos.find((x) => x.id === id);
    if (!m) return;
    setP((cur) => ({
      ...cur,
      moduloId: m.id, moduloMarca: m.marca, moduloModelo: m.modelo,
      moduloPotenciaWp: m.potenciaWp, moduloLarguraM: m.larguraM, moduloAlturaM: m.alturaM,
    }));
  }

  function addInversor(invId: string) {
    setP((cur) => ({ ...cur, inversores: [...cur.inversores, { inversorId: invId, quantidade: 1 }] }));
  }
  function setInversorQtd(idx: number, qtd: number) {
    setP((cur) => {
      const arr = [...cur.inversores]; arr[idx] = { ...arr[idx], quantidade: qtd }; return { ...cur, inversores: arr };
    });
  }
  function setInversorId(idx: number, invId: string) {
    setP((cur) => {
      const arr = [...cur.inversores]; arr[idx] = { ...arr[idx], inversorId: invId }; return { ...cur, inversores: arr };
    });
  }
  function delInversor(idx: number) {
    setP((cur) => ({ ...cur, inversores: cur.inversores.filter((_, i) => i !== idx) }));
  }

  function regenerarCustos() {
    const linhas = gerarCustosSugeridos(p, custos);
    // ajusta os pct (% sobre valor final) usando o valor atual
    const valor = pre.valorFinal;
    const ajustadas: LinhaCusto[] = linhas.map((l) => {
      const base = custos.find((c) => c.id === l.id);
      if (base?.regraCalculo === "pct_valor") {
        const total = round2((valor * l.valorUnit) / 100);
        return { ...l, qtdSugerida: 1, qtdReal: 1, total };
      }
      return l;
    });
    setP((cur) => ({ ...cur, custos: ajustadas }));
    toast.success("Custos sugeridos atualizados.");
  }

  function setLinhaCusto(idx: number, patch: Partial<LinhaCusto>) {
    setP((cur) => {
      const arr = [...cur.custos]; const cur2 = { ...arr[idx], ...patch };
      cur2.total = round2((cur2.qtdReal || 0) * (cur2.valorUnit || 0));
      arr[idx] = cur2; return { ...cur, custos: arr };
    });
  }
  function addLinhaCustoVazia() {
    setP((cur) => ({
      ...cur,
      custos: [...cur.custos, { id: `EXTRA-${Date.now()}`, nome: "", tipo: "OUTRO", qtdSugerida: 0, qtdReal: 1, valorUnit: 0, total: 0 }],
    }));
  }
  function delLinhaCusto(idx: number) {
    setP((cur) => ({ ...cur, custos: cur.custos.filter((_, i) => i !== idx) }));
  }

  function salvar(novoStatus?: StatusProposta) {
    const final: PropostaFV = { ...p };
    if (novoStatus) final.status = novoStatus;
    final.atualizadoEm = new Date().toISOString().slice(0, 10);
    upsertProposta(final);
    setP(final);
    toast.success(novoStatus ? `Proposta ${novoStatus.toLowerCase()}.` : "Rascunho salvo.");
  }

  function aprovarEGerarContrato() {
    const erros = validarParaGeracao(p);
    if (erros.length) { toast.error("Preencha: " + erros.join(", ")); return; }
    if (!confirm("Aprovar proposta e gerar contrato no Comercial?")) return;
    const ano = new Date().getFullYear();
    const seq = String((Math.floor(Math.random() * 900) + 100)); // simples — real seria via store
    const contratoId = `CT-${ano}-${seq}`;
    upsertContrato({
      id: contratoId,
      cliente: p.clienteNome,
      clienteId: p.clienteId,
      vendedor: p.criadoPor ?? "—",
      valor: pre.valorFinal,
      kwp: dim.potenciaFinalKwp,
      status: "Aguardando assinatura",
      data: new Date().toISOString().slice(0, 10),
      pagamento: "À combinar",
      modulos: dim.qtdFinal,
      potencia: dim.potenciaFinalKwp,
      inv1: inversores.find((i) => i.id === p.inversores[0]?.inversorId)?.modelo,
      parametro: String(p.parametroPorKwp),
      obs: p.obsCliente,
    } as any);
    salvar("APROVADA");
    setP((cur) => ({ ...cur, contratoGeradoId: contratoId }));
    upsertProposta({ ...p, status: "APROVADA", contratoGeradoId: contratoId });
    toast.success(`Contrato ${contratoId} criado no Comercial.`);
  }

  const erros = validarParaGeracao(p);

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-5xl">
        <SheetHeader className="sticky top-0 z-10 -mx-6 -mt-6 border-b bg-background px-6 py-4">
          <SheetTitle className="flex items-center justify-between">
            <span>Proposta {p.numero}</span>
            <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
          </SheetTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1 bg-success text-success-foreground hover:bg-success/90"
              onClick={() => {
                const errs = validarParaGeracao(p);
                if (errs.length) { toast.error("Preencha: " + errs.join(", ")); return; }
                const final: PropostaFV = {
                  ...p,
                  status: "GERADA",
                  atualizadoEm: new Date().toISOString().slice(0, 10),
                  custos: p.custos.length ? p.custos : gerarCustosSugeridos(p, custos),
                };
                upsertProposta(final);
                toast.success(`${final.numero} gerada com sucesso.`);
                onGerada?.();
              }}
              disabled={erros.length > 0}
            >
              <CheckCircle2 className="h-4 w-4" /> Gerar Proposta
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={onClose}>
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
          </div>
          {erros.length > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <div><strong>Faltam:</strong> {erros.join(", ")}.</div>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-4 pt-4">
          {/* BLOCO 1 — Cliente */}
          <Bloco icon={<Users className="h-4 w-4" />} title="1. Dados do Cliente">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Nome do cliente" hint="Travado. Edite o cliente em Cadastros para alterar.">
                <Input value={p.clienteNome} readOnly className="bg-muted/50" />
              </Field>
              <Field label="CPF/CNPJ"><Input value={p.clienteDoc ?? ""} onChange={(e) => update("clienteDoc", e.target.value)} /></Field>
              <Field label="Telefone"><Input value={p.clienteTelefone ?? ""} onChange={(e) => update("clienteTelefone", e.target.value)} /></Field>
              <Field label="E-mail"><Input type="email" value={p.clienteEmail ?? ""} onChange={(e) => update("clienteEmail", e.target.value)} /></Field>
              <Field label="Consultor de venda">
                <Input value={p.consultor ?? ""} readOnly className="bg-muted/50" />
              </Field>
              <Field label="CEP" hint="Digite os 8 dígitos. O endereço será preenchido automaticamente.">
                <Input
                  value={p.clienteCep ?? ""}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="00000-000"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
                    const fmt = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
                    update("clienteCep", fmt);
                    if (raw.length === 8) buscarCep(raw);
                  }}
                />
              </Field>
              <Field label="Rua/Logradouro"><Input value={p.clienteRua ?? ""} onChange={(e) => update("clienteRua", e.target.value.toUpperCase())} /></Field>
              <Field label="Número"><Input value={p.clienteNumero ?? ""} onChange={(e) => update("clienteNumero", e.target.value)} /></Field>
              <Field label="Complemento"><Input value={p.clienteComplemento ?? ""} onChange={(e) => update("clienteComplemento", e.target.value.toUpperCase())} /></Field>
              <Field label="Bairro"><Input value={p.clienteBairro ?? ""} onChange={(e) => update("clienteBairro", e.target.value.toUpperCase())} /></Field>
              <Field label="Cidade do cliente"><Input value={p.clienteCidade ?? ""} onChange={(e) => update("clienteCidade", e.target.value.toUpperCase())} /></Field>
              <Field label="UF"><Input maxLength={2} value={p.clienteUf ?? ""} onChange={(e) => update("clienteUf", e.target.value.toUpperCase())} /></Field>
            </div>
          </Bloco>

          {/* BLOCO 2 — Localização */}
          <Bloco icon={<MapPin className="h-4 w-4" />} title="2. Localização">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Cidade cadastrada</Label>
                {p.cidadeId ? (
                  <div className="flex h-9 items-center justify-between rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                    <span className="truncate">
                      {(cidades.find((c) => c.id === p.cidadeId)?.cidade ?? p.cidade)}/{p.estado}
                    </span>
                    <button
                      type="button"
                      onClick={limparCidade}
                      className="ml-2 rounded p-1 hover:bg-background"
                      title="Limpar cidade"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Select value="" onValueChange={selecionarCidade}>
                    <SelectTrigger><SelectValue placeholder="Buscar..." /></SelectTrigger>
                    <SelectContent>
                      {cidades.map((c) => <SelectItem key={c.id} value={c.id}>{c.cidade}/{c.estado}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Field label="Concessionária">
                <Select value={p.concessionaria ?? ""} onValueChange={(v) => update("concessionaria", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {concessionarias.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Grupo tarifário">
                <Select value={p.grupoTarifario ?? "B1"} onValueChange={(v) => update("grupoTarifario", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["B1","B2","B3","A4","A3","A2"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Modalidade tarifária">
                <Select value={p.modalidadeTarifaria ?? "Convencional"} onValueChange={(v) => update("modalidadeTarifaria", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Convencional","Branca","Verde","Azul"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Parâmetro de irradiação (kWh/kWp·mês)" hint="Base real corrigida da cidade. Usado como produtividade real no cálculo.">
                <Input type="number" step="0.1" value={p.irradiacaoMedia} onChange={(e) => update("irradiacaoMedia", +e.target.value)} />
              </Field>
            </div>
          </Bloco>

          {/* BLOCO 3 — Fatura */}
          <Bloco icon={<Receipt className="h-4 w-4" />} title="3. Dados da Fatura">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Tipo de instalação">
                <Select value={p.tipoInstalacao} onValueChange={(v) => update("tipoInstalacao", v as PropostaFV["tipoInstalacao"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["RESIDENCIAL","COMERCIAL","INDUSTRIAL","RURAL"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo de telhado">
                <Select value={p.tipoTelhado} onValueChange={(v) => update("tipoTelhado", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["FIBROCIMENTO","METÁLICO","CERÂMICO","SOLO","LAJE","OUTRO"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Padrão de entrada">
                <Select value={p.padraoEntrada} onValueChange={(v) => update("padraoEntrada", v as PropostaFV["padraoEntrada"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["MONOFÁSICO","BIFÁSICO","TRIFÁSICO"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tarifa de energia (R$/kWh)" hint="Definida no cadastro de Tarifas (Cadastros → Tarifas). Para alterar, edite na base de tarifas.">
                <Input
                  type="number"
                  step="0.0001"
                  value={p.tarifa}
                  onChange={(e) => update("tarifa", +e.target.value)}
                  disabled={!ehAdmin}
                  className={!ehAdmin ? "bg-muted/50" : ""}
                />
              </Field>
            </div>
          </Bloco>

          {/* BLOCO 4 — Consumo */}
          <Bloco icon={<Zap className="h-4 w-4" />} title="4. Consumo">
            <div className="mb-3 flex items-center gap-3">
              <Switch checked={p.modoConsumo === "MENSAL"}
                onCheckedChange={(v) => update("modoConsumo", v ? "MENSAL" : "MEDIA")} />
              <Label>Preencher consumo mês a mês</Label>
            </div>
            {p.modoConsumo === "MEDIA" ? (
              <Field label="Consumo médio mensal (kWh)" hint="Informe a média da conta de energia.">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Ex.: 450"
                  value={p.consumoMedio ? p.consumoMedio : ""}
                  onChange={(e) => update("consumoMedio", e.target.value === "" ? 0 : +e.target.value)}
                />
              </Field>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {(["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"] as const).map((m) => (
                    <div key={m}>
                      <Label className="text-xs uppercase">{m}</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={p.consumoMensal?.[m] ? p.consumoMensal[m] : ""}
                        onChange={(e) => update("consumoMensal", { ...(p.consumoMensal ?? {}), [m]: e.target.value === "" ? 0 : +e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Anual: <strong>{fmtNum(somaMensal(p.consumoMensal), 0)} kWh</strong> · Média: <strong>{fmtNum(somaMensal(p.consumoMensal)/12, 0)} kWh/mês</strong>
                </div>
              </>
            )}
          </Bloco>

          {/* BLOCO 5 — Dimensionamento */}
          <Bloco icon={<Sun className="h-4 w-4" />} title="5. Dimensionamento" badge={`${fmtNum(dim.potenciaFinalKwp,2)} kWp`}>
            <div className="grid gap-3 md:grid-cols-3">
              <ReadOnlyField label="PVOUT mensal Atlas (kWh/kWp/mês)" value={fmtNum(dim.pvoutMensal, 2)} />
              <Field label="FRO — Fator de Rendimento Operacional" hint="Corrige o PVOUT do Atlas (perdas por temperatura, sujeira, cabeamento, inversor). Padrão 0,75.">
                <Input
                  type="number" step="0.01" min={0.1} max={1}
                  value={p.fro ?? 0.75}
                  onChange={(e) => update("fro", +e.target.value)}
                />
              </Field>
              <ReadOnlyField label="Produtividade real corrigida (kWh/kWp/mês)" value={fmtNum(dim.produtividadeReal, 2)} />
              <ReadOnlyField label="Consumo desejado (kWh/mês)" value={fmtNum(dim.geracaoDesejada, 0)} />
              <ReadOnlyField label="kWp necessário" value={fmtNum(dim.potenciaNecKwp, 2)} />
              <ReadOnlyField label="Quantidade calculada (arred. ↑)" value={String(dim.qtdCalc)} />
              <Field label="Quantidade final (módulos)" hint="Ative a chave para ajustar manualmente.">
                <div className="flex items-center gap-2">
                  <Switch checked={!!p.ajusteManualModulos} onCheckedChange={(v) => update("ajusteManualModulos", v)} />
                  <Input type="number" disabled={!p.ajusteManualModulos}
                    value={p.ajusteManualModulos ? (p.modulosManual ?? dim.qtdCalc) : dim.qtdCalc}
                    onChange={(e) => update("modulosManual", +e.target.value)} />
                </div>
              </Field>
              <ReadOnlyField label="Potência do sistema (kWp)" value={`${fmtNum(dim.potenciaFinalKwp, 2)} kWp`} />
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>
                Produtividade: <strong>{fmtNum(dim.pvoutMensal, 2)}</strong> × <strong>{fmtNum(dim.fro, 2)}</strong> = <strong>{fmtNum(dim.produtividadeReal, 2)} kWh/kWp/mês</strong>
              </div>
              <div>
                kWp necessário: <strong>{fmtNum(dim.geracaoDesejada, 0)}</strong> ÷ <strong>{fmtNum(dim.produtividadeReal, 2)}</strong> = <strong>{fmtNum(dim.potenciaNecKwp, 2)} kWp</strong>
              </div>
              <div>
                Módulos: <strong>{fmtNum(dim.potenciaNecKwp, 2)}</strong> ÷ <strong>{fmtNum((p.moduloPotenciaWp || 0)/1000, 3)} kW</strong> = <strong>{dim.qtdCalc} módulos</strong>
              </div>
              <div>
                Sistema final: <strong>{dim.qtdFinal}</strong> × <strong>{fmtNum((p.moduloPotenciaWp || 0)/1000, 3)} kW</strong> = <strong>{fmtNum(dim.potenciaFinalKwp, 2)} kWp</strong>
              </div>
            </div>
          </Bloco>

          {/* BLOCO 6 — Módulo */}
          <Bloco icon={<Sun className="h-4 w-4" />} title="6. Módulo Fotovoltaico" badge={`${fmtNum(dim.areaTotal,2)} m²`}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Módulo cadastrado">
                <Select value={p.moduloId ?? ""} onValueChange={selecionarModulo}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {modulos.filter((m) => m.ativo).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.marca} {m.modelo} ({m.potenciaWp}W)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Potência (Wp)"><Input type="number" value={p.moduloPotenciaWp} onChange={(e) => update("moduloPotenciaWp", +e.target.value)} /></Field>
              <Field label="Marca"><Input value={p.moduloMarca ?? ""} onChange={(e) => update("moduloMarca", e.target.value)} /></Field>
              <Field label="Modelo"><Input value={p.moduloModelo ?? ""} onChange={(e) => update("moduloModelo", e.target.value)} /></Field>
              <Field label="Largura (m)"><Input type="number" step="0.001" value={p.moduloLarguraM} onChange={(e) => update("moduloLarguraM", +e.target.value)} /></Field>
              <Field label="Altura (m)"><Input type="number" step="0.001" value={p.moduloAlturaM} onChange={(e) => update("moduloAlturaM", +e.target.value)} /></Field>
              <ReadOnlyField label="Área por módulo (m²)" value={fmtNum(dim.areaPorModulo, 2)} />
              <ReadOnlyField label="Quantidade" value={String(dim.qtdFinal)} />
              <ReadOnlyField label="Área total (m²)" value={fmtNum(dim.areaTotal, 2)} />
            </div>
          </Bloco>

          {/* BLOCO 7 — Inversores */}
          <Bloco icon={<Wrench className="h-4 w-4" />} title="7. Inversores e Kit" badge={`${fmtNum(potTotalInv, 1)} kW`}>
            <div className="space-y-2">
              {p.inversores.map((inv, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-7">
                    <Label className="text-xs">Inversor {i + 1}</Label>
                    <Select value={inv.inversorId} onValueChange={(v) => setInversorId(i, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {inversores.filter((x) => x.ativo).map((x) => (
                          <SelectItem key={x.id} value={x.id}>{x.marca} {x.modelo} ({x.potenciaKw}kW)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Quantidade</Label>
                    <Input type="number" min={1} value={inv.quantidade} onChange={(e) => setInversorQtd(i, +e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Button variant="ghost" size="icon" onClick={() => delInversor(i)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addInversor(inversores[0]?.id || "")} disabled={!inversores.length}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar inversor
              </Button>
              {potTotalInv > 0 && Math.abs(potTotalInv - dim.potenciaFinalKwp) / Math.max(dim.potenciaFinalKwp, 0.1) > 0.3 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
                  <AlertTriangle className="mr-1 inline h-3 w-3 text-warning" />
                  Potência dos inversores ({fmtNum(potTotalInv,1)} kW) muito diferente da potência do sistema ({fmtNum(dim.potenciaFinalKwp,1)} kWp).
                </div>
              )}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Distribuidor">
                <Select value={p.distribuidor ?? ""} onValueChange={(v) => update("distribuidor", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {distribuidores.filter((d) => d.ativo).map((d) => <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor do kit (R$)"><Input type="number" step="0.01" value={p.valorKit} onChange={(e) => update("valorKit", +e.target.value)} /></Field>
              <Field label="Validade da proposta"><Input type="date" value={p.validade} onChange={(e) => update("validade", e.target.value)} /></Field>
            </div>
          </Bloco>

          {/* BLOCO 8 — Precificação */}
          <Bloco icon={<DollarSign className="h-4 w-4" />} title="8. Precificação" badge={fmtBRL(pre.valorFinal)}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Parâmetro (R$/kWp)" hint="Preço de venda por kWp.">
                <Input type="number" step="0.01" value={p.parametroPorKwp} onChange={(e) => update("parametroPorKwp", +e.target.value)} />
              </Field>
              <Field label="Desconto (%)"><Input type="number" step="0.01" value={p.descontoPct} onChange={(e) => update("descontoPct", +e.target.value)} /></Field>
              <Field label="Desconto (R$)"><Input type="number" step="0.01" value={p.descontoValor} onChange={(e) => update("descontoValor", +e.target.value)} /></Field>
              <ReadOnlyField label="Valor bruto" value={fmtBRL(pre.valorBruto)} />
              <Field label="Valor final manual (R$)" hint="Sobrescreve cálculo. Em branco usa o cálculo automático.">
                <Input type="number" step="0.01" value={p.valorFinalManual ?? ""} onChange={(e) => update("valorFinalManual", e.target.value ? +e.target.value : undefined)} />
              </Field>
              <ReadOnlyField label="Parâmetro real (R$/kWp)" value={fmtBRL(pre.parametroReal)} />
            </div>
          </Bloco>

          {/* BLOCO 9 — Custos */}
          <Bloco icon={<Calculator className="h-4 w-4" />} title="9. Composição de Custos" badge={fmtBRL(res.custoTotal)}>
            <div className="mb-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={regenerarCustos}><Calculator className="mr-1 h-3 w-3" /> Recalcular sugeridos</Button>
              <Button variant="outline" size="sm" onClick={addLinhaCustoVazia}><Plus className="mr-1 h-3 w-3" /> Adicionar linha</Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Sugerido</TableHead>
                    <TableHead className="text-right">Qtd real</TableHead>
                    <TableHead className="text-right">Valor unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.custos.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Sem custos. Clique em <em>Recalcular sugeridos</em>.</TableCell></TableRow>
                  )}
                  {p.custos.map((l, i) => (
                    <TableRow key={l.id + i}>
                      <TableCell><Input value={l.nome} onChange={(e) => setLinhaCusto(i, { nome: e.target.value })} className="h-8" /></TableCell>
                      <TableCell>
                        <Select value={l.tipo} onValueChange={(v) => setLinhaCusto(i, { tipo: v as LinhaCusto["tipo"] })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["MATERIAL","SERVICO","OUTRO"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{fmtNum(l.qtdSugerida, 2)}</TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.qtdReal} onChange={(e) => setLinhaCusto(i, { qtdReal: +e.target.value })} className="h-8 text-right" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.valorUnit} onChange={(e) => setLinhaCusto(i, { valorUnit: +e.target.value })} className="h-8 text-right" /></TableCell>
                      <TableCell className="text-right font-medium">{fmtBRL(l.total)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => delLinhaCusto(i)} className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Bloco>

          {/* BLOCO 10 — Resultado */}
          <Bloco icon={<DollarSign className="h-4 w-4" />} title="10. Resultado e Margem">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              <ResultCard label="Valor final" value={fmtBRL(res.valorFinal)} />
              <ResultCard label="Custo total" value={fmtBRL(res.custoTotal)} />
              <ResultCard label="Lucro bruto" value={fmtBRL(res.lucroBruto)} tone={res.lucroBruto < 0 ? "neg" : "pos"} />
              <ResultCard label="Margem %" value={`${fmtNum(res.margemPct, 1)}%`} tone={res.margemPct < 0 ? "neg" : res.margemPct < 10 ? "warn" : "pos"} />
              <ResultCard label="Custo / kWp" value={fmtBRL(res.custoPorKwp)} />
              <ResultCard label="Resultado / kWp" value={fmtBRL(res.resultadoPorKwp)} tone={res.resultadoPorKwp < 0 ? "neg" : "pos"} />
            </div>
            {res.margemPct < 0 && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="mr-1 inline h-3 w-3" /> A proposta está com <strong>margem negativa</strong>.
              </div>
            )}
            {res.margemPct >= 0 && res.margemPct < 10 && (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
                <AlertTriangle className="mr-1 inline h-3 w-3 text-warning" /> Margem abaixo de 10% — verifique aprovação gerencial.
              </div>
            )}
          </Bloco>

          {/* BLOCO 11 — Observações */}
          <Bloco icon={<FileText className="h-4 w-4" />} title="11. Observações">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Observações internas (não aparecem na proposta)">
                <Textarea rows={4} value={p.obsInternas ?? ""} onChange={(e) => update("obsInternas", e.target.value)} />
              </Field>
              <Field label="Observações para o cliente">
                <Textarea rows={4} value={p.obsCliente ?? ""} onChange={(e) => update("obsCliente", e.target.value)} />
              </Field>
            </div>
          </Bloco>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function round2(v: number) { return Math.round((Number(v) || 0) * 100) / 100; }

/* ============= helpers de UI ============= */

function Bloco({ title, icon, badge, children }: { title: string; icon?: React.ReactNode; badge?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center gap-2 text-sm">{icon}{title}</CardTitle>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {hint && (
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <span className="cursor-help text-muted-foreground">?</span>
          </TooltipTrigger><TooltipContent className="max-w-xs">{hint}</TooltipContent></Tooltip></TooltipProvider>
        )}
      </Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">{value}</div>
    </div>
  );
}

function ResultCard({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "warn" }) {
  const cls = tone === "neg" ? "text-destructive" : tone === "warn" ? "text-warning" : tone === "pos" ? "text-success" : "";
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${cls}`}>{value}</div>
    </Card>
  );
}

/* =========================== IMPRESSÃO =========================== */

// PropostaImpressao + Info foram extraídos para ./components/PropostaImpressao.tsx

/* =========================== CADASTROS =========================== */

function CadastrosFV() {
  return (
    <Tabs defaultValue="cidades" className="w-full">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="cidades">Cidades</TabsTrigger>
        <TabsTrigger value="concs">Concessionárias</TabsTrigger>
        <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
        <TabsTrigger value="modulos">Módulos</TabsTrigger>
        <TabsTrigger value="inversores">Inversores</TabsTrigger>
        <TabsTrigger value="dist">Distribuidores</TabsTrigger>
        <TabsTrigger value="param">Parâmetros</TabsTrigger>
        <TabsTrigger value="custos">Custos</TabsTrigger>
      </TabsList>
      <TabsContent value="cidades" className="mt-4"><CrudCidades /></TabsContent>
      <TabsContent value="concs" className="mt-4"><CrudConcessionarias /></TabsContent>
      <TabsContent value="tarifas" className="mt-4"><CrudTarifas /></TabsContent>
      <TabsContent value="modulos" className="mt-4"><CrudModulos /></TabsContent>
      <TabsContent value="inversores" className="mt-4"><CrudInversores /></TabsContent>
      <TabsContent value="dist" className="mt-4"><CrudDistribuidores /></TabsContent>
      <TabsContent value="param" className="mt-4"><CrudParametros /></TabsContent>
      <TabsContent value="custos" className="mt-4"><CrudCustos /></TabsContent>
    </Tabs>
  );
}

/* CRUDs simples e genéricos -------------------------------------------- */

function CrudCidades() {
  const list = useCidadesFV();
  const novo = (): CidadeFV => ({ id: `CID-${Date.now()}`, cidade: "", estado: "GO", irradiacaoMedia: 5.4 });
  return (
    <CrudTable<CidadeFV>
      title="Cidades"
      data={list}
      cols={[
        { label: "Cidade", get: (r) => r.cidade, set: (r, v) => ({ ...r, cidade: v }) },
        { label: "UF", get: (r) => r.estado, set: (r, v) => ({ ...r, estado: v }) },
        { label: "Concessionária", get: (r) => r.concessionariaPadrao ?? "", set: (r, v) => ({ ...r, concessionariaPadrao: v }) },
        { label: "Irradiação", type: "number", get: (r) => String(r.irradiacaoMedia), set: (r, v) => ({ ...r, irradiacaoMedia: +v }) },
        { label: "Tarifa", type: "number", get: (r) => String(r.tarifaPadrao ?? ""), set: (r, v) => ({ ...r, tarifaPadrao: +v }) },
      ]}
      onSave={upsertCidadeFV}
      onDelete={(r) => removeCidadeFV(r.id)}
      onNew={novo}
    />
  );
}
function CrudConcessionarias() {
  const list = useConcessionarias();
  const novo = (): ConcessionariaFV => ({ id: `CON-${Date.now()}`, nome: "", estado: "GO" });
  return (
    <CrudTable<ConcessionariaFV>
      title="Concessionárias"
      data={list}
      cols={[
        { label: "Nome", get: (r) => r.nome, set: (r, v) => ({ ...r, nome: v }) },
        { label: "UF", get: (r) => r.estado, set: (r, v) => ({ ...r, estado: v }) },
        { label: "Tarifa", type: "number", get: (r) => String(r.tarifaPadrao ?? ""), set: (r, v) => ({ ...r, tarifaPadrao: +v }) },
        { label: "Mín Mono (kWh)", type: "number", get: (r) => String(r.taxaMinMonofasico ?? ""), set: (r, v) => ({ ...r, taxaMinMonofasico: +v }) },
        { label: "Mín Bi", type: "number", get: (r) => String(r.taxaMinBifasico ?? ""), set: (r, v) => ({ ...r, taxaMinBifasico: +v }) },
        { label: "Mín Tri", type: "number", get: (r) => String(r.taxaMinTrifasico ?? ""), set: (r, v) => ({ ...r, taxaMinTrifasico: +v }) },
      ]}
      onSave={upsertConcessionariaFV}
      onDelete={(r) => removeConcessionariaFV(r.id)}
      onNew={novo}
    />
  );
}
function CrudModulos() {
  const list = useModulosFV();
  const novo = (): ModuloFV => ({ id: `MOD-${Date.now()}`, marca: "", modelo: "", potenciaWp: 0, larguraM: 1.134, alturaM: 2.382, ativo: true });
  return (
    <CrudTable<ModuloFV>
      title="Módulos fotovoltaicos"
      data={list}
      cols={[
        { label: "Marca", get: (r) => r.marca, set: (r, v) => ({ ...r, marca: v }) },
        { label: "Modelo", get: (r) => r.modelo, set: (r, v) => ({ ...r, modelo: v }) },
        { label: "Wp", type: "number", get: (r) => String(r.potenciaWp), set: (r, v) => ({ ...r, potenciaWp: +v }) },
        { label: "Larg (m)", type: "number", get: (r) => String(r.larguraM), set: (r, v) => ({ ...r, larguraM: +v }) },
        { label: "Alt (m)", type: "number", get: (r) => String(r.alturaM), set: (r, v) => ({ ...r, alturaM: +v }) },
        { label: "Ativo", type: "bool", get: (r) => (r.ativo ? "1" : ""), set: (r, v) => ({ ...r, ativo: !!v }) },
      ]}
      onSave={upsertModuloFV}
      onDelete={(r) => removeModuloFV(r.id)}
      onNew={novo}
    />
  );
}
function CrudInversores() {
  const list = useInversoresFV();
  const novo = (): InversorFV => ({ id: `INV-${Date.now()}`, marca: "", modelo: "", potenciaKw: 0, ativo: true });
  return (
    <CrudTable<InversorFV>
      title="Inversores"
      data={list}
      cols={[
        { label: "Marca", get: (r) => r.marca, set: (r, v) => ({ ...r, marca: v }) },
        { label: "Modelo", get: (r) => r.modelo, set: (r, v) => ({ ...r, modelo: v }) },
        { label: "Potência (kW)", type: "number", get: (r) => String(r.potenciaKw), set: (r, v) => ({ ...r, potenciaKw: +v }) },
        { label: "Tipo", get: (r) => r.tipo ?? "", set: (r, v) => ({ ...r, tipo: v }) },
        { label: "Ativo", type: "bool", get: (r) => (r.ativo ? "1" : ""), set: (r, v) => ({ ...r, ativo: !!v }) },
      ]}
      onSave={upsertInversorFV}
      onDelete={(r) => removeInversorFV(r.id)}
      onNew={novo}
    />
  );
}
function CrudDistribuidores() {
  const list = useDistribuidoresFV();
  const novo = (): DistribuidorFV => ({ id: `DIS-${Date.now()}`, nome: "", ativo: true });
  return (
    <CrudTable<DistribuidorFV>
      title="Distribuidores"
      data={list}
      cols={[
        { label: "Nome", get: (r) => r.nome, set: (r, v) => ({ ...r, nome: v }) },
        { label: "Telefone", get: (r) => r.telefone ?? "", set: (r, v) => ({ ...r, telefone: v }) },
        { label: "Observação", get: (r) => r.observacao ?? "", set: (r, v) => ({ ...r, observacao: v }) },
        { label: "Ativo", type: "bool", get: (r) => (r.ativo ? "1" : ""), set: (r, v) => ({ ...r, ativo: !!v }) },
      ]}
      onSave={upsertDistribuidorFV}
      onDelete={(r) => removeDistribuidorFV(r.id)}
      onNew={novo}
    />
  );
}
function CrudParametros() {
  const list = useParametrosFV();
  const novo = (): ParametroFV => ({ id: `PRM-${Date.now()}`, nome: "", valorPorKwp: 0, faixaInicio: 0, faixaFim: 9999, ativo: true });
  return (
    <CrudTable<ParametroFV>
      title="Parâmetros de venda"
      data={list}
      cols={[
        { label: "Nome", get: (r) => r.nome, set: (r, v) => ({ ...r, nome: v }) },
        { label: "Tipo", get: (r) => r.tipoInstalacao ?? "", set: (r, v) => ({ ...r, tipoInstalacao: v }) },
        { label: "kWp de", type: "number", get: (r) => String(r.faixaInicio), set: (r, v) => ({ ...r, faixaInicio: +v }) },
        { label: "kWp até", type: "number", get: (r) => String(r.faixaFim), set: (r, v) => ({ ...r, faixaFim: +v }) },
        { label: "R$/kWp", type: "number", get: (r) => String(r.valorPorKwp), set: (r, v) => ({ ...r, valorPorKwp: +v }) },
        { label: "Ativo", type: "bool", get: (r) => (r.ativo ? "1" : ""), set: (r, v) => ({ ...r, ativo: !!v }) },
      ]}
      onSave={upsertParametroFV}
      onDelete={(r) => removeParametroFV(r.id)}
      onNew={novo}
    />
  );
}
function CrudCustos() {
  const list = useCustosFV();
  const novo = (): CustoFV => ({ id: `CUS-${Date.now()}`, nome: "", tipo: "MATERIAL", unidade: "un", valorUnitario: 0, regraCalculo: "fixo", ativo: true });
  return (
    <CrudTable<CustoFV>
      title="Custos padrão"
      data={list}
      cols={[
        { label: "Nome", get: (r) => r.nome, set: (r, v) => ({ ...r, nome: v }) },
        { label: "Tipo", get: (r) => r.tipo, set: (r, v) => ({ ...r, tipo: (v as CustoFV["tipo"]) || "MATERIAL" }) },
        { label: "Unidade", get: (r) => r.unidade, set: (r, v) => ({ ...r, unidade: v }) },
        { label: "Valor unit.", type: "number", get: (r) => String(r.valorUnitario), set: (r, v) => ({ ...r, valorUnitario: +v }) },
        { label: "Regra", get: (r) => r.regraCalculo ?? "fixo", set: (r, v) => ({ ...r, regraCalculo: v as CustoFV["regraCalculo"] }) },
        { label: "Ativo", type: "bool", get: (r) => (r.ativo ? "1" : ""), set: (r, v) => ({ ...r, ativo: !!v }) },
      ]}
      onSave={upsertCustoFV}
      onDelete={(r) => removeCustoFV(r.id)}
      onNew={novo}
    />
  );
}

/* Tabela CRUD genérica ------------------------------------------------- */

type CrudCol<T> = {
  label: string;
  type?: "text" | "number" | "bool";
  get: (r: T) => string;
  set: (r: T, v: any) => T;
};

function CrudTable<T extends { id: string }>({
  title, data, cols, onSave, onDelete, onNew,
}: {
  title: string;
  data: T[];
  cols: CrudCol<T>[];
  onSave: (r: T) => void;
  onDelete: (r: T) => void;
  onNew: () => T;
}) {
  const [rows, setRows] = useState<T[]>(data);
  useEffect(() => { setRows(data); }, [data]);

  function update(idx: number, col: CrudCol<T>, v: any) {
    setRows((cur) => { const n = [...cur]; n[idx] = col.set(n[idx], v); return n; });
  }
  function persistir(idx: number) { onSave(rows[idx]); toast.success("Salvo."); }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => { const n = onNew(); onSave(n); }}>
          <Plus className="mr-1 h-3 w-3" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => <TableHead key={c.label}>{c.label}</TableHead>)}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                {cols.map((c) => (
                  <TableCell key={c.label}>
                    {c.type === "bool" ? (
                      <Switch checked={!!c.get(r)} onCheckedChange={(v) => update(i, c, v)} />
                    ) : (
                      <Input
                        type={c.type === "number" ? "number" : "text"}
                        value={c.get(r)}
                        onChange={(e) => update(i, c, e.target.value)}
                        onBlur={() => persistir(i)}
                        className="h-8"
                      />
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => persistir(i)} title="Salvar"><Save className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(r)} className="text-destructive" title="Excluir"><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* =========================== AJUDA =========================== */

// AjudaTab foi extraído para ./components/AjudaTab.tsx
