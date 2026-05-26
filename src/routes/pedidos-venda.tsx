import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  usePedidosVenda, useGerarPVDoContrato, useBridgePV,
  PV_STATUS_LABEL, PV_STATUS_TONE, type PVStatus,
} from "@/hooks/usePedidosVenda";
import { PedidoVendaModal } from "@/components/app/pv/PedidoVendaModal";
import { PageHeader } from "@/components/app/PageHeader";
import { DashboardReaisOverview } from "@/components/app/analytics/DashboardReaisOverview";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Eye, Network, FileText } from "lucide-react";
import {
  EnterpriseDataGrid,
  exportToCSV,
} from "@/components/app/grid/EnterpriseDataGrid";


export const Route = createFileRoute("/pedidos-venda")({
  head: () => ({ meta: [{ title: "Pedidos de Venda — Meta Sun Gerencial" }] }),
  component: PedidosVendaPage,
});

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

function PedidosVendaPage() {
  const [filtro, setFiltro] = useState<PVStatus | "TODOS">("TODOS");
  const [busca, setBusca] = useState("");
  const [pvAtivo, setPvAtivo] = useState<string | null>(null);
  const [openNovo, setOpenNovo] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: pvs = [], isLoading, refetch, isFetching } = usePedidosVenda({ status: filtro });
  const { data: bridge = [] } = useBridgePV();


  const filtrados = useMemo(() => {
    if (!busca.trim()) return pvs;
    const t = busca.trim().toLowerCase();
    return pvs.filter((p) =>
      [p.codigo, p.observacoes, p.financiamento_banco].some((v) =>
        v?.toLowerCase().includes(t),
      ),
    );
  }, [pvs, busca]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    pvs.forEach((p) => {
      c[p.status] = (c[p.status] ?? 0) + 1;
    });
    return c;
  }, [pvs]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Pedidos de Venda"
        subtitle="Fundação transacional — Contrato → Projeto → PV → Engenharia."
        actions={
          <Button onClick={() => setOpenNovo(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar PV de contrato
          </Button>
        }
      />

      <DashboardReaisOverview />


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Rascunho" value={counts.RASCUNHO ?? 0} icon={FileText} />
        <StatCard label="Em análise" value={counts.EM_ANALISE ?? 0} icon={FileText} />
        <StatCard label="Aprovado" value={counts.APROVADO ?? 0} icon={FileText} />
        <StatCard label="Em execução" value={counts.EM_EXECUCAO ?? 0} icon={FileText} />
        <StatCard label="Faturado" value={counts.FATURADO ?? 0} icon={FileText} />
        <StatCard label="Finalizado" value={counts.FINALIZADO ?? 0} icon={FileText} />
        <StatCard label="Cancelado" value={counts.CANCELADO ?? 0} icon={FileText} />
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="bridge"><Network className="h-4 w-4 mr-1" />Bridge UUID</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-3 pt-3">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Buscar por código, observação, banco..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filtro} onValueChange={(v) => setFiltro(v as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  {Object.entries(PV_STATUS_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma pagto</TableHead>
                  <TableHead>Obra vinculada</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Nenhum PV. Use "Gerar PV de contrato".
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                    <TableCell>
                      <Badge className={PV_STATUS_TONE[p.status as PVStatus]}>
                        {PV_STATUS_LABEL[p.status as PVStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtBRL(p.valor_total)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.forma_pagamento ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {p.obra_id ? p.obra_id.slice(0, 8) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setPvAtivo(p.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="bridge" className="pt-3">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Status contrato</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status projeto</TableHead>
                  <TableHead>PV</TableHead>
                  <TableHead>Status PV</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Status obra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bridge.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      Sem contratos visíveis para o usuário.
                    </TableCell>
                  </TableRow>
                )}
                {bridge.map((b, i) => (
                  <TableRow key={`${b.contrato_id}-${b.pv_id ?? "none"}-${i}`}>
                    <TableCell className="font-mono text-xs">{b.contrato_codigo ?? "—"}</TableCell>
                    <TableCell className="text-sm">{b.contrato_status ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {b.projeto_contrato_id ? b.projeto_contrato_id.slice(0, 8) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{b.projeto_status ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{b.pv_codigo ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {b.pv_status ? (
                        <Badge className={PV_STATUS_TONE[b.pv_status as PVStatus]}>
                          {PV_STATUS_LABEL[b.pv_status as PVStatus]}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{b.obra_codigo ?? "—"}</TableCell>
                    <TableCell className="text-sm">{b.obra_status ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <PedidoVendaModal
        pvId={pvAtivo}
        open={!!pvAtivo}
        onOpenChange={(v) => !v && setPvAtivo(null)}
      />
      <NovoPVDialog
        open={openNovo}
        onOpenChange={setOpenNovo}
        onCreated={(pvId) => {
          setOpenNovo(false);
          setPvAtivo(pvId);
        }}
      />
    </div>
  );
}

function NovoPVDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (pvId: string) => void;
}) {
  const [contratoId, setContratoId] = useState<string>("");
  const [projetoId, setProjetoId] = useState<string>("");
  const gerar = useGerarPVDoContrato();

  const { data: contratos = [] } = useQuery({
    queryKey: ["pv-novo-contratos"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, codigo, status, valor_total, cliente_id")
        .is("deleted_at", null)
        .in("status", ["Assinado", "Aprovado", "Pronto para aprovação"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ["pv-novo-projetos", contratoId],
    enabled: open && !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos_contrato")
        .select("id, valor, status, descricao")
        .eq("contrato_id", contratoId)
        .is("deleted_at", null)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar Pedido de Venda</DialogTitle>
          <DialogDescription>
            A partir de um contrato (opcionalmente vinculado a um projeto aprovado).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Contrato
            </label>
            <Select value={contratoId || ""} onValueChange={(v) => { setContratoId(v); setProjetoId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar contrato" /></SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo ?? c.id.slice(0, 8)} · {c.status} · {fmtBRL(c.valor_total)}
                  </SelectItem>
                ))}
                {contratos.length === 0 && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    Nenhum contrato elegível.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Projeto vinculado (opcional)
            </label>
            <Select
              value={projetoId || "_auto_"}
              onValueChange={(v) => setProjetoId(v === "_auto_" ? "" : v)}
              disabled={!contratoId}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_auto_">Automático (primeiro aprovado)</SelectItem>
                {projetos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.descricao || p.id.slice(0, 8)} · {p.status} · {fmtBRL(p.valor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!contratoId || gerar.isPending}
            onClick={() =>
              gerar.mutate(
                { contratoId, projetoContratoId: projetoId || undefined },
                { onSuccess: (pvId) => onCreated(pvId) },
              )
            }
          >
            Gerar PV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
