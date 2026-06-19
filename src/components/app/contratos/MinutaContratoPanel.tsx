/**
 * D18.18 — Editor multi-aba da Minuta do contrato (Supabase).
 *
 * Visível somente quando `etapa === "minuta"` (PENDENTE_REDACAO / MINUTA).
 * Abas internas: Contratante · Dados Contratuais · Forma de Pagamento ·
 * Cláusulas · Prévia.
 *
 * Persistência: tudo vive em `public.contratos.dados` (jsonb) +
 * colunas oficiais (forma_pagamento, valor_entrada, observacoes,
 * data_assinatura, possui_financiamento, financiamento_*).
 *
 * NÃO altera valor_total / potencia_kwp / modulos_qtde / inversor — esses
 * vêm da proposta origem. NÃO gera financeiro/engenharia (libera só após
 * assinatura via rpc_contrato_marcar_assinado).
 */
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileSignature, Save, FileCheck2, Ban, Loader2, AlertTriangle,
  Plus, Trash2, RotateCcw, Eye, FileText, Pencil, MinusCircle, BookmarkPlus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
  useGerarContratoFinal,
  useCancelarMinutaContrato,
} from "@/lib/repositories/comercial-processos-repo";
import { useQueryClient } from "@tanstack/react-query";
import { logError } from "@/lib/repositories/error-log-repo";
import {
  clausulasPadrao,
  substituirVariaveis, variaveisFaltando, valorPorExtenso,
  somaFormaPagamento, descricaoFormaPagamento, formaPagamentoVazia,
  temFinanciamento, sincronizarClausulasFinanciamento,
  FP_LABEL, FP_TIPOS_SELECIONAVEIS, BANCOS_FINANCIAMENTO,
  MOMENTO_LABEL, MOMENTO_OPCOES,
  renumerar, inserirItem, removerItem, alterarTextoItem,
  salvarTemplateUsuario, carregarTemplateUsuario, existeTemplateUsuario, limparTemplateUsuario,
  type Clausula, type ClausulaCategoria, type FormaPagamentoConfig,
  type FormaPagamentoTipo, type MomentoPagamento, type Variaveis,
} from "@/lib/contrato-clausulas-template";
import { usePropostas, useInversoresFV, type PropostaFV } from "@/modules/propostas/store";
import metaSunLogo from "@/assets/meta-sun-logo-v2.png.asset.json";
import metaSunRodape from "@/assets/meta-sun-rodape.png.asset.json";





type MinutaContrato = {
  id: string;
  codigo: string | null;
  status: string;
  valor_total: number;
  valor_entrada: number | null;
  observacoes: string | null;
  data_assinatura: string | null;
  forma_pagamento: string | null;
  possui_financiamento: boolean;
  financiamento_banco: string | null;
  financiamento_valor: number | null;
  dados: Record<string, unknown> | null;
  potencia_kwp?: number | null;
  modulos_qtde?: number | null;
};

type ClienteSnap = {
  nome?: string | null;
  doc?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  uf?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
};

type PropostaSnap = {
  id?: string | null;
  inversor?: string | null;
  potencia_kwp?: number | null;
  modulos_qtd?: number | null;
  dados?: Record<string, unknown> | null;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

// Numeral por extenso PT-BR (0..199 cobre uso real de módulos/inversores).
const _UN = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","catorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
const _DZ = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
function numeroExtensoPt(n: number): string {
  const x = Math.max(0, Math.floor(Number(n) || 0));
  if (x < 20) return _UN[x];
  if (x < 100) {
    const d = Math.floor(x / 10); const u = x % 10;
    return u === 0 ? _DZ[d] : `${_DZ[d]} e ${_UN[u]}`;
  }
  if (x === 100) return "cem";
  if (x < 200) {
    const resto = x - 100;
    return resto === 0 ? "cem" : `cento e ${numeroExtensoPt(resto)}`;
  }
  return String(x);
}
// Formata kWp em PT-BR (sem zeros sobrando: 9.3 -> "9,30"; 5 -> "5"; 6.5 -> "6,5").
function formatKwpPt(kw: number): string {
  const v = Number(kw);
  if (!Number.isFinite(v)) return "";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/0$/, "").replace(".", ",");
}

type DadosContratuais = {
  // Contratante editáveis (snapshot contratual, não cliente 360)
  contratante_tipo_pessoa?: "PF" | "PJ";
  contratante_nome?: string;
  contratante_doc?: string;
  /** RG do contratante PF (opcional). */
  contratante_rg?: string;
  /** Documento adicional opcional do PF: CNH, OAB, etc. (texto livre, ex.: "OAB/RO 12345"). */
  contratante_doc_extra?: string;
  contratante_telefone?: string;
  contratante_whatsapp?: string;
  contratante_email?: string;
  contratante_cep?: string;
  contratante_logradouro?: string;
  contratante_numero?: string;
  contratante_bairro?: string;
  contratante_complemento?: string;
  contratante_cidade?: string;
  contratante_uf?: string;
  /** Computado a partir de logradouro+numero+bairro+complemento (compat). */
  contratante_endereco?: string;
  // Representante legal (apenas quando contratante_tipo_pessoa = "PJ")
  repr_nome?: string;
  repr_cpf?: string;
  repr_rg?: string;
  repr_telefone?: string;
  // Dados contratuais
  responsavel_assinatura?: string;
  responsavel_cpf?: string;
  assinatura_email?: string;
  assinatura_telefone?: string;
  prazo_contratual_dias?: number;
  data_prevista_assinatura?: string;
  observacoes_internas?: string;
  observacoes_contrato?: string;
  local_assinatura?: string;
  data_base_contrato?: string;
  // Forma e cláusulas
  forma_pagamento_config?: FormaPagamentoConfig | null;
  clausulas?: Clausula[];
  endereco_instalacao?: string;
  prazo_execucao_dias?: number;
};

export function MinutaContratoPanel({
  contrato, cliente, proposta,
}: {
  contrato: MinutaContrato;
  cliente?: ClienteSnap | null;
  proposta?: PropostaSnap | null;
}) {
  const qc = useQueryClient();
  const permEditar = useHasPermission("comercial.contrato.editar_minuta");
  const permGerar = useHasPermission("comercial.contrato.gerar_minuta");
  const permCancelar = useHasPermission("comercial.contrato.cancelar");
  const gerar = useGerarContratoFinal();
  const cancelarMinuta = useCancelarMinutaContrato();

  const valorTotal = Number(contrato.valor_total) || 0;
  const dadosIni = useMemo<DadosContratuais>(() => {
    const d = (contrato.dados ?? {}) as Record<string, unknown>;
    return (d as DadosContratuais) ?? {};
  }, [contrato.dados]);

  // ---- Estado completo do formulário ----
  const [state, setState] = useState<DadosContratuais>(() => {
    const docDig = (dadosIni.contratante_doc ?? cliente?.doc ?? "").replace(/\D/g, "");
    const tipoInferido: "PF" | "PJ" =
      dadosIni.contratante_tipo_pessoa ?? (docDig.length === 14 ? "PJ" : "PF");
    return {
      contratante_tipo_pessoa: tipoInferido,
      contratante_nome: dadosIni.contratante_nome ?? cliente?.nome ?? "",
      contratante_doc: dadosIni.contratante_doc ?? cliente?.doc ?? "",
      contratante_rg: dadosIni.contratante_rg ?? "",
      contratante_doc_extra: dadosIni.contratante_doc_extra ?? "",
      contratante_telefone: dadosIni.contratante_telefone ?? cliente?.telefone ?? "",
      contratante_whatsapp: dadosIni.contratante_whatsapp ?? "",
      contratante_email: dadosIni.contratante_email ?? cliente?.email ?? "",
      contratante_cep: dadosIni.contratante_cep ?? "",
      contratante_logradouro: dadosIni.contratante_logradouro ?? cliente?.rua ?? "",
      contratante_numero: dadosIni.contratante_numero ?? cliente?.numero ?? "",
      contratante_bairro: dadosIni.contratante_bairro ?? cliente?.bairro ?? "",
      contratante_complemento: dadosIni.contratante_complemento ?? "",
      contratante_endereco: dadosIni.contratante_endereco ??
        [cliente?.rua, cliente?.numero, cliente?.bairro].filter(Boolean).join(", "),
      contratante_cidade: dadosIni.contratante_cidade ?? cliente?.cidade ?? "",
      contratante_uf: dadosIni.contratante_uf ?? cliente?.uf ?? "",
      repr_nome: dadosIni.repr_nome ?? "",
      repr_cpf: dadosIni.repr_cpf ?? "",
      repr_rg: dadosIni.repr_rg ?? "",
      repr_telefone: dadosIni.repr_telefone ?? "",
      responsavel_assinatura: dadosIni.responsavel_assinatura ?? "",
      responsavel_cpf: dadosIni.responsavel_cpf ?? "",
      assinatura_email: dadosIni.assinatura_email ?? cliente?.email ?? "",
      assinatura_telefone: dadosIni.assinatura_telefone ?? cliente?.telefone ?? "",
      prazo_contratual_dias: dadosIni.prazo_contratual_dias ?? 90,
      data_prevista_assinatura: dadosIni.data_prevista_assinatura ?? (contrato.data_assinatura ?? ""),
      observacoes_internas: dadosIni.observacoes_internas ?? "",
      observacoes_contrato: dadosIni.observacoes_contrato ?? (contrato.observacoes ?? ""),
      local_assinatura: dadosIni.local_assinatura ?? (cliente?.cidade ?? ""),
      data_base_contrato: dadosIni.data_base_contrato ?? new Date().toISOString().slice(0, 10),
      forma_pagamento_config: dadosIni.forma_pagamento_config ?? null,
      clausulas: dadosIni.clausulas ?? carregarTemplateUsuario() ?? clausulasPadrao(),
      endereco_instalacao: dadosIni.endereco_instalacao ?? "",
      prazo_execucao_dias: dadosIni.prazo_execucao_dias ?? 60,
    };
  });
  const [tab, setTab] = useState("contratante");
  const [salvando, setSalvando] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [gerarOpen, setGerarOpen] = useState(false);
  const [gerarObs, setGerarObs] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivoCancelar, setMotivoCancelar] = useState("");
  const [focoGerar, setFocoGerar] = useState(false);

  useEffect(() => { setDirty(false); }, [contrato.id]);

  // D18.19 — lê query oficial (?tab=previa&focus=gerar) e hash legado.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(raw);
      const sub = searchParams.get("tab") === "previa" ? "previa" : hashParams.get("minuta");
      const focus = searchParams.get("focus") ?? hashParams.get("focus");
      const ABAS = ["contratante", "pagamento", "clausulas", "previa"];
      if (sub && ABAS.includes(sub)) setTab(sub);
      if (focus === "gerar") {
        setTab((t) => (t === "previa" ? t : "previa"));
        setFocoGerar(true);
        // limpa o highlight depois de alguns segundos
        window.setTimeout(() => setFocoGerar(false), 4000);
      }
    };
    apply();
    const onHash = () => apply();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("lovable:hash-sync", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("lovable:hash-sync", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, [contrato.id]);

  function upd<K extends keyof DadosContratuais>(k: K, v: DadosContratuais[K]) {
    setState((s) => ({ ...s, [k]: v }));
    setDirty(true);
  }

  /** Endereço contratual reconstruído (compatibilidade com PDF/cláusulas). */
  const enderecoCompleto = useMemo(() => {
    const log = state.contratante_logradouro?.trim() ?? "";
    const num = state.contratante_numero?.trim() ?? "";
    const bairro = state.contratante_bairro?.trim() ?? "";
    const compl = state.contratante_complemento?.trim() ?? "";
    const cep = state.contratante_cep?.trim() ?? "";
    const linha1 = [log, num].filter(Boolean).join(", ");
    const linha2 = [bairro, compl].filter(Boolean).join(" — ");
    return [linha1, linha2, cep ? `CEP ${cep}` : ""].filter(Boolean).join(", ");
  }, [state.contratante_logradouro, state.contratante_numero, state.contratante_bairro, state.contratante_complemento, state.contratante_cep]);

  // mantém contratante_endereco em sincronia (cláusulas legadas referenciam ele)
  useEffect(() => {
    setState((s) => (s.contratante_endereco === enderecoCompleto ? s : { ...s, contratante_endereco: enderecoCompleto }));
  }, [enderecoCompleto]);

  // Cláusulas auto-geradas de FINANCIAMENTO (renegociação / liberação dos recursos)
  // são DERIVADAS — recomputadas a cada render conforme a forma de pagamento atual,
  // garantindo que apareçam imediatamente na prévia e sejam persistidas na geração.
  const hasFinanciamento = temFinanciamento(state.forma_pagamento_config);
  const clausulasEfetivas = useMemo(
    () => sincronizarClausulasFinanciamento(state.clausulas ?? [], hasFinanciamento),
    [state.clausulas, hasFinanciamento],
  );


  /** Busca endereço via ViaCEP e preenche logradouro/bairro/cidade/UF. */
  async function aplicarCep(cepRaw: string) {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) return;
      const j = await res.json() as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
      if (j.erro) { toast.error("CEP não encontrado."); return; }
      setState((s) => ({
        ...s,
        contratante_cep: cep.replace(/(\d{5})(\d{3})/, "$1-$2"),
        contratante_logradouro: j.logradouro || s.contratante_logradouro || "",
        contratante_bairro: j.bairro || s.contratante_bairro || "",
        contratante_cidade: j.localidade || s.contratante_cidade || "",
        contratante_uf: j.uf || s.contratante_uf || "",
      }));
      setDirty(true);
      toast.success(`Endereço preenchido: ${j.logradouro || ""}${j.bairro ? `, ${j.bairro}` : ""} — ${j.localidade || ""}/${j.uf || ""}`);
    } catch { /* silencia rede */ }
  }

  // ---- Lookup da proposta original (LS) para puxar marca/potência módulo + inversores
  const propostasLS = usePropostas();
  const inversoresLS = useInversoresFV();
  const propostaLS = useMemo<PropostaFV | undefined>(() => {
    const lsId =
      (proposta?.dados as { origem_ls?: { propostaIdLs?: string } } | null | undefined)
        ?.origem_ls?.propostaIdLs ?? proposta?.id ?? null;
    if (!lsId) return undefined;
    return propostasLS.find((p) => p.id === lsId);
  }, [propostasLS, proposta?.id, proposta?.dados]);

  const inversorDescricao = useMemo(() => {
    // Agrupa por potenciaKw (kWp) e produz frase:
    // "total de 3 inversores, sendo 01 (um) de 5 kWp e 02 (dois) de 6 kWp, todos marca PADRÃO"
    const lista = propostaLS?.inversores ?? [];
    const porPotencia = new Map<number, number>();
    let totalUnidades = 0;
    for (const e of lista) {
      const qtd = Math.max(0, Number(e.quantidade) || 0);
      if (qtd === 0) continue;
      const inv = inversoresLS.find((x) => x.id === e.inversorId);
      const potKw = Number(inv?.potenciaKw ?? 0);
      if (potKw <= 0) continue;
      porPotencia.set(potKw, (porPotencia.get(potKw) ?? 0) + qtd);
      totalUnidades += qtd;
    }
    if (totalUnidades === 0) return proposta?.inversor ?? "";
    const marca = propostaLS?.inversorMarca?.trim() || "";
    const entradas = [...porPotencia.entries()].sort((a, b) => a[0] - b[0]);
    const partes = entradas.map(([kw, q]) => {
      const qStr = String(q).padStart(2, "0");
      const ext = numeroExtensoPt(q);
      const kwStr = formatKwpPt(kw);
      return `${qStr} (${ext}) de ${kwStr} kWp`;
    });
    const sentencaPartes = partes.length <= 1
      ? partes[0] ?? ""
      : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
    const sufixoMarca = marca ? `, todos marca ${marca}` : "";
    const totalExt = numeroExtensoPt(totalUnidades);
    return `total de ${totalUnidades} (${totalExt}) inversor${totalUnidades > 1 ? "es" : ""}, sendo ${sentencaPartes}${sufixoMarca}`;
  }, [propostaLS, inversoresLS, proposta?.inversor]);

  const moduloDescricao = useMemo(() => {
    const qtde = Number(contrato.modulos_qtde ?? proposta?.modulos_qtd ?? propostaLS?.modulosQtd ?? 0);
    const potMod = Number(propostaLS?.moduloPotenciaWp ?? 0);
    const marca = propostaLS?.moduloMarca?.trim() || "";
    const kwp = Number(contrato.potencia_kwp ?? proposta?.potencia_kwp ?? 0);
    if (qtde <= 0 || potMod <= 0) return "";
    const qStr = String(qtde).padStart(2, "0");
    const qExt = numeroExtensoPt(qtde);
    const kwpTxt = kwp > 0 ? `, totalizando ${formatKwpPt(kwp)} kWp` : "";
    const marcaTxt = marca ? `, marca ${marca}` : "";
    return `${qStr} (${qExt}) módulos de ${Math.round(potMod)} Wp${marcaTxt}${kwpTxt}`;
  }, [contrato.modulos_qtde, contrato.potencia_kwp, proposta?.modulos_qtd, proposta?.potencia_kwp, propostaLS]);

  // ---- Variáveis para prévia ----
  const variaveis: Variaveis = useMemo(() => {
    // numero_contrato / ano_contrato derivados do código (ex.: "CT-120/2026" ou "120/2026")
    const code = contrato.codigo ?? "";
    const m = code.match(/(\d+)\s*[/-]\s*(\d{2,4})/);
    const numero_contrato = m?.[1] ?? code;
    const ano_contrato = m?.[2] ?? new Date().getFullYear().toString();
    const qtde =
      contrato.modulos_qtde ?? proposta?.modulos_qtd ?? propostaLS?.modulosQtd ?? "";
    const marcaMod = propostaLS?.moduloMarca?.trim() ?? "";
    const potMod = propostaLS?.moduloPotenciaWp;
    return {
      contratante_tipo: state.contratante_tipo_pessoa ?? "PF",
      cliente_nome: state.contratante_nome || "",
      cliente_documento: state.contratante_doc || state.contratante_rg || state.contratante_doc_extra || "",
      cliente_endereco: [state.contratante_endereco, state.contratante_cidade, state.contratante_uf]
        .filter(Boolean).join(", "),
      cliente_telefone: state.contratante_telefone || state.contratante_whatsapp || "",
      cliente_rg: state.contratante_rg || "",
      cliente_doc_extra: state.contratante_doc_extra || "",
      repr_contratante_nome: state.repr_nome || "",
      repr_contratante_cpf: state.repr_cpf || "",
      repr_contratante_rg: state.repr_rg || "",
      repr_contratante_telefone: state.repr_telefone || "",
      valor_total: brl(valorTotal),
      valor_total_extenso: valorPorExtenso(valorTotal),
      potencia_kwp: contrato.potencia_kwp != null
        ? Number(contrato.potencia_kwp).toFixed(2)
        : (proposta?.potencia_kwp != null ? Number(proposta.potencia_kwp).toFixed(2) : ""),
      quantidade_modulos: qtde,
      quantidade_modulos_extenso: typeof qtde === "number" && qtde > 0 ? valorPorExtenso(qtde).replace(/ reais?$/, "") : "",
      marca_modulos: marcaMod,
      potencia_modulo_w: potMod != null && Number(potMod) > 0 ? String(Math.round(Number(potMod))) : "",
      inversor: inversorDescricao || (proposta?.inversor ?? ""),
      modulo_descricao: moduloDescricao,
      inversor_descricao: inversorDescricao,
      forma_pagamento: descricaoFormaPagamento(state.forma_pagamento_config),
      prazo_execucao: state.prazo_execucao_dias != null ? String(state.prazo_execucao_dias) : "",
      cidade: state.local_assinatura || state.contratante_cidade || "Porto Velho/RO",
      cidade_foro: state.local_assinatura || state.contratante_cidade || "Porto Velho/RO",
      data_contrato: state.data_base_contrato || "",
      endereco_instalacao: state.endereco_instalacao || state.contratante_endereco || "",
      numero_contrato,
      ano_contrato,
      representante_contratada: "Vitor Sirioli Ribeiro",
      representante_cpf: "007.084.922-66",
      representante_rg: "998.679 - SESDEC/RO",
    };
  }, [state, valorTotal, contrato.potencia_kwp, contrato.modulos_qtde, contrato.codigo, proposta, propostaLS, inversorDescricao, moduloDescricao]);

  const varsFaltando = useMemo(() => variaveisFaltando(variaveis), [variaveis]);
  const somaFP = useMemo(() => somaFormaPagamento(state.forma_pagamento_config), [state.forma_pagamento_config]);
  const fpFecha = Math.abs(somaFP - valorTotal) < 0.01;

  // Validações p/ Gerar
  const erros = useMemo(() => {
    const arr: string[] = [];
    const tipoPJ = state.contratante_tipo_pessoa === "PJ";
    const docDig = (state.contratante_doc ?? "").replace(/\D/g, "");
    if (!state.contratante_nome?.trim()) arr.push(tipoPJ ? "razão social" : "nome do contratante");
    if (tipoPJ) {
      if (!state.contratante_doc?.trim()) arr.push("CNPJ");
      else if (docDig.length !== 14) arr.push("CNPJ inválido (14 dígitos)");
    } else {
      // PF: aceita CPF OU RG OU CNH/OAB (campo doc extra). Basta 1 dos 4.
      const temCpf = !!state.contratante_doc?.trim();
      const temRg = !!state.contratante_rg?.trim();
      const temExtra = !!state.contratante_doc_extra?.trim();
      if (!temCpf && !temRg && !temExtra) arr.push("documento do contratante (CPF, RG, CNH ou OAB)");
      else if (temCpf && docDig.length !== 11) arr.push("CPF inválido (11 dígitos)");
    }
    if (!state.contratante_logradouro?.trim() || !state.contratante_numero?.trim()
        || !state.contratante_bairro?.trim() || !state.contratante_cidade?.trim()
        || !state.contratante_uf?.trim()) arr.push("endereço completo do contratante");
    // e-mail do contratante: opcional (regra de negócio 2026-06-19)
    if (tipoPJ) {
      const reprDoc = (state.repr_cpf ?? "").replace(/\D/g, "");
      if (!state.repr_nome?.trim()) arr.push("nome completo do representante");
      if (!state.repr_cpf?.trim()) arr.push("CPF do representante");
      else if (reprDoc.length !== 11) arr.push("CPF do representante inválido");
      if (!state.repr_telefone?.trim()) arr.push("telefone do representante");
    }
    if (!state.forma_pagamento_config) arr.push("forma de pagamento");
    else if (!fpFecha) arr.push(`forma de pagamento não fecha (${brl(somaFP)} ≠ ${brl(valorTotal)})`);
    if (valorTotal <= 0) arr.push("valor total > 0");
    const obrigSemRevisar = (state.clausulas ?? [])
      .filter((c) => c.tipo !== "GRUPO" && c.obrigatoria && !c.oculta && !c.revisada).length;
    if (obrigSemRevisar > 0) arr.push(`${obrigSemRevisar} cláusula(s) obrigatória(s) sem revisão`);
    if (varsFaltando.length) arr.push(`variáveis: ${varsFaltando.join(", ")}`);
    return arr;
  }, [state, fpFecha, somaFP, valorTotal, varsFaltando]);

  async function salvar(): Promise<boolean> {
    if (!permEditar.data) {
      toast.error("Sem permissão para editar minuta.");
      return false;
    }
    setSalvando(true);
    try {
      const novoDados = {
        ...(contrato.dados ?? {}),
        ...state,
        clausulas: clausulasEfetivas,
        editado_em: new Date().toISOString(),
      };
      const fp = state.forma_pagamento_config;
      const { error } = await supabase
        .from("contratos")
        .update({
          forma_pagamento: fp?.tipo ?? null,
          valor_entrada: fp?.tipo === "ENTRADA_PARCELAS" ? (fp.entrada_parcelas?.entrada ?? 0)
            : fp?.tipo === "FINANCIAMENTO" ? (fp.financiamento?.entrada ?? 0)
            : 0,
          data_assinatura: state.data_prevista_assinatura || null,
          possui_financiamento: fp?.tipo === "FINANCIAMENTO" || (fp?.tipo === "MISTO" && (fp.misto?.componentes ?? []).some((c) => c.tipo === "FINANCIAMENTO")),
          financiamento_banco: fp?.financiamento?.banco ?? null,
          financiamento_valor: fp?.financiamento?.valor ?? null,
          observacoes: state.observacoes_contrato?.trim() || null,
          dados: novoDados as never,
        } as never)
        .eq("id", contrato.id);
      if (error) throw error;
      toast.success("Minuta salva.");
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["contratos-supabase"] });
      return true;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      toast.error(`Erro ao salvar minuta: ${msg}`);
      logError({ modulo: "comercial", tela: "MinutaContratoPanel", acao: "salvar", mensagem: msg, payload: { contratoId: contrato.id } });
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function gerar_() {
    if (erros.length) { toast.error("Bloqueios: " + erros.join(" · ")); return; }
    if (dirty) { const ok = await salvar(); if (!ok) return; }
    try {
      await gerar.mutateAsync({ contratoId: contrato.id, observacao: gerarObs.trim() || undefined });
      setGerarOpen(false); setGerarObs("");
    } catch { /* hook já tratou */ }
  }

  async function cancelar_() {
    if (motivoCancelar.trim().length < 5) { toast.error("Motivo precisa ter pelo menos 5 caracteres."); return; }
    try {
      await cancelarMinuta.mutateAsync({ contratoId: contrato.id, motivo: motivoCancelar.trim() });
      setCancelOpen(false); setMotivoCancelar("");
    } catch { /* hook já tratou */ }
  }

  const podeEditar = permEditar.data === true;
  const podeGerar = permGerar.data === true;
  const podeCancelar = permCancelar.data === true;

  return (
    <Card className="p-3 space-y-3 border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/15">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-amber-600" />
          <h3 className="font-semibold text-sm">Contrato Pendente — Editor de Minuta</h3>
          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">Editável</Badge>
          {dirty && <Badge variant="outline" className="border-orange-500 text-orange-700">Não salvo</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={!podeEditar || salvando || !dirty} onClick={() => void salvar()}>
            {salvando ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Salvar
          </Button>
          <Button size="sm" variant="destructive" disabled={!podeCancelar} onClick={() => setCancelOpen(true)}>
            <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar minuta
          </Button>
          <Button size="sm" disabled={!podeGerar || erros.length > 0} onClick={() => setGerarOpen(true)}
            className={`bg-emerald-600 hover:bg-emerald-700 text-white ${focoGerar ? "ring-2 ring-emerald-400 ring-offset-2 animate-pulse" : ""}`}>
            <FileCheck2 className="h-3.5 w-3.5 mr-1" /> Gerar contrato
          </Button>
        </div>
      </div>

      {erros.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <div><strong>Para gerar o contrato, resolva:</strong> {erros.join(" · ")}</div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="contratante">Contratante</TabsTrigger>
          <TabsTrigger value="pagamento">
            Forma de Pagamento {state.forma_pagamento_config && (
              <Badge variant={fpFecha ? "default" : "destructive"} className="ml-2 text-[10px] h-4">
                {fpFecha ? "OK" : `${brl(somaFP)}/${brl(valorTotal)}`}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clausulas">Cláusulas ({clausulasEfetivas.filter((c) => !c.oculta).length})</TabsTrigger>
          <TabsTrigger value="previa">Prévia</TabsTrigger>
        </TabsList>

        {/* CONTRATANTE */}
        <TabsContent value="contratante" className="mt-3 space-y-3">
          {/* Toggle PF / PJ */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Tipo do contratante:</Label>
            <div className="inline-flex rounded-md border overflow-hidden">
              <button type="button" disabled={!podeEditar}
                className={`px-3 py-1 text-xs ${(state.contratante_tipo_pessoa ?? "PF") === "PF" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                onClick={() => upd("contratante_tipo_pessoa", "PF")}>Pessoa Física</button>
              <button type="button" disabled={!podeEditar}
                className={`px-3 py-1 text-xs ${state.contratante_tipo_pessoa === "PJ" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                onClick={() => upd("contratante_tipo_pessoa", "PJ")}>Pessoa Jurídica</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
            <Field
              label={(state.contratante_tipo_pessoa === "PJ" ? "Razão social *" : "Nome completo *")}
              v={state.contratante_nome} on={(v) => upd("contratante_nome", v)} disabled={!podeEditar} className="md:col-span-4" />
            <Field
              label={(state.contratante_tipo_pessoa === "PJ" ? "CNPJ *" : "CPF *")}
              v={state.contratante_doc} on={(v) => upd("contratante_doc", v)} disabled={!podeEditar} className="md:col-span-2" />
            {state.contratante_tipo_pessoa !== "PJ" && (
              <>
                <Field label="RG (opcional)" v={state.contratante_rg} on={(v) => upd("contratante_rg", v)} disabled={!podeEditar} className="md:col-span-2" />
                <Field label="CNH / OAB / outro doc. (opcional)" v={state.contratante_doc_extra} on={(v) => upd("contratante_doc_extra", v)} disabled={!podeEditar} className="md:col-span-4" />
              </>
            )}
            <Field label="Telefone *" v={state.contratante_telefone} on={(v) => upd("contratante_telefone", v)} disabled={!podeEditar} className="md:col-span-2" />
            <Field label="WhatsApp" v={state.contratante_whatsapp} on={(v) => upd("contratante_whatsapp", v)} disabled={!podeEditar} className="md:col-span-2" />
            <Field label="E-mail (opcional)" v={state.contratante_email} on={(v) => upd("contratante_email", v)} disabled={!podeEditar} className="md:col-span-2" />
            <div className="md:col-span-2">
              <Label className="text-xs">CEP (autopreenche endereço)</Label>
              <Input
                className="mt-1 h-8"
                value={state.contratante_cep ?? ""}
                disabled={!podeEditar}
                placeholder="00000-000"
                onChange={(e) => {
                  const raw = e.target.value;
                  upd("contratante_cep", raw);
                  if (raw.replace(/\D/g, "").length === 8) void aplicarCep(raw);
                }}
                onBlur={(e) => void aplicarCep(e.target.value)}
              />
            </div>
            <Field label="Logradouro *" v={state.contratante_logradouro} on={(v) => upd("contratante_logradouro", v)} disabled={!podeEditar} className="md:col-span-3" />
            <Field label="Número *" v={state.contratante_numero} on={(v) => upd("contratante_numero", v)} disabled={!podeEditar} className="md:col-span-1" />
            <Field label="Bairro *" v={state.contratante_bairro} on={(v) => upd("contratante_bairro", v)} disabled={!podeEditar} className="md:col-span-2" />
            <Field label="Complemento" v={state.contratante_complemento} on={(v) => upd("contratante_complemento", v)} disabled={!podeEditar} className="md:col-span-2" />
            <Field label="Cidade *" v={state.contratante_cidade} on={(v) => upd("contratante_cidade", v)} disabled={!podeEditar} className="md:col-span-3" />
            <Field label="UF *" v={state.contratante_uf} on={(v) => upd("contratante_uf", v)} disabled={!podeEditar} className="md:col-span-1" />
            <div className="md:col-span-6">
              <Label className="text-xs">Endereço completo (gerado automaticamente)</Label>
              <Input className="mt-1 h-8 bg-muted/40" readOnly value={enderecoCompleto} />
            </div>
          </div>

          {state.contratante_tipo_pessoa === "PJ" && (
            <div className="rounded-md border border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Representante legal (obrigatório para PJ)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                <Field label="Nome completo *" v={state.repr_nome} on={(v) => upd("repr_nome", v)} disabled={!podeEditar} className="md:col-span-3" />
                <Field label="CPF *" v={state.repr_cpf} on={(v) => upd("repr_cpf", v)} disabled={!podeEditar} className="md:col-span-1" />
                <Field label="Telefone *" v={state.repr_telefone} on={(v) => upd("repr_telefone", v)} disabled={!podeEditar} className="md:col-span-1" />
                <Field label="RG (opcional)" v={state.repr_rg} on={(v) => upd("repr_rg", v)} disabled={!podeEditar} className="md:col-span-1" />
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Alterações aqui salvam um <strong>snapshot contratual</strong> em <code>contratos.dados</code> e
            <strong> não sobrescrevem o Cliente 360°</strong>.
          </p>
        </TabsContent>

        {/* DADOS CONTRATUAIS — removidos do UI a pedido. Defaults silenciosos:
            data_base_contrato = hoje, prazo_execucao_dias = 60,
            cidade/cidade_foro/local_assinatura = "Porto Velho/RO" (sede Meta Sun),
            endereco_instalacao = endereço do contratante,
            assinatura_email = e-mail do contratante. */}

        {/* FORMA DE PAGAMENTO */}
        <TabsContent value="pagamento" className="mt-3">
          <FormaPagamentoEditor
            valorTotal={valorTotal}
            disabled={!podeEditar}
            value={state.forma_pagamento_config}
            onChange={(v) => upd("forma_pagamento_config", v)}
          />
          {!fpFecha && state.forma_pagamento_config && (
            <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              Forma de pagamento não fecha com o valor total do contrato.
            </div>
          )}

        </TabsContent>

        {/* CLÁUSULAS */}
        <TabsContent value="clausulas" className="mt-3">
          <ClausulasEditor
            disabled={!podeEditar}
            clausulas={state.clausulas ?? []}
            onChange={(v) => upd("clausulas", v)}
          />
        </TabsContent>

        {/* PRÉVIA */}
        <TabsContent value="previa" className="mt-3">
          <PreviaContrato
            variaveis={variaveis}
            clausulas={clausulasEfetivas}
            varsFaltando={varsFaltando}
            podeGerar={erros.length === 0 && podeGerar}
            onGerar={() => setGerarOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Diálogo Gerar */}
      <Dialog open={gerarOpen} onOpenChange={setGerarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar contrato {contrato.codigo ?? contrato.id.slice(0, 8)}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação transforma a minuta em <strong>contrato gerado, aguardando assinatura</strong>.
            Cláusulas, forma de pagamento e dados contratuais ficam travados (reabra a minuta com
            permissão específica para alterar).
          </p>
          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea className="mt-1" rows={2} value={gerarObs} onChange={(e) => setGerarObs(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGerarOpen(false)} disabled={gerar.isPending}>Voltar</Button>
            <Button onClick={() => void gerar_()} disabled={gerar.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {gerar.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5 mr-1" />}
              Gerar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Cancelar */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar minuta {contrato.codigo ?? contrato.id.slice(0, 8)}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            A minuta será marcada como <strong>CANCELADO</strong> e a proposta de origem voltará a
            <strong> APROVADA</strong>, permitindo gerar novo contrato.
          </p>
          <div>
            <Label className="text-xs">Motivo (mín. 5 caracteres) *</Label>
            <Textarea className="mt-1" rows={2} value={motivoCancelar} onChange={(e) => setMotivoCancelar(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelarMinuta.isPending}>Voltar</Button>
            <Button variant="destructive" onClick={() => void cancelar_()} disabled={cancelarMinuta.isPending}>
              {cancelarMinuta.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1" />}
              Cancelar minuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ===================================================================
// Helpers de campo
// ===================================================================
function Field({ label, v, on, disabled, className }: {
  label: string; v: string | undefined; on: (v: string) => void; disabled?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1 h-8" value={v ?? ""} onChange={(e) => on(e.target.value)} disabled={disabled} />
    </div>
  );
}
function NumField({ label, v, on, disabled }: { label: string; v: number | undefined; on: (v: number | undefined) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="mt-1 h-8"
        type="number"
        inputMode="decimal"
        value={v === undefined || Number.isNaN(v) ? "" : String(v)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") { on(undefined); return; }
          const n = Number(raw);
          on(Number.isNaN(n) ? undefined : n);
        }}
        disabled={disabled}
      />
    </div>
  );
}
function DateField({ label, v, on, disabled }: { label: string; v: string | undefined; on: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1 h-8" type="date" value={v ?? ""} onChange={(e) => on(e.target.value)} disabled={disabled} />
    </div>
  );
}

// ===================================================================
// Forma de pagamento

const SUB_KEY: Record<Exclude<FormaPagamentoTipo, "MISTO">, keyof FormaPagamentoConfig> = {
  DINHEIRO: "dinheiro",
  PIX: "pix",
  BOLETO: "boleto",
  CARTAO: "cartao",
  CARTAO_DEBITO: "cartao_debito",
  CHEQUE: "cheque",
  FINANCIAMENTO: "financiamento",
  ENTRADA_PARCELAS: "entrada_parcelas",
  PERMUTA: "permuta",
};

function getMomento(v: FormaPagamentoConfig, t: FormaPagamentoTipo): MomentoPagamento | undefined {
  if (t === "MISTO") return undefined;
  const sub = v[SUB_KEY[t as Exclude<FormaPagamentoTipo, "MISTO">]] as { momento?: MomentoPagamento } | undefined;
  return sub?.momento;
}
function getMomentoData(v: FormaPagamentoConfig, t: FormaPagamentoTipo): string | undefined {
  if (t === "MISTO") return undefined;
  const k = SUB_KEY[t as Exclude<FormaPagamentoTipo, "MISTO">];
  const sub = v[k] as { data?: string; entrada_data?: string } | undefined;
  return sub?.data ?? sub?.entrada_data;
}
function setMomento(
  v: FormaPagamentoConfig, t: FormaPagamentoTipo, m: MomentoPagamento,
  onChange: (v: FormaPagamentoConfig) => void,
  patch: <K extends keyof FormaPagamentoConfig>(k: K, p: Partial<NonNullable<FormaPagamentoConfig[K]>>) => void,
) {
  if (t === "MISTO") return;
  const k = SUB_KEY[t as Exclude<FormaPagamentoTipo, "MISTO">];
  patch(k, { momento: m } as never);
  void v; void onChange;
}
function setMomentoData(
  v: FormaPagamentoConfig, t: FormaPagamentoTipo, d: string,
  onChange: (v: FormaPagamentoConfig) => void,
  patch: <K extends keyof FormaPagamentoConfig>(k: K, p: Partial<NonNullable<FormaPagamentoConfig[K]>>) => void,
) {
  if (t === "MISTO") return;
  const k = SUB_KEY[t as Exclude<FormaPagamentoTipo, "MISTO">];
  patch(k, { data: d } as never);
  void v; void onChange;
}

function MomentoBlock({ disabled, momento, data, onMomento, onData }: {
  disabled?: boolean;
  momento: MomentoPagamento | undefined;
  data: string | undefined;
  onMomento: (m: MomentoPagamento) => void;
  onData: (d: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm rounded-md border border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-2">
      <div>
        <Label className="text-xs">Momento do pagamento *</Label>
        <Select value={momento ?? "ASSINATURA"} onValueChange={(v) => onMomento(v as MomentoPagamento)} disabled={disabled}>
          <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MOMENTO_OPCOES.map((m) => (
              <SelectItem key={m} value={m}>{MOMENTO_LABEL[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {momento === "DATA_ESPECIFICA" && (
        <div>
          <Label className="text-xs">Data *</Label>
          <Input type="date" className="mt-1 h-8" value={data ?? ""} disabled={disabled} onChange={(e) => onData(e.target.value)} />
        </div>
      )}
    </div>
  );
}

function FormaPagamentoEditor({ valorTotal, disabled, value, onChange, nested }: {
  valorTotal: number; disabled?: boolean; value: FormaPagamentoConfig | null | undefined;
  onChange: (v: FormaPagamentoConfig | null) => void;
  nested?: boolean;
}) {
  const tipo = value?.tipo;
  function setTipo(t: FormaPagamentoTipo) {
    if (t === value?.tipo) return;
    onChange(formaPagamentoVazia(t));
  }
  function patch<K extends keyof FormaPagamentoConfig>(k: K, p: Partial<NonNullable<FormaPagamentoConfig[K]>>) {
    if (!value) return;
    onChange({ ...value, [k]: { ...(value[k] as object), ...p } } as FormaPagamentoConfig);
  }
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tipo de pagamento *</Label>
        <Select value={tipo ?? ""} onValueChange={(v) => setTipo(v as FormaPagamentoTipo)} disabled={disabled}>
          <SelectTrigger className="mt-1 h-8 w-full md:w-72"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {FP_TIPOS_SELECIONAVEIS.map((t) => (
              <SelectItem key={t} value={t}>{FP_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tipo && tipo !== "MISTO" && (
        <MomentoBlock
          disabled={disabled}
          momento={getMomento(value!, tipo)}
          data={getMomentoData(value!, tipo)}
          onMomento={(m) => setMomento(value!, tipo, m, onChange, patch)}
          onData={(d) => setMomentoData(value!, tipo, d, onChange, patch)}
        />
      )}



      {tipo === "DINHEIRO" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.dinheiro?.valor} on={(v) => patch("dinheiro", { valor: v })} disabled={disabled} />
          <Field label="Observação" v={value!.dinheiro?.observacao} on={(v) => patch("dinheiro", { observacao: v })} disabled={disabled} className="md:col-span-2" />
        </div>
      )}

      {tipo === "PIX" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.pix?.valor} on={(v) => patch("pix", { valor: v })} disabled={disabled} />
          <Field label="Chave/observação" v={value!.pix?.chave} on={(v) => patch("pix", { chave: v })} disabled={disabled} className="md:col-span-2" />
          <div className="md:col-span-3">
            <Label className="text-xs">Condição textual para o contrato</Label>
            <Textarea rows={2} className="mt-1" disabled={disabled} value={value!.pix?.observacao ?? ""} onChange={(e) => patch("pix", { observacao: e.target.value })} />
          </div>
        </div>
      )}

      {tipo === "BOLETO" && (() => {
        const b = value!.boleto!;
        const parcelaCalc = b.parcelas > 0 ? b.valor / b.parcelas : 0;
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <NumField label="Valor total" v={b.valor} on={(v) => patch("boleto", { valor: v ?? 0, valor_parcela: b.parcelas > 0 ? (v ?? 0) / b.parcelas : 0 })} disabled={disabled} />
            <NumField label="Qtde parcelas (editável)" v={b.parcelas} on={(v) => patch("boleto", { parcelas: v ?? 0, valor_parcela: (v ?? 0) > 0 ? b.valor / (v ?? 1) : 0 })} disabled={disabled} />

            <div>
              <Label className="text-xs">Valor da parcela (calculado)</Label>
              <Input className="mt-1 h-8 bg-muted/40 tabular-nums" readOnly value={brl(parcelaCalc)} />
            </div>
            <Field label="Observação" v={b.observacao} on={(v) => patch("boleto", { observacao: v })} disabled={disabled} className="md:col-span-3" />

          </div>
        );
      })()}

      {tipo === "CARTAO" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.cartao?.valor} on={(v) => patch("cartao", { valor: v })} disabled={disabled} />
          <NumField label="Qtde parcelas" v={value!.cartao?.parcelas} on={(v) => patch("cartao", { parcelas: v })} disabled={disabled} />
          <Field label="Bandeira" v={value!.cartao?.bandeira} on={(v) => patch("cartao", { bandeira: v })} disabled={disabled} />
          <div className="md:col-span-2">
            <Label className="text-xs">Juros do parcelamento *</Label>
            <Select
              value={(value!.cartao?.com_juros ?? false) ? "CLIENTE" : "META"}
              onValueChange={(v) => patch("cartao", { com_juros: v === "CLIENTE" })}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENTE">Juros por conta do cliente</SelectItem>
                <SelectItem value="META">Juros por conta da Meta (sem juros ao cliente)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Observação" v={value!.cartao?.observacao} on={(v) => patch("cartao", { observacao: v })} disabled={disabled} className="md:col-span-3" />
        </div>
      )}

      {tipo === "CARTAO_DEBITO" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.cartao_debito?.valor} on={(v) => patch("cartao_debito", { valor: v })} disabled={disabled} />
          <Field label="Bandeira" v={value!.cartao_debito?.bandeira} on={(v) => patch("cartao_debito", { bandeira: v })} disabled={disabled} />
          <Field label="Observação" v={value!.cartao_debito?.observacao} on={(v) => patch("cartao_debito", { observacao: v })} disabled={disabled} className="md:col-span-3" />
        </div>
      )}

      {tipo === "CHEQUE" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.cheque?.valor} on={(v) => patch("cheque", { valor: v })} disabled={disabled} />
          <NumField label="Qtde de cheques" v={value!.cheque?.parcelas} on={(v) => patch("cheque", { parcelas: Math.max(1, Math.floor(v || 1)) })} disabled={disabled} />
          <Field label="Banco emissor" v={value!.cheque?.banco} on={(v) => patch("cheque", { banco: v })} disabled={disabled} />
          <Field label="Observação" v={value!.cheque?.observacao} on={(v) => patch("cheque", { observacao: v })} disabled={disabled} className="md:col-span-3" />
        </div>
      )}




      {tipo === "FINANCIAMENTO" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <Label className="text-xs">Banco *</Label>
            <Select value={value!.financiamento?.banco ?? ""} onValueChange={(v) => patch("financiamento", { banco: v })} disabled={disabled}>
              <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {BANCOS_FINANCIAMENTO.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <NumField label="Valor financiado" v={value!.financiamento?.valor} on={(v) => patch("financiamento", { valor: v })} disabled={disabled} />
          <NumField label="Entrada (se houver)" v={value!.financiamento?.entrada} on={(v) => patch("financiamento", { entrada: v })} disabled={disabled} />
          
          <Field label="Observação" v={value!.financiamento?.observacao} on={(v) => patch("financiamento", { observacao: v })} disabled={disabled} />
          <div className="md:col-span-3">
            <Label className="text-xs">Cláusula específica de financiamento</Label>
            <Textarea rows={2} className="mt-1" disabled={disabled} value={value!.financiamento?.clausula ?? ""} onChange={(e) => patch("financiamento", { clausula: e.target.value })} />
          </div>
        </div>
      )}


      {tipo === "PERMUTA" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor da permuta" v={value!.permuta?.valor} on={(v) => patch("permuta", { valor: v })} disabled={disabled} />
          <Field label="Descrição do bem/serviço *" v={value!.permuta?.descricao} on={(v) => patch("permuta", { descricao: v })} disabled={disabled} className="md:col-span-2" />
          <div className="md:col-span-3">
            <Label className="text-xs">Condições da permuta (entra no contrato)</Label>
            <Textarea rows={3} className="mt-1" disabled={disabled} value={value!.permuta?.observacao ?? ""} onChange={(e) => patch("permuta", { observacao: e.target.value })} />
          </div>
        </div>
      )}

      {tipo === "MISTO" && value!.misto && (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">
            Cada componente: <strong>Tipo – Momento – Valor</strong> (e parcelas, se houver).
            Soma deve igualar o total do contrato ({brl(valorTotal)}).
          </p>
          {value!.misto.componentes.map((c, i) => {
            const updateComp = (patchC: Partial<typeof c>) => {
              const arr = [...value!.misto!.componentes];
              arr[i] = { ...arr[i], ...patchC };
              patch("misto", { componentes: arr });
            };
            const parcelas = c.parcelas ?? 1;
            const vp = parcelas > 1 ? (c.valor || 0) / parcelas : 0;
            return (
              <div key={i} className="rounded-md border p-2 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-3">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={c.tipo} onValueChange={(v) => updateComp({ tipo: v as FormaPagamentoTipo })} disabled={disabled}>
                      <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["DINHEIRO","PIX","BOLETO","CARTAO","CARTAO_DEBITO","CHEQUE","FINANCIAMENTO","PERMUTA"] as FormaPagamentoTipo[]).map((t) =>
                          <SelectItem key={t} value={t}>{FP_LABEL[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4">
                    <Label className="text-xs">Momento</Label>
                    <Select value={c.momento ?? "ASSINATURA"} onValueChange={(v) => updateComp({ momento: v as MomentoPagamento })} disabled={disabled}>
                      <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOMENTO_OPCOES.map((m) => <SelectItem key={m} value={m}>{MOMENTO_LABEL[m]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <NumField label="Valor" v={c.valor} on={(v) => updateComp({ valor: v })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-2">
                    <NumField label="Parcelas" v={parcelas} on={(v) => updateComp({ parcelas: Math.max(1, Math.floor(v || 1)) })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button size="sm" variant="ghost" disabled={disabled} onClick={() => {
                      const arr = value!.misto!.componentes.filter((_, idx) => idx !== i);
                      patch("misto", { componentes: arr });
                    }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  {c.momento === "DATA_ESPECIFICA" && (
                    <div className="md:col-span-3">
                      <Label className="text-xs">Data específica</Label>
                      <Input type="date" className="mt-1 h-8" value={c.data ?? ""} disabled={disabled} onChange={(e) => updateComp({ data: e.target.value })} />
                    </div>
                  )}
                  <div className={c.momento === "DATA_ESPECIFICA" ? "md:col-span-6" : "md:col-span-9"}>
                    <Field label="Observação" v={c.obs ?? ""} on={(v) => updateComp({ obs: v })} disabled={disabled} />
                  </div>
                  {parcelas > 1 && (
                    <div className="md:col-span-3">
                      <Label className="text-xs">Valor da parcela</Label>
                      <Input className="mt-1 h-8 bg-muted/40 tabular-nums" readOnly value={brl(vp)} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => {
            const arr = [...value!.misto!.componentes, { tipo: "PIX" as FormaPagamentoTipo, momento: "ASSINATURA" as MomentoPagamento, valor: 0, parcelas: 1, obs: "" }];
            patch("misto", { componentes: arr });
          }}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar componente</Button>
        </div>
      )}


      {/* ============================================================== */}
      {/* Formas de pagamento adicionais — UI compacta, sem ruído visual */}
      {/* ============================================================== */}
      {!nested && value && (
        <div className="space-y-2 pt-1">
          {(value.formas_extras ?? []).length > 0 && (
            <div className="space-y-2 border-l-2 border-muted pl-3">
              {(value.formas_extras ?? []).map((extra, idx) => (
                <div key={idx} className="rounded-md border bg-muted/30 p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Forma adicional {idx + 2} — {FP_LABEL[extra.tipo] ?? extra.tipo}
                    </span>
                    <Button
                      size="sm" variant="ghost" disabled={disabled}
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        const arr = [...(value.formas_extras ?? [])];
                        arr.splice(idx, 1);
                        onChange({ ...value, formas_extras: arr });
                      }}
                      title="Remover esta forma"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <FormaPagamentoEditor
                    valorTotal={valorTotal}
                    disabled={disabled}
                    value={extra}
                    nested
                    onChange={(v) => {
                      if (!v) return;
                      const arr = [...(value.formas_extras ?? [])];
                      arr[idx] = v;
                      onChange({ ...value, formas_extras: arr });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <Button
            size="sm" variant="ghost" disabled={disabled}
            className="h-7 text-xs text-primary hover:text-primary"
            onClick={() => {
              const arr = [...(value.formas_extras ?? []), formaPagamentoVazia("PIX")];
              onChange({ ...value, formas_extras: arr });
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar outra forma de pagamento
          </Button>
        </div>
      )}
    </div>
  );
}

// ===================================================================
// Cláusulas — UM botão "Editar contrato" abre dialog com seletores.
// Alterações afetam SOMENTE este contrato (vivem em contratos.dados).
// ===================================================================
type AcaoCl = "ALTERAR" | "EXCLUIR" | "ADICIONAR";

function ClausulasEditor({ disabled, clausulas, onChange }: {
  disabled?: boolean; clausulas: Clausula[]; onChange: (v: Clausula[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [acao, setAcao] = useState<AcaoCl>("ALTERAR");
  const [refId, setRefId] = useState<string>("");
  const [posicao, setPosicao] = useState<"antes" | "depois">("depois");
  const [novoTexto, setNovoTexto] = useState("");

  const itens = useMemo(
    () => clausulas.filter((c) => c.tipo === "ITEM" && !c.oculta),
    [clausulas],
  );
  const itensExcluiveis = useMemo(
    () => itens.filter((c) => !c.obrigatoria),
    [itens],
  );

  const refSel = useMemo(() => clausulas.find((c) => c.id === refId) ?? null, [clausulas, refId]);

  function abrir() {
    setOpen(true);
    setAcao("ALTERAR");
    setRefId("");
    setPosicao("depois");
    setNovoTexto("");
  }

  function trocarAcao(a: AcaoCl) {
    setAcao(a);
    setRefId("");
    setNovoTexto("");
    setPosicao("depois");
  }

  function aoSelecionarRef(id: string) {
    setRefId(id);
    if (acao === "ALTERAR") {
      const c = clausulas.find((x) => x.id === id);
      setNovoTexto(c?.texto ?? "");
    } else {
      setNovoTexto("");
    }
  }

  function aplicar() {
    if (acao === "ALTERAR") {
      if (!refId) { toast.error("Selecione a cláusula a alterar."); return; }
      if (novoTexto.trim().length < 5) { toast.error("Novo texto muito curto."); return; }
      onChange(alterarTextoItem(clausulas, refId, novoTexto.trim()));
      toast.success(`Cláusula ${refSel?.numero} alterada neste contrato.`);
      setOpen(false);
      return;
    }
    if (acao === "EXCLUIR") {
      if (!refId) { toast.error("Selecione a cláusula a excluir."); return; }
      if (refSel?.obrigatoria) { toast.error("Cláusula obrigatória não pode ser excluída."); return; }
      if (!confirm(`Excluir a cláusula ${refSel?.numero}? As seguintes do mesmo grupo serão renumeradas.`)) return;
      onChange(removerItem(clausulas, refId));
      toast.success(`Cláusula ${refSel?.numero} excluída.`);
      setOpen(false);
      return;
    }
    if (acao === "ADICIONAR") {
      if (!refId) { toast.error("Selecione a cláusula de referência."); return; }
      if (novoTexto.trim().length < 5) { toast.error("Texto da nova cláusula muito curto."); return; }
      onChange(inserirItem(clausulas, refId, posicao, novoTexto.trim(), refSel?.categoria ?? "OBRIG_CONTRATADA"));
      toast.success(`Cláusula inserida ${posicao} de ${refSel?.numero}.`);
      setOpen(false);
      return;
    }
  }

  function salvarComoPadrao() {
    if (!confirm("Salvar a versão atual como seu novo template padrão? Sempre que criar uma nova minuta, este modelo será carregado.")) return;
    salvarTemplateUsuario(clausulas);
    toast.success("Template padrão atualizado para os próximos contratos.");
  }
  function restaurarMetaSun() {
    if (!confirm("Restaurar o template oficial Meta Sun? Alterações desta minuta serão perdidas.")) return;
    onChange(clausulasPadrao());
  }
  function recarregarMeuPadrao() {
    const t = carregarTemplateUsuario();
    if (!t) { toast.error("Você ainda não salvou um template padrão pessoal."); return; }
    if (!confirm("Recarregar seu template salvo? Alterações desta minuta serão perdidas.")) return;
    onChange(t);
  }
  function apagarMeuPadrao() {
    if (!confirm("Apagar seu template padrão salvo?")) return;
    limparTemplateUsuario();
    toast.success("Template padrão pessoal removido.");
  }

  const totalItens = clausulas.filter((c) => c.tipo === "ITEM").length;

  const itensDoSelect = acao === "EXCLUIR" ? itensExcluiveis : itens;

  return (
    <div className="space-y-3">
      {/* Cabeçalho + botão único Editar contrato + toolbar de template */}
      <div className="flex items-start justify-between gap-2 flex-wrap border-b pb-2">
        <div className="space-y-1 max-w-lg">
          <p className="text-xs text-muted-foreground">
            Template oficial Meta Sun — <strong>{totalItens} cláusulas</strong>. As alterações feitas aqui valem
            <strong> somente para este contrato</strong> (não mudam o modelo base).
          </p>
          <Button size="sm" disabled={disabled} onClick={abrir}
            className="bg-amber-600 hover:bg-amber-700 text-white">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar contrato
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" disabled={disabled} onClick={salvarComoPadrao}
            title="Salvar como seu modelo pessoal — usado nas próximas minutas.">
            <BookmarkPlus className="h-3.5 w-3.5 mr-1" /> Salvar como meu padrão
          </Button>
          <Button size="sm" variant="outline" disabled={disabled || !existeTemplateUsuario()} onClick={recarregarMeuPadrao}>
            Carregar meu padrão
          </Button>
          <Button size="sm" variant="outline" disabled={disabled} onClick={restaurarMetaSun}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar Meta Sun
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled || !existeTemplateUsuario()}
            onClick={apagarMeuPadrao} className="text-rose-600">
            Apagar meu padrão
          </Button>
        </div>
      </div>

      {/* Lista somente leitura (preview) */}
      <div className="space-y-1.5">
        {clausulas.map((c) => {
          if (c.tipo === "GRUPO") {
            return (
              <div key={c.id} className="mt-4 first:mt-0">
                <h4 className="text-xs font-bold tracking-wide text-foreground/90 border-b pb-1 uppercase">
                  {c.titulo}
                </h4>
              </div>
            );
          }
          return (
            <div key={c.id} className={`rounded-md border p-2 ${c.oculta ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] tabular-nums shrink-0 mt-0.5">{c.numero}</Badge>
                {c.obrigatoria && <Badge variant="default" className="text-[10px] shrink-0">Obrig.</Badge>}
                {c.complementar && <Badge variant="outline" className="text-[10px] shrink-0 border-sky-500 text-sky-700">Compl.</Badge>}
                <p className="text-xs flex-1 whitespace-pre-wrap">{c.texto}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog: Editar contrato */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-amber-600" /> Editar cláusulas deste contrato
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              As mudanças valem somente para este contrato — o modelo base permanece intacto.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            {/* 1) Ação */}
            <div>
              <Label className="text-xs">Ação *</Label>
              <Select value={acao} onValueChange={(v) => trocarAcao(v as AcaoCl)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALTERAR">Alterar cláusula</SelectItem>
                  <SelectItem value="EXCLUIR">Excluir cláusula</SelectItem>
                  <SelectItem value="ADICIONAR">Adicionar cláusula</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2) Posição (somente ADICIONAR) */}
            {acao === "ADICIONAR" && (
              <div>
                <Label className="text-xs">Posição *</Label>
                <Select value={posicao} onValueChange={(v) => setPosicao(v as "antes" | "depois")}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="antes">Antes de</SelectItem>
                    <SelectItem value="depois">Depois de</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 3) Cláusula */}
            <div>
              <Label className="text-xs">
                {acao === "ADICIONAR" ? "Cláusula de referência *" : "Cláusula *"}
              </Label>
              <Select value={refId} onValueChange={aoSelecionarRef}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder={
                    acao === "EXCLUIR" ? "Selecione a cláusula a excluir..."
                    : acao === "ADICIONAR" ? "Ex.: 3.2 — a nova entrará antes/depois desta"
                    : "Selecione a cláusula a alterar..."
                  } />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {itensDoSelect.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <span className="font-semibold tabular-nums mr-2">{c.numero}</span>
                      {c.texto.slice(0, 80)}{c.texto.length > 80 ? "…" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {acao === "EXCLUIR" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cláusulas obrigatórias não aparecem na lista — não podem ser excluídas.
                </p>
              )}
            </div>

            {/* 4) Texto atual + Novo texto / confirmação de exclusão */}
            {refSel && acao === "ALTERAR" && (
              <>
                <div>
                  <Label className="text-xs">Texto atual da cláusula {refSel.numero}</Label>
                  <Textarea readOnly rows={4} className="mt-1 text-xs bg-muted/60" value={refSel.texto} />
                </div>
                <div>
                  <Label className="text-xs">Como deve ficar neste contrato *</Label>
                  <Textarea rows={5} className="mt-1 text-xs" value={novoTexto}
                    onChange={(e) => setNovoTexto(e.target.value)} autoFocus />
                </div>
              </>
            )}

            {refSel && acao === "EXCLUIR" && (
              <div className="rounded-md border bg-rose-50/60 dark:bg-rose-950/20 p-2 text-xs">
                <strong>{refSel.numero}</strong> — {refSel.texto}
                <p className="mt-2 text-[11px] text-rose-700">
                  Esta cláusula será removida deste contrato. As seguintes do mesmo grupo serão renumeradas.
                </p>
              </div>
            )}

            {refSel && acao === "ADICIONAR" && (
              <>
                <div className="rounded-md border bg-muted/40 p-2 text-[11px]">
                  Nova cláusula entrará como{" "}
                  <strong>
                    {(() => {
                      const sub = (refSel.subordem ?? 0) + (posicao === "depois" ? 1 : 0);
                      return `${refSel.grupo}.${Math.max(sub, 1)}`;
                    })()}
                  </strong>{" "}— as seguintes serão renumeradas automaticamente.
                </div>
                <div>
                  <Label className="text-xs">Texto da nova cláusula *</Label>
                  <Textarea rows={5} className="mt-1 text-xs" value={novoTexto}
                    onChange={(e) => setNovoTexto(e.target.value)}
                    placeholder="Digite o texto completo da nova cláusula..." autoFocus />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={aplicar} disabled={!refId}
              className={
                acao === "EXCLUIR" ? "bg-rose-600 hover:bg-rose-700 text-white"
                : acao === "ADICIONAR" ? "bg-sky-600 hover:bg-sky-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
              }>
              {acao === "ALTERAR" ? "Aplicar alteração"
               : acao === "EXCLUIR" ? "Excluir cláusula"
               : "Adicionar cláusula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




// ===================================================================
// Prévia
// ===================================================================
function PreviaContrato({ variaveis, clausulas, varsFaltando, podeGerar, onGerar }: {
  variaveis: Variaveis; clausulas: Clausula[];
  varsFaltando: string[]; podeGerar: boolean; onGerar: () => void;
}) {
  const visiveis = renumerar(clausulas.filter((c) => !c.oculta));
  return (
    <div className="space-y-2">
      {/* Print CSS oficial Meta Sun: A4, margens 3-2-2-3 cm, Times New Roman 12pt,
          espaçamento 1,5 e numeração de folhas no rodapé. */}
      <style>{`
        .print-only { display: none; }
        @media print {
          @page {
            size: A4;
            margin: 35mm 20mm 30mm 20mm;
            @bottom-right {
              content: "Folha " counter(page) " de " counter(pages);
              font-family: "Times New Roman", Times, serif;
              font-size: 10pt;
              color: #000;
            }
          }

          body * { visibility: hidden !important; }
          #contrato-print-area, #contrato-print-area * { visibility: visible !important; }
          .print-only, .print-only * { visibility: visible !important; }
          #contrato-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: "Times New Roman", Times, serif !important;
            font-size: 12pt !important;
            line-height: 1.5 !important;
          }
          #contrato-print-area h2, #contrato-print-area h3 {
            font-family: "Times New Roman", Times, serif !important;
            font-size: 12pt !important;
          }
          #contrato-print-area .no-print,
          #contrato-print-area .screen-only { display: none !important; }

          .print-only.print-header {
            display: block !important;
            position: fixed !important;
            top: 0; left: 0; right: 0;
            height: 30mm;
            text-align: center;
            padding-top: 5mm;
            background: #fff;
            z-index: 9999;
          }
          .print-only.print-header img {
            display: block; margin: 0 auto;
            height: 22mm; width: auto;
          }
          .print-only.print-footer {
            display: block !important;
            position: fixed !important;
            bottom: 0; left: 0; right: 0;
            height: 25mm;
            text-align: center;
            padding-bottom: 3mm;
            background: #fff;
            z-index: 9999;
          }
          .print-only.print-footer img {
            display: block; margin: 0 auto;
            width: 100%; max-width: 190mm; height: auto;
          }
        }
      `}</style>
      {/* Cabeçalho e rodapé fixos: repetem em TODAS as folhas impressas */}
      <div className="print-only print-header" aria-hidden>
        <img src={metaSunLogo.url} alt="Meta Sun Energia Solar" />
      </div>
      <div className="print-only print-footer" aria-hidden>
        <img src={metaSunRodape.url} alt="Meta Sun rodapé" />
      </div>
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Prévia do contrato</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Imprimir / PDF
          </Button>
          <Button size="sm" disabled={!podeGerar} onClick={onGerar}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileCheck2 className="h-3.5 w-3.5 mr-1" /> Gerar contrato final
          </Button>
        </div>
      </div>
      {varsFaltando.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive no-print">
          <strong>Variáveis obrigatórias vazias:</strong> {varsFaltando.join(", ")}.
          A geração do contrato está bloqueada.
        </div>
      )}
      <div id="contrato-print-area"
        className="mx-auto bg-white text-black shadow-lg"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm 25mm 25mm 25mm",
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: "12pt",
          lineHeight: 1.5,
          color: "#000",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cabeçalho oficial Meta Sun (apenas na tela; na impressão, o header fixo se repete em todas as folhas) */}
        <div className="text-center screen-only" style={{ marginBottom: "8mm" }}>
          <img src={metaSunLogo.url} alt="Meta Sun Energia Solar"
            style={{ display: "block", margin: "0 auto", height: "72px", width: "auto" }} />
          <p style={{
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "12pt",
            fontWeight: "bold",
            textDecoration: "underline",
            marginTop: "6mm",
            marginBottom: "2mm",
            textAlign: "center",
            letterSpacing: "0.5px",
          }}>
            CONTRATO {String(variaveis.numero_contrato || "0").padStart(3, "0")}/{variaveis.ano_contrato || "2026"}
          </p>
          <p style={{
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "11pt",
            fontWeight: "bold",
            textDecoration: "underline",
            textAlign: "center",
            marginBottom: "4mm",
            letterSpacing: "0.3px",
            whiteSpace: "nowrap",
          }}>
            AQUISIÇÃO E INSTALAÇÃO DO SISTEMA DE ENERGIA FOTOVOLTAICA ON – GRID
          </p>
        </div>

        <p style={{ textAlign: "justify", marginBottom: "4mm", textIndent: "0" }}>
          Pelo presente instrumento e na melhor forma de direito, as partes, a saber:
        </p>

        {variaveis.contratante_tipo === "PJ" ? (
          <p style={{ textAlign: "justify", marginBottom: "4mm" }}>
            <strong>CONTRATANTE:</strong> {variaveis.cliente_nome || "______________"}, pessoa jurídica de
            direito privado, inscrita no <strong>CNPJ sob o nº {variaveis.cliente_documento || "______________"}</strong>,
            com sede em {variaveis.cliente_endereco || "______________"}
            {variaveis.cliente_telefone ? <>, telefone para contato <strong>{variaveis.cliente_telefone}</strong></> : null},
            neste ato representada por <strong>{variaveis.repr_contratante_nome || "______________"}</strong>,
            inscrito no <strong>CPF sob o nº {variaveis.repr_contratante_cpf || "______________"}</strong>
            {variaveis.repr_contratante_rg ? <>, <strong>RG nº {variaveis.repr_contratante_rg}</strong></> : null}
            {variaveis.repr_contratante_telefone ? <>, telefone <strong>{variaveis.repr_contratante_telefone}</strong></> : null}.
          </p>
        ) : (
          <p style={{ textAlign: "justify", marginBottom: "4mm" }}>
            <strong>CONTRATANTE:</strong> {variaveis.cliente_nome || "______________"},
            {" "}portador(a) do <strong>CPF nº {variaveis.cliente_documento || "______________"}</strong>
            {variaveis.cliente_rg ? <>, <strong>RG nº {variaveis.cliente_rg}</strong></> : null}
            {variaveis.cliente_doc_extra ? <>, <strong>{variaveis.cliente_doc_extra}</strong></> : null},
            residente e domiciliado(a) em {variaveis.cliente_endereco || "______________"}
            {variaveis.cliente_telefone ? <>, telefone para contato <strong>{variaveis.cliente_telefone}</strong></> : null}.
          </p>
        )}

        <p style={{ textAlign: "justify", marginBottom: "4mm" }}>
          <strong>CONTRATADA:</strong> Meta Sun Instalações Elétricas LTDA, pessoa jurídica de direito privado,
          inscrita no <strong>CNPJ sob o nº 41.452.412/0001-40</strong>, com sede na Av. Engº Anysio da Rocha
          Compasso, nº 5055, Bairro Rio Madeira, CEP 76.821-381, na cidade de Porto Velho/RO, telefone (69)
          99289-7292, neste ato representada pelo Sr. {variaveis.representante_contratada || "Vitor Sirioli Ribeiro"},
          inscrito no <strong>CPF sob o nº {variaveis.representante_cpf || "007.084.922-66"}</strong> e no{" "}
          <strong>RG nº {variaveis.representante_rg || "998.679 - SESDEC/RO"}</strong>.
        </p>

        <p style={{ textAlign: "justify", marginBottom: "6mm" }}>
          Têm, entre si, justo e acordado o que dispõem as cláusulas abaixo e às quais se obrigam mutuamente:
        </p>

        {visiveis.map((c) => {
          if (c.tipo === "GRUPO") {
            return (
              <p key={c.id} style={{
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: "12pt",
                fontWeight: "bold",
                textTransform: "uppercase",
                marginTop: "6mm",
                marginBottom: "3mm",
                textAlign: "justify",
                letterSpacing: "0.3px",
              }}>
                {c.titulo}
              </p>
            );
          }
          const rendered = substituirVariaveis(c.texto, variaveis);
          const hasMissing = /\{\{(\w+)\}\}/.test(rendered);
          return (
            <p
              key={c.id}
              style={{
                textAlign: "justify",
                marginBottom: "3mm",
                textIndent: "0",
                color: hasMissing ? "#b91c1c" : "#000",
              }}
            >
              <strong style={{ marginRight: "2mm" }}>{c.numero}</strong>
              {rendered}
            </p>
          );
        })}

        <p style={{ marginTop: "10mm", textAlign: "justify" }}>
          {variaveis.cidade || "______________"}, {variaveis.data_contrato || "____/____/______"}.
        </p>

        <div style={{
          marginTop: "20mm",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16mm",
          textAlign: "center",
          fontSize: "11pt",
        }}>
          <div>
            <div style={{ borderTop: "1px solid #000", paddingTop: "2mm" }}>
              <strong>{variaveis.cliente_nome || "______________"}</strong>
            </div>
            <div style={{ fontSize: "10pt", color: "#333" }}>{variaveis.cliente_documento}</div>
            <div style={{ fontWeight: "bold", marginTop: "1mm" }}>CONTRATANTE</div>
          </div>
          <div>
            <div style={{ borderTop: "1px solid #000", paddingTop: "2mm" }}>
              <strong>Meta Sun Instalações Elétricas LTDA</strong>
            </div>
            <div style={{ fontSize: "10pt", color: "#333" }}>
              {variaveis.representante_contratada || "Vitor Sirioli Ribeiro"} — CNPJ 41.452.412/0001-40
            </div>
            <div style={{ fontWeight: "bold", marginTop: "1mm" }}>CONTRATADA</div>
          </div>
        </div>

        {/* Rodapé oficial Meta Sun (apenas na tela; na impressão, o footer fixo se repete em todas as folhas) */}
        <div className="screen-only" style={{ marginTop: "12mm", textAlign: "center" }}>
          <img
            src={metaSunRodape.url}
            alt="Meta Sun — Av. Eng. Anysio da Rocha Compasso 5055, Rio Madeira, Porto Velho - RO, 76821-381 | 69 9.9341-2188 | www.metasun.com.br"
            style={{ display: "block", margin: "0 auto", width: "100%", maxWidth: "680px", height: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}
