/**
 * C-ENT.5 — Workspace do Contrato Supabase.
 * Fonte: public.contratos + contrato_propostas + propostas + projetos.
 * Gate: permissão `comercial.contrato.visualizar`.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Loader2, ShieldAlert, FileSignature, FileText, Users, Ban, ExternalLink,
  Zap, DollarSign, Layers, History, ClipboardList, Plus,
} from "lucide-react";
import {
  useContratoSupabaseById,
  usePropostasDoContrato,
  useProjetosPorContrato,
  useCancelarContratoSupabase,
  calcularConsumoContrato,
} from "@/lib/repositories/contratos-supabase-repo";
import { useAditivosPorContrato } from "@/lib/repositories/aditivos-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { CancelarContratoDialog } from "@/components/app/contratos/CancelarContratoDialog";
import { NovoAditivoDialog } from "@/components/app/contratos/NovoAditivoDialog";
import { AditivosListPanel } from "@/components/app/contratos/AditivosListPanel";
import { useTabFromHash } from "@/lib/route-tabs";
import { DocumentosObjetoPanel } from "@/components/app/universal/DocumentosObjetoPanel";
import { TimelineObjetoPanel } from "@/components/app/universal/TimelineObjetoPanel";
import { ConsumoContratoCard } from "@/components/app/contratos/ConsumoContratoCard";
import { ComissoesContratoPanel } from "@/components/app/comissoes/ComissoesContratoPanel";
import { MinutaContratoPanel } from "@/components/app/contratos/MinutaContratoPanel";
import { classificarEtapaContrato, rotuloEtapaContrato } from "@/lib/contrato-etapa";

export const Route = createFileRoute("/comercial/contratos/$contratoId")({
  head: () => ({ meta: [{ title: "Contrato — Workspace — Meta Sun" }] }),
  component: ContratoWorkspacePage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (status: string, cancelado?: boolean) => {
  const e = classificarEtapaContrato(status, cancelado);
  if (e === "cancelado") return <Badge variant="destructive">CANCELADO</Badge>;
  if (e === "minuta") return <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40">CONTRATO PENDENTE</Badge>;
  return <Badge>ATIVO</Badge>;
};

function useCliente(id: string | null | undefined) {
  return useQuery({
    queryKey: ["cliente-360", "cliente", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id,nome,cidade,uf,rua,numero,bairro,doc,email,telefone")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useConsultor(id: string | null | undefined) {
  return useQuery({
    queryKey: ["profile", "user_id", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,nome,email")
        .eq("user_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function ContratoWorkspacePage() {
  const { contratoId } = Route.useParams();
  const navigate = useNavigate();
  const perm = useHasPermission("comercial.contrato.visualizar");
  const permCancelar = useHasPermission("comercial.contrato.cancelar");
  const permAditivoVer = useHasPermission("comercial.aditivo.visualizar");
  const permAditivoCriar = useHasPermission("comercial.aditivo.criar");
  const permAditivoCompensar = useHasPermission("comercial.aditivo.compensar");
  const contrato = useContratoSupabaseById(contratoId);
  const propostas = usePropostasDoContrato(contratoId);
  const projetos = useProjetosPorContrato(contratoId);
  const aditivos = useAditivosPorContrato(contratoId);
  const cliente = useCliente(contrato.data?.cliente_id);
  const consultor = useConsultor(contrato.data?.consultor_id);
  const cancelar = useCancelarContratoSupabase();
  const [tab, setTab] = useTabFromHash("resumo");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [novoAditivoOpen, setNovoAditivoOpen] = useState(false);
  const [compensarOrigem, setCompensarOrigem] = useState<import("@/lib/repositories/aditivos-repo").AditivoSupabase | null>(null);

  const totais = useMemo(() => {
    const rows = propostas.data ?? [];
    const valor = rows.reduce((s, p) => s + (Number(p.valor_final) || 0), 0);
    const potencia = rows.reduce((s, p) => s + (Number(p.potencia_kwp) || 0), 0);
    const modulos = rows.reduce((s, p) => s + (Number(p.modulos_qtd) || 0), 0);
    return { valor, potencia, modulos };
  }, [propostas.data]);

  const consumo = useMemo(() => {
    if (!contrato.data) return null;
    return calcularConsumoContrato(contrato.data, projetos.data ?? []);
  }, [contrato.data, projetos.data]);

  if (perm.isLoading || contrato.isLoading) {
    return (
      <div className="p-2">
        <PageHeader title="Contrato" subtitle="Carregando..." />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando contrato...
        </div>
      </div>
    );
  }
  if (perm.data === false) {
    return (
      <div className="p-2">
        <PageHeader title="Contrato" subtitle="Acesso negado" />
        <Card className="p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium">Você não tem permissão para visualizar este contrato.</p>
            <p className="text-sm text-muted-foreground">
              Permissão necessária: <code>comercial.contrato.visualizar</code>.
            </p>
          </div>
        </Card>
      </div>
    );
  }
  if (!contrato.data) {
    return (
      <div className="p-2">
        <PageHeader title="Contrato" subtitle="Não encontrado" />
        <Card className="p-4 text-sm">
          Contrato não encontrado ou excluído.{" "}
          <Link to="/comercial/contratos" className="underline">Voltar à lista</Link>
        </Card>
      </div>
    );
  }

  const c = contrato.data;
  const cancelado = c.status === "CANCELADO" || c.cancelado;
  const clienteNome = cliente.data?.nome ?? "—";

  return (
    <div className="p-2 space-y-2">
      <PageHeader
        title={`Contrato ${c.codigo ?? c.id.slice(0, 8)}`}
        subtitle={`Cliente: ${clienteNome} · ${statusFromContract(c)}`}
        actions={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/comercial/contratos" })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            {c.cliente_id && (
              <Link to="/comercial/clientes/$clienteId" params={{ clienteId: c.cliente_id }}>
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" /> Cliente 360º
                </Button>
              </Link>
            )}
            {permAditivoCriar.data === true && !cancelado && (
              <Button size="sm" onClick={() => setNovoAditivoOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Novo Aditivo
              </Button>
            )}
            {permCancelar.data === true && !cancelado && (
              <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4 mr-1" /> Cancelar contrato
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="Valor global" value={fmtBRL(c.valor_total)} icon={DollarSign} />
        <StatCard label="Potência (kWp)" value={(Number(c.potencia_kwp) || 0).toFixed(2)} icon={Zap} />
        <StatCard label="Módulos" value={String(c.modulos_qtde ?? 0)} icon={Layers} />
        <StatCard label="Propostas" value={String(propostas.data?.length ?? 0)} icon={FileText} />
        <StatCard label="Projetos" value={String(projetos.data?.length ?? 0)} icon={ClipboardList} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="propostas">Propostas origem ({propostas.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="projetos">Projetos ({projetos.data?.length ?? 0})</TabsTrigger>
          {permAditivoVer.data !== false && (
            <TabsTrigger value="aditivos">Aditivos ({aditivos.data?.length ?? 0})</TabsTrigger>
          )}
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <Card className="p-3 space-y-2 text-sm">
              <h3 className="font-semibold flex items-center gap-1.5">
                <FileSignature className="h-4 w-4" /> Dados do contrato
              </h3>
              <Field label="Código" value={c.codigo ?? "—"} mono />
              <Field label="Cliente" value={clienteNome} />
              <Field label="Documento" value={cliente.data?.doc ?? "—"} />
              <Field label="Endereço" value={[cliente.data?.rua, cliente.data?.numero, cliente.data?.bairro, cliente.data?.cidade, cliente.data?.uf].filter(Boolean).join(", ") || "—"} />
              <Field label="Consultor" value={consultor.data?.nome ?? consultor.data?.email ?? "—"} />
              <Field label="Status" value={c.status} />
              <Field label="Etapa" value={String(((c.dados ?? {}) as Record<string, unknown>)["etapa"] ?? "—")} />
              <Field label="Criado em" value={new Date(c.created_at).toLocaleString("pt-BR")} />
              <Field label="Última atualização" value={new Date(c.updated_at).toLocaleString("pt-BR")} />
              {cancelado && (
                <Field label="Motivo cancelamento" value={c.motivo_cancelamento ?? "—"} />
              )}
            </Card>

            <Card className="p-3 space-y-2 text-sm">
              <h3 className="font-semibold flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> Composição do contrato
              </h3>
              <Field label="Total de propostas" value={String(propostas.data?.length ?? 0)} />
              <Field label="Total de projetos" value={String(projetos.data?.length ?? 0)} />
              <Field label="Valor global (contrato)" value={fmtBRL(c.valor_total)} />
              <Field label="Valor consolidado (propostas)" value={fmtBRL(totais.valor)} />
              <Field label="Potência global (contrato)" value={`${(Number(c.potencia_kwp) || 0).toFixed(2)} kWp`} />
              <Field label="Potência consolidada (propostas)" value={`${totais.potencia.toFixed(2)} kWp`} />
              <Field label="Módulos globais" value={String(c.modulos_qtde ?? 0)} />
              <Field label="Módulos consolidados (propostas)" value={String(totais.modulos)} />
            </Card>
          </div>
          {consumo && (
            <div className="mt-2">
              <ConsumoContratoCard consumo={consumo} />
            </div>
          )}
        </TabsContent>


        <TabsContent value="propostas" className="mt-3">
          <Card className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Potência</TableHead>
                  <TableHead className="text-right">Módulos</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(propostas.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero ?? p.id.slice(0, 8)}</TableCell>
                    <TableCell>{p.cliente_nome ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(p.valor_final)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.potencia_kwp != null ? Number(p.potencia_kwp).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.modulos_qtd ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
                {(propostas.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">
                      Nenhuma proposta vinculada a este contrato.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="projetos" className="mt-3 space-y-2">
          {consumo && <ConsumoContratoCard consumo={consumo} />}
          <Card className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead className="text-right">Valor ref.</TableHead>
                  <TableHead className="text-right">Potência</TableHead>
                  <TableHead className="text-right">Módulos</TableHead>
                  <TableHead>Inversor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(projetos.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.codigo ?? p.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{p.tipo}</TableCell>
                    <TableCell className="text-xs">{[p.cidade, p.uf].filter(Boolean).join("/") || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(p.valor_estimado)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.potencia_kwp != null ? Number(p.potencia_kwp).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.modulos_qtde ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.inversor ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Link to="/comercial/projetos/$projetoId" params={{ projetoId: p.id }}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(projetos.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-6 text-sm">
                      Nenhum projeto criado para este contrato.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>


        {permAditivoVer.data !== false && (
          <TabsContent value="aditivos" className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Aditivos aplicados a este contrato (projeto específico ou contrato inteiro).
              </p>
              {permAditivoCriar.data === true && !cancelado && (
                <Button size="sm" onClick={() => setNovoAditivoOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Novo Aditivo
                </Button>
              )}
            </div>
            <AditivosListPanel
              aditivos={aditivos.data ?? []}
              podeCompensar={permAditivoCompensar.data === true && !cancelado}
              onCompensar={(a) => { setCompensarOrigem(a); setNovoAditivoOpen(true); }}
            />
          </TabsContent>
        )}

        <TabsContent value="documentos" className="mt-3">
          <DocumentosObjetoPanel
            objetoTipo="contratos"
            objetoId={c.id}
            permissaoVisualizar="comercial.contrato.visualizar"
            permissaoUpload="comercial.contrato.editar_cadastro"
            timelineObjetoTipo="contrato"
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          <TimelineObjetoPanel objetoTipo="contrato" objetoId={c.id} />
        </TabsContent>

        <TabsContent value="comissoes" className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Comissões vinculadas ao contrato (incluindo complementares por aditivo e versões substituídas).
          </p>
          <ComissoesContratoPanel contratoId={c.id} />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-3">
          <Card className="p-4 text-sm text-muted-foreground">
            <Users className="h-5 w-5 inline mr-1" />
            Auditoria técnica completa será consolidada em onda futura. Eventos operacionais já aparecem na aba <strong>Timeline</strong>.
          </Card>
        </TabsContent>
      </Tabs>

      <CancelarContratoDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        contratoId={c.id}
        codigo={c.codigo}
        loading={cancelar.isPending}
        onConfirm={async (motivo, observacao) => {
          await cancelar.mutateAsync({ id: c.id, motivo, observacao });
          setCancelOpen(false);
        }}
      />
      <NovoAditivoDialog
        open={novoAditivoOpen}
        onOpenChange={(v) => { setNovoAditivoOpen(v); if (!v) setCompensarOrigem(null); }}
        contrato={c}
        projetos={projetos.data ?? []}
        aditivoOrigem={compensarOrigem}
      />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/50 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-right"}>{value}</span>
    </div>
  );
}

function statusFromContract(c: { status: string; cancelado: boolean }): string {
  if (c.cancelado || c.status === "CANCELADO") return "CANCELADO";
  return c.status;
}
