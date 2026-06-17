/**
 * D17.UI Fase 2c — Carteira Comercial Enterprise (RM/TOTVS)
 *
 * Tela DEDICADA da carteira, unificando Leads + Propostas + Contratos do
 * vendedor. 100% UI: usa stores existentes (leads, propostas, contratos)
 * sem qualquer alteração de regra, RPC, RLS ou auditoria.
 *
 * Componentes Enterprise aplicados:
 *   EnterpriseRecordToolbar · FilterPanel · ColumnManager · RowActions
 *   · useColumnPrefs · Tabela densa RM
 *
 * Origem dos dados (somente leitura):
 *   - useLeads()         → src/modules/leads/store
 *   - usePropostas()     → src/modules/propostas/store
 *   - useContratos()     → src/lib/contratos-store
 *   - useConsultores()   → src/lib/consultores-store
 */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/app/StatusBadge";
import {
  EnterpriseRecordToolbar,
  FilterPanel,
  ColumnManager,
  RowActions,
  useColumnPrefs,
  BulkActionBar,
  useRowSelection,
  type ColumnDef,
} from "@/components/app/enterprise";
import { Checkbox } from "@/components/ui/checkbox";
import { ribbonRm, layoutBarRm } from "@/components/app/enterprise/rm-ribbon-presets";
import { useLeads } from "@/modules/leads/store";
import { usePropostas } from "@/modules/propostas/store";
import { useContratos } from "@/lib/contratos-store";
import { useConsultores } from "@/lib/consultores-store";
import { fmtBRL } from "@/lib/mock-data";
import { ORIGEM_LEAD_LABEL } from "@/lib/status-catalog";
import { notifyUnavailable, notifyDone } from "@/lib/comercial-ux";

type CarteiraRow = {
  id: string;
  tipo: "LEAD" | "PROPOSTA" | "CONTRATO";
  numero: string;
  cliente: string;
  vendedor: string;
  consultor: string;
  origem: string;
  cidade: string;
  status: string;
  valor: number;
  data: string;
  // navigation hints
  contratoId?: string;
  propostaId?: string;
  leadId?: string;
};

const COLS: ColumnDef[] = [
  { key: "tipo",     label: "Tipo",     locked: true },
  { key: "numero",   label: "Número",   locked: true },
  { key: "cliente",  label: "Cliente" },
  { key: "vendedor", label: "Vendedor / Consultor" },
  { key: "origem",   label: "Origem" },
  { key: "cidade",   label: "Cidade" },
  { key: "status",   label: "Status" },
  { key: "valor",    label: "Valor" },
  { key: "data",     label: "Data" },
  { key: "acoes",    label: "Ações", locked: true },
];

const TIPO_TONE: Record<CarteiraRow["tipo"], string> = {
  LEAD: "bg-sky-50 text-sky-700 border-sky-200",
  PROPOSTA: "bg-amber-50 text-amber-700 border-amber-200",
  CONTRATO: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function CarteiraTab({ onChangeTab }: { onChangeTab?: (tab: string) => void }) {
  const navigate = useNavigate();
  const leads = useLeads();
  const propostas = usePropostas();
  const contratos = useContratos();
  const consultores = useConsultores();

  const consultorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of consultores) m.set(c.id, c.nome);
    return m;
  }, [consultores]);

  // ---------- Filtros ----------
  const [busca, setBusca] = useState("");
  const [fVendedor, setFVendedor] = useState<string>("__todos__");
  const [fStatus, setFStatus] = useState<string>("__todos__");
  const [fOrigem, setFOrigem] = useState<string>("__todos__");
  const [fCliente, setFCliente] = useState<string>("");
  const [fCidade, setFCidade] = useState<string>("__todos__");
  const [fConsultor, setFConsultor] = useState<string>("__todos__");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const limparFiltros = () => {
    setFVendedor("__todos__"); setFStatus("__todos__"); setFOrigem("__todos__");
    setFCliente(""); setFCidade("__todos__"); setFConsultor("__todos__");
    setDataInicio(""); setDataFim("");
  };

  // ---------- Consolidação Leads + Propostas + Contratos ----------
  const linhasBase: CarteiraRow[] = useMemo(() => {
    const out: CarteiraRow[] = [];
    for (const l of leads) {
      out.push({
        id: `LEAD-${l.id}`, tipo: "LEAD", numero: l.numero,
        cliente: l.nome, vendedor: "—",
        consultor: consultorById.get(l.consultorId) ?? l.consultorId,
        origem: ORIGEM_LEAD_LABEL[l.origem] ?? l.origem,
        cidade: "—", status: l.status, valor: 0,
        data: l.criadoEm, leadId: l.id,
      });
    }
    for (const p of propostas) {
      out.push({
        id: `PROP-${p.id}`, tipo: "PROPOSTA", numero: p.numero,
        cliente: p.clienteNome, vendedor: p.consultor ?? "—",
        consultor: p.consultor ?? "—",
        origem: p.origemCaptacao ?? "—",
        cidade: p.clienteCidade ?? p.cidade ?? "—",
        status: p.status,
        valor: (p as { valorTotal?: number }).valorTotal ?? 0,
        data: p.criadoEm, propostaId: p.id,
      });
    }
    for (const c of contratos) {
      out.push({
        id: `CT-${c.id}`, tipo: "CONTRATO", numero: c.id,
        cliente: c.cliente, vendedor: c.vendedor, consultor: c.vendedor,
        origem: "—",
        cidade: c.clienteFull?.cidade ?? "—",
        status: c.status, valor: c.valor, data: c.data,
        contratoId: c.id,
      });
    }
    return out;
  }, [leads, propostas, contratos, consultorById]);

  // ---------- Universos de filtro ----------
  const universos = useMemo(() => {
    const vendedores = new Set<string>(), origens = new Set<string>(),
          cidades = new Set<string>(), statuses = new Set<string>(),
          consultoresU = new Set<string>();
    for (const r of linhasBase) {
      if (r.vendedor && r.vendedor !== "—") vendedores.add(r.vendedor);
      if (r.origem && r.origem !== "—") origens.add(r.origem);
      if (r.cidade && r.cidade !== "—") cidades.add(r.cidade);
      if (r.status) statuses.add(r.status);
      if (r.consultor && r.consultor !== "—") consultoresU.add(r.consultor);
    }
    return {
      vendedores: Array.from(vendedores).sort(),
      origens: Array.from(origens).sort(),
      cidades: Array.from(cidades).sort(),
      statuses: Array.from(statuses).sort(),
      consultores: Array.from(consultoresU).sort(),
    };
  }, [linhasBase]);

  // ---------- Aplicação dos filtros ----------
  const linhas: CarteiraRow[] = useMemo(() => {
    return linhasBase.filter((r) => {
      if (busca) {
        const q = busca.toLowerCase();
        const blob = `${r.numero} ${r.cliente} ${r.vendedor} ${r.cidade} ${r.status}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (fVendedor !== "__todos__" && r.vendedor !== fVendedor) return false;
      if (fStatus !== "__todos__" && r.status !== fStatus) return false;
      if (fOrigem !== "__todos__" && r.origem !== fOrigem) return false;
      if (fCliente && !r.cliente.toLowerCase().includes(fCliente.toLowerCase())) return false;
      if (fCidade !== "__todos__" && r.cidade !== fCidade) return false;
      if (fConsultor !== "__todos__" && r.consultor !== fConsultor) return false;
      if (dataInicio && r.data < dataInicio) return false;
      if (dataFim && r.data > dataFim) return false;
      return true;
    }).sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
  }, [linhasBase, busca, fVendedor, fStatus, fOrigem, fCliente, fCidade, fConsultor, dataInicio, dataFim]);

  // Resumo/KPIs (não muda regra, só apresentação)
  const totais = useMemo(() => {
    const t = { leads: 0, propostas: 0, contratos: 0, valor: 0 };
    for (const r of linhas) {
      if (r.tipo === "LEAD") t.leads++;
      else if (r.tipo === "PROPOSTA") t.propostas++;
      else if (r.tipo === "CONTRATO") t.contratos++;
      t.valor += r.valor || 0;
    }
    return t;
  }, [linhas]);

  // ---------- Coluna preferences ----------
  const prefs = useColumnPrefs("carteira_comercial", COLS);
  const showCol = (k: string) => prefs.isVisible(k);

  // Seleção múltipla
  const sel = useRowSelection(linhas, (r) => r.id);

  const ativosCount =
    Number(fVendedor !== "__todos__") + Number(fStatus !== "__todos__") +
    Number(fOrigem !== "__todos__") + Number(!!fCliente) +
    Number(fCidade !== "__todos__") + Number(fConsultor !== "__todos__") +
    Number(!!dataInicio) + Number(!!dataFim);

  const irPara = (tab: string) => {
    if (onChangeTab) { onChangeTab(tab); return; }
    void navigate({ to: "/comercial", hash: `tab=${tab}` });
  };

  const handleRowAction = (kind: string, rowId: string) => {
    const row = linhas.find((x) => x.id === rowId);
    if (!row) return;
    if (kind === "visualizar") {
      if (row.tipo === "LEAD") irPara("orcamentos");
      else if (row.tipo === "PROPOSTA") irPara("orcamentos");
      else if (row.tipo === "CONTRATO") irPara("contratos");
    } else if (kind === "historico") {
      notifyUnavailable();
    } else if (kind === "anexos") {
      notifyUnavailable();
    }
  };

  return (
    <div className="space-y-3">
      <EnterpriseRecordToolbar
        entityType="contratos"
        selectedIds={sel.selectedIds}
        availableActions={["atualizar", "anexos", "filtroAvancado", "colunas", "exportar", "imprimir", "historico"]}
        statusActions={ribbonRm()}
        layoutBar={layoutBarRm()}
        searchPlaceholder="Buscar número, cliente, cidade, status…"
        search={busca}
        onSearchChange={setBusca}
        position={{ current: linhas.length === 0 ? 0 : 1, total: linhas.length }}
        availableProcesses={[
          { key: "abrirLead",      label: "Abrir Leads" },
          { key: "abrirProposta",  label: "Abrir Propostas" },
          { key: "abrirContrato",  label: "Abrir Contratos" },
          { key: "transferir",     label: "Transferir carteira" },
          { key: "historico",      label: "Histórico de transferências" },
        ]}
        onProcess={(p) => {
          if (p === "abrirLead") irPara("orcamentos");
          else if (p === "abrirProposta") irPara("orcamentos");
          else if (p === "abrirContrato") irPara("contratos");
          else if (p === "transferir") toast.info("Transferência usa RPC oficial (Comercial C4) — UI dedicada em D17.UI Fase 3.");
          else if (p === "historico") toast.info("Histórico de carteira (comercial_carteira_transferencias) — UI dedicada em D17.UI Fase 3.");
        }}
        onAction={(a) => {
          if (a === "atualizar") notifyDone("Carteira recalculada.");
          else if (a === "exportar") notifyUnavailable();
          else if (a === "imprimir") window.print();
        }}
        extraRight={
          <div className="flex items-center gap-1">
            <FilterPanel
              resumo={ativosCount > 0 ? `${ativosCount} ativo(s)` : "Todos"}
              ativos={ativosCount}
              busca={busca}
              onBuscaChange={setBusca}
              buscaPlaceholder="Buscar carteira…"
              dataInicio={dataInicio}
              dataFim={dataFim}
              onPeriodoChange={(i, f) => { setDataInicio(i); setDataFim(f); }}
              statusSlot={
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os status</SelectItem>
                    {universos.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
              responsavelSlot={
                <Select value={fVendedor} onValueChange={setFVendedor}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos os vendedores</SelectItem>
                    {universos.vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
              extraSlot={
                <div className="grid grid-cols-2 gap-2">
                  <Select value={fOrigem} onValueChange={setFOrigem}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Origem" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todas as origens</SelectItem>
                      {universos.origens.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fCidade} onValueChange={setFCidade}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Cidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todas as cidades</SelectItem>
                      {universos.cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fConsultor} onValueChange={setFConsultor}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Consultor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos os consultores</SelectItem>
                      {universos.consultores.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <input
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                    placeholder="Cliente contém…"
                    value={fCliente}
                    onChange={(e) => setFCliente(e.target.value)}
                  />
                </div>
              }
              onLimpar={limparFiltros}
            />
            <ColumnManager entity="carteira_comercial" columns={COLS} prefs={prefs} />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Leads</div><div className="text-lg font-semibold">{totais.leads}</div></Card>
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Propostas</div><div className="text-lg font-semibold">{totais.propostas}</div></Card>
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Contratos</div><div className="text-lg font-semibold">{totais.contratos}</div></Card>
        <Card className="p-3"><div className="text-[11px] uppercase text-muted-foreground">Valor consolidado</div><div className="text-lg font-semibold">{fmtBRL(totais.valor)}</div></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="[&_th]:py-1.5 [&_th]:text-[11.5px]">
              <TableHead className="w-8">
                <Checkbox
                  checked={sel.allChecked ? true : sel.someChecked ? "indeterminate" : false}
                  onCheckedChange={sel.toggleAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              {prefs.visibleKeys.map((k) => {
                if (k === "valor") return <TableHead key={k} className="text-right">Valor</TableHead>;
                if (k === "acoes") return <TableHead key={k} className="text-right w-[120px]">Ações</TableHead>;
                const col = COLS.find((c) => c.key === k); return <TableHead key={k}>{col?.label}</TableHead>;
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow><TableCell colSpan={prefs.visibleKeys.length + 1} className="text-center py-8 text-sm text-muted-foreground">Nenhum item na carteira para os filtros aplicados.</TableCell></TableRow>
            ) : linhas.map((r) => (
              <TableRow key={r.id} className="[&_td]:py-1 [&_td]:text-[12.5px]" data-state={sel.isSelected(r.id) ? "selected" : undefined}>
                <TableCell className="w-8"><Checkbox checked={sel.isSelected(r.id)} onCheckedChange={() => sel.toggle(r.id)} aria-label={`Selecionar ${r.numero}`} /></TableCell>
                {showCol("tipo") && (
                  <TableCell>
                    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TIPO_TONE[r.tipo]}`}>{r.tipo}</span>
                  </TableCell>
                )}
                {showCol("numero")   && <TableCell className="font-mono text-[11.5px]">{r.numero}</TableCell>}
                {showCol("cliente")  && <TableCell className="truncate max-w-[260px]">{r.cliente}</TableCell>}
                {showCol("vendedor")&& <TableCell>{r.vendedor !== "—" ? r.vendedor : r.consultor}</TableCell>}
                {showCol("origem")   && <TableCell>{r.origem}</TableCell>}
                {showCol("cidade")   && <TableCell>{r.cidade}</TableCell>}
                {showCol("status")   && <TableCell><StatusBadge status={r.status} /></TableCell>}
                {showCol("valor")    && <TableCell className="text-right font-mono">{r.valor ? fmtBRL(r.valor) : "—"}</TableCell>}
                {showCol("data")     && <TableCell className="text-xs">{r.data ? r.data.slice(0, 10) : "—"}</TableCell>}
                {showCol("acoes")    && (
                  <TableCell className="text-right">
                    <RowActions
                      rowId={r.id}
                      onAction={handleRowAction}
                      actions={[
                        { kind: "visualizar", label: "Abrir registro" },
                        { kind: "anexos", label: "Anexos", overflow: true },
                        { kind: "historico", label: "Histórico", overflow: true },
                      ]}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <BulkActionBar
        count={sel.count}
        label="item(ns) selecionado(s)"
        onClear={sel.clear}
        actions={[
          { key: "transferir", label: "Transferir carteira", tone: "indigo", onClick: () => toast.info("Transferência em lote usa RPC oficial (Comercial C4) — UI dedicada em D17.UI Fase 3.") },
          { key: "exportar", label: "Exportar", tone: "azul", onClick: () => notifyUnavailable() },
        ]}
      />
    </div>
  );
}