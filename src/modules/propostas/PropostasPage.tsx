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
  type ParametroFV, type CustoFV,
  useCidadesFV, useConcessionarias, useModulosFV, useInversoresFV,
  useDistribuidoresFV, useParametrosFV, useCustosFV, usePropostas,
  upsertCidadeFV, removeCidadeFV, upsertConcessionariaFV, removeConcessionariaFV,
  upsertModuloFV, removeModuloFV, upsertInversorFV, removeInversorFV,
  upsertDistribuidorFV, removeDistribuidorFV, upsertParametroFV, removeParametroFV,
  upsertCustoFV, removeCustoFV, upsertProposta, removeProposta,
  novaPropostaVazia, proximoNumeroProposta, calcDimensionamento, calcPrecificacao,
  calcResultado, gerarCustosSugeridos, sugerirParametro, potenciaInversores,
  consumoEfetivo, somaMensal, fmtBRL, fmtNum, validarParaGeracao,
} from "@/modules/propostas/store";

import { PropostaList, statusVariant } from "./components/PropostaList";

export { PropostasPage };

/* =========================== PÁGINA =========================== */

function PropostasPage() {
  const [tab, setTab] = useTabFromHash("/propostas");
  const propostas = usePropostas();
  const [editando, setEditando] = useState<PropostaFV | null>(null);
  const [vendoId, setVendoId] = useState<string | null>(null);

  const propostaVisualizada = vendoId ? propostas.find((p) => p.id === vendoId) ?? null : null;

  function novaProposta() {
    const numero = proximoNumeroProposta(propostas);
    const p = novaPropostaVazia(numero);
    setEditando(p);
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

      {editando && (
        <PropostaSheet
          proposta={editando}
          onClose={() => setEditando(null)}
          onVisualizar={(id) => { setVendoId(id); setEditando(null); }}
        />
      )}
      {propostaVisualizada && (
        <PropostaImpressao proposta={propostaVisualizada} onClose={() => setVendoId(null)} />
      )}
    </>
  );
}

/* =========================== LISTA =========================== */
// PropostaList foi extraído para ./components/PropostaList.tsx

/* =========================== SHEET DE EDIÇÃO =========================== */

function PropostaSheet({
  proposta, onClose, onVisualizar,
}: {
  proposta: PropostaFV;
  onClose: () => void;
  onVisualizar: (id: string) => void;
}) {
  const [p, setP] = useState<PropostaFV>(proposta);
  const cidades = useCidadesFV();
  const concessionarias = useConcessionarias();
  const modulos = useModulosFV();
  const inversores = useInversoresFV();
  const distribuidores = useDistribuidoresFV();
  const parametros = useParametrosFV();
  const custos = useCustosFV();
  const clientes = useClientesFull();

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
    setP((cur) => ({
      ...cur,
      cidadeId: c.id,
      cidade: c.cidade,
      estado: c.estado,
      concessionaria: c.concessionariaPadrao ?? cur.concessionaria,
      irradiacaoMedia: c.irradiacaoMedia ?? cur.irradiacaoMedia,
      mesMaior: c.mesMaiorIrradiacao ?? cur.mesMaior,
      mesMenor: c.mesMenorIrradiacao ?? cur.mesMenor,
      grupoTarifario: c.grupoTarifarioPadrao ?? cur.grupoTarifario,
      tarifa: c.tarifaPadrao ?? cur.tarifa,
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
            <Button size="sm" variant="outline" className="gap-1" onClick={() => salvar()}>
              <Save className="h-4 w-4" /> Salvar rascunho
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={regenerarCustos}>
              <Calculator className="h-4 w-4" /> Recalcular custos
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { upsertProposta(p); onVisualizar(p.id); }}>
              <FileSearch className="h-4 w-4" /> Visualizar
            </Button>
            <Button size="sm" className="gap-1" onClick={() => salvar("ENVIADA")} disabled={erros.length > 0}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
            <Button size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90"
              onClick={aprovarEGerarContrato} disabled={erros.length > 0 || p.status === "APROVADA"}>
              <CheckCircle2 className="h-4 w-4" /> Aprovar → contrato
            </Button>
            <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => salvar("CANCELADA")}>
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
              <div>
                <Label>Cliente cadastrado</Label>
                <Select value={p.clienteId ?? ""} onValueChange={selecionarCliente}>
                  <SelectTrigger><SelectValue placeholder="Buscar..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome} — {c.doc || "sem doc"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Nome do cliente"><Input value={p.clienteNome} onChange={(e) => update("clienteNome", e.target.value)} /></Field>
              <Field label="CPF/CNPJ"><Input value={p.clienteDoc ?? ""} onChange={(e) => update("clienteDoc", e.target.value)} /></Field>
              <Field label="Telefone"><Input value={p.clienteTelefone ?? ""} onChange={(e) => update("clienteTelefone", e.target.value)} /></Field>
              <Field label="E-mail"><Input type="email" value={p.clienteEmail ?? ""} onChange={(e) => update("clienteEmail", e.target.value)} /></Field>
              <Field label="Endereço"><Input value={p.clienteEndereco ?? ""} onChange={(e) => update("clienteEndereco", e.target.value)} /></Field>
            </div>
          </Bloco>

          {/* BLOCO 2 — Localização */}
          <Bloco icon={<MapPin className="h-4 w-4" />} title="2. Localização">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Cidade cadastrada</Label>
                <Select value={p.cidadeId ?? ""} onValueChange={selecionarCidade}>
                  <SelectTrigger><SelectValue placeholder="Buscar..." /></SelectTrigger>
                  <SelectContent>
                    {cidades.map((c) => <SelectItem key={c.id} value={c.id}>{c.cidade}/{c.estado}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Cidade"><Input value={p.cidade} onChange={(e) => update("cidade", e.target.value)} /></Field>
              <Field label="Estado"><Input value={p.estado} onChange={(e) => update("estado", e.target.value)} /></Field>
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
              <Field label="Irradiação média (kWh/m²·dia)" hint="Média de sol da cidade. Quanto maior, menor o sistema necessário.">
                <Input type="number" step="0.1" value={p.irradiacaoMedia} onChange={(e) => update("irradiacaoMedia", +e.target.value)} />
              </Field>
              <Field label="Mês maior irradiação"><Input value={p.mesMaior ?? ""} onChange={(e) => update("mesMaior", e.target.value)} /></Field>
              <Field label="Mês menor irradiação"><Input value={p.mesMenor ?? ""} onChange={(e) => update("mesMenor", e.target.value)} /></Field>
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
              <Field label="Tarifa de energia (R$/kWh)">
                <Input type="number" step="0.01" value={p.tarifa} onChange={(e) => update("tarifa", +e.target.value)} />
              </Field>
              <Field label="Conta mínima (kWh)" hint="Consumo mínimo cobrado pela concessionária mesmo com geração própria.">
                <Input type="number" value={p.contaMinimaKwh} onChange={(e) => update("contaMinimaKwh", +e.target.value)} />
              </Field>
              <Field label="Iluminação pública (R$)">
                <Input type="number" step="0.01" value={p.taxaIluminacao} onChange={(e) => update("taxaIluminacao", +e.target.value)} />
              </Field>
              <Field label="Conta média atual (R$)">
                <Input type="number" step="0.01" value={p.contaMediaAtual} onChange={(e) => update("contaMediaAtual", +e.target.value)} />
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
                <Input type="number" value={p.consumoMedio} onChange={(e) => update("consumoMedio", +e.target.value)} />
              </Field>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {(["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"] as const).map((m) => (
                    <div key={m}>
                      <Label className="text-xs uppercase">{m}</Label>
                      <Input type="number" value={p.consumoMensal?.[m] ?? ""}
                        onChange={(e) => update("consumoMensal", { ...(p.consumoMensal ?? {}), [m]: +e.target.value })} />
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
              <Field label="Geração desejada (kWh/mês)" hint="Padrão = consumo médio.">
                <Input type="number" value={p.geracaoDesejada} onChange={(e) => update("geracaoDesejada", +e.target.value)} />
              </Field>
              <Field label="Taxa de simultaneidade (%)">
                <Input type="number" value={Math.round((p.taxaSimultaneidade || 0) * 100)}
                  onChange={(e) => update("taxaSimultaneidade", (+e.target.value || 0) / 100)} />
              </Field>
              <Field label="Fator de performance">
                <Input type="number" step="0.01" value={p.fatorPerformance}
                  onChange={(e) => update("fatorPerformance", +e.target.value)} />
              </Field>
              <ReadOnlyField label="Consumo instantâneo (kWh)" value={fmtNum(dim.consumoInstantaneo, 0)} />
              <ReadOnlyField label="Geração injetada (kWh)" value={fmtNum(dim.geracaoInjetada, 0)} />
              <ReadOnlyField label="Potência necessária (kWp)" value={fmtNum(dim.potenciaNecKwp, 2)} />
              <ReadOnlyField label="Quantidade calculada" value={String(dim.qtdCalc)} />
              <Field label="Quantidade final (módulos)">
                <div className="flex items-center gap-2">
                  <Switch checked={!!p.ajusteManualModulos} onCheckedChange={(v) => update("ajusteManualModulos", v)} />
                  <Input type="number" disabled={!p.ajusteManualModulos}
                    value={p.ajusteManualModulos ? (p.modulosManual ?? dim.qtdCalc) : dim.qtdCalc}
                    onChange={(e) => update("modulosManual", +e.target.value)} />
                </div>
              </Field>
              <ReadOnlyField label="Potência final (kWp)" value={fmtNum(dim.potenciaFinalKwp, 2)} />
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

function PropostaImpressao({ proposta, onClose }: { proposta: PropostaFV; onClose: () => void }) {
  const inversores = useInversoresFV();
  const dim = calcDimensionamento(proposta);
  const pre = calcPrecificacao(proposta);

  function imprimir() {
    document.body.classList.add("print-proposta");
    window.print();
    setTimeout(() => document.body.classList.remove("print-proposta"), 500);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Visualização — {proposta.numero}</DialogTitle>
        </DialogHeader>

        <style>{`
          @media print {
            body.print-proposta * { visibility: hidden !important; }
            body.print-proposta .proposta-print, body.print-proposta .proposta-print * { visibility: visible !important; }
            body.print-proposta .proposta-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
            body.print-proposta .no-print { display: none !important; }
          }
        `}</style>

        <div className="proposta-print space-y-6 px-2 text-sm text-foreground">
          <header className="flex items-start justify-between border-b pb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary">Meta Sun · Energia Solar</div>
              <h1 className="text-2xl font-semibold">Proposta Comercial Fotovoltaica</h1>
              <div className="mt-1 text-xs text-muted-foreground">Nº {proposta.numero} · Emitida em {proposta.criadoEm} · Válida até {proposta.validade}</div>
            </div>
            <div className="text-right text-xs">
              <div className="font-semibold">Status: {proposta.status}</div>
            </div>
          </header>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Cliente</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><strong>Nome:</strong> {proposta.clienteNome}</div>
              <div><strong>CPF/CNPJ:</strong> {proposta.clienteDoc || "—"}</div>
              <div><strong>Telefone:</strong> {proposta.clienteTelefone || "—"}</div>
              <div><strong>E-mail:</strong> {proposta.clienteEmail || "—"}</div>
              <div className="col-span-2"><strong>Endereço:</strong> {proposta.clienteEndereco || "—"} — {proposta.cidade}/{proposta.estado}</div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Sistema fotovoltaico proposto</h2>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Info label="Potência" value={`${fmtNum(dim.potenciaFinalKwp, 2)} kWp`} />
              <Info label="Quantidade de módulos" value={String(dim.qtdFinal)} />
              <Info label="Módulo" value={`${proposta.moduloMarca || "—"} ${proposta.moduloModelo || ""} (${proposta.moduloPotenciaWp}W)`} />
              <Info label="Área estimada" value={`${fmtNum(dim.areaTotal, 1)} m²`} />
              <Info label="Geração média mensal" value={`${fmtNum(dim.geracaoMensalKwh, 0)} kWh`} />
              <Info label="Geração média anual" value={`${fmtNum(dim.geracaoAnualKwh, 0)} kWh`} />
              <Info label="Concessionária" value={proposta.concessionaria || "—"} />
              <Info label="Tipo de instalação" value={proposta.tipoInstalacao} />
              <Info label="Tipo de telhado" value={proposta.tipoTelhado} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Inversores</h2>
            <ul className="list-disc pl-5 text-xs">
              {proposta.inversores.map((e, i) => {
                const inv = inversores.find((x) => x.id === e.inversorId);
                return inv ? <li key={i}>{e.quantidade}× {inv.marca} {inv.modelo} ({inv.potenciaKw} kW)</li> : null;
              })}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Comparativo energético</h2>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Info label="Consumo médio" value={`${fmtNum(consumoEfetivo(proposta), 0)} kWh/mês`} />
              <Info label="Geração média" value={`${fmtNum(dim.geracaoMensalKwh, 0)} kWh/mês`} />
              <Info label="Economia estimada" value={fmtBRL(dim.geracaoMensalKwh * (proposta.tarifa || 0))} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Investimento</h2>
            <div className="rounded-md border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Valor total</span>
                <span className="text-2xl font-bold">{fmtBRL(pre.valorFinal)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Validade: {proposta.validade}</div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Garantias</h2>
            <ul className="list-disc pl-5 text-xs">
              <li>Módulos: 12 anos de produto · 25–30 anos de performance</li>
              <li>Inversores: 10 anos do fabricante</li>
              <li>Estrutura de fixação: 12 anos</li>
              <li>Instalação Meta Sun: 1 ano</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Por que escolher a Meta Sun</h2>
            <ul className="grid grid-cols-2 gap-1 pl-5 text-xs list-disc">
              <li>Mais de 750 projetos entregues</li>
              <li>Mais de 8 MW instalados/em operação</li>
              <li>Equipe de engenharia própria</li>
              <li>Atuação em todo o Brasil</li>
              <li>Atendimento personalizado</li>
              <li>Retorno garantido em contrato</li>
            </ul>
          </section>

          {proposta.obsCliente && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Observações</h2>
              <p className="whitespace-pre-line text-xs">{proposta.obsCliente}</p>
            </section>
          )}

          <section className="grid grid-cols-2 gap-8 pt-8">
            <div className="text-center">
              <div className="border-t border-foreground pt-1 text-xs">Cliente</div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground pt-1 text-xs">Meta Sun · Energia Solar</div>
            </div>
          </section>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={imprimir} className="gap-2"><Printer className="h-4 w-4" /> Imprimir / Salvar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

/* =========================== CADASTROS =========================== */

function CadastrosFV() {
  return (
    <Tabs defaultValue="cidades" className="w-full">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="cidades">Cidades</TabsTrigger>
        <TabsTrigger value="concs">Concessionárias</TabsTrigger>
        <TabsTrigger value="modulos">Módulos</TabsTrigger>
        <TabsTrigger value="inversores">Inversores</TabsTrigger>
        <TabsTrigger value="dist">Distribuidores</TabsTrigger>
        <TabsTrigger value="param">Parâmetros</TabsTrigger>
        <TabsTrigger value="custos">Custos</TabsTrigger>
      </TabsList>
      <TabsContent value="cidades" className="mt-4"><CrudCidades /></TabsContent>
      <TabsContent value="concs" className="mt-4"><CrudConcessionarias /></TabsContent>
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

function AjudaTab() {
  return (
    <Card className="p-6 leading-relaxed text-sm">
      <h3 className="text-lg font-semibold">Como o módulo funciona</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li><strong>Cadastros:</strong> mantenha cidades, módulos, inversores, parâmetros e custos atualizados — eles alimentam os cálculos.</li>
        <li><strong>Nova proposta:</strong> selecione cliente e cidade — o sistema preenche endereço, concessionária, irradiação e tarifa automaticamente.</li>
        <li><strong>Consumo:</strong> informe a média mensal ou os 12 meses individualmente.</li>
        <li><strong>Dimensionamento:</strong> potência necessária = geração desejada / (irradiação × 30 × performance). Quantidade de módulos é arredondada para cima.</li>
        <li><strong>Inversores:</strong> adicione um ou mais. O sistema alerta se a soma de potência diverge muito da potência do sistema.</li>
        <li><strong>Precificação:</strong> parâmetro sugerido pela faixa de kWp. Aplique desconto em % ou R$, ou sobrescreva o valor final.</li>
        <li><strong>Custos:</strong> clique em <em>Recalcular sugeridos</em> — o sistema calcula quantidades por módulo (cabos, MC4, hooks, trilho, estrutura) e aplica % sobre valor final (comissão, risco).</li>
        <li><strong>Resultado:</strong> margem é destacada em verde, amarelo ou vermelho. Margem negativa exibe alerta.</li>
        <li><strong>Aprovar → contrato:</strong> bloqueia edição e gera um contrato no módulo Comercial automaticamente.</li>
      </ol>
      <div className="mt-4 text-xs text-muted-foreground">
        Atalhos no Comercial: <Link to="/comercial" className="underline">ir para Comercial</Link>.
      </div>
    </Card>
  );
}
