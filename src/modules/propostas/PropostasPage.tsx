// Página principal do módulo Propostas Fotovoltaicas.
// Movida de src/routes/propostas.tsx durante reorganização modular.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Trash2, Eye, FileText, Printer, Copy, CheckCircle2, Send,
  XCircle, Sparkles, Calculator, Users, MapPin, Zap, Sun, Wrench, DollarSign,
  Receipt, AlertTriangle, Save, FileSearch, Settings as SettingsIcon, Pencil,
  Undo2,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  useAprovarProposta,
  useCancelarProposta,
  useGerarContratoDaProposta,
  useGerarAditivoContrato,
  useEnviarContratoEngenharia,
  useEnviarContratoFinanciamento,
  useEnviarContratoAssinatura,
  useGerarComissaoDeContrato,
  useReabrirProposta,
  useReprovarProposta,
} from "@/lib/repositories/comercial-processos-repo";
import { useTabFromHash } from "@/lib/route-tabs";
// LEGADO LS — pendente migração PropostasPage Supabase. Não estender.
import { useClientesFull, addClienteFull } from "@/lib/clientes-store";
import { upsertContrato } from "@/lib/contratos-store";
import {
  type PropostaFV, type StatusProposta, type LinhaCusto, type CidadeFV,
  type ConcessionariaFV, type ModuloFV, type InversorFV, type DistribuidorFV,
  type ParametroFV, type CustoFV, type TarifaEnergia,
  useCidadesFV, useConcessionarias, useModulosFV, useInversoresFV,
  useDistribuidoresFV, useParametrosFV, useCustosFV, usePropostas,
  refreshPropostas,
  useTarifasEnergia,
  upsertCidadeFV, removeCidadeFV, upsertConcessionariaFV, removeConcessionariaFV,
  upsertModuloFV, removeModuloFV, upsertInversorFV, removeInversorFV,
  upsertDistribuidorFV, removeDistribuidorFV, upsertParametroFV, removeParametroFV,
  upsertCustoFV, removeCustoFV, upsertProposta, removeProposta,
  marcarPropostaAtivaDoLead, expirarPropostasVencidasAuto,
  novaPropostaVazia, proximoNumeroProposta, calcDimensionamento, calcPrecificacao,
  calcResultado, gerarCustosSugeridos, sugerirParametro, potenciaInversores,
  consumoEfetivo, somaMensal, fmtBRL, fmtNum, validarParaGeracao,
  buscarTarifa, getLastCidadeId, setLastCidadeId, addHistoricoIrradiacao,
  sugerirInversoresAuto, inversorIdPadrao, modulosSuportadosPorInversor,
  capacidadeKwpInversor, STANDARD_INVERSOR_KW,
  formatDoc, isDocValido, buscarClienteExistente, type ClienteSnapshot,
} from "@/modules/propostas/store";
import { usePropostaConfig } from "@/modules/propostas/proposta-config-store";
import { Slider } from "@/components/ui/slider";
import { useComissaoPolicy, calcularComissao } from "@/modules/propostas/comissao-policy-store";
import { useUsuarioAtual } from "@/lib/perfis-store";
import { useConsultoresAtivos, upsertConsultor, novoConsultorVazio, formatTelefoneBR, type Consultor } from "@/lib/consultores-store";
import { X as XIcon } from "lucide-react";

import { PropostaList, statusVariant, duplicarProposta, excluirProposta, AprovarPropostaDialog } from "./components/PropostaList";
import { PropostaImpressao } from "./components/PropostaImpressao";
import { CrudTarifas } from "./components/CrudTarifas";
import { EnterpriseRecordToolbar, layoutBarRm, AttachmentDialog, ModuloHistoricoDrawer } from "@/components/app/enterprise";


export { PropostasPage, CadastrosFV };

function CidadeCombobox({ cidades, onSelect }: { cidades: CidadeFV[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? cidades.filter((c) => `${c.cidade}/${c.estado}`.toLowerCase().includes(q))
      : cidades;
    return list.slice(0, 100);
  }, [cidades, query]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground shadow-sm hover:bg-accent/30"
        >
          <span>Buscar...</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Pesquisar cidade ou UF..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onSelect(c.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {c.cidade}/{c.estado}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Combobox livre estilo "Selecione ou crie": filtra opções existentes e
 *  exibe "Novo: <texto>" quando o digitado não corresponde a nenhuma. */
function MarcaCombobox({
  value, onChange, options, placeholder, onCreateNew,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  /** Disparado quando o usuário escolhe a opção "Novo: <texto>". */
  onCreateNew?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const norm = (s: string) => (s || "").trim().toUpperCase();
  const opts = useMemo(
    () => Array.from(new Set(options.map(norm).filter(Boolean))).sort(),
    [options],
  );
  const q = norm(query);
  const filtered = q ? opts.filter((o) => o.includes(q)) : opts;
  const exists = q ? opts.includes(q) : true;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm hover:bg-accent/30"
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {value || placeholder || "Selecione ou digite..."}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Pesquisar ou digitar novo..." value={query} onValueChange={setQuery} />
          <CommandList>
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem key={o} value={o} onSelect={() => { onChange(o); setQuery(""); setOpen(false); }}>
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {q && !exists && (
              <CommandGroup>
                <CommandItem
                  value={`__new_${q}`}
                  className="bg-primary/10 text-primary"
                  onSelect={() => {
                    onCreateNew?.(q);
                    onChange(q);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  Novo: {q}
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length === 0 && !q && <CommandEmpty>Digite para criar.</CommandEmpty>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Resolve um label digitado em um inversorId.
 *  - Reconhece "INVERSOR XKW" como padrão (usa STANDARD_INVERSOR_KW)
 *  - Reaproveita inversor existente por modelo
 *  - Caso contrário cria um novo InversorFV personalizado e devolve seu id */
function ensureInversorByLabel(label: string, marca: string, lista: InversorFV[]): string {
  const l = label.trim().toUpperCase();
  if (!l) return "";
  // Aceita só o número (ex.: "75", "37,5", "37.5") — mapeia para o inversor padrão.
  const onlyNum = l.replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(?:KW)?$/);
  if (onlyNum) {
    const kw = Number(onlyNum[1]);
    if ((STANDARD_INVERSOR_KW as readonly number[]).includes(kw)) return inversorIdPadrao(kw);
  }
  const stdMatch = l.match(/^INVERSOR\s+([\d.,]+)\s*KW$/);
  if (stdMatch) {
    const kw = Number(stdMatch[1].replace(",", "."));
    if ((STANDARD_INVERSOR_KW as readonly number[]).includes(kw)) return inversorIdPadrao(kw);
  }
  const existing = lista.find((i) => i.modelo.toUpperCase() === l);
  if (existing) return existing.id;
  const numMatch = l.replace(",", ".").match(/(\d+(\.\d+)?)/);
  const kw = numMatch ? Number(numMatch[1]) : 0;
  const id = `INV-CUSTOM-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  upsertInversorFV({ id, marca: marca || "PERSONALIZADO", modelo: l, potenciaKw: kw, tipo: "STRING", garantia: 10, ativo: true });
  return id;
}

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
    // tarifa permanece travada via config global (Configurações → Proposta)
  };
}

/* =========================== PÁGINA =========================== */

function PropostasPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const propostas = usePropostas();
  const [editando, setEditando] = useState<PropostaFV | null>(null);
  const [editandoCliente, setEditandoCliente] = useState<PropostaFV | null>(null);
  const [vendoId, setVendoId] = useState<string | null>(null);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [leadDraft, setLeadDraft] = useState<PropostaFV | null>(null);
  const [anexosOpen, setAnexosOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [propostaParaAprovarId, setPropostaParaAprovarId] = useState<string | null>(null);
  const [selecionarAprovarOpen, setSelecionarAprovarOpen] = useState(false);
  const [candidatasAprovacao, setCandidatasAprovacao] = useState<PropostaFV[]>([]);

  // D17.UI — densidade + preset da tabela (persistidos em LS `ui.*`)
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">(() => {
    if (typeof window === "undefined") return "compact";
    const v = window.localStorage.getItem("ui.propostas.density.v1");
    return v === "comfortable" || v === "spacious" ? v : "compact";
  });
  const [layoutPreset, setLayoutPreset] = useState<string>(() => {
    if (typeof window === "undefined") return "padrao";
    return window.localStorage.getItem("ui.propostas.preset.v1") || "padrao";
  });
  useEffect(() => {
    try { window.localStorage.setItem("ui.propostas.density.v1", density); } catch {}
  }, [density]);
  useEffect(() => {
    try { window.localStorage.setItem("ui.propostas.preset.v1", layoutPreset); } catch {}
  }, [layoutPreset]);
  const densityClass =
    density === "spacious"
      ? "[&_td]:!py-3 [&_th]:!py-3 text-[13px]"
      : density === "comfortable"
        ? "[&_td]:!py-2 [&_th]:!py-2 text-[13px]"
        : "[&_td]:!py-1 [&_th]:!py-1 text-[12px]";


  const propostaVisualizada = vendoId ? propostas.find((p) => p.id === vendoId) ?? null : null;
  const propostaSelecionada =
    propostaVisualizada ?? (selecionadaId ? propostas.find((p) => p.id === selecionadaId) ?? null : null);

  const aprovar = useAprovarProposta();
  const reprovar = useReprovarProposta();
  const cancelar = useCancelarProposta();
  const reabrir = useReabrirProposta();
  const gerarContrato = useGerarContratoDaProposta();
  const gerarAditivo = useGerarAditivoContrato();
  const enviarEng = useEnviarContratoEngenharia();
  const enviarFin = useEnviarContratoFinanciamento();
  const enviarAssinatura = useEnviarContratoAssinatura();
  const gerarComissao = useGerarComissaoDeContrato();

  const isBusy = [
    aprovar.isPending,
    reprovar.isPending,
    cancelar.isPending,
    reabrir.isPending,
    gerarContrato.isPending,
    gerarAditivo.isPending,
    enviarEng.isPending,
    enviarFin.isPending,
    enviarAssinatura.isPending,
    gerarComissao.isPending,
  ].some(Boolean);

  function getPropostaAtiva(): PropostaFV | null {
    if (propostaSelecionada) return propostaSelecionada;
    toast.error("Selecione uma proposta primeiro.");
    return null;
  }

  async function syncComercialState(selectedId?: string | null) {
    await refreshPropostas();
    if (selectedId) setVendoId(selectedId);
  }

  function pedirMotivo(label: string): string | null {
    const motivo = window.prompt(`Informe o motivo para ${label.toLowerCase()}:`, "");
    if (motivo === null) return null;
    const normalizado = motivo.trim();
    if (normalizado.length < 5) {
      toast.error("Informe um motivo com pelo menos 5 caracteres.");
      return null;
    }
    return normalizado;
  }

  function pedirDescricaoAditivo(): string | null {
    const descricao = window.prompt("Descreva o aditivo que será criado:", "");
    if (descricao === null) return null;
    const normalizado = descricao.trim();
    if (normalizado.length < 5) {
      toast.error("Descreva o aditivo com pelo menos 5 caracteres.");
      return null;
    }
    return normalizado;
  }

  async function garantirContrato(
    proposta: PropostaFV,
    mensagem: string,
  ): Promise<string | null> {
    if (proposta.contratoGeradoId) return proposta.contratoGeradoId;
    const confirmar = window.confirm(mensagem);
    if (!confirmar) return null;
    const contratoId = await gerarContrato.mutateAsync({ propostaId: proposta.id });
    await syncComercialState(proposta.id);
    return contratoId;
  }

  function executarAprovar() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    if (proposta.status === "APROVADA") {
      toast.info("Esta proposta já está aprovada.");
      return;
    }
    if (proposta.status === "CANCELADA") {
      toast.error("Reabra a proposta antes de aprovar.");
      return;
    }
    // Identidade do lead = leadId → CPF/CNPJ → nome (mesmo critério da lista).
    const leadKey = (
      proposta.leadId?.trim() ||
      proposta.clienteDoc?.trim() ||
      (proposta.clienteNome || "").trim().toLowerCase() ||
      proposta.id
    );
    const aprovaveis = propostas.filter((p) => {
      const k = p.leadId?.trim() || p.clienteDoc?.trim() || (p.clienteNome || "").trim().toLowerCase() || p.id;
      return k === leadKey && ["RASCUNHO", "GERADA", "ENVIADA"].includes(p.status);
    });
    if (aprovaveis.length > 1) {
      setCandidatasAprovacao(aprovaveis);
      setSelecionarAprovarOpen(true);
      return;
    }
    setPropostaParaAprovarId(proposta.id);
    setAprovarOpen(true);
  }

  async function executarReprovar() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    const motivo = pedirMotivo("reprovar a proposta");
    if (!motivo) return;
    await reprovar.mutateAsync({ propostaId: proposta.id, motivo });
    await syncComercialState(proposta.id);
  }

  async function executarCancelar() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    const motivo = pedirMotivo("cancelar a proposta");
    if (!motivo) return;
    await cancelar.mutateAsync({ propostaId: proposta.id, motivo });
    await syncComercialState(proposta.id);
  }

  async function executarReabrir() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    const motivo = pedirMotivo("reabrir a proposta");
    if (!motivo) return;
    await reabrir.mutateAsync({ propostaId: proposta.id, motivo });
    await syncComercialState(proposta.id);
  }

  async function executarEnviarEngenharia() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    const contratoId = await garantirContrato(
      proposta,
      "Esta proposta ainda não tem contrato. Deseja gerar contrato agora para enviar à Engenharia?",
    );
    if (!contratoId) return;
    await enviarEng.mutateAsync({ contratoId });
    await syncComercialState(proposta.id);
  }

  async function executarEnviarFinanciamento() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    if (proposta.possuiFinanciamento !== true) {
      toast.warning("Esta proposta não possui financiamento marcado. Nenhuma pendência foi criada.");
      return;
    }
    const contratoId = await garantirContrato(
      proposta,
      "Esta proposta ainda não tem contrato. Deseja gerar contrato agora para enviar ao Financiamento?",
    );
    if (!contratoId) return;
    await enviarFin.mutateAsync({ contratoId });
    await syncComercialState(proposta.id);
  }

  async function executarGerarComissao() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    const contratoId = proposta.contratoGeradoId;
    if (!contratoId) {
      toast.error("Gere o contrato antes de criar a comissão.");
      return;
    }
    await gerarComissao.mutateAsync({ contratoId });
    await syncComercialState(proposta.id);
  }

  async function executarGerarAditivo() {
    const proposta = getPropostaAtiva();
    if (!proposta?.contratoGeradoId) return;
    const descricao = pedirDescricaoAditivo();
    if (!descricao) return;
    await gerarAditivo.mutateAsync({ contratoId: proposta.contratoGeradoId, descricao });
    await syncComercialState(proposta.id);
  }

  async function executarEnviarAssinatura() {
    const proposta = getPropostaAtiva();
    if (!proposta) return;
    const contratoId = await garantirContrato(
      proposta,
      "Esta proposta ainda não tem contrato. Deseja gerar contrato agora para enviar à assinatura?",
    );
    if (!contratoId) return;
    await enviarAssinatura.mutateAsync({ contratoId });
    await syncComercialState(proposta.id);
  }

  const ribbonState = (() => {
    const proposta = propostaSelecionada;
    if (!proposta) {
      const motivo = "Selecione uma proposta primeiro.";
      return {
        aprovar: { disabled: true, disabledReason: motivo },
        reprovar: { disabled: true, disabledReason: motivo },
        gerarAditivo: { disabled: true, disabledReason: motivo },
        enviarFinanciamento: { disabled: true, disabledReason: motivo },
        cancelar: { disabled: true, disabledReason: motivo },
        reabrir: { disabled: true, disabledReason: motivo },
      };
    }

    const possuiContrato = !!proposta.contratoGeradoId;
    const podeReabrir = ["CANCELADA", "RECUSADA", "VENCIDA"].includes(proposta.status);
    const podeGerarAditivo = possuiContrato && proposta.status === "APROVADA";

    return {
      aprovar: {
        onClick: () => void executarAprovar(),
        disabled: isBusy || ["APROVADA", "CANCELADA"].includes(proposta.status),
        disabledReason: proposta.status === "APROVADA" ? "A proposta já está aprovada." : proposta.status === "CANCELADA" ? "Reabra a proposta antes de aprovar." : undefined,
      },
      reprovar: {
        onClick: () => void executarReprovar(),
        disabled: isBusy || ["RECUSADA", "CANCELADA"].includes(proposta.status),
        disabledReason: proposta.status === "RECUSADA" ? "A proposta já está reprovada." : proposta.status === "CANCELADA" ? "Reabra a proposta antes de reprovar." : undefined,
      },
      gerarAditivo: {
        onClick: () => void executarGerarAditivo(),
        disabled: isBusy || !podeGerarAditivo,
        disabledReason: !possuiContrato ? "Gere o contrato antes de criar aditivo." : proposta.status !== "APROVADA" ? "Aprove o contrato antes de criar aditivo." : undefined,
      },
      enviarFinanciamento: {
        onClick: () => void executarEnviarFinanciamento(),
        disabled: isBusy || proposta.possuiFinanciamento !== true,
        disabledReason: proposta.possuiFinanciamento !== true ? "Esta proposta não possui financiamento marcado." : undefined,
      },
      cancelar: {
        onClick: () => void executarCancelar(),
        disabled: isBusy || proposta.status === "CANCELADA",
        disabledReason: proposta.status === "CANCELADA" ? "A proposta já está cancelada." : undefined,
      },
      reabrir: {
        onClick: () => void executarReabrir(),
        disabled: isBusy || !podeReabrir,
        disabledReason: !podeReabrir ? "Somente propostas canceladas, recusadas ou vencidas podem ser reabertas." : undefined,
      },
    };
  })();

  const cidadesAll = useCidadesFV();
  function novaProposta(preset?: Partial<PropostaFV>) {
    const numero = proximoNumeroProposta(propostas);
    let p = novaPropostaVazia(numero);
    const lastId = getLastCidadeId();
    const cidadeDefault = lastId ? cidadesAll.find((c) => c.id === lastId) : undefined;
    if (cidadeDefault) p = aplicarCidadeNaProposta(p, cidadeDefault, true);
    if (preset) p = { ...p, ...preset, id: p.id, numero: p.numero, status: "RASCUNHO", criadoEm: p.criadoEm, atualizadoEm: p.atualizadoEm };
    setLeadDraft(p);
  }

  return (
    <>
      {!embedded && (
        <PageHeader
          title="Propostas Fotovoltaicas"
          subtitle="Crie propostas guiadas com cálculo automático de potência, preço e margem."
        />
      )}
      {/* D17.UI Fase 1 — Comercial: barra Enterprise RM/TOTVS */}
      <div className={embedded ? "mt-4" : "mt-3"}>
        <EnterpriseRecordToolbar
          entityType="propostas"
          selectedIds={propostaSelecionada ? [propostaSelecionada.id] : []}
          splitSecondaryActions
          onFilter={() => {
            const open = (window as any).__propostasOpenFilters;
            if (typeof open === "function") {
              open();
            }
            else {
              const inp = document.querySelector<HTMLInputElement>("[data-propostas-search]");
              if (inp) { inp.scrollIntoView({ behavior: "smooth", block: "center" }); inp.focus(); }
              else toast.info("Use a busca/filtro da lista abaixo.");
            }
          }}
          availableActions={(() => {
            const base = [
              "editar", "atualizar",
              "anexos", "historico", "auditoria", "favoritos",
              "exportar", "enviar",
              "filtroRapido", "filtroAvancado", "colunas",
            ] as const;
            const s = String(propostaSelecionada?.status ?? "").toUpperCase();
            const terminalAprovado = ["APROVADA","ATIVA","CONTRATO_PENDENTE","CONTRATADA","ASSINADA"].includes(s);
            const terminalEncerrado = ["CANCELADA","RECUSADA","REPROVADA","VENCIDA"].includes(s);
            // Editar inviável quando a proposta está aprovada/contratada/assinada
            // ou encerrada — única forma é "Gerar nova proposta" (ou reabrir).
            return (terminalAprovado || terminalEncerrado)
              ? base.filter((a) => a !== "editar")
              : [...base];
          })()}
          availableProcesses={(() => {
            const s = String(propostaSelecionada?.status ?? "").toUpperCase();
            const aprovado = ["APROVADA","ATIVA","CONTRATO_PENDENTE","CONTRATADA","ASSINADA"].includes(s);
            const encerrado = ["CANCELADA","RECUSADA","REPROVADA","VENCIDA"].includes(s);
            const semSelecao = !propostaSelecionada;
            const reasonAprovado =
              s === "ASSINADA" ? "Proposta já assinada."
              : s === "CONTRATADA" ? "Proposta já contratada."
              : s === "CONTRATO_PENDENTE" ? "Proposta já enviada para contrato."
              : "Proposta já aprovada — gere uma nova versão para alterar.";
            const reasonEncerrado =
              s === "CANCELADA" ? "Proposta cancelada — reabra antes."
              : s === "VENCIDA" ? "Proposta vencida — reabra ou gere nova."
              : "Proposta encerrada — reabra antes.";
            return [
              { key: "aprovar_proposta",     label: "Aprovar Proposta",          group: "Proposta",
                disabled: semSelecao || aprovado || encerrado,
                disabledReason: semSelecao ? "Selecione uma proposta." : aprovado ? reasonAprovado : encerrado ? reasonEncerrado : undefined },
              { key: "reprovar_proposta",    label: "Reprovar Proposta",         group: "Proposta", destructive: true, requerMotivo: true,
                disabled: semSelecao || aprovado || encerrado,
                disabledReason: semSelecao ? "Selecione uma proposta." : aprovado ? reasonAprovado : encerrado ? reasonEncerrado : undefined },
              { key: "editar_cliente",       label: "Corrigir Dados Cadastrais", group: "Proposta", requerMotivo: true,
                disabled: semSelecao || aprovado,
                disabledReason: semSelecao ? "Selecione uma proposta." : aprovado ? reasonAprovado : undefined },
              // ▼ Nova Proposta — sempre disponível com seleção (única via de "edição" pós-aprovação)
              { key: "gerar_nova_proposta",  label: "Gerar Nova Proposta",       group: "Nova Proposta",
                disabled: semSelecao,
                disabledReason: semSelecao ? "Selecione uma proposta." : undefined },
              // ▼ Encerramento
              { key: "cancelar_proposta",    label: "Cancelar Proposta",         group: "Encerramento", destructive: true, requerMotivo: true,
                disabled: semSelecao || aprovado || s === "CANCELADA",
                disabledReason: semSelecao ? "Selecione uma proposta." : s === "CANCELADA" ? "Proposta já cancelada." : aprovado ? reasonAprovado : undefined },
              { key: "reabrir_proposta",     label: "Reabrir Proposta",          group: "Encerramento", requerMotivo: true,
                disabled: semSelecao || !encerrado,
                disabledReason: semSelecao ? "Selecione uma proposta." : !encerrado ? "Apenas propostas canceladas, recusadas ou vencidas podem ser reabertas." : undefined },
            ];
          })()}
          onProcess={async (key) => {
            // Confirmação padronizada: ação + destino + novo status.
            const confirmarProcesso = (titulo: string, destino: string, novoStatus: string) =>
              window.confirm(
                `${titulo}\n\nDestino: ${destino}\nNovo status: ${novoStatus}\n\nDeseja continuar?`,
              );

            if (key === "aprovar_proposta") {
              const pAtiva = getPropostaAtiva();
              if (pAtiva && String(pAtiva.status).toUpperCase() === "VENCIDA") {
                toast.error("Esta proposta está expirada. Gere uma nova proposta ou solicite revalidação por perfil autorizado.");
                return;
              }
              if (!confirmarProcesso("Aprovar Proposta", "Comercial > Contratos Pendentes (geração automática)", "APROVADA")) return;
              executarAprovar();
            } else if (key === "reprovar_proposta") {
              if (!confirmarProcesso("Reprovar Proposta", "Comercial > Propostas Reprovadas", "REPROVADA")) return;
              await executarReprovar();
            } else if (key === "editar_cliente") {
              const p = getPropostaAtiva();
              if (!p) { toast.info("Selecione uma proposta na tabela."); return; }
              // Governança Enterprise D18.4: correção cadastral só em propostas em aberto.
              // CONTRATADA/SUBSTITUIDA/CANCELADA/EXPIRADA = documentos históricos.
              // Campos comerciais/técnicos/financeiros NUNCA são editáveis — exigem Gerar Nova Proposta.
              const bloqueados = ["APROVADA", "ASSINADA", "CONTRATADA", "CANCELADA", "REPROVADA", "RECUSADA", "VENCIDA", "SUBSTITUIDA", "EXPIRADA"];
              if (bloqueados.includes(String(p.status).toUpperCase())) {
                toast.error(
                  `Proposta ${p.status} é documento histórico e não permite edição. Gere nova proposta ou ajuste o cadastro no Cliente/Contrato.`,
                );
                return;
              }
              setEditandoCliente(p);
            } else if (key === "gerar_nova_proposta") {
              const sel = (window as any).__propostasSelectedLead;
              const lead = typeof sel === "function" ? sel() : propostaSelecionada;
              if (!lead) { toast.info("Flegue 1 lead na lista abaixo."); return; }
              if (!confirmarProcesso("Gerar Nova Proposta", "Comercial > Propostas (nova proposta para o lead flegado)", "RASCUNHO")) return;
              // Governança Enterprise: pergunta se a nova proposta vira a proposta ativa do lead.
              // Marcação efetiva como SUBSTITUÍDA das anteriores em aberto será aplicada na Onda P2
              // (novo status no store + ação marcarComoAtiva). Por ora a escolha é registrada em window
              // para o LeadModal/PropostaSheet consumir quando a nova proposta for salva.
              const marcarAtiva = window.confirm(
                "Deseja marcar esta nova proposta como proposta ativa do lead?\n\n" +
                "OK = a nova proposta nasce como ATIVA (as anteriores em aberto serão marcadas como SUBSTITUÍDAS na Onda P2).\n" +
                "Cancelar = a nova proposta nasce em aberto, sem alterar a proposta ativa atual.",
              );
              try { (window as any).__propostasMarcarAtiva = marcarAtiva; } catch { /* noop */ }
              novaProposta(lead);
            } else if (key === "cancelar_proposta") {
              if (!confirmarProcesso("Cancelar Proposta", "Comercial > Propostas Canceladas", "CANCELADA")) return;
              await executarCancelar();
            } else if (key === "reabrir_proposta") {
              if (!confirmarProcesso("Reabrir Proposta", "Comercial > Propostas em Negociação", "EM NEGOCIAÇÃO")) return;
              await executarReabrir();
            }
          }}

          onAction={(a) => {
            if (a === "novo") {
              novaProposta();
            } else if (a === "editar") {
              const p = getPropostaAtiva();
              if (!p) { toast.info("Selecione uma proposta na tabela."); return; }
              // D18.4: mesma trava do "editar_cliente" — proposta histórica é somente leitura.
              const bloqueadosEdit = ["APROVADA", "ASSINADA", "CONTRATADA", "CANCELADA", "REPROVADA", "RECUSADA", "VENCIDA", "SUBSTITUIDA", "EXPIRADA"];
              if (bloqueadosEdit.includes(String(p.status).toUpperCase())) {
                toast.error(
                  `Proposta ${p.status} é documento histórico e não permite edição. Gere nova proposta ou ajuste o cadastro no Cliente/Contrato.`,
                );
                return;
              }
              // Edição inline pela barra = SOMENTE dados do cliente (nome/CPF/endereço/contato).
              // Para editar a proposta inteira, abrir pelo botão "Visualizar/Editar proposta" da linha.
              setEditandoCliente(p);
            } else if (a === "duplicar") {
              const p = getPropostaAtiva();
              if (p) duplicarProposta(p);
            } else if (a === "excluir") {
              const p = getPropostaAtiva();
              if (p) excluirProposta(p);
            } else if (a === "atualizar") {
              void refreshPropostas();
              toast.info("Lista de propostas atualizada.");
            } else if (a === "exportar") {
              // CSV das propostas atualmente visíveis (snapshot completo)
              try {
                const visiveis = (window as any).__propostasVisiveis as PropostaFV[] | undefined;
                const linhas = (Array.isArray(visiveis) && visiveis.length ? visiveis : propostas);
                const header = [
                  "numero","status","cliente","consultor","cidade","uf",
                  "potencia_kwp","modulos_qtd","valor_final","criado_em","atualizado_em","validade",
                ];
                const SEP = ";";
                const esc = (v: any) => {
                  if (v == null) return "";
                  const s = String(v).replace(/"/g, '""');
                  return /["\n;]/.test(s) ? `"${s}"` : s;
                };
                const linhasCsv = linhas.map((p) => {
                  const pr = calcPrecificacao(p);
                  return [
                    p.numero, p.status, p.clienteNome ?? "", p.consultor ?? "",
                    p.cidade ?? "", (p as any).uf ?? "",
                    (p as any).potenciaKwp ?? (p as any).potencia ?? "",
                    (p as any).modulos?.length ?? (p as any).qtdModulos ?? "",
                    pr.valorFinal ?? "",
                    p.criadoEm, p.atualizadoEm, (p as any).validade ?? "",
                  ].map(esc).join(SEP);
                });
                const csv = [header.join(SEP), ...linhasCsv].join("\r\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a2 = document.createElement("a");
                a2.href = url;
                a2.download = `propostas-${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a2); a2.click(); a2.remove();
                URL.revokeObjectURL(url);
                toast.success(`Exportado ${linhas.length} proposta(s) em CSV.`);
              } catch (e: any) {
                toast.error(e?.message ?? "Falha ao exportar.");
              }
            } else if (a === "imprimir") {
              const p = getPropostaAtiva();
              if (p) {
                setVendoId(p.id);
                // dispara print após o sheet montar
                setTimeout(() => { try { window.print(); } catch { /* noop */ } }, 700);
              } else {
                toast.info("Selecione uma proposta para imprimir.");
              }
            } else if (a === "enviar") {
              toast.info("Envio por e-mail/WhatsApp chega em D27.COM.6.");
            } else if (a === "anexos") {
              const p = getPropostaAtiva();
              if (p) setAnexosOpen(true);
            } else if (a === "historico" || a === "auditoria") {
              const p = getPropostaAtiva();
              if (!p) return;
              setHistoricoOpen(true);
            } else if (a === "favoritos") {
              toast.info("Favoritos por usuário chegam em D27.COM.5.");
            } else if (a === "colunas") {
              const open = (window as any).__propostasOpenColunas;
              if (typeof open === "function") open();
              else toast.info("Use o menu de filtros da lista abaixo.");
            } else if (a === "filtroAvancado" || a === "filtroRapido") {
              const open = (window as any).__propostasOpenFilters;
              if (typeof open === "function") open();
              else {
                const inp = document.querySelector<HTMLInputElement>("[data-propostas-search]");
                if (inp) { inp.scrollIntoView({ behavior: "smooth", block: "center" }); inp.focus(); }
                else toast.info("Use a busca/filtro da lista abaixo.");
              }
            }
          }}
          statusActions={(() => {
            const hasSelectedLead = !!propostaSelecionada;
            const r = ribbonState;
            return [
              {
                key: "novoLead",
                label: "Nova Proposta",
                icon: Plus,
                tone: "info" as const,
                wide: true,
                disabled: hasSelectedLead,
                disabledReason: "Desmarque o lead para criar uma nova proposta.",
                onClick: () => novaProposta(),
              },
              {
                key: "aprovar",
                label: "Aprovar Proposta",
                icon: CheckCircle2,
                tone: "success" as const,
                ...r.aprovar,
              },
              {
                key: "reprovar",
                label: "Reprovar Proposta",
                icon: XCircle,
                tone: "danger" as const,
                ...r.reprovar,
              },
              {
                key: "gerarNovaProposta",
                label: "Gerar Nova Proposta",
                icon: Copy,
                tone: "warning" as const,
                wide: true,
                disabled: !hasSelectedLead,
                disabledReason: "Flegue exatamente 1 lead para gerar nova proposta.",
                onClick: () => {
                  const sel = (window as any).__propostasSelectedLead;
                  const lead = typeof sel === "function" ? sel() : propostaSelecionada;
                  if (!lead) { toast.info("Flegue 1 lead na lista abaixo."); return; }
                  novaProposta(lead);
                },
              },
              {
                key: "cancelar",
                label: "Cancelar Proposta",
                icon: XCircle,
                tone: "danger" as const,
                ...r.cancelar,
              },
              {
                key: "reabrir",
                label: "Reabrir Proposta",
                icon: Undo2,
                tone: "warning" as const,
                ...r.reabrir,
              },
            ];
          })()}
          layoutBar={layoutBarRm({
            density,
            onDensityChange: (d) => setDensity(d),
            currentPreset: layoutPreset,
            presets: [
              { key: "padrao",      label: "Padrão" },
              { key: "compacto",    label: "Compacto" },
              { key: "confortavel", label: "Confortável" },
              { key: "espacoso",    label: "Espaçoso" },
            ],
            onPresetChange: (k) => {
              setLayoutPreset(k);
              if (k === "compacto") setDensity("compact");
              else if (k === "confortavel") setDensity("comfortable");
              else if (k === "espacoso") setDensity("spacious");
              else setDensity("compact");
            },
          })}
        />

      </div>

      <div className={`mt-5 ${densityClass}`}>
        <PropostaList
          propostas={propostas}
          onEditar={setEditando}
          onVisualizar={(id) => setVendoId(id)}
          onNova={novaProposta}
          onSelecionarUltima={(id) => setSelecionadaId(id)}
        />
      </div>


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

      {editandoCliente && (
        <EditarDadosClienteDialog
          proposta={editandoCliente}
          onClose={() => setEditandoCliente(null)}
          onSaved={() => { setEditandoCliente(null); void refreshPropostas(); }}
        />
      )}
      {propostaVisualizada && (
        <PropostaImpressao proposta={propostaVisualizada} onClose={() => setVendoId(null)} />
      )}

      {propostaSelecionada && (
        <AttachmentDialog
          open={anexosOpen}
          onOpenChange={setAnexosOpen}
          entidade="propostas"
          entidadeId={propostaSelecionada.id}
          titulo={`Anexos · Proposta ${propostaSelecionada.numero}`}
          descricao={propostaSelecionada.clienteNome}
          categoriaPadrao="orcamento"
        />
      )}

      {propostaSelecionada && (
        <ModuloHistoricoDrawer
          open={historicoOpen}
          onOpenChange={setHistoricoOpen}
          titulo={`Histórico · Proposta ${propostaSelecionada.numero}`}
          descricao={propostaSelecionada.clienteNome}
          entidade="proposta"
          entidadeId={propostaSelecionada.id}
        />
      )}

      <AprovarPropostaDialog
        proposta={propostaParaAprovarId ? propostas.find((p) => p.id === propostaParaAprovarId) ?? null : propostaSelecionada}
        open={aprovarOpen}
        onOpenChange={(o) => { setAprovarOpen(o); if (!o) setPropostaParaAprovarId(null); }}
        onAprovado={() => {
          const id = propostaParaAprovarId ?? propostaSelecionada?.id ?? null;
          void syncComercialState(id);
          toast.success("Contrato criado em Pendentes. Abra Comercial → Contratos para gerar.", { duration: 5000 });
        }}
      />

      <Dialog open={selecionarAprovarOpen} onOpenChange={setSelecionarAprovarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qual proposta aprovar?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Este cliente tem mais de uma proposta em aberto. Selecione a versão que será aprovada.
            As demais permanecerão inalteradas.
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {candidatasAprovacao.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left rounded-md border border-border bg-card hover:bg-accent px-3 py-2 transition"
                onClick={() => {
                  setSelecionarAprovarOpen(false);
                  setPropostaParaAprovarId(p.id);
                  setAprovarOpen(true);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{p.numero}</div>
                  <Badge variant={statusVariant(p.status)} className="text-[10px]">{p.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {p.modulosQtd} mód · {(p.modulosQtd * (p.moduloPotenciaWp / 1000)).toFixed(2)} kWp · {fmtBRL(p.valorFinalManual ?? calcPrecificacao(p).valorFinal ?? 0)}
                </div>
                <div className="text-[11px] text-muted-foreground">Atualizada em {p.atualizadoEm}</div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelecionarAprovarOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* =========================== LEAD MODAL =========================== */

const ORIGENS_KEY = "ms.fv.origens-captacao.v1";
const ORIGENS_DEFAULT = ["INDICAÇÃO", "REDE SOCIAL", "CONHECIDO", "SITE", "ANÚNCIO", "EVENTO"];
function loadOrigens(): string[] {
  try {
    const raw = localStorage.getItem(ORIGENS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return ORIGENS_DEFAULT;
}
function saveOrigens(list: string[]) {
  try { localStorage.setItem(ORIGENS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function LeadModal({
  proposta, onCancel, onContinuar,
}: {
  proposta: PropostaFV;
  onCancel: () => void;
  onContinuar: (p: PropostaFV) => void;
}) {
  const consultores = useConsultoresAtivos();
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">(proposta.tipoPessoa ?? "PF");
  const [nome, setNome] = useState(proposta.clienteNome ?? "");
  const [doc, setDoc] = useState(formatDoc(proposta.clienteDoc ?? "", proposta.tipoPessoa ?? "PF"));
  const [telefone, setTelefone] = useState(formatTelefoneBR(proposta.clienteTelefone ?? ""));
  const [consultor, setConsultor] = useState(proposta.consultor ?? "");
  const [endereco, setEndereco] = useState(proposta.clienteEndereco ?? "");
  const [origens, setOrigens] = useState<string[]>(() => loadOrigens());
  const [captacao, setCaptacao] = useState(proposta.origemCaptacao ?? "");
  const [novaOrigem, setNovaOrigem] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [novaOrigemOpen, setNovaOrigemOpen] = useState(false);
  const [encontrado, setEncontrado] = useState<ClienteSnapshot | null>(null);

  // Quando vem com dados preenchidos (gerar nova proposta a partir de um lead
  // existente), os campos ficam travados. O bloqueio é definido pelos valores
  // iniciais — digitar não trava o campo. O usuário clica no X para liberar.
  const initial = useRef({
    nome: !!(proposta.clienteNome ?? "").trim(),
    doc: !!(proposta.clienteDoc ?? "").trim(),
    telefone: !!(proposta.clienteTelefone ?? "").trim(),
    consultor: !!(proposta.consultor ?? "").trim(),
    captacao: !!(proposta.origemCaptacao ?? "").trim(),
    endereco: !!(proposta.clienteEndereco ?? "").trim(),
  }).current;
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const isLocked = (field: string, _value?: string) =>
    !unlocked[field] && !!(initial as Record<string, boolean>)[field];
  const unlock = (field: string) =>
    setUnlocked((u) => ({ ...u, [field]: true }));

  const upper = (v: string) => v.toUpperCase();

  function adicionarOrigem() {
    const t = upper(novaOrigem.trim());
    if (!t) return;
    const next = Array.from(new Set([...origens, t]));
    setOrigens(next); saveOrigens(next);
    setCaptacao(t);
    setNovaOrigem(""); setNovaOrigemOpen(false);
  }

  function buscarExistente() {
    const snap = buscarClienteExistente({ doc, nome });
    if (!snap) {
      toast.message("Nenhum cadastro anterior encontrado.");
      return;
    }
    setEncontrado(snap);
    if (snap.tipoPessoa) setTipoPessoa(snap.tipoPessoa);
    if (snap.clienteNome) setNome(snap.clienteNome);
    if (snap.clienteDoc) setDoc(formatDoc(snap.clienteDoc, snap.tipoPessoa));
    if (snap.clienteTelefone) setTelefone(formatTelefoneBR(snap.clienteTelefone));
    const end = [snap.clienteRua, snap.clienteNumero, snap.clienteBairro, snap.clienteCidade]
      .filter(Boolean).join(", ");
    if (end) setEndereco(end.toUpperCase());
    toast.success(`Cadastro reaproveitado da proposta ${snap.origemPropostaNumero}.`);
  }

  function continuar() {
    if (!nome.trim() || !telefone.trim() || !consultor.trim()) {
      toast.error("Preencha Nome, Telefone e selecione um Consultor.");
      return;
    }
    if (!captacao.trim()) {
      toast.error("Selecione a forma de captação do lead.");
      return;
    }
    const tel = telefone.replace(/\D/g, "");
    if (tel.length < 10 || tel.length > 11) {
      toast.error("Telefone inválido. Use DDD + número (10 ou 11 dígitos).");
      return;
    }
    // CPF/CNPJ é opcional no cadastro inicial — só valida se foi preenchido.
    if (doc.trim() && !isDocValido(doc, tipoPessoa)) {
      toast.error(
        tipoPessoa === "PF"
          ? "CPF inválido. Informe 11 dígitos."
          : "CNPJ inválido. Informe 14 dígitos.",
      );
      return;
    }
    onContinuar({
      ...proposta,
      tipoPessoa,
      clienteNome: upper(nome.trim()),
      clienteDoc: doc.trim(),
      clienteTelefone: formatTelefoneBR(telefone),
      consultor: upper(consultor.trim()),
      clienteEndereco: endereco.trim() ? upper(endereco.trim()) : "",
      // se reaproveitou cadastro existente, copia o endereço estruturado
      clienteCep: encontrado?.clienteCep ?? proposta.clienteCep,
      clienteRua: encontrado?.clienteRua ?? proposta.clienteRua,
      clienteNumero: encontrado?.clienteNumero ?? proposta.clienteNumero,
      clienteComplemento: encontrado?.clienteComplemento ?? proposta.clienteComplemento,
      clienteBairro: encontrado?.clienteBairro ?? proposta.clienteBairro,
      clienteCidade: encontrado?.clienteCidade ?? proposta.clienteCidade,
      clienteUf: encontrado?.clienteUf ?? proposta.clienteUf,
      clienteEmail: encontrado?.clienteEmail ?? proposta.clienteEmail,
      origemCaptacao: captacao,
      criadoPor: upper(consultor.trim()),
    });
  }

  /** Renderiza o botão X que aparece quando o campo está travado. */
  const LockX = ({ field }: { field: string }) => (
    <button
      type="button"
      onClick={() => unlock(field)}
      title="Liberar edição"
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <XIcon className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Cadastrar Lead</DialogTitle>
                <p className="text-xs text-muted-foreground">Proposta <span className="font-mono font-semibold text-primary">{proposta.numero}</span></p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div>
              <Label className="text-xs">Tipo de pessoa *</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipoPessoa === "PF" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTipoPessoa("PF"); setDoc(formatDoc(doc, "PF")); }}
                  className="h-9"
                >
                  Pessoa Física (CPF)
                </Button>
                <Button
                  type="button"
                  variant={tipoPessoa === "PJ" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTipoPessoa("PJ"); setDoc(formatDoc(doc, "PJ")); }}
                  className="h-9"
                >
                  Pessoa Jurídica (CNPJ)
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">{tipoPessoa === "PF" ? "Nome completo" : "Razão social"} *</Label>
              <div className="relative mt-1.5">
                <Input
                  value={nome}
                  onChange={(e) => setNome(upper(e.target.value))}
                  placeholder={tipoPessoa === "PF" ? "NOME COMPLETO" : "RAZÃO SOCIAL"}
                  disabled={isLocked("nome", nome)}
                  className={isLocked("nome", nome) ? "pr-8 bg-muted/50" : ""}
                />
                {isLocked("nome", nome) && <LockX field="nome" />}
              </div>
            </div>
            <div>
              <Label className="text-xs">{tipoPessoa === "PF" ? "CPF" : "CNPJ"} <span className="text-muted-foreground font-normal">(opcional — exigido na aprovação)</span></Label>
              <div className="relative mt-1.5 flex gap-2">
                <Input
                  value={doc}
                  onChange={(e) => setDoc(formatDoc(e.target.value, tipoPessoa))}
                  placeholder={tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                  inputMode="numeric"
                  maxLength={tipoPessoa === "PF" ? 14 : 18}
                  disabled={isLocked("doc", doc)}
                  className={isLocked("doc", doc) ? "pr-8 bg-muted/50 flex-1" : "flex-1"}
                />
                {isLocked("doc", doc) && <LockX field="doc" />}
                <Button type="button" variant="outline" size="sm" onClick={buscarExistente} title="Buscar cadastro existente por CPF/CNPJ ou Nome">
                  Buscar cadastro
                </Button>
              </div>
              {encontrado && (
                <div className="mt-1.5 rounded border border-primary/30 bg-primary/5 p-2 text-[11px] text-primary">
                  Cadastro reaproveitado da proposta <strong>{encontrado.origemPropostaNumero}</strong>.
                  Endereço completo poderá ser revisado ao aprovar a proposta.
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Telefone *</Label>
              <div className="relative mt-1.5">
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(formatTelefoneBR(e.target.value))}
                  placeholder="(00) 9 0000-0000"
                  inputMode="numeric"
                  maxLength={20}
                  disabled={isLocked("telefone", telefone)}
                  className={isLocked("telefone", telefone) ? "pr-8 bg-muted/50" : ""}
                />
                {isLocked("telefone", telefone) && <LockX field="telefone" />}
              </div>
            </div>
            <div>
              <Label className="text-xs">Consultor de venda *</Label>
              <div className="mt-1.5">
              {isLocked("consultor", consultor) ? (
                <div className="relative">
                  <Input value={consultor} disabled className="pr-8 bg-muted/50" />
                  <LockX field="consultor" />
                </div>
              ) : (
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
              )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Forma de captação *</Label>
              <div className="mt-1.5">
              {isLocked("captacao", captacao) ? (
                <div className="relative">
                  <Input value={captacao} disabled className="pr-8 bg-muted/50" />
                  <LockX field="captacao" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={captacao} onValueChange={setCaptacao}>
                      <SelectTrigger><SelectValue placeholder="Como conheceu?" /></SelectTrigger>
                      <SelectContent>
                        {origens.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Popover open={novaOrigemOpen} onOpenChange={setNovaOrigemOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="h-3 w-3 mr-1" /> Novo
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="end">
                      <Label className="text-xs">Nova forma de captação</Label>
                      <Input
                        value={novaOrigem}
                        onChange={(e) => setNovaOrigem(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && adicionarOrigem()}
                        placeholder="EX.: WHATSAPP"
                        className="mt-1 h-8"
                        autoFocus
                      />
                      <Button size="sm" className="mt-2 w-full" onClick={adicionarOrigem}>Adicionar</Button>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Endereço (opcional)</Label>
              <div className="relative mt-1.5">
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(upper(e.target.value))}
                  placeholder="RUA, NÚMERO, BAIRRO, CIDADE"
                  disabled={isLocked("endereco", endereco)}
                  className={isLocked("endereco", endereco) ? "pr-8 bg-muted/50" : ""}
                />
                {isLocked("endereco", endereco) && <LockX field="endereco" />}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-3">
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>Voltar</Button>
            <Button onClick={continuar} className="bg-primary text-primary-foreground">Salvar cliente</Button>
          </DialogFooter>
        </div>
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
      <DialogContent className="sm:max-w-sm max-h-[92vh] overflow-y-auto">
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
  const cfg = usePropostaConfig();

  const dim = calcDimensionamento(p);
  const pre = calcPrecificacao(p);
  const res = calcResultado(p);
  const potTotalInv = potenciaInversores(p, inversores);
  const comissaoPolicy = useComissaoPolicy();
  const comissao = calcularComissao(p.parametroPorKwp || 0, pre.valorFinal, pre.valorBruto, comissaoPolicy, dim.potenciaFinalKwp);

  // sincroniza qtd final em modulosQtd
  useEffect(() => {
    if (p.modulosQtd !== dim.qtdFinal) update("modulosQtd", dim.qtdFinal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim.qtdFinal]);

  // tarifa de energia: sempre travada na config global
  useEffect(() => {
    if (p.tarifa !== cfg.tarifaPadraoKwh) update("tarifa", cfg.tarifaPadraoKwh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.tarifaPadraoKwh]);

  // sugere inversores automaticamente quando muda qtd ou potência do módulo
  useEffect(() => {
    const sug = sugerirInversoresAuto(dim.qtdFinal, p.moduloPotenciaWp, cfg.inversorMultBaixa, cfg.inversorMultAlta);
    const novos = sug.map((s) => ({ inversorId: inversorIdPadrao(s.potKw), quantidade: s.quantidade }));
    const sameLen = novos.length === p.inversores.length;
    const sameAll = sameLen && novos.every((n, i) =>
      n.inversorId === p.inversores[i].inversorId && n.quantidade === p.inversores[i].quantidade);
    if (!sameAll) update("inversores", novos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim.qtdFinal, p.moduloPotenciaWp, cfg.inversorMultBaixa, cfg.inversorMultAlta]);

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
    setP((cur) => aplicarCidadeNaProposta(cur, c, false));
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
    // Onda P2 — Governança Enterprise: se o usuário pediu para marcar como ativa
    // ao gerar nova proposta, aplica SUBSTITUIDA nas demais propostas em aberto do lead.
    try {
      const marcar = (window as any).__propostasMarcarAtiva;
      if (marcar === true && final.leadId) {
        marcarPropostaAtivaDoLead(
          final.id,
          final.criadoPor ?? "usuário",
          `Nova proposta ${final.numero} marcada como ativa do lead.`,
        );
      }
      (window as any).__propostasMarcarAtiva = undefined;
    } catch { /* noop */ }
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
          {erros.length > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <div><strong>Faltam:</strong> {erros.join(", ")}.</div>
            </div>
          )}
        </SheetHeader>

        <div className="space-y-4 pt-4">
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
                  <CidadeCombobox cidades={cidades} onSelect={selecionarCidade} />
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
              <Field label="Parâmetro de irradiação (kWh/kWp·mês)" hint="Travado. Base real corrigida da cidade — edite em Cadastros → Cidades.">
                <Input
                  type="number"
                  step="0.1"
                  value={p.irradiacaoMedia}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
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
              <Field label="Tarifa de energia (R$/kWh)" hint="Travada. Edite em Configurações → Proposta.">
                <Input
                  type="number"
                  step="0.000001"
                  value={cfg.tarifaPadraoKwh}
                  readOnly
                  disabled
                  className="bg-muted/50"
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
              <ReadOnlyField label="kWp necessário" value={fmtNum(dim.potenciaNecKwp, 2)} />
              <ReadOnlyField label="Quantidade calculada (arred.)" value={String(dim.qtdCalc)} />
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
          </Bloco>

          {/* BLOCO 6 — Módulo */}
          <Bloco icon={<Sun className="h-4 w-4" />} title="6. Módulo Fotovoltaico" badge={`${fmtNum(dim.areaTotal,2)} m²`}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Potência (Wp)"><Input type="number" value={p.moduloPotenciaWp} onChange={(e) => update("moduloPotenciaWp", +e.target.value)} /></Field>
              <Field label="Marca">
                <MarcaCombobox
                  value={p.moduloMarca ?? ""}
                  onChange={(v) => update("moduloMarca", v)}
                  onCreateNew={(v) => {
                    const marca = v.trim().toUpperCase();
                    if (!marca) return;
                    if (modulos.some((m) => (m.marca || "").trim().toUpperCase() === marca)) return;
                    upsertModuloFV({
                      id: `MOD-MARCA-${marca.replace(/\s+/g, "_")}-${Date.now().toString(36)}`,
                      marca,
                      modelo: "(NOVA MARCA)",
                      potenciaWp: 0,
                      larguraM: 0,
                      alturaM: 0,
                      ativo: true,
                    });
                    toast.success(`Marca de módulo "${marca}" cadastrada.`);
                  }}
                  options={modulos.map((m) => m.marca)}
                  placeholder="Selecione ou digite..."
                />
              </Field>
              <ReadOnlyField label="Quantidade" value={String(dim.qtdFinal)} />
              <ReadOnlyField label="Área total (m²)" value={fmtNum(dim.areaTotal, 2)} />
            </div>
          </Bloco>

          {/* BLOCO 6.1 — Inversores (sugestão automática) */}
          <Bloco icon={<Wrench className="h-4 w-4" />} title="6.1 Inversores (sugestão automática)" badge={`${fmtNum(potTotalInv,1)} kW`}>
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <Field label="Marca dos inversores">
                <MarcaCombobox
                  value={p.inversorMarca ?? ""}
                  onChange={(v) => update("inversorMarca", v)}
                  onCreateNew={(v) => {
                    const marca = v.trim().toUpperCase();
                    if (!marca) return;
                    if (inversores.some((i) => (i.marca || "").trim().toUpperCase() === marca)) return;
                    upsertInversorFV({
                      id: `INV-MARCA-${marca.replace(/\s+/g, "_")}-${Date.now().toString(36)}`,
                      marca,
                      modelo: "(NOVA MARCA)",
                      potenciaKw: 0,
                      tipo: "STRING",
                      garantia: 10,
                      ativo: true,
                    });
                    toast.success(`Marca de inversor "${marca}" cadastrada.`);
                  }}
                  options={inversores.map((i) => i.marca)}
                  placeholder="Selecione ou digite..."
                />
              </Field>
              <div className="flex items-end justify-end">
                <Button variant="outline" size="sm" onClick={() => {
                  const sug = sugerirInversoresAuto(dim.qtdFinal, p.moduloPotenciaWp, cfg.inversorMultBaixa, cfg.inversorMultAlta);
                  update("inversores", sug.map((s) => ({ inversorId: inversorIdPadrao(s.potKw), quantidade: s.quantidade })));
                  toast.success("Inversores sugeridos automaticamente.");
                }}><Sparkles className="mr-1 h-3 w-3" /> Sugerir novamente</Button>
              </div>
            </div>
            <div className="mb-2 text-xs text-muted-foreground">
              Sugestão para <strong>{dim.qtdFinal}</strong> módulo(s) de <strong>{p.moduloPotenciaWp}W</strong>. Edite livremente cada linha.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[0,1,2,3,4].map((idx) => {
                // expande pelas quantidades: cada inversor sugerido vira N slots
                const flat: string[] = [];
                p.inversores.forEach((e) => {
                  for (let i = 0; i < (e.quantidade || 0) && flat.length < 5; i++) flat.push(e.inversorId);
                });
                const slotId = flat[idx] ?? "";
                const slotLabel = (() => {
                  if (!slotId) return "";
                  // Sempre exibir apenas o número (ex.: "75", "37,5").
                  const m = /INV-STD-(.+)$/i.exec(slotId);
                  if (m) return m[1].replace("_", ",");
                  const inv = inversores.find((i) => i.id === slotId);
                  if (inv?.potenciaKw) {
                    const kw = inv.potenciaKw;
                    return Number.isInteger(kw) ? String(kw) : String(kw).replace(".", ",");
                  }
                  return inv?.modelo ?? "";
                })();
                const setSlot = (newId: string) => {
                  const arr: string[] = [];
                  p.inversores.forEach((e) => {
                    for (let i = 0; i < (e.quantidade || 0) && arr.length < 5; i++) arr.push(e.inversorId);
                  });
                  while (arr.length < 5) arr.push("");
                  arr[idx] = newId;
                  const agg = new Map<string, number>();
                  arr.filter(Boolean).forEach((id) => agg.set(id, (agg.get(id) ?? 0) + 1));
                  update("inversores", Array.from(agg.entries()).map(([inversorId, quantidade]) => ({ inversorId, quantidade })));
                };
                // Opções: apenas os números (kW) dos inversores padrão + modelos custom.
                const opcoes = [
                  ...STANDARD_INVERSOR_KW.map((kw) => (Number.isInteger(kw) ? String(kw) : String(kw).replace(".", ","))),
                  ...inversores.filter((i) => !i.id.startsWith("INV-STD-")).map((i) => i.modelo),
                ];
                return (
                  <Field key={idx} label={`Inversor ${idx + 1}`}>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <MarcaCombobox
                          value={slotLabel}
                          onChange={(v) => {
                            if (!v.trim()) { setSlot(""); return; }
                            const id = ensureInversorByLabel(v, p.inversorMarca ?? "", inversores);
                            setSlot(id);
                          }}
                          options={opcoes}
                          placeholder="—"
                        />
                      </div>
                      {slotId && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setSlot("")} title="Limpar">
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Field>
                );
              })}
            </div>
          </Bloco>

          {/* BLOCO 7 — Precificação */}
          <Bloco icon={<DollarSign className="h-4 w-4" />} title="7. Precificação" badge={fmtBRL(pre.valorFinal)}>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-end justify-between gap-3">
                <Label className="text-xs">Parâmetro (R$/kWp)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="10"
                    className="h-8 w-32 text-right"
                    value={p.parametroPorKwp}
                    onChange={(e) => update("parametroPorKwp", +e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">R$/kWp</span>
                </div>
              </div>
              <Slider
                className="mt-3"
                min={1500}
                max={6000}
                step={10}
                value={[Math.min(6000, Math.max(1500, p.parametroPorKwp || 1500))]}
                onValueChange={(v) => update("parametroPorKwp", v[0])}
              />
              <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
                <span>R$ 1.500</span>
                <span>Arraste para ajustar o preço por kWp</span>
                <span>R$ 6.000</span>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Desconto (R$)"><Input type="number" step="0.01" value={p.descontoValor} onChange={(e) => update("descontoValor", +e.target.value)} /></Field>
              <ReadOnlyField label="Valor bruto" value={fmtBRL(pre.valorBruto)} />
              <ReadOnlyField label="Parâmetro real (R$/kWp)" value={fmtBRL(pre.parametroReal)} />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-success/30 bg-success/10 p-3">
              <div className="text-xs">
                <div className="font-semibold text-foreground">Comissão prevista do consultor</div>
                <div className="text-muted-foreground">
                  Faixa aplicada: até {fmtBRL(comissao.percentual === comissaoPolicy.percentualAcima
                    ? (comissaoPolicy.faixas[comissaoPolicy.faixas.length - 1]?.ateParametro ?? 0)
                    : (comissaoPolicy.faixas.find((f) => (p.parametroPorKwp || 0) <= f.ateParametro)?.ateParametro ?? 0))} R$/kWp
                  {" · "}base {comissaoPolicy.base === "VALOR_BRUTO" ? "valor bruto" : "valor final"}
                  {" · "}<Link to="/configuracoes" hash="tab=comissionamento" className="underline">editar política</Link>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold text-success">{fmtBRL(comissao.valor)}</div>
                <div className="text-[11px] text-muted-foreground">{fmtNum(comissao.percentual, 2)}% sobre {fmtBRL(comissao.base)}</div>
              </div>
            </div>
          </Bloco>

          {/* BLOCO 8 — Custos */}
          <Bloco icon={<Calculator className="h-4 w-4" />} title="8. Composição de Custos" badge={fmtBRL(res.custoTotal)}>
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

          {/* BLOCO 9 — Resultado */}
          <Bloco icon={<DollarSign className="h-4 w-4" />} title="9. Resultado e Margem">
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

          {/* BLOCO 10 — Observações */}
          <Bloco icon={<FileText className="h-4 w-4" />} title="10. Observações">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Observações internas (não aparecem na proposta)">
                <Textarea rows={4} value={p.obsInternas ?? ""} onChange={(e) => update("obsInternas", e.target.value)} />
              </Field>
              <Field label="Observações para o cliente">
                <Textarea rows={4} value={p.obsCliente ?? ""} onChange={(e) => update("obsCliente", e.target.value)} />
              </Field>
            </div>
          </Bloco>

          {/* BLOCO 11 — Validade */}
          <Bloco icon={<FileText className="h-4 w-4" />} title="11. Validade da Proposta">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Validade da proposta">
                <Input type="date" value={p.validade} onChange={(e) => update("validade", e.target.value)} />
              </Field>
            </div>
          </Bloco>
        </div>

        <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-end gap-2 border-t bg-background px-6 py-3">
          <Button size="sm" variant="outline" className="gap-1" onClick={onClose}>
            <XCircle className="h-4 w-4" /> Cancelar
          </Button>
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

/* =========================== EDITAR DADOS DO CLIENTE (propostas) =========================== */
/**
 * Diálogo enxuto para editar APENAS dados cadastrais do cliente vinculado à proposta
 * (nome, CPF/CNPJ, contato, endereço). NÃO altera kit, valores ou status da proposta.
 */
function EditarDadosClienteDialog({
  proposta,
  onClose,
  onSaved,
}: {
  proposta: PropostaFV;
  onClose: () => void;
  onSaved: () => void;
}) {
  const consultoresAtivos = useConsultoresAtivos();
  const [nome, setNome] = useState(proposta.clienteNome ?? "");
  const [consultor, setConsultor] = useState(proposta.consultor ?? "");
  const [doc, setDoc] = useState(proposta.clienteDoc ?? "");
  const [telefone, setTelefone] = useState(proposta.clienteTelefone ?? "");
  const [email, setEmail] = useState(proposta.clienteEmail ?? "");
  const [cep, setCep] = useState(proposta.clienteCep ?? "");
  const [rua, setRua] = useState(proposta.clienteRua ?? "");
  const [numero, setNumero] = useState(proposta.clienteNumero ?? "");
  const [complemento, setComplemento] = useState(proposta.clienteComplemento ?? "");
  const [bairro, setBairro] = useState(proposta.clienteBairro ?? "");
  const [cidade, setCidade] = useState(proposta.clienteCidade ?? "");
  const [uf, setUf] = useState(proposta.clienteUf ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) { toast.error("Nome do cliente é obrigatório."); return; }
    setSalvando(true);
    try {
      await upsertProposta({
        ...proposta,
        clienteNome: nome.trim(),
        consultor: consultor.trim() || undefined,
        clienteDoc: doc.trim() || undefined,
        clienteTelefone: telefone.trim() || undefined,
        clienteEmail: email.trim() || undefined,
        clienteCep: cep.trim() || undefined,
        clienteRua: rua.trim() || undefined,
        clienteNumero: numero.trim() || undefined,
        clienteComplemento: complemento.trim() || undefined,
        clienteBairro: bairro.trim() || undefined,
        clienteCidade: cidade.trim() || undefined,
        clienteUf: uf.trim().toUpperCase() || undefined,
        atualizadoEm: new Date().toISOString(),
      });
      toast.success("Dados do cliente atualizados.");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar dados do cliente.");
    } finally {
      setSalvando(false);
    }
  }

  // D18.4 — guard de governança: se a proposta já é histórica, dialog é somente leitura.
  const STATUS_LOCKED = ["APROVADA","ASSINADA","CONTRATADA","CANCELADA","REPROVADA","RECUSADA","VENCIDA","SUBSTITUIDA","EXPIRADA"];
  const statusUpper = String(proposta.status ?? "").toUpperCase();
  const isLocked = STATUS_LOCKED.includes(statusUpper);
  const lockedMsg = statusUpper === "CONTRATADA"
    ? "Esta proposta já gerou contrato e está bloqueada para edição. Alterações cadastrais devem ser feitas no Cliente ou no Contrato, conforme permissão."
    : statusUpper === "SUBSTITUIDA"
      ? "Esta proposta foi substituída por outra versão e está somente leitura."
      : statusUpper === "CANCELADA"
        ? "Esta proposta foi cancelada e está somente leitura."
        : `Proposta ${statusUpper} é documento histórico. Gere nova proposta ou ajuste o cadastro no objeto correto.`;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Editar dados do cliente · Proposta {proposta.numero}</span>
            {isLocked && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                {statusUpper}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLocked && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {lockedMsg}
          </div>
        )}
        <fieldset disabled={isLocked} className="contents">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Nome / Razão social *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Consultor responsável</Label>
            <Select value={consultor || "__none__"} onValueChange={(v) => setConsultor(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o consultor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sem consultor —</SelectItem>
                {consultoresAtivos.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                ))}
                {consultor && !consultoresAtivos.some((c) => c.nome === consultor) && (
                  <SelectItem value={consultor}>{consultor} (atual)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">CPF / CNPJ</Label>
            <Input value={doc} onChange={(e) => setDoc(e.target.value)} maxLength={20} />
          </div>
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={30} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label className="text-xs">CEP</Label>
            <Input value={cep} onChange={(e) => setCep(e.target.value)} maxLength={12} />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">Rua / Logradouro</Label>
            <Input value={rua} onChange={(e) => setRua(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label className="text-xs">Número</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={15} />
          </div>
          <div>
            <Label className="text-xs">Complemento</Label>
            <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label className="text-xs">Bairro</Label>
            <Input value={bairro} onChange={(e) => setBairro(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label className="text-xs">Cidade</Label>
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label className="text-xs">UF</Label>
            <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} maxLength={2} />
          </div>
        </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>{isLocked ? "Fechar" : "Cancelar"}</Button>
          {!isLocked && (
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar dados do cliente"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
