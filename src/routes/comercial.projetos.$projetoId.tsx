/**
 * C-ENT.7 — Workspace do Projeto Supabase.
 * Fonte: public.projetos (criado por rpc_contrato_gerar_de_propostas).
 * Gate: permissão `comercial.projeto.visualizar`.
 *
 * NÃO implementa engenharia, aditivos, financeiro do projeto, checklist, ART nesta onda.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, ShieldAlert, ExternalLink,
  Zap, DollarSign, Layers, FileSignature, Users,
} from "lucide-react";
import {
  useProjetoSupabaseById,
  useContratoSupabaseById,
  usePropostasDoContrato,
} from "@/lib/repositories/contratos-supabase-repo";
import { useAditivosPorProjeto } from "@/lib/repositories/aditivos-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useTabFromHash } from "@/lib/route-tabs";
import { DocumentosObjetoPanel } from "@/components/app/universal/DocumentosObjetoPanel";
import { TimelineObjetoPanel } from "@/components/app/universal/TimelineObjetoPanel";
import { AditivosListPanel } from "@/components/app/contratos/AditivosListPanel";

export const Route = createFileRoute("/comercial/projetos/$projetoId")({
  head: () => ({ meta: [{ title: "Projeto — Workspace — Meta Sun" }] }),
  component: ProjetoWorkspacePage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

function ProjetoWorkspacePage() {
  const { projetoId } = Route.useParams();
  const navigate = useNavigate();
  const perm = useHasPermission("comercial.projeto.visualizar");
  const permAditivoVer = useHasPermission("comercial.aditivo.visualizar");
  const projeto = useProjetoSupabaseById(projetoId);
  const contrato = useContratoSupabaseById(projeto.data?.contrato_id);
  const propostas = usePropostasDoContrato(projeto.data?.contrato_id);
  const cliente = useCliente(projeto.data?.cliente_id);
  const aditivos = useAditivosPorProjeto(projetoId);
  const [tab, setTab] = useTabFromHash("resumo");

  if (perm.isLoading || projeto.isLoading) {
    return (
      <div className="p-2">
        <PageHeader title="Projeto" subtitle="Carregando..." />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando projeto...
        </div>
      </div>
    );
  }
  if (perm.data === false) {
    return (
      <div className="p-2">
        <PageHeader title="Projeto" subtitle="Acesso negado" />
        <Card className="p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium">Você não tem permissão para visualizar este projeto.</p>
            <p className="text-sm text-muted-foreground">
              Permissão necessária: <code>comercial.projeto.visualizar</code>.
            </p>
          </div>
        </Card>
      </div>
    );
  }
  if (!projeto.data) {
    return (
      <div className="p-2">
        <PageHeader title="Projeto" subtitle="Não encontrado" />
        <Card className="p-4 text-sm">
          Projeto não encontrado ou excluído.{" "}
          <Link to="/comercial/contratos" className="underline">Voltar a contratos</Link>
        </Card>
      </div>
    );
  }

  const p = projeto.data;
  const c = contrato.data;
  const propostaOrigem = (propostas.data ?? []).find(
    (pr) => pr.id === ((p.dados ?? {}) as Record<string, unknown>)["proposta_origem_id"],
  );
  const endereco = [cliente.data?.rua, cliente.data?.numero, cliente.data?.bairro, p.cidade, p.uf]
    .filter(Boolean)
    .join(", ") || "—";
  const etapa = String(((p.dados ?? {}) as Record<string, unknown>)["etapa"] ?? "—");

  return (
    <div className="p-2 space-y-2">
      <PageHeader
        title={`Projeto ${p.codigo ?? p.id.slice(0, 8)}`}
        subtitle={`Contrato: ${c?.codigo ?? "—"} · Cliente: ${cliente.data?.nome ?? "—"} · ${p.status}`}
        actions={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/comercial/contratos" })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            {p.contrato_id && (
              <Link to="/comercial/contratos/$contratoId" params={{ contratoId: p.contrato_id }}>
                <Button size="sm" variant="outline">
                  <FileSignature className="h-4 w-4 mr-1" /> Abrir contrato
                </Button>
              </Link>
            )}
            {p.cliente_id && (
              <Link to="/comercial/clientes/$clienteId" params={{ clienteId: p.cliente_id }}>
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" /> Cliente 360º
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard label="Valor ref." value={fmtBRL(p.valor_estimado)} icon={DollarSign} />
        <StatCard label="Potência (kWp)" value={(Number(p.potencia_kwp) || 0).toFixed(2)} icon={Zap} />
        <StatCard label="Módulos" value={String(p.modulos_qtde ?? 0)} icon={Layers} />
        <StatCard label="Tipo" value={p.tipo ?? "—"} icon={Users} />
        <StatCard label="Status" value={p.status ?? "—"} icon={FileSignature} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="execucao">Dados de execução</TabsTrigger>
          {permAditivoVer.data !== false && (
            <TabsTrigger value="aditivos">Aditivos ({aditivos.data?.length ?? 0})</TabsTrigger>
          )}
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <Card className="p-3 space-y-2 text-sm">
              <h3 className="font-semibold">Dados do projeto</h3>
              <Field label="Código" value={p.codigo ?? "—"} mono />
              <Field label="Contrato origem" value={c?.codigo ?? "—"} mono />
              <Field label="Proposta origem" value={propostaOrigem?.numero ?? "—"} mono />
              <Field label="Cliente" value={cliente.data?.nome ?? "—"} />
              <Field label="Documento" value={cliente.data?.doc ?? "—"} />
              <Field label="Endereço de instalação" value={endereco} />
              <Field label="Status" value={p.status} />
              <Field label="Etapa" value={etapa} />
              <Field label="Criado em" value={new Date(p.created_at).toLocaleString("pt-BR")} />
              <Field label="Última atualização" value={new Date(p.updated_at).toLocaleString("pt-BR")} />
            </Card>

            <Card className="p-3 space-y-2 text-sm">
              <h3 className="font-semibold">Composição técnica</h3>
              <Field label="Tipo" value={p.tipo ?? "—"} />
              <Field label="Inversor" value={p.inversor ?? "—"} />
              <Field label="Potência (kWp)" value={(Number(p.potencia_kwp) || 0).toFixed(2)} />
              <Field label="Módulos (qtd)" value={String(p.modulos_qtde ?? 0)} />
              <Field label="Valor referência" value={fmtBRL(p.valor_estimado)} />
              <Field label="Cidade/UF" value={[p.cidade, p.uf].filter(Boolean).join("/") || "—"} />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="execucao" className="mt-3">
          <Card className="p-3 text-sm space-y-2">
            <h3 className="font-semibold">Dados de execução</h3>
            <p className="text-muted-foreground text-xs">
              Esta aba exibe somente dados já existentes do projeto. Campos técnicos avançados
              (UC, concessionária, ART, homologação) e checklist de obra serão implementados em
              ondas de Engenharia.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <Field label="Status" value={p.status} />
              <Field label="Etapa" value={etapa} />
              <Field label="Tipo" value={p.tipo ?? "—"} />
              <Field label="Inversor" value={p.inversor ?? "—"} />
              <Field label="Potência (kWp)" value={(Number(p.potencia_kwp) || 0).toFixed(2)} />
              <Field label="Módulos" value={String(p.modulos_qtde ?? 0)} />
              <Field label="Cidade/UF" value={[p.cidade, p.uf].filter(Boolean).join("/") || "—"} />
              <Field label="Endereço" value={endereco} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-3">
          <DocumentosObjetoPanel
            objetoTipo="projetos"
            objetoId={p.id}
            permissaoVisualizar="comercial.projeto.visualizar"
            permissaoUpload="comercial.projeto.editar_cadastro"
            timelineObjetoTipo="projeto"
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          <TimelineObjetoPanel objetoTipo="projeto" objetoId={p.id} />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-3">
          <Card className="p-4 text-sm text-muted-foreground">
            Auditoria técnica completa será consolidada em onda futura. Eventos operacionais
            aparecem na aba <strong>Timeline</strong>.
          </Card>
        </TabsContent>
      </Tabs>
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

export { ProjetoWorkspacePage };
