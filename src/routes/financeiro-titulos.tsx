// ============================================================================
// /financeiro-titulos — Lista real de títulos financeiros (Onda D2).
// Tudo via Supabase + RPCs + RLS.
// ============================================================================
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useTitulosFinanceiros,
  useParcelasTitulo,
  useMovimentacoesTitulo,
  useTituloFinanceiro,
  useCancelarTitulo,
  TF_STATUS_LABEL,
  TF_STATUS_TONE,
  ORIGEM_LABEL,
  type TFStatus,
  type OrigemTipo,
  type ParcelaFinanceira,
} from "@/hooks/useTitulosFinanceiros";
import { ReceberParcelaModal } from "@/components/app/financeiro/ReceberParcelaModal";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Ban } from "lucide-react";
import {
  EnterpriseDataGrid,
  exportToCSV,
} from "@/components/app/grid/EnterpriseDataGrid";
import { EnterpriseToolbar } from "@/components/app/grid/EnterpriseToolbar";
import { toast } from "sonner";


export const Route = createFileRoute("/financeiro-titulos")({
  head: () => ({ meta: [{ title: "Títulos Financeiros — Meta Sun" }] }),
  component: TitulosPage,
});

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(n ?? 0));

function TitulosPage() {
  const [status, setStatus] = useState<TFStatus | "TODOS">("TODOS");
  const [origem, setOrigem] = useState<OrigemTipo | "TODOS">("TODOS");
  const [busca, setBusca] = useState("");
  const [tituloAtivo, setTituloAtivo] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: titulos = [],
    isLoading,
    refetch,
    isFetching,
  } = useTitulosFinanceiros({
    status,
    origemTipo: origem,
  });

  const cancelar = useCancelarTitulo();

  const filtrados = useMemo(() => {
    if (!busca.trim()) return titulos;
    const t = busca.trim().toLowerCase();
    return titulos.filter((tit) =>
      [tit.codigo, tit.observacoes, tit.forma_pagamento].some((v) =>
        v?.toLowerCase().includes(t),
      ),
    );
  }, [titulos, busca]);

  const totais = useMemo(() => {
    const t = { aberto: 0, recebido: 0, atrasado: 0, total: 0 };
    titulos.forEach((tit) => {
      const liq = Number(tit.valor_liquido ?? 0);
      const sal = Number(tit.saldo ?? 0);
      t.total += liq;
      if (tit.status === "RECEBIDO") t.recebido += liq;
      else if (tit.status === "ATRASADO") t.atrasado += sal;
      else if (["PENDENTE", "PARCIAL"].includes(tit.status)) t.aberto += sal;
    });
    return t;
  }, [titulos]);

  const selectedArr = useMemo(() => Array.from(selected), [selected]);
  const selectedRows = useMemo(
    () => filtrados.filter((t) => selected.has(t.id)),
    [filtrados, selected],
  );
  const singleSel = selectedRows.length === 1 ? selectedRows[0] : null;

  const handleExport = () =>
    exportToCSV(`titulos-financeiros-${new Date().toISOString().slice(0, 10)}`, filtrados, [
      { key: "codigo", label: "Código" },
      { key: "status", label: "Status", get: (r) => TF_STATUS_LABEL[r.status as TFStatus] },
      { key: "origem_tipo", label: "Origem", get: (r) => ORIGEM_LABEL[r.origem_tipo as OrigemTipo] },
      { key: "vencimento", label: "Vencimento" },
      { key: "valor_liquido", label: "Valor líquido" },
      { key: "saldo", label: "Saldo" },
    ]);

  const handleCancelarLote = async () => {
    if (selectedArr.length === 0) return;
    const motivo = window.prompt("Motivo do cancelamento (mín. 3 caracteres):", "");
    if (!motivo || motivo.trim().length < 3) return;
    let ok = 0, fail = 0;
    for (const id of selectedArr) {
      try { await cancelar.mutateAsync({ tituloId: id, motivo: motivo.trim() }); ok++; }
      catch { fail++; }
    }
    toast[fail ? "warning" : "success"](
      `Cancelamento: ${ok} ok${fail ? `, ${fail} falha${fail > 1 ? "s" : ""}` : ""}`,
    );
    setSelected(new Set());
  };

  return (
    <div className="space-y-2 p-2 md:p-3">
      <PageHeader
        title="Títulos Financeiros"
        subtitle="Contas a receber/pagar corporativo — origem rastreada, sem títulos órfãos."
      />

      {/* Strip financeiro denso — substitui StatCards SaaS */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-border/70 bg-muted/30 px-3 py-1.5 text-[11px]">
        <Totalizador label="Total bruto" value={fmtBRL(totais.total)} />
        <Sep />
        <Totalizador label="Em aberto" value={fmtBRL(totais.aberto)} tone="warning" />
        <Sep />
        <Totalizador label="Atrasado" value={fmtBRL(totais.atrasado)} tone="danger" />
        <Sep />
        <Totalizador label="Recebido" value={fmtBRL(totais.recebido)} tone="success" />
        <span className="ml-auto text-muted-foreground">
          Registros: <span className="font-mono font-semibold text-foreground">{filtrados.length}</span>
          {titulos.length !== filtrados.length && (
            <span className="text-muted-foreground/70"> / {titulos.length}</span>
          )}
        </span>
      </div>

      <EnterpriseToolbar
        title="Títulos"
        count={filtrados.length}
        hint={selected.size > 0 ? `${selected.size} selecionado${selected.size > 1 ? "s" : ""}` : undefined}
        selecionado={selected.size > 0}
        onEditar={() => singleSel && setTituloAtivo(singleSel.id)}
        onCancelar={handleCancelarLote}
        onExportar={handleExport}
        onImprimir={() => window.print()}
        onAtualizar={() => refetch()}
        onHistorico={() => singleSel && setTituloAtivo(singleSel.id)}
        onAnexos={() => singleSel && setTituloAtivo(singleSel.id)}
      />

      <EnterpriseDataGrid
        gridId="financeiro-titulos"
        count={filtrados.length}
        filters={{
          search: busca,
          onSearchChange: setBusca,
          searchPlaceholder: "Buscar código, observação…",
          onClear:
            status !== "TODOS" || origem !== "TODOS" || busca
              ? () => {
                  setStatus("TODOS");
                  setOrigem("TODOS");
                  setBusca("");
                }
              : undefined,
          children: (
            <>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  {Object.entries(TF_STATUS_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={origem} onValueChange={(v) => setOrigem(v as any)}>
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as origens</SelectItem>
                  {Object.entries(ORIGEM_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFetching && (
                <span className="text-[10px] text-muted-foreground">atualizando…</span>
              )}
            </>
          ),
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32px]">
                <Checkbox
                  checked={filtrados.length > 0 && selected.size === filtrados.length}
                  onCheckedChange={(v) =>
                    setSelected(v ? new Set(filtrados.map((t) => t.id)) : new Set())
                  }
                />
              </TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor líquido</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                  Nenhum título. Gere a partir de um PV aprovado.
                </TableCell>
              </TableRow>
            )}
            {filtrados.map((t) => (
              <TableRow
                key={t.id}
                data-state={selected.has(t.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    return next;
                  });
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={(v) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(t.id);
                        else next.delete(t.id);
                        return next;
                      });
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{t.codigo}</TableCell>
                <TableCell>
                  <Badge className={TF_STATUS_TONE[t.status as TFStatus]}>
                    {TF_STATUS_LABEL[t.status as TFStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {ORIGEM_LABEL[t.origem_tipo as OrigemTipo]}
                  <span className="ml-1 text-[10px] font-mono text-muted-foreground">
                    {t.origem_id.slice(0, 8)}
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {t.vencimento
                    ? new Date(t.vencimento).toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(t.valor_liquido)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmtBRL(t.saldo)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setTituloAtivo(t.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </EnterpriseDataGrid>



      <TituloDetalheModal
        tituloId={tituloAtivo}
        open={!!tituloAtivo}
        onOpenChange={(v) => !v && setTituloAtivo(null)}
      />
    </div>
  );
}

function TituloDetalheModal({
  tituloId,
  open,
  onOpenChange,
}: {
  tituloId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: titulo } = useTituloFinanceiro(tituloId ?? undefined);
  const { data: parcelas = [] } = useParcelasTitulo(tituloId ?? undefined);
  const { data: movs = [] } = useMovimentacoesTitulo(tituloId ?? undefined);
  const cancelar = useCancelarTitulo();

  const [parcelaReceber, setParcelaReceber] = useState<ParcelaFinanceira | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  if (!titulo) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Título {titulo.codigo}{" "}
              <Badge className={TF_STATUS_TONE[titulo.status as TFStatus]}>
                {TF_STATUS_LABEL[titulo.status as TFStatus]}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Origem {ORIGEM_LABEL[titulo.origem_tipo as OrigemTipo]} ·{" "}
              <span className="font-mono">{titulo.origem_id.slice(0, 8)}</span>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList>
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="operacional">Parcelas</TabsTrigger>
              <TabsTrigger value="auditoria">Movimentações</TabsTrigger>
            </TabsList>

            <TabsContent value="identificacao" className="space-y-2 pt-3 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                {titulo.tipo}
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                <span className="font-mono text-xs">
                  {titulo.cliente_id?.slice(0, 8) ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Consultor:</span>{" "}
                <span className="font-mono text-xs">
                  {titulo.consultor_id?.slice(0, 8) ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Criado:</span>{" "}
                {new Date(titulo.created_at).toLocaleString("pt-BR")}
              </div>
              <div>
                <span className="text-muted-foreground">Observações:</span>{" "}
                {titulo.observacoes ?? "—"}
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-2 pt-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Valor bruto" value={fmtBRL(titulo.valor_bruto)} />
                <Stat label="Valor líquido" value={fmtBRL(titulo.valor_liquido)} />
                <Stat label="Desconto" value={fmtBRL(titulo.desconto)} />
                <Stat label="Juros" value={fmtBRL(titulo.juros)} />
                <Stat label="Multa" value={fmtBRL(titulo.multa)} />
                <Stat label="Saldo" value={fmtBRL(titulo.saldo)} />
                <Stat
                  label="Vencimento"
                  value={
                    titulo.vencimento
                      ? new Date(titulo.vencimento).toLocaleDateString("pt-BR")
                      : "—"
                  }
                />
                <Stat
                  label="Forma pagto"
                  value={titulo.forma_pagamento ?? "—"}
                />
              </div>
            </TabsContent>

            <TabsContent value="operacional" className="pt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.numero}</TableCell>
                      <TableCell>
                        {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{fmtBRL(p.valor)}</TableCell>
                      <TableCell>{fmtBRL(p.saldo)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.status !== "RECEBIDO" &&
                          p.status !== "CANCELADO" &&
                          titulo.status !== "CANCELADO" &&
                          titulo.status !== "RENEGOCIADO" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setParcelaReceber(p)}
                            >
                              Receber
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="auditoria" className="pt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-4 text-muted-foreground"
                      >
                        Nenhuma movimentação.
                      </TableCell>
                    </TableRow>
                  )}
                  {movs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">
                        {new Date(m.data).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.tipo}</Badge>
                      </TableCell>
                      <TableCell>{fmtBRL(m.valor)}</TableCell>
                      <TableCell className="text-xs">
                        {m.user_email ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{m.observacao ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between sm:justify-between">
            {!["CANCELADO", "RECEBIDO", "RENEGOCIADO"].includes(titulo.status) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="h-4 w-4 mr-1" /> Cancelar título
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceberParcelaModal
        parcela={parcelaReceber}
        open={!!parcelaReceber}
        onOpenChange={(v) => !v && setParcelaReceber(null)}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar título</DialogTitle>
            <DialogDescription>
              Informe o motivo (mínimo 3 caracteres). Esta ação é auditada.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={motivo.trim().length < 3 || cancelar.isPending}
              onClick={() =>
                cancelar.mutate(
                  { tituloId: titulo.id, motivo },
                  {
                    onSuccess: () => {
                      setCancelOpen(false);
                      setMotivo("");
                    },
                  },
                )
              }
            >
              Cancelar título
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
