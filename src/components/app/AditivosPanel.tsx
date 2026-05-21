// Painel de aditivos de um contrato — lista + ações conforme fluxo.
import { useState } from "react";
import { Plus, FileSignature, CheckCircle2, XCircle, Paperclip, Send, ChevronRight, Lock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fmtBRL } from "@/lib/mock-data";
import { toast } from "sonner";
import {
  useAditivosByContrato,
  ADITIVO_STATUS_LABEL,
  ADITIVO_CATEGORIA_LABEL,
  enviarParaAssinatura,
  anexarAssinado,
  enviarParaAprovacao,
  aprovarAditivo,
  reprovarAditivo,
  cancelarAditivo,
  areasImpactadas,
  type Aditivo,
} from "@/lib/aditivos-store";
import type { ContratoFull } from "@/lib/contratos-store";
import { AditivoDialog } from "./AditivoDialog";

const STATUS_COLOR: Record<string, string> = {
  CRIADO: "bg-muted text-foreground",
  AGUARDANDO_ASSINATURA: "bg-warning/15 text-warning border-warning/40",
  ASSINADO: "bg-info/15 text-info border-info/40",
  AGUARDANDO_APROVACAO: "bg-warning/20 text-warning border-warning/50",
  APROVADO: "bg-success/15 text-success border-success/40",
  REPROVADO: "bg-destructive/15 text-destructive border-destructive/40",
  CANCELADO: "bg-muted text-muted-foreground",
};

const AREA_LABEL: Record<string, string> = {
  finalizar_obra: "Finalizar obra",
  liberar_estoque: "Liberar estoque",
  faturar: "Faturar",
  gerar_financeiro: "Gerar financeiro",
  concluir_etapa_critica: "Concluir etapa crítica",
  consolidar: "Consolidar alterações",
};

export function AditivosPanel({
  contrato, usuario, podeGerenciar,
}: {
  contrato: ContratoFull;
  usuario: string;
  /** Apenas Financeiro/Diretoria pode criar/aprovar/substituir/validar. */
  podeGerenciar: boolean;
}) {
  const aditivos = useAditivosByContrato(contrato.id);
  const [novoOpen, setNovoOpen] = useState(false);
  const [anexoTarget, setAnexoTarget] = useState<Aditivo | null>(null);
  const [anexoNome, setAnexoNome] = useState("");
  const [reprovaTarget, setReprovaTarget] = useState<Aditivo | null>(null);
  const [reprovaMotivo, setReprovaMotivo] = useState("");

  function handleAprovar(a: Aditivo) {
    const r = aprovarAditivo(a.id, usuario, contrato);
    if (!r.ok) toast.error(r.erro);
    else toast.success(`Aditivo ${a.id} aprovado e consolidado.`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Aditivos contratuais</h3>
          <p className="text-xs text-muted-foreground">
            Contrato assinado não retorna etapa. Mudanças posteriores ocorrem por aditivo.
          </p>
        </div>
        {podeGerenciar && (
          <Button size="sm" onClick={() => setNovoOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo aditivo
          </Button>
        )}
      </div>

      {aditivos.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum aditivo registrado para este contrato.
        </Card>
      )}

      {aditivos.map((a) => {
        const areas = areasImpactadas(a);
        return (
          <Card key={a.id} className={`p-4 space-y-3 ${a.oculto ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold">{a.id}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{a.tipo}</Badge>
                  <Badge variant="outline" className="text-[10px]">{ADITIVO_CATEGORIA_LABEL[a.categoria]}</Badge>
                  {a.impactoFinanceiro && <Badge className="bg-warning text-warning-foreground text-[10px]">Impacto financeiro</Badge>}
                  {a.oculto && <Badge variant="secondary" className="text-[10px] gap-1"><Ban className="h-3 w-3" /> Substituído</Badge>}
                </div>
                <div className="text-sm">{a.descricao}</div>
                <div className="text-xs text-muted-foreground">{a.motivo}</div>
              </div>
              <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${STATUS_COLOR[a.status] ?? ""}`}>
                {ADITIVO_STATUS_LABEL[a.status]}
              </span>
            </div>

            {/* Alterações */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {a.alteracoes.modulos !== undefined && (
                <div><span className="text-muted-foreground">Δ Módulos:</span> <b>{a.alteracoes.modulos > 0 ? "+" : ""}{a.alteracoes.modulos}</b></div>
              )}
              {a.alteracoes.potenciaKwp !== undefined && (
                <div><span className="text-muted-foreground">Δ kWp:</span> <b>{a.alteracoes.potenciaKwp > 0 ? "+" : ""}{a.alteracoes.potenciaKwp}</b></div>
              )}
              {a.alteracoes.valor !== undefined && (
                <div><span className="text-muted-foreground">Δ Valor:</span> <b>{fmtBRL(a.alteracoes.valor)}</b></div>
              )}
              {a.alteracoes.inversores && (
                <div><span className="text-muted-foreground">Inversores:</span> <b>{a.alteracoes.inversores}</b></div>
              )}
              {a.alteracoes.endereco && (
                <div className="col-span-2"><span className="text-muted-foreground">Endereço:</span> <b>{a.alteracoes.endereco}</b></div>
              )}
              {a.alteracoes.estruturaTecnica && (
                <div className="col-span-2"><span className="text-muted-foreground">Estrutura:</span> <b>{a.alteracoes.estruturaTecnica}</b></div>
              )}
            </div>

            {/* Áreas travadas (se pendente) */}
            {["CRIADO","AGUARDANDO_ASSINATURA","ASSINADO","AGUARDANDO_APROVACAO"].includes(a.status) && areas.length > 0 && (
              <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-warning mb-1">
                  <Lock className="h-3 w-3" /> Trava operacional parcial enquanto aditivo está pendente:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map((ar) => (
                    <Badge key={ar} variant="outline" className="text-[10px]">{AREA_LABEL[ar]}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reprovação */}
            {a.status === "REPROVADO" && a.reprovadoMotivo && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
                <b>Motivo da reprovação:</b> {a.reprovadoMotivo}
              </div>
            )}

            {/* Ações conforme status */}
            {podeGerenciar && (
              <div className="flex flex-wrap gap-2 pt-1 border-t">
                {a.status === "CRIADO" && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => enviarParaAssinatura(a.id, usuario)}>
                      <Send className="h-3.5 w-3.5" /> Enviar para assinatura
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => setReprovaTarget(a)}>
                      <XCircle className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  </>
                )}
                {a.status === "AGUARDANDO_ASSINATURA" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setAnexoTarget(a); setAnexoNome(""); }}>
                    <Paperclip className="h-3.5 w-3.5" /> Anexar assinado
                  </Button>
                )}
                {a.status === "ASSINADO" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => enviarParaAprovacao(a.id, usuario)}>
                    <ChevronRight className="h-3.5 w-3.5" /> Enviar para aprovação
                  </Button>
                )}
                {a.status === "AGUARDANDO_APROVACAO" && (
                  <>
                    <Button size="sm" className="gap-1.5 bg-success text-success-foreground hover:bg-success/90" onClick={() => handleAprovar(a)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar e consolidar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/40" onClick={() => setReprovaTarget(a)}>
                      <XCircle className="h-3.5 w-3.5" /> Reprovar
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="text-[10px] text-muted-foreground flex gap-3 flex-wrap pt-1">
              <span>Criado: {new Date(a.dataCriacao).toLocaleString("pt-BR")} por {a.criadoPor}</span>
              {a.dataAssinatura && <span>Assinado: {new Date(a.dataAssinatura).toLocaleString("pt-BR")}</span>}
              {a.dataAprovacao && <span>{a.status === "APROVADO" ? "Aprovado" : "Reprovado"}: {new Date(a.dataAprovacao).toLocaleString("pt-BR")} {a.aprovadoPor ? `por ${a.aprovadoPor}` : ""}</span>}
              {a.anexoAssinadoNome && <span className="inline-flex items-center gap-1"><FileSignature className="h-3 w-3" /> {a.anexoAssinadoNome}</span>}
            </div>
          </Card>
        );
      })}

      <AditivoDialog open={novoOpen} onOpenChange={setNovoOpen} contrato={contrato} usuario={usuario} />

      {/* Anexar assinado */}
      <Dialog open={!!anexoTarget} onOpenChange={(v) => { if (!v) setAnexoTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar aditivo assinado</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome do arquivo / referência</Label>
            <Input value={anexoNome} onChange={(e) => setAnexoNome(e.target.value)} placeholder="aditivo-001-assinado.pdf" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnexoTarget(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!anexoNome.trim()) { toast.error("Informe o nome/referência."); return; }
              anexarAssinado(anexoTarget!.id, anexoNome.trim(), usuario);
              toast.success("Aditivo marcado como assinado.");
              setAnexoTarget(null);
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprovar / Cancelar */}
      <Dialog open={!!reprovaTarget} onOpenChange={(v) => { if (!v) { setReprovaTarget(null); setReprovaMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reprovaTarget?.status === "AGUARDANDO_APROVACAO" ? "Reprovar aditivo" : "Cancelar aditivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea value={reprovaMotivo} onChange={(e) => setReprovaMotivo(e.target.value)} rows={3} />
            <p className="text-xs text-muted-foreground">
              A trava operacional será liberada e as alterações pendentes serão descartadas. O contrato permanece no estado anterior.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReprovaTarget(null)}>Voltar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!reprovaMotivo.trim()) { toast.error("Informe o motivo."); return; }
                if (reprovaTarget!.status === "AGUARDANDO_APROVACAO") {
                  reprovarAditivo(reprovaTarget!.id, reprovaMotivo.trim(), usuario);
                  toast.success("Aditivo reprovado.");
                } else {
                  cancelarAditivo(reprovaTarget!.id, reprovaMotivo.trim(), usuario);
                  toast.success("Aditivo cancelado.");
                }
                setReprovaTarget(null);
                setReprovaMotivo("");
              }}
            >Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
