import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Boxes, Truck, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/estoque-fundacao")({
  head: () => ({ meta: [{ title: "Estoque Fundação — Meta Sun Gerencial" }] }),
  component: EstoqueFundacaoPage,
});

function EstoqueFundacaoPage() {
  const saldos = useQuery({
    queryKey: ["v_estoque_saldos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("v_estoque_saldos").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as Array<{
        produto_id: string; codigo: string; nome: string; unidade: string;
        custo_unitario: number; saldo_fisico: number; saldo_reservado: number;
      }>;
    },
  });
  const reservas = useQuery({
    queryKey: ["estoque_reservas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("estoque_reservas")
        .select("id,produto_id,obra_id,pv_id,quantidade_reservada,quantidade_entregue,status,created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
  });
  const entregas = useQuery({
    queryKey: ["estoque_entregas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("estoque_entregas")
        .select("id,reserva_id,produto_id,quantidade,status,baixado_em,created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const totalSku = saldos.data?.length ?? 0;
  const totalReservasAtivas = reservas.data?.filter((r) => r.status === "ATIVA" || r.status === "PARCIAL").length ?? 0;
  const totalEntregasPendentes = entregas.data?.filter((e) => e.status === "PENDENTE").length ?? 0;
  const valorEstoque = saldos.data?.reduce((s, r) => s + Number(r.saldo_fisico) * Number(r.custo_unitario), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Estoque Fundação"
        subtitle="Fundação persistida (D3): produtos, reservas, entregas e saldos reais."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-5">
        <StatCard label="SKUs cadastrados" value={String(totalSku)} hint="Produtos ativos" />
        <StatCard label="Reservas ativas" value={String(totalReservasAtivas)} hint="ATIVA + PARCIAL" />
        <StatCard label="Entregas pendentes" value={String(totalEntregasPendentes)} hint="Aguardando baixa" />
        <StatCard label="Valor em estoque" value={`R$ ${valorEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} hint="Saldo físico × custo" />
      </div>
      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos"><Package className="mr-1 h-4 w-4" />Produtos & Saldos</TabsTrigger>
          <TabsTrigger value="reservas"><ClipboardList className="mr-1 h-4 w-4" />Reservas</TabsTrigger>
          <TabsTrigger value="entregas"><Truck className="mr-1 h-4 w-4" />Entregas</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-4">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Un.</TableHead>
                  <TableHead className="text-right">Custo unit.</TableHead>
                  <TableHead className="text-right">Físico</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(saldos.data ?? []).map((s) => {
                  const disp = Number(s.saldo_fisico) - Number(s.saldo_reservado);
                  return (
                    <TableRow key={s.produto_id}>
                      <TableCell className="font-mono text-xs">{s.codigo}</TableCell>
                      <TableCell>{s.nome}</TableCell>
                      <TableCell>{s.unidade}</TableCell>
                      <TableCell className="text-right">R$ {Number(s.custo_unitario).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{s.saldo_fisico}</TableCell>
                      <TableCell className="text-right">{s.saldo_reservado}</TableCell>
                      <TableCell className="text-right font-semibold">{disp}</TableCell>
                    </TableRow>
                  );
                })}
                {saldos.data?.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="reservas" className="mt-4">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reserva</TableHead><TableHead>Obra</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Entregue</TableHead>
                  <TableHead>Status</TableHead><TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reservas.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.obra_id?.slice(0, 8) ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.quantidade_reservada}</TableCell>
                    <TableCell className="text-right">{r.quantidade_entregue}</TableCell>
                    <TableCell><Badge variant={r.status === "ATENDIDA" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
                {reservas.data?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhuma reserva.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="entregas" className="mt-4">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entrega</TableHead><TableHead>Reserva</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Status</TableHead><TableHead>Baixada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entregas.data ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{e.reserva_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-right">{e.quantidade}</TableCell>
                    <TableCell><Badge variant={e.status === "BAIXADA" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.baixado_em ? new Date(e.baixado_em).toLocaleString("pt-BR") : "—"}</TableCell>
                  </TableRow>
                ))}
                {entregas.data?.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhuma entrega.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
