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
  CATEGORIA_LABEL, clausulasPadrao,
  substituirVariaveis, variaveisFaltando, valorPorExtenso,
  somaFormaPagamento, descricaoFormaPagamento, formaPagamentoVazia,
  FP_LABEL, BANCOS_FINANCIAMENTO,
  renumerar, inserirItem, removerItem, alterarTextoItem,
  salvarTemplateUsuario, carregarTemplateUsuario, existeTemplateUsuario, limparTemplateUsuario,
  type Clausula, type ClausulaCategoria, type FormaPagamentoConfig,
  type FormaPagamentoTipo, type Variaveis,
} from "@/lib/contrato-clausulas-template";

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
  inversor?: string | null;
  potencia_kwp?: number | null;
  modulos_qtd?: number | null;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

type DadosContratuais = {
  // Contratante editáveis (snapshot contratual, não cliente 360)
  contratante_nome?: string;
  contratante_doc?: string;
  contratante_telefone?: string;
  contratante_whatsapp?: string;
  contratante_email?: string;
  contratante_endereco?: string;
  contratante_cidade?: string;
  contratante_uf?: string;
  contratante_cep?: string;
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
  const [state, setState] = useState<DadosContratuais>(() => ({
    contratante_nome: dadosIni.contratante_nome ?? cliente?.nome ?? "",
    contratante_doc: dadosIni.contratante_doc ?? cliente?.doc ?? "",
    contratante_telefone: dadosIni.contratante_telefone ?? cliente?.telefone ?? "",
    contratante_whatsapp: dadosIni.contratante_whatsapp ?? "",
    contratante_email: dadosIni.contratante_email ?? cliente?.email ?? "",
    contratante_endereco: dadosIni.contratante_endereco ??
      [cliente?.rua, cliente?.numero, cliente?.bairro].filter(Boolean).join(", "),
    contratante_cidade: dadosIni.contratante_cidade ?? cliente?.cidade ?? "",
    contratante_uf: dadosIni.contratante_uf ?? cliente?.uf ?? "",
    contratante_cep: dadosIni.contratante_cep ?? "",
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
  }));
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
      const ABAS = ["contratante", "contratuais", "pagamento", "clausulas", "previa"];
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

  // ---- Variáveis para prévia ----
  const variaveis: Variaveis = useMemo(() => ({
    cliente_nome: state.contratante_nome || "",
    cliente_documento: state.contratante_doc || "",
    cliente_endereco: [state.contratante_endereco, state.contratante_cidade, state.contratante_uf]
      .filter(Boolean).join(", "),
    valor_total: brl(valorTotal),
    valor_total_extenso: valorPorExtenso(valorTotal),
    potencia_kwp: contrato.potencia_kwp != null
      ? Number(contrato.potencia_kwp).toFixed(2)
      : (proposta?.potencia_kwp != null ? Number(proposta.potencia_kwp).toFixed(2) : ""),
    quantidade_modulos: contrato.modulos_qtde ?? proposta?.modulos_qtd ?? "",
    inversor: proposta?.inversor ?? "",
    forma_pagamento: descricaoFormaPagamento(state.forma_pagamento_config),
    prazo_execucao: state.prazo_execucao_dias != null ? String(state.prazo_execucao_dias) : "",
    cidade: state.local_assinatura || state.contratante_cidade || "",
    data_contrato: state.data_base_contrato || "",
  }), [state, valorTotal, contrato.potencia_kwp, contrato.modulos_qtde, proposta]);

  const varsFaltando = useMemo(() => variaveisFaltando(variaveis), [variaveis]);
  const somaFP = useMemo(() => somaFormaPagamento(state.forma_pagamento_config), [state.forma_pagamento_config]);
  const fpFecha = Math.abs(somaFP - valorTotal) < 0.01;

  // Validações p/ Gerar
  const erros = useMemo(() => {
    const arr: string[] = [];
    if (!state.contratante_nome?.trim()) arr.push("nome do contratante");
    if (!state.contratante_doc?.trim()) arr.push("documento");
    if (!state.contratante_endereco?.trim()) arr.push("endereço contratual");
    if (!state.assinatura_email?.trim()) arr.push("e-mail de assinatura");
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
          <TabsTrigger value="contratuais">Dados Contratuais</TabsTrigger>
          <TabsTrigger value="pagamento">
            Forma de Pagamento {state.forma_pagamento_config && (
              <Badge variant={fpFecha ? "default" : "destructive"} className="ml-2 text-[10px] h-4">
                {fpFecha ? "OK" : `${brl(somaFP)}/${brl(valorTotal)}`}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clausulas">Cláusulas ({(state.clausulas ?? []).filter((c) => !c.oculta).length})</TabsTrigger>
          <TabsTrigger value="previa">Prévia</TabsTrigger>
        </TabsList>

        {/* CONTRATANTE */}
        <TabsContent value="contratante" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Field label="Nome / Razão social *" v={state.contratante_nome} on={(v) => upd("contratante_nome", v)} disabled={!podeEditar} />
            <Field label="CPF / CNPJ *" v={state.contratante_doc} on={(v) => upd("contratante_doc", v)} disabled={!podeEditar} />
            <Field label="Telefone" v={state.contratante_telefone} on={(v) => upd("contratante_telefone", v)} disabled={!podeEditar} />
            <Field label="WhatsApp" v={state.contratante_whatsapp} on={(v) => upd("contratante_whatsapp", v)} disabled={!podeEditar} />
            <Field label="E-mail" v={state.contratante_email} on={(v) => upd("contratante_email", v)} disabled={!podeEditar} />
            <Field label="CEP" v={state.contratante_cep} on={(v) => upd("contratante_cep", v)} disabled={!podeEditar} />
            <Field label="Endereço contratual *" v={state.contratante_endereco} on={(v) => upd("contratante_endereco", v)} disabled={!podeEditar} className="md:col-span-2" />
            <Field label="Cidade" v={state.contratante_cidade} on={(v) => upd("contratante_cidade", v)} disabled={!podeEditar} />
            <Field label="UF" v={state.contratante_uf} on={(v) => upd("contratante_uf", v)} disabled={!podeEditar} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Alterações aqui salvam um <strong>snapshot contratual</strong> em <code>contratos.dados</code> e
            <strong> não sobrescrevem o Cliente 360°</strong>.
          </p>
        </TabsContent>

        {/* DADOS CONTRATUAIS */}
        <TabsContent value="contratuais" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Field label="Responsável pela assinatura" v={state.responsavel_assinatura} on={(v) => upd("responsavel_assinatura", v)} disabled={!podeEditar} />
            <Field label="CPF do responsável (se PJ)" v={state.responsavel_cpf} on={(v) => upd("responsavel_cpf", v)} disabled={!podeEditar} />
            <Field label="E-mail de assinatura *" v={state.assinatura_email} on={(v) => upd("assinatura_email", v)} disabled={!podeEditar} />
            <Field label="Telefone de assinatura" v={state.assinatura_telefone} on={(v) => upd("assinatura_telefone", v)} disabled={!podeEditar} />
            <NumField label="Prazo contratual (dias)" v={state.prazo_contratual_dias} on={(v) => upd("prazo_contratual_dias", v)} disabled={!podeEditar} />
            <DateField label="Data prevista de assinatura" v={state.data_prevista_assinatura} on={(v) => upd("data_prevista_assinatura", v)} disabled={!podeEditar} />
            <Field label="Local de assinatura" v={state.local_assinatura} on={(v) => upd("local_assinatura", v)} disabled={!podeEditar} />
            <DateField label="Data base do contrato" v={state.data_base_contrato} on={(v) => upd("data_base_contrato", v)} disabled={!podeEditar} />
            <NumField label="Prazo execução (dias)" v={state.prazo_execucao_dias} on={(v) => upd("prazo_execucao_dias", v)} disabled={!podeEditar} />
            <Field label="Endereço de instalação" v={state.endereco_instalacao} on={(v) => upd("endereco_instalacao", v)} disabled={!podeEditar} className="md:col-span-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
            <div>
              <Label className="text-xs">Observações internas</Label>
              <Textarea className="mt-1" rows={3} disabled={!podeEditar}
                value={state.observacoes_internas ?? ""} onChange={(e) => upd("observacoes_internas", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Observações que entram no contrato</Label>
              <Textarea className="mt-1" rows={3} disabled={!podeEditar}
                value={state.observacoes_contrato ?? ""} onChange={(e) => upd("observacoes_contrato", e.target.value)} />
            </div>
          </div>
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground mt-3">
            <strong>Travado pela proposta origem:</strong> valor total ({brl(valorTotal)}), potência,
            módulos, inversor e consumo. Alterar exige nova proposta ou aditivo após a assinatura.
          </div>
        </TabsContent>

        {/* FORMA DE PAGAMENTO */}
        <TabsContent value="pagamento" className="mt-3">
          <FormaPagamentoEditor
            valorTotal={valorTotal}
            disabled={!podeEditar}
            value={state.forma_pagamento_config}
            onChange={(v) => upd("forma_pagamento_config", v)}
          />
          <div className="mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>Soma das formas: <strong className="tabular-nums">{brl(somaFP)}</strong></span>
            <span>Valor do contrato: <strong className="tabular-nums">{brl(valorTotal)}</strong></span>
            {fpFecha
              ? <Badge className="bg-emerald-600">Fecha</Badge>
              : <Badge variant="destructive">Diferença: {brl(somaFP - valorTotal)}</Badge>}
          </div>
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
            clausulas={state.clausulas ?? []}
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
function NumField({ label, v, on, disabled }: { label: string; v: number | undefined; on: (v: number) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1 h-8" type="number" value={v ?? ""} onChange={(e) => on(Number(e.target.value))} disabled={disabled} />
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
// ===================================================================
function FormaPagamentoEditor({ valorTotal, disabled, value, onChange }: {
  valorTotal: number; disabled?: boolean; value: FormaPagamentoConfig | null | undefined;
  onChange: (v: FormaPagamentoConfig | null) => void;
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
            {(Object.keys(FP_LABEL) as FormaPagamentoTipo[]).map((t) => (
              <SelectItem key={t} value={t}>{FP_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tipo === "PIX" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.pix?.valor} on={(v) => patch("pix", { valor: v })} disabled={disabled} />
          <DateField label="Data prevista" v={value!.pix?.data} on={(v) => patch("pix", { data: v })} disabled={disabled} />
          <Field label="Chave/observação" v={value!.pix?.chave} on={(v) => patch("pix", { chave: v })} disabled={disabled} />
          <div className="md:col-span-3">
            <Label className="text-xs">Condição textual para o contrato</Label>
            <Textarea rows={2} className="mt-1" disabled={disabled} value={value!.pix?.observacao ?? ""} onChange={(e) => patch("pix", { observacao: e.target.value })} />
          </div>
        </div>
      )}

      {tipo === "BOLETO" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.boleto?.valor} on={(v) => patch("boleto", { valor: v })} disabled={disabled} />
          <NumField label="Qtde parcelas" v={value!.boleto?.parcelas} on={(v) => patch("boleto", { parcelas: v })} disabled={disabled} />
          <NumField label="Valor da parcela" v={value!.boleto?.valor_parcela} on={(v) => patch("boleto", { valor_parcela: v })} disabled={disabled} />
          <DateField label="1º vencimento" v={value!.boleto?.primeiro_venc} on={(v) => patch("boleto", { primeiro_venc: v })} disabled={disabled} />
          <NumField label="Dia fixo de vencimento" v={value!.boleto?.dia_fixo} on={(v) => patch("boleto", { dia_fixo: v })} disabled={disabled} />
          <Field label="Observação" v={value!.boleto?.observacao} on={(v) => patch("boleto", { observacao: v })} disabled={disabled} />
        </div>
      )}

      {tipo === "CARTAO" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor total" v={value!.cartao?.valor} on={(v) => patch("cartao", { valor: v })} disabled={disabled} />
          <NumField label="Qtde parcelas" v={value!.cartao?.parcelas} on={(v) => patch("cartao", { parcelas: v })} disabled={disabled} />
          <Field label="Bandeira" v={value!.cartao?.bandeira} on={(v) => patch("cartao", { bandeira: v })} disabled={disabled} />
          <NumField label="Taxa (%)" v={value!.cartao?.taxa} on={(v) => patch("cartao", { taxa: v })} disabled={disabled} />
          <Field label="Observação" v={value!.cartao?.observacao} on={(v) => patch("cartao", { observacao: v })} disabled={disabled} className="md:col-span-2" />
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
          <NumField label="Prazo (meses)" v={value!.financiamento?.prazo_meses} on={(v) => patch("financiamento", { prazo_meses: v })} disabled={disabled} />
          <Field label="Status financiamento" v={value!.financiamento?.status} on={(v) => patch("financiamento", { status: v })} disabled={disabled} />
          <Field label="Observação" v={value!.financiamento?.observacao} on={(v) => patch("financiamento", { observacao: v })} disabled={disabled} />
          <div className="md:col-span-3">
            <Label className="text-xs">Cláusula específica de financiamento</Label>
            <Textarea rows={2} className="mt-1" disabled={disabled} value={value!.financiamento?.clausula ?? ""} onChange={(e) => patch("financiamento", { clausula: e.target.value })} />
          </div>
        </div>
      )}

      {tipo === "ENTRADA_PARCELAS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <NumField label="Valor de entrada" v={value!.entrada_parcelas?.entrada} on={(v) => patch("entrada_parcelas", { entrada: v })} disabled={disabled} />
          <DateField label="Data da entrada" v={value!.entrada_parcelas?.entrada_data} on={(v) => patch("entrada_parcelas", { entrada_data: v })} disabled={disabled} />
          <NumField label="Saldo parcelado" v={value!.entrada_parcelas?.saldo} on={(v) => patch("entrada_parcelas", { saldo: v })} disabled={disabled} />
          <NumField label="Qtde parcelas" v={value!.entrada_parcelas?.parcelas} on={(v) => patch("entrada_parcelas", { parcelas: v })} disabled={disabled} />
          <DateField label="1º vencimento" v={value!.entrada_parcelas?.primeiro_venc} on={(v) => patch("entrada_parcelas", { primeiro_venc: v })} disabled={disabled} />
        </div>
      )}

      {tipo === "MISTO" && value!.misto && (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">
            Compõe combinações: financiamento + PIX, financiamento + boleto, PIX + boleto, cartão + PIX, etc.
            A soma dos componentes deve igualar o valor total do contrato ({brl(valorTotal)}).
          </p>
          {value!.misto.componentes.map((c, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-md border p-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={c.tipo} onValueChange={(v) => {
                  const arr = [...value!.misto!.componentes];
                  arr[i] = { ...arr[i], tipo: v as FormaPagamentoTipo };
                  patch("misto", { componentes: arr });
                }} disabled={disabled}>
                  <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["PIX","BOLETO","CARTAO","FINANCIAMENTO"] as FormaPagamentoTipo[]).map((t) =>
                      <SelectItem key={t} value={t}>{FP_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <NumField label="Valor" v={c.valor} on={(v) => {
                const arr = [...value!.misto!.componentes];
                arr[i] = { ...arr[i], valor: v };
                patch("misto", { componentes: arr });
              }} disabled={disabled} />
              <Field label="Observação" v={c.obs} on={(v) => {
                const arr = [...value!.misto!.componentes];
                arr[i] = { ...arr[i], obs: v };
                patch("misto", { componentes: arr });
              }} disabled={disabled} />
              <div className="flex items-end">
                <Button size="sm" variant="ghost" disabled={disabled} onClick={() => {
                  const arr = value!.misto!.componentes.filter((_, idx) => idx !== i);
                  patch("misto", { componentes: arr });
                }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => {
            const arr = [...value!.misto!.componentes, { tipo: "PIX" as FormaPagamentoTipo, valor: 0, obs: "" }];
            patch("misto", { componentes: arr });
          }}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar componente</Button>
        </div>
      )}
    </div>
  );
}

// ===================================================================
// Cláusulas — editor INLINE: cada cláusula tem seus próprios botões.
// ===================================================================
function ClausulasEditor({ disabled, clausulas, onChange }: {
  disabled?: boolean; clausulas: Clausula[]; onChange: (v: Clausula[]) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const [addId, setAddId] = useState<string | null>(null);
  const [addPos, setAddPos] = useState<"antes" | "depois">("depois");
  const [addTexto, setAddTexto] = useState("");

  function abrirEdit(c: Clausula) {
    setEditId(c.id); setEditTexto(c.texto);
    setAddId(null); setAddTexto("");
  }
  function abrirAdd(c: Clausula, pos: "antes" | "depois") {
    setAddId(c.id); setAddPos(pos); setAddTexto("");
    setEditId(null); setEditTexto("");
  }
  function fechar() {
    setEditId(null); setEditTexto("");
    setAddId(null); setAddTexto("");
  }

  function aplicarEdit() {
    if (!editId) return;
    if (editTexto.trim().length < 5) { toast.error("Texto muito curto."); return; }
    onChange(alterarTextoItem(clausulas, editId, editTexto.trim()));
    toast.success("Cláusula alterada.");
    fechar();
  }
  function aplicarExcluir(c: Clausula) {
    if (c.obrigatoria) { toast.error("Cláusula obrigatória não pode ser retirada."); return; }
    if (!confirm(`Excluir a cláusula ${c.numero}? As seguintes do mesmo grupo serão renumeradas.`)) return;
    onChange(removerItem(clausulas, c.id));
    toast.success(`Cláusula ${c.numero} retirada.`);
    if (editId === c.id || addId === c.id) fechar();
  }
  function aplicarAdd() {
    if (!addId) return;
    if (addTexto.trim().length < 5) { toast.error("Texto muito curto."); return; }
    const ref = clausulas.find((x) => x.id === addId);
    onChange(inserirItem(clausulas, addId, addPos, addTexto.trim(), ref?.categoria ?? "OBRIG_CONTRATADA"));
    toast.success(`Cláusula inserida ${addPos} de ${ref?.numero ?? ""}.`);
    fechar();
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

  return (
    <div className="space-y-3">
      {/* Cabeçalho + toolbar de template */}
      <div className="flex items-start justify-between gap-2 flex-wrap border-b pb-2">
        <p className="text-xs text-muted-foreground max-w-md">
          Template oficial Meta Sun — <strong>{totalItens} cláusulas</strong>.
          Passe o mouse em cada cláusula para <strong>editar</strong>, <strong>excluir</strong> ou <strong>adicionar</strong> antes/depois dela.
        </p>
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

      {/* Lista de cláusulas com ações inline */}
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

          const emEdicao = editId === c.id;
          const adicionando = addId === c.id;

          return (
            <div key={c.id} className="space-y-1.5">
              {adicionando && addPos === "antes" && (
                <AddInline refNumero={c.numero ?? ""} posicao="antes"
                  texto={addTexto} onTexto={setAddTexto} onCancel={fechar} onAdd={aplicarAdd} />
              )}

              <div className={`group rounded-md border p-2 transition hover:bg-muted/40 ${c.oculta ? "opacity-50" : ""} ${emEdicao ? "ring-2 ring-amber-400 bg-amber-50/40" : ""}`}>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] tabular-nums shrink-0 mt-0.5">{c.numero}</Badge>
                  {c.obrigatoria && <Badge variant="default" className="text-[10px] shrink-0">Obrig.</Badge>}
                  {c.complementar && <Badge variant="outline" className="text-[10px] shrink-0 border-sky-500 text-sky-700">Compl.</Badge>}

                  <div className="flex-1 min-w-0">
                    {!emEdicao ? (
                      <p className="text-xs whitespace-pre-wrap">{c.texto}</p>
                    ) : (
                      <div className="space-y-1.5">
                        <Textarea rows={5} className="text-xs" value={editTexto}
                          onChange={(e) => setEditTexto(e.target.value)} autoFocus />
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={fechar}>Cancelar</Button>
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={aplicarEdit}>
                            Salvar alteração
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!emEdicao && !disabled && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-700 hover:bg-amber-100"
                        onClick={() => abrirEdit(c)} title="Editar texto desta cláusula">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-sky-700 hover:bg-sky-100"
                        onClick={() => abrirAdd(c, "antes")} title="Adicionar nova cláusula ANTES desta">
                        <Plus className="h-3.5 w-3.5 -rotate-90" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-sky-700 hover:bg-sky-100"
                        onClick={() => abrirAdd(c, "depois")} title="Adicionar nova cláusula DEPOIS desta">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        className={`h-7 px-2 ${c.obrigatoria ? "text-muted-foreground cursor-not-allowed" : "text-rose-700 hover:bg-rose-100"}`}
                        onClick={() => aplicarExcluir(c)} disabled={c.obrigatoria}
                        title={c.obrigatoria ? "Cláusula obrigatória — não pode ser excluída" : "Excluir esta cláusula"}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {adicionando && addPos === "depois" && (
                <AddInline refNumero={c.numero ?? ""} posicao="depois"
                  texto={addTexto} onTexto={setAddTexto} onCancel={fechar} onAdd={aplicarAdd} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddInline({ refNumero, posicao, texto, onTexto, onCancel, onAdd }: {
  refNumero: string; posicao: "antes" | "depois";
  texto: string; onTexto: (v: string) => void;
  onCancel: () => void; onAdd: () => void;
}) {
  return (
    <div className="rounded-md border-2 border-dashed border-sky-400 bg-sky-50/60 dark:bg-sky-950/20 p-2 space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-sky-800 dark:text-sky-200">
        <Plus className="h-3.5 w-3.5" />
        <span>Nova cláusula <strong>{posicao}</strong> de <strong>{refNumero}</strong> — será renumerada automaticamente.</span>
      </div>
      <Textarea rows={4} className="text-xs" value={texto} onChange={(e) => onTexto(e.target.value)}
        placeholder="Digite o texto completo da nova cláusula..." autoFocus />
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white" onClick={onAdd}>
          Adicionar cláusula
        </Button>
      </div>
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
      <div className="flex items-center justify-between">
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
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <strong>Variáveis obrigatórias vazias:</strong> {varsFaltando.join(", ")}.
          A geração do contrato está bloqueada.
        </div>
      )}
      <Card className="p-4 bg-white dark:bg-zinc-950 max-h-[640px] overflow-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <h2 className="text-center">CONTRATO DE FORNECIMENTO E INSTALAÇÃO DE SISTEMA FOTOVOLTAICO ON-GRID</h2>
          {visiveis.map((c) => {
            if (c.tipo === "GRUPO") {
              return (
                <h3 key={c.id} className="mt-6 font-bold uppercase text-sm tracking-wide">
                  {c.titulo}
                </h3>
              );
            }
            const rendered = substituirVariaveis(c.texto, variaveis);
            const hasMissing = /\{\{(\w+)\}\}/.test(rendered);
            return (
              <p key={c.id} className={`my-2 text-justify ${hasMissing ? "text-destructive" : ""}`}>
                <strong className="mr-1 tabular-nums">{c.numero}</strong>
                {rendered}
              </p>
            );
          })}
          <div className="mt-8 text-xs">
            <p>{variaveis.cidade || "______________"}, {variaveis.data_contrato || "____/____/______"}.</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t mt-12 pt-1">CONTRATANTE</div>
              <div>{variaveis.cliente_nome}</div>
              <div className="text-[10px] text-muted-foreground">{variaveis.cliente_documento}</div>
            </div>
            <div>
              <div className="border-t mt-12 pt-1">CONTRATADA</div>
              <div>META SUN INSTALAÇÕES ELÉTRICAS LTDA</div>
              <div className="text-[10px] text-muted-foreground">CNPJ 41.452.412/0001-40</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
