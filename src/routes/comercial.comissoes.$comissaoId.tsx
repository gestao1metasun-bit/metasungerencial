/**
 * C-ENT.10 — Workspace oficial da Comissão.
 * Fonte: public.comercial_comissoes + comercial_comissao_eventos.
 * Gate: permissão `comercial.comissao.visualizar`.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Loader2, ShieldAlert, ExternalLink, CheckCircle2,
  Shuffle, Ban, DollarSign, FileSignature,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useComissaoById,
  useComissaoEventos,
  useAprovarComissao,
  useLiberarComissao,
  useMarcarComissaoPaga,
  useCancelarComissao,
  type ComissaoStatus,
} from "@/lib/repositories/comercial-comissao-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useTabFromHash } from "@/lib/route-tabs";
import { TimelineObjetoPanel } from "@/components/app/universal/TimelineObjetoPanel";
import { DocumentosObjetoPanel } from "@/components/app/universal/DocumentosObjetoPanel";
import { SubstituirComissaoDialog } from "@/components/app/comissoes/SubstituirComissaoDialog";

export const Route = createFileRoute("/comercial/comissoes/$comissaoId")({
  head: () => ({ meta: [{ title: "Comissão — Workspace — Meta Sun" }] }),
  component: ComissaoWorkspacePage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusTone: Record<ComissaoStatus, string> = {
  PREVISTA:    "bg-sky-50 text-sky-700 border-sky-200",
  APROVADA:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  LIBERADA:    "bg-amber-50 text-amber-700 border-amber-200",
  PAGA:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELADA:   "bg-slate-100 text-slate-600 border-slate-200",
  ESTORNADA:   "bg-red-50 text-red-700 border-red-200",
  SUBSTITUIDA: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function ComissaoWorkspacePage() {
  const { comissaoId } = Route.useParams();
  const navigate = useNavigate();
  const perm = useHasPermission("comercial.comissao.visualizar");
  const permAprovar = useHasPermission("comercial.comissao.aprovar");
  const permSubst = useHasPermission("comercial.comissao.substituir");
  const permLib = useHasPermission("comercial.comissao.liberar");
  const permPagar = useHasPermission("comercial.comissao.pagar");
  const permCanc = useHasPermission("comercial.comissao.cancelar");

  const { data: c, isLoading } = useComissaoById(comissaoId);
  const eventos = useComissaoEventos(comissaoId);
  const aprovar = useAprovarComissao();
  const liberar = useLiberarComissao();
  const pagar = useMarcarComissaoPaga();
  const cancelar = useCancelarComissao();

  const [tab, setTab] = useTabFromHash("/comercial/comissoes/$comissaoId");
  const [substOpen, setSubstOpen] = useState(false);

  if (perm.isLoading || isLoading) {
    return <div className="p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Carregando…</div>;
  }
  if (perm.data === false) {
    return (
      <Card className="m-3 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4" /> Sem permissão para ver Comissões.
      </Card>
    );
  }
  if (!c) {
    return (
      <Card className="m-3 p-4 text-sm">
        Comissão não encontrada.
        <Button size="sm" variant="link" onClick={() => navigate({ to: "/comercial/comissoes" })}>Voltar</Button>
      </Card>
    );
  }
  const canMutate = !["PAGA","CANCELADA","SUBSTITUIDA","ESTORNADA"].includes(c.status);

  return (
    <div className="p-3 space-y-3">
      <PageHeader
        title={`Comissão ${c.codigo ?? c.id.slice(0,8)}`}
        subtitle={`Beneficiário: ${c.beneficiario_nome ?? c.vendedor_nome ?? "—"} • Origem: ${c.origem}`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/comercial/comissoes" })}>
              <ArrowLeft className="h-3 w-3 mr-1" /> Lista
            </Button>
            {canMutate && c.status === "PREVISTA" && permAprovar.data && (
              <Button size="sm" onClick={() => aprovar.mutate({ comissaoId: c.id })}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
              </Button>
            )}
            {canMutate && (c.status === "APROVADA" || c.status === "PREVISTA") && permLib.data && (
              <Button size="sm" variant="outline" onClick={() => liberar.mutate({ comissaoId: c.id })}>
                <DollarSign className="h-3 w-3 mr-1" /> Liberar
              </Button>
            )}
            {c.status === "LIBERADA" && permPagar.data && (
              <Button size="sm" onClick={() => pagar.mutate({ comissaoId: c.id })}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar paga
              </Button>
            )}
            {canMutate && permSubst.data && (
              <Button size="sm" variant="outline" onClick={() => setSubstOpen(true)}>
                <Shuffle className="h-3 w-3 mr-1" /> Substituir
              </Button>
            )}
            {canMutate && permCanc.data && (
              <Button size="sm" variant="destructive" onClick={() => {
                const m = window.prompt("Motivo (mín. 5 caracteres):");
                if (m && m.trim().length >= 5) cancelar.mutate({ comissaoId: c.id, motivo: m.trim() });
              }}>
                <Ban className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria ({eventos.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <Card className="p-3 space-y-2 text-sm">
              <h3 className="font-semibold flex items-center gap-1.5">
                <FileSignature className="h-4 w-4" /> Dados da comissão
              </h3>
              <Field label="Código" value={c.codigo ?? "—"} mono />
              <Field label="Status" value={
                <Badge variant="outline" className={statusTone[c.status]}>{c.status}</Badge>
              } />
              <Field label="Origem" value={c.origem} />
              <Field label="Tipo de beneficiário" value={c.tipo_beneficiario} />
              <Field label="Beneficiário" value={c.beneficiario_nome ?? c.vendedor_nome ?? "—"} />
              <Field label="Percentual" value={`${Number(c.percentual).toFixed(2)}%`} />
              <Field label="Base de cálculo" value={fmtBRL(c.valor_base)} />
              <Field label="Valor previsto" value={fmtBRL(c.valor_previsto ?? c.valor_calculado)} />
              {c.valor_aprovado != null && <Field label="Valor aprovado" value={fmtBRL(c.valor_aprovado)} />}
              {c.valor_pago != null && <Field label="Valor pago" value={fmtBRL(c.valor_pago)} />}
              {c.motivo && <Field label="Motivo" value={c.motivo} />}
              {c.justificativa_aprovacao && <Field label="Justificativa aprovação" value={c.justificativa_aprovacao} />}
            </Card>

            <Card className="p-3 space-y-2 text-sm">
              <h3 className="font-semibold flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4" /> Vínculos
              </h3>
              <Field label="Contrato" value={
                <Link to="/comercial/contratos/$contratoId" params={{ contratoId: c.contrato_id }}
                  className="text-primary hover:underline font-mono text-xs">
                  {c.contrato_id.slice(0,8)} <ExternalLink className="h-3 w-3 inline" />
                </Link>
              } />
              {c.projeto_id && (
                <Field label="Projeto" value={
                  <Link to="/comercial/projetos/$projetoId" params={{ projetoId: c.projeto_id }}
                    className="text-primary hover:underline font-mono text-xs">
                    {c.projeto_id.slice(0,8)} <ExternalLink className="h-3 w-3 inline" />
                  </Link>
                } />
              )}
              {c.aditivo_id && <Field label="Aditivo" value={c.aditivo_id.slice(0,8)} mono />}
              {c.proposta_id && <Field label="Proposta" value={c.proposta_id.slice(0,8)} mono />}
              {c.comissao_origem_id && (
                <Field label="Substitui comissão" value={
                  <Link to="/comercial/comissoes/$comissaoId" params={{ comissaoId: c.comissao_origem_id }}
                    className="text-primary hover:underline font-mono text-xs">
                    {c.comissao_origem_id.slice(0,8)} <ExternalLink className="h-3 w-3 inline" />
                  </Link>
                } />
              )}
              {c.substituida_por_comissao_id && (
                <Field label="Substituída por" value={
                  <Link to="/comercial/comissoes/$comissaoId" params={{ comissaoId: c.substituida_por_comissao_id }}
                    className="text-primary hover:underline font-mono text-xs">
                    {c.substituida_por_comissao_id.slice(0,8)} <ExternalLink className="h-3 w-3 inline" />
                  </Link>
                } />
              )}
              <Field label="Título financeiro (futuro)" value={c.titulo_financeiro_id ?? "—"} mono />
              <Field label="Criada em" value={new Date(c.created_at).toLocaleString("pt-BR")} />
              <Field label="Atualizada em" value={new Date(c.updated_at).toLocaleString("pt-BR")} />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-3">
          <DocumentosObjetoPanel
            objetoTipo="comercial_comissoes"
            objetoId={c.id}
            permissaoVisualizar="comercial.comissao.visualizar"
            permissaoUpload="comercial.comissao.editar"
            timelineObjetoTipo="comissao"
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-3">
          <TimelineObjetoPanel objetoTipo="comissao" objetoId={c.id} />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-3">
          <Card className="p-2 text-xs">
            <div className="grid grid-cols-7 gap-2 px-2 py-1 font-semibold text-muted-foreground border-b">
              <span>Quando</span><span>Ação</span><span>Status ant.</span><span>Status novo</span>
              <span>%</span><span>Valor</span><span>Motivo</span>
            </div>
            {(eventos.data ?? []).map((e) => (
              <div key={e.id} className="grid grid-cols-7 gap-2 px-2 py-1 border-b border-border/50">
                <span>{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                <span className="font-mono">{e.acao}</span>
                <span>{e.status_anterior ?? "—"}</span>
                <span>{e.status_novo ?? "—"}</span>
                <span>{e.percentual_novo ?? "—"}</span>
                <span>{e.valor_novo != null ? fmtBRL(Number(e.valor_novo)) : "—"}</span>
                <span className="truncate">{e.motivo ?? "—"}</span>
              </div>
            ))}
            {(eventos.data ?? []).length === 0 && (
              <div className="py-6 text-center text-muted-foreground">Nenhum evento registrado.</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <SubstituirComissaoDialog open={substOpen} onOpenChange={setSubstOpen} comissao={c} />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/50 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-right"}>{value}</span>
    </div>
  );
}
