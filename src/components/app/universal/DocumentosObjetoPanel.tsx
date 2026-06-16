/**
 * C-ENT.6 — Componente Universal de Documentos por Objeto.
 * Reutiliza o motor universal `anexos` (tabela `public.anexos` + bucket `anexos`).
 * Documento sempre nasce vinculado ao objeto. Nova versão = novo anexo (histórico recolhido).
 */
import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Download, FileText, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import {
  anexosRepo, useAnexos, useUploadAnexo, type Anexo, type EntidadeAnexavel,
} from "@/lib/repositories/anexos-repo";
import { useHasPermission } from "@/hooks/use-has-permission";
import { toast } from "sonner";
import { logError } from "@/lib/error-log";
import { timelineRepo, type ObjetoTipo } from "@/lib/repositories/timeline-repo";

interface Props {
  objetoTipo: EntidadeAnexavel;
  objetoId: string;
  readonly?: boolean;
  permissaoVisualizar?: string;
  permissaoUpload?: string;
  /** Se informado, registra evento de timeline ao subir documento. */
  timelineObjetoTipo?: ObjetoTipo;
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosObjetoPanel({
  objetoTipo,
  objetoId,
  readonly = false,
  permissaoVisualizar,
  permissaoUpload,
  timelineObjetoTipo,
}: Props) {
  const podeVer = useHasPermission(permissaoVisualizar as never);
  const podeUpload = useHasPermission(permissaoUpload as never);
  const lista = useAnexos(objetoTipo, objetoId);
  const upload = useUploadAnexo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [verAnteriores, setVerAnteriores] = useState(false);

  const podeVisualizar = permissaoVisualizar ? podeVer : true;
  const podeFazerUpload = !readonly && (permissaoUpload ? podeUpload : true);

  const { atual, anteriores } = useMemo(() => {
    const rows = (lista.data ?? []) as Anexo[];
    if (rows.length === 0) return { atual: null as Anexo | null, anteriores: [] as Anexo[] };
    return { atual: rows[0], anteriores: rows.slice(1) };
  }, [lista.data]);

  async function onPickFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    try {
      const novo = await upload.mutateAsync({
        entidade: objetoTipo,
        entidadeId: objetoId,
        file,
        categoria: "outros",
      });
      toast.success("Documento anexado.");
      if (timelineObjetoTipo) {
        try {
          await timelineRepo.registrar({
            objetoTipo: timelineObjetoTipo,
            objetoId,
            eventoTipo: "DOCUMENTO_ANEXADO",
            titulo: `Documento anexado: ${novo.nome}`,
            descricao: `Arquivo ${novo.nome} (${fmtSize(novo.tamanho)})`,
            payload: { anexo_id: novo.id, nome: novo.nome, mime: novo.mime, tamanho: novo.tamanho },
          });
        } catch (err) {
          logError({ scope: "timeline.documento_anexado", error: err });
        }
      }
    } catch (err) {
      logError({ scope: "anexos.upload", error: err, context: { objetoTipo, objetoId } });
      toast.error("Falha ao anexar documento.");
    }
  }

  async function baixar(a: Anexo) {
    try {
      const url = await anexosRepo.getSignedUrl(a.storage_path, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      logError({ scope: "anexos.signed_url", error: err });
      toast.error("Falha ao gerar link de download.");
    }
  }

  if (!podeVisualizar) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4 inline mr-1" />
        Sem permissão para visualizar documentos.
      </Card>
    );
  }

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="h-4 w-4" /> Documentos do objeto
        </div>
        {podeFazerUpload && (
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              size="sm"
              variant="default"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Anexar / Nova versão
            </Button>
          </div>
        )}
      </div>

      {lista.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…
        </div>
      ) : lista.isError ? (
        <div className="text-sm text-destructive py-4">
          Falha ao carregar documentos. Tente novamente.
        </div>
      ) : !atual ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Nenhum documento anexado a este objeto ainda.
        </div>
      ) : (
        <>
          <DocRow doc={atual} versaoLabel="Versão atual" highlight onDownload={() => baixar(atual)} />
          {anteriores.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVerAnteriores((v) => !v)}
                className="text-xs"
              >
                {verAnteriores ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Versões anteriores ({anteriores.length})
              </Button>
              {verAnteriores && (
                <div className="mt-2 space-y-1.5 opacity-70">
                  {anteriores.map((a) => (
                    <DocRow key={a.id} doc={a} versaoLabel="Anterior" onDownload={() => baixar(a)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function DocRow({
  doc, versaoLabel, highlight, onDownload,
}: { doc: Anexo; versaoLabel: string; highlight?: boolean; onDownload: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-md border p-2 ${highlight ? "bg-muted/30" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{doc.nome}</div>
          <div className="text-xs text-muted-foreground">
            {fmtSize(doc.tamanho)} • {doc.mime || "—"} •{" "}
            {new Date(doc.created_at).toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={highlight ? "default" : "outline"} className="text-[10px]">{versaoLabel}</Badge>
        <Button size="sm" variant="outline" onClick={onDownload}>
          <Download className="h-3.5 w-3.5 mr-1" /> Baixar
        </Button>
      </div>
    </div>
  );
}
