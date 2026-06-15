// Onda C-ENT.1.b — Workspace 360º do Cliente.
// Rota lê 100% Supabase (clientes, oportunidades, propostas, contratos, leads).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Target, FileText, FileSignature, AlertTriangle, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useOportunidadesPorCliente,
  useCriarOportunidade,
} from "@/lib/repositories/oportunidades-repo";
import { useAtualizarClienteSupabase } from "@/lib/repositories/clientes-supabase-repo";
import { useHasPermission } from "@/hooks/use-has-permission";

export const Route = createFileRoute("/comercial/clientes/$clienteId")({
  head: () => ({ meta: [{ title: "Workspace 360º — Cliente — Meta Sun" }] }),
  component: WorkspaceClientePage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useCliente(id: string) {
  return useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function usePropostasPorCliente(clienteId: string) {
  return useQuery({
    queryKey: ["propostas", "by-cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas")
        .select("id,numero,cliente_nome,valor_final,status,created_at,oportunidade_id,validade")
        .eq("cliente_id", clienteId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useContratosPorCliente(clienteId: string) {
  return useQuery({
    queryKey: ["contratos", "by-cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id,codigo,valor_total,status,data_assinatura,created_at,proposta_id")
        .eq("cliente_id", clienteId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useLeadsPorCliente(clienteId: string) {
  return useQuery({
    queryKey: ["leads", "by-cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,nome,status,origem,created_at,oportunidade_id")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function WorkspaceClientePage() {
  const { clienteId } = Route.useParams();
  const perm = useHasPermission("comercial.cliente.visualizar");
  const cliente = useCliente(clienteId);
  const oportunidades = useOportunidadesPorCliente(clienteId);
  const propostas = usePropostasPorCliente(clienteId);
  const contratos = useContratosPorCliente(clienteId);
  const leads = useLeadsPorCliente(clienteId);

  const stats = useMemo(() => {
    const valorPropostas = (propostas.data ?? []).reduce((s, p) => s + (Number(p.valor_final) || 0), 0);
    const valorContratos = (contratos.data ?? []).reduce((s, c) => s + (Number(c.valor_total) || 0), 0);
    const oportunidadesAbertas = (oportunidades.data ?? []).filter((o) => o.status === "ABERTA").length;
    return { valorPropostas, valorContratos, oportunidadesAbertas };
  }, [propostas.data, contratos.data, oportunidades.data]);

  if (perm.isLoading || cliente.isLoading) {
    return (
      <div className="p-2">
        <PageHeader title="Workspace 360º" subtitle="Carregando cliente..." />
      </div>
    );
  }
  if (perm.data === false) {
    return (
      <div className="p-2">
        <PageHeader
          title="Acesso negado"
          subtitle="Você não possui permissão para visualizar clientes."
        />
        <Button variant="outline" size="sm" asChild>
          <Link to="/comercial">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Comercial
          </Link>
        </Button>
      </div>
    );
  }
  if (!cliente.data) {
    return (
      <div className="p-2 space-y-3">
        <PageHeader
          title="Cliente não encontrado"
          subtitle="O cliente informado não existe, foi removido ou você não tem acesso."
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/comercial/clientes">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Clientes
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/comercial">Ir para Comercial</Link>
          </Button>
        </div>
      </div>
    );
  }

  const c = cliente.data;
  const enderecoCompleto = [c.rua, c.numero, c.bairro, c.cidade && `${c.cidade}/${c.uf ?? ""}`]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/comercial">
            <ArrowLeft className="h-4 w-4 mr-1" /> Comercial
          </Link>
        </Button>
        <Badge variant="outline" className="font-mono text-[10px]">
          {c.tipo_pessoa}
        </Badge>
        <Badge variant={c.status === "Ativo" ? "default" : "secondary"}>{c.status}</Badge>
      </div>

      <PageHeader
        title={c.nome}
        subtitle={`Workspace 360º · ${c.doc ?? "sem documento"} · ${c.email ?? "sem email"}`}
        actions={<NovaOportunidadeButton clienteId={c.id} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard label="Oportunidades abertas" value={String(stats.oportunidadesAbertas)} icon={Target} />
        <StatCard label="Propostas (Σ)" value={fmtBRL(stats.valorPropostas)} icon={FileText} />
        <StatCard label="Contratos (Σ)" value={fmtBRL(stats.valorContratos)} icon={FileSignature} />
        <StatCard label="Leads vinculados" value={String(leads.data?.length ?? 0)} icon={AlertTriangle} />
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades ({oportunidades.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="propostas">Propostas ({propostas.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratos.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-3">
          <Card className="p-3 space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Linha label="Nome" value={c.nome} />
              <Linha label="Documento" value={c.doc ?? "—"} />
              <Linha label="Email" value={c.email ?? "—"} />
              <Linha label="Telefone" value={c.telefone ?? "—"} />
              <Linha label="RG / IE" value={c.rg ?? c.inscricao_estadual ?? "—"} />
              <Linha label="Regime tributário" value={c.regime_tributario ?? "—"} />
              <Linha label="Endereço" value={enderecoCompleto || "—"} />
              <Linha label="CEP" value={c.cep ?? "—"} />
              <Linha label="Criado em" value={new Date(c.created_at).toLocaleString("pt-BR")} />
              <Linha label="Atualizado em" value={new Date(c.updated_at).toLocaleString("pt-BR")} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="oportunidades" className="mt-3">
          <Card className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor estimado</TableHead>
                  <TableHead>Próxima ação</TableHead>
                  <TableHead>Criada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(oportunidades.data ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.nome}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "ABERTA" ? "default" : o.status === "GANHA" ? "default" : "secondary"}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(o.valor_estimado)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.proxima_acao ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {(oportunidades.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                      Nenhuma oportunidade. Use o botão "Nova oportunidade" acima.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="propostas" className="mt-3">
          <Card className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Criada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(propostas.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero ?? p.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(p.valor_final)}</TableCell>
                    <TableCell className="text-xs">{p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {(propostas.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                      Sem propostas registradas para este cliente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="mt-3">
          <Card className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Assinado em</TableHead>
                  <TableHead>Criado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(contratos.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.codigo ?? c.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(c.valor_total)}</TableCell>
                    <TableCell className="text-xs">{c.data_assinatura ? new Date(c.data_assinatura).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {(contratos.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                      Sem contratos para este cliente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-3">
          <Card className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Criado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(leads.data ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                    <TableCell className="text-xs">{l.origem ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {(leads.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                      Sem leads vinculados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function NovaOportunidadeButton({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<string>("");
  const criar = useCriarOportunidade();

  const handleSubmit = async () => {
    if (nome.trim().length < 3) {
      toast.error("Nome da oportunidade deve ter ao menos 3 caracteres.");
      return;
    }
    await criar.mutateAsync({
      cliente_id: clienteId,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      valor_estimado: valor ? Number(valor.replace(/\./g, "").replace(",", ".")) : null,
    });
    setOpen(false);
    setNome("");
    setDescricao("");
    setValor("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Nova oportunidade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
          <DialogDescription>
            Cria uma oportunidade vinculada a este cliente. Propostas comerciais futuras devem ser geradas a partir da oportunidade.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div>
            <Label htmlFor="op-nome">Nome *</Label>
            <Input id="op-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sistema 10 kWp residencial" />
          </div>
          <div>
            <Label htmlFor="op-valor">Valor estimado (R$)</Label>
            <Input id="op-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label htmlFor="op-desc">Descrição</Label>
            <Textarea id="op-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={criar.isPending}>
            {criar.isPending ? "Criando..." : "Criar oportunidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
