import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Power } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bancos, gerentes, equipes, vendedores, usuarios } from "@/lib/mock-data";

export const Route = createFileRoute("/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros — Meta Sun Gerencial" }] }),
  component: CadastrosPage,
});

function CadastrosPage() {
  return (
    <>
      <PageHeader title="Cadastros" subtitle="Mantenha as bases auxiliares do sistema." />
      <Tabs defaultValue="bancos">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="gerentes">Gerentes</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="bancos" className="mt-5">
          <Listing
            title="Bancos cadastrados"
            cols={["Banco", "Operações", "Total", "Status"]}
            rows={bancos.map((b) => [b.nome, b.operacoes, b.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), <StatusBadge key="s" status={b.status} />])}
          />
        </TabsContent>
        <TabsContent value="gerentes" className="mt-5">
          <Listing
            title="Gerentes bancários"
            cols={["Nome", "Banco", "Telefone", "Operações", "Status"]}
            rows={gerentes.map((g) => [g.nome, g.banco, g.telefone, g.operacoes, <StatusBadge key="s" status={g.status} />])}
          />
        </TabsContent>
        <TabsContent value="equipes" className="mt-5">
          <Listing
            title="Equipes de instalação"
            cols={["Equipe", "Líder", "Membros", "Obras ativas", "Status"]}
            rows={equipes.map((e) => [e.nome, e.lider, e.membros, e.obrasAtivas, <StatusBadge key="s" status={e.status} />])}
          />
        </TabsContent>
        <TabsContent value="vendedores" className="mt-5">
          <Listing
            title="Vendedores"
            cols={["Nome", "E-mail", "Contratos", "Status"]}
            rows={vendedores.map((v) => [v.nome, v.email, v.contratos, <StatusBadge key="s" status={v.status} />])}
          />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-5">
          <Listing
            title="Usuários do sistema"
            cols={["Nome", "E-mail", "Perfil", "Status"]}
            rows={usuarios.map((u) => [u.nome, u.email, u.perfil, <StatusBadge key="s" status={u.status} />])}
          />
        </TabsContent>
        <TabsContent value="status" className="mt-5">
          <Listing
            title="Status do sistema"
            cols={["Status", "Módulo"]}
            rows={[
              ["Gerado", "Comercial"], ["Assinado", "Comercial"], ["Pendente", "Comercial"], ["Cancelado", "Comercial"],
              ["Em análise", "Financiamentos"], ["Aprovado", "Financiamentos"], ["Liberado", "Financiamentos"], ["Finalizado", "Financiamentos"],
              ["Executando instalação", "Engenharia"], ["Aguardando instalação", "Engenharia"], ["Em projeto/aprovação", "Engenharia"], ["Standby", "Engenharia"], ["Finalizado", "Engenharia"],
            ].map((r) => [<StatusBadge key="s" status={r[0]} />, r[1]])}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Listing({ title, cols, rows }: { title: string; cols: string[]; rows: any[][] }) {
  return (
    <Card className="bg-[image:var(--gradient-card)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="text-sm font-semibold">{title}</div>
        <Button className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo</Button>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          {cols.map((c) => <TableHead key={c}>{c}</TableHead>)}
          <TableHead className="text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((cell, j) => <TableCell key={j} className={j === 0 ? "font-medium" : ""}>{cell}</TableCell>)}
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Power className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
