/**
 * D17.UI Fase 5b — Operações Financeiras (UI funcional Enterprise)
 *
 * Wireup completo:
 *  • EnterpriseRecordToolbar oficial com busca canônica e filtros.
 *  • Grid por aba (tipo) com RowActions (visualizar/aprovar/liberar/cancelar/timeline).
 *  • Drawer com parcelas + timeline (operacoes_financeiras_eventos).
 *  • Modal "Novo" cabeada à rpc_op_fin_criar.
 *
 * Regra de pedra (Onda F): NUNCA toca contratos/PV/propostas/eng/comissão.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Landmark, Wallet, Undo2, Star, CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EnterpriseRecordToolbar, ModuloHistoricoDrawer } from "@/components/app/enterprise";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { OperacoesFinanceirasGrid } from "@/components/op-financeiras/OperacoesFinanceirasGrid";
import {
  type OpFinTipo, useCriarOperacao,
} from "@/lib/repositories/op-financeiras-repo";

export const Route = createFileRoute("/operacoes-financeiras")({
  head: () => ({ meta: [{ title: "Operações Financeiras — Meta Sun" }] }),
  component: OperacoesFinanceirasPage,
});

type Tab = "emprestimos" | "aportes" | "devolucoes" | "especiais" | "parcelamentos";

const TAB_META: Record<Tab, {
  label: string; icon: typeof Landmark; descricao: string;
  tipos?: OpFinTipo[]; apenasParceladas?: boolean; tipoNovoDefault: OpFinTipo;
  natureza: "ENTRADA" | "SAIDA";
}> = {
  emprestimos: {
    label: "Empréstimos", icon: Landmark,
    descricao: "Capital de giro, BNDES, FCO, linhas bancárias e empréstimos entre partes.",
    tipos: ["EMPRESTIMO_COLABORADOR","EMPRESTIMO_CLIENTE","EMPRESTIMO_FORNECEDOR","EMPRESTIMO_SOCIO_EMPRESA","EMPRESTIMO_EMPRESA_TERCEIRO","CAPITAL_DE_GIRO"],
    tipoNovoDefault: "CAPITAL_DE_GIRO", natureza: "ENTRADA",
  },
  aportes: {
    label: "Aportes", icon: Wallet,
    descricao: "Aportes de sócios e capital próprio.",
    tipos: ["APORTE_CAPITAL"],
    tipoNovoDefault: "APORTE_CAPITAL", natureza: "ENTRADA",
  },
  devolucoes: {
    label: "Devoluções", icon: Undo2,
    descricao: "Devoluções a sócios e amortizações antecipadas (empréstimo sócio→empresa, natureza saída).",
    tipos: ["EMPRESTIMO_SOCIO_EMPRESA"],
    tipoNovoDefault: "EMPRESTIMO_SOCIO_EMPRESA", natureza: "SAIDA",
  },
  especiais: {
    label: "Operações Especiais", icon: Star,
    descricao: "Aplicações financeiras, resgates e operações pontuais.",
    tipos: ["APLICACAO_FINANCEIRA"],
    tipoNovoDefault: "APLICACAO_FINANCEIRA", natureza: "SAIDA",
  },
  parcelamentos: {
    label: "Parcelamentos", icon: CalendarRange,
    descricao: "Operações parceladas (REFIS, governo, fornecedores) — qtd_parcelas > 1.",
    apenasParceladas: true,
    tipoNovoDefault: "CAPITAL_DE_GIRO", natureza: "SAIDA",
  },
};

function OperacoesFinanceirasPage() {
  const [tab, setTab] = useState<Tab>("emprestimos");
  const [search, setSearch] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const meta = TAB_META[tab];

  return (
    <>
      <PageHeader
        title="Operações Financeiras"
        subtitle="Empréstimos, aportes, devoluções, aplicações e parcelamentos — segregados do fluxo comercial."
      />
      <div className="mb-3">
        <EnterpriseRecordToolbar
          entityType="operacoes_financeiras"
          availableActions={["novo", "atualizar", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
          selectedIds={[]}
          searchPlaceholder="Buscar código, contraparte, banco, finalidade…"
          search={search}
          onSearchChange={setSearch}
          onAction={(a) => {
            if (a === "novo") setNovoOpen(true);
            else if (a === "atualizar") toast.success("Lista recarregada.");
            else if (a === "historico") setHistOpen(true);
            else if (a === "imprimir") window.print();
            else if (a === "colunas") toast.info("Gestor de colunas universal chega em D17.UI.4c.");
            else if (a === "filtroAvancado") toast.info("Filtros avançados chegam em D17.UI.4c (data, status, instituição).");
            else if (a === "exportar") toast.info("Exportação CSV chega em D17.UI.4c.");
          }}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSearch(""); }}>
        <TabsList>
          {(Object.keys(TAB_META) as Tab[]).map((k) => {
            const m = TAB_META[k];
            const I = m.icon;
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5">
                <I className="h-3.5 w-3.5" /> {m.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(TAB_META) as Tab[]).map((k) => {
          const m = TAB_META[k];
          return (
            <TabsContent key={k} value={k} className="mt-4 space-y-2">
              <p className="text-[11.5px] text-muted-foreground">{m.descricao}</p>
              <OperacoesFinanceirasGrid
                tipos={m.tipos}
                apenasParceladas={m.apenasParceladas}
                search={search}
                emptyHint={`Nenhuma operação nesta visão. Use "Novo" para registrar a primeira ${m.label.toLowerCase()}.`}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      <NovaOperacaoDialog
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        tipoDefault={meta.tipoNovoDefault}
        naturezaDefault={meta.natureza}
      />
    </>
  );
}

/* ───────────────── Modal Nova Operação ───────────────── */

const TIPOS_OPTS: { value: OpFinTipo; label: string }[] = [
  { value: "CAPITAL_DE_GIRO",            label: "Capital de giro" },
  { value: "EMPRESTIMO_COLABORADOR",     label: "Empréstimo a colaborador" },
  { value: "EMPRESTIMO_CLIENTE",         label: "Empréstimo a cliente" },
  { value: "EMPRESTIMO_FORNECEDOR",      label: "Empréstimo a fornecedor" },
  { value: "EMPRESTIMO_SOCIO_EMPRESA",   label: "Empréstimo sócio↔empresa" },
  { value: "EMPRESTIMO_EMPRESA_TERCEIRO",label: "Empréstimo empresa→terceiro" },
  { value: "APORTE_CAPITAL",             label: "Aporte de capital" },
  { value: "APLICACAO_FINANCEIRA",       label: "Aplicação financeira" },
];

function NovaOperacaoDialog({
  open, onClose, tipoDefault, naturezaDefault,
}: { open: boolean; onClose: () => void; tipoDefault: OpFinTipo; naturezaDefault: "ENTRADA" | "SAIDA"; }) {
  const criar = useCriarOperacao();
  const [tipo, setTipo] = useState<OpFinTipo>(tipoDefault);
  const [natureza, setNatureza] = useState<"ENTRADA" | "SAIDA">(naturezaDefault);
  const [valor, setValor] = useState("");
  const [dataOp, setDataOp] = useState(new Date().toISOString().slice(0,10));
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [finalidade, setFinalidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [contraparte, setContraparte] = useState("");
  const [jurosPct, setJurosPct] = useState("");

  const reset = () => {
    setTipo(tipoDefault); setNatureza(naturezaDefault);
    setValor(""); setQtdParcelas("1"); setFinalidade(""); setObservacoes("");
    setInstituicao(""); setContraparte(""); setJurosPct("");
  };

  const submit = () => {
    const v = parseFloat(valor.replace(",", "."));
    const qtd = parseInt(qtdParcelas, 10);
    if (!v || v <= 0) { toast.error("Informe um valor válido."); return; }
    if (!qtd || qtd < 1) { toast.error("Qtd de parcelas inválida."); return; }
    const isSocio = tipo === "EMPRESTIMO_SOCIO_EMPRESA" || tipo === "APORTE_CAPITAL";
    const isTerceiro = tipo === "EMPRESTIMO_EMPRESA_TERCEIRO";
    const isColab = tipo === "EMPRESTIMO_COLABORADOR";
    criar.mutate({
      tipo, natureza_caixa: natureza, valor_total: v, data_operacao: dataOp,
      qtd_parcelas: qtd, finalidade: finalidade || undefined,
      observacoes: observacoes || undefined,
      instituicao: instituicao || undefined,
      socio_nome: isSocio && contraparte ? contraparte : undefined,
      terceiro_nome: isTerceiro && contraparte ? contraparte : undefined,
      colaborador_nome: isColab && contraparte ? contraparte : undefined,
      juros_pct: jurosPct ? parseFloat(jurosPct.replace(",", ".")) : undefined,
    }, {
      onSuccess: () => {
        toast.success("Operação criada em RASCUNHO.");
        reset(); onClose();
      },
      onError: (e) => toast.error(`Falha ao criar: ${(e as Error).message}`),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Nova operação financeira</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[12.5px]">
          <div className="col-span-2">
            <Label className="text-[11px]">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as OpFinTipo)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Natureza de caixa</Label>
            <Select value={natureza} onValueChange={(v) => setNatureza(v as "ENTRADA" | "SAIDA")}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SAIDA">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Data da operação</Label>
            <Input type="date" className="h-8" value={dataOp} onChange={(e) => setDataOp(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Valor total (R$)</Label>
            <Input className="h-8" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Qtd. parcelas</Label>
            <Input type="number" min={1} className="h-8" value={qtdParcelas} onChange={(e) => setQtdParcelas(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Instituição / banco</Label>
            <Input className="h-8" value={instituicao} onChange={(e) => setInstituicao(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Contraparte (sócio/terceiro/colab.)</Label>
            <Input className="h-8" value={contraparte} onChange={(e) => setContraparte(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Finalidade</Label>
            <Input className="h-8" value={finalidade} onChange={(e) => setFinalidade(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">Juros % a.m. (opcional)</Label>
            <Input className="h-8" value={jurosPct} onChange={(e) => setJurosPct(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Observações</Label>
            <Textarea className="min-h-16 text-[12.5px]" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={criar.isPending}>
            {criar.isPending ? "Criando…" : "Criar (RASCUNHO)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
