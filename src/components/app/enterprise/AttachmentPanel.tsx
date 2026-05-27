/**
 * D6.13.4 — AttachmentPanel (REAL)
 *
 * Painel polimórfico de anexos. Substitui o stub D6.13.2. Usa as server fns
 * em `src/lib/anexos-engine.functions.ts` e funciona para QUALQUER entidade
 * declarada em `ENTIDADES_ANEXAVEIS`.
 *
 * Recursos:
 *  - Lista anexos (filtrados via RLS — usuário só vê o que pode).
 *  - Upload com categoria + observação (validação client + server).
 *  - Download via signed URL (5 min).
 *  - Soft delete com motivo obrigatório.
 *
 * NÃO duplicar este componente por módulo. Sempre reaproveitar.
 */
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Paperclip, Upload, Download, Trash2, Loader2, FileText,
  Image as ImageIcon, FileArchive, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAnexosEntidade,
  uploadAnexoEntidade,
  signedUrlAnexoEntidade,
  softDeleteAnexoEntidade,
  CATEGORIAS_ANEXO,
  type AnexoRow,
  type CategoriaAnexo,
  type EntidadeAnexavel,
} from "@/lib/anexos-engine.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORIA_LABEL: Record<CategoriaAnexo, string> = {
  contrato: "Contrato",
  comprovante: "Comprovante",
  boleto: "Boleto",
  nota_fiscal: "Nota fiscal",
  documento_cliente: "Documento do cliente",
  foto_obra: "Foto de obra",
  laudo: "Laudo",
  projeto: "Projeto",
  aprovacao: "Aprovação",
  orcamento: "Orçamento",
  financeiro: "Financeiro",
  estoque: "Estoque",
  outros: "Outros",
};

function iconForMime(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/zip") return FileArchive;
  return FileText;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export type AttachmentPanelProps = {
  entidade: EntidadeAnexavel;
  entidadeId?: string | null;
  /** Categoria sugerida por contexto (cliente pode override). */
  categoriaPadrao?: CategoriaAnexo;
  /** Esconde o cabeçalho — útil dentro de dialogs. */
  hideHeader?: boolean;
  className?: string;
};

export function AttachmentPanel({
  entidade, entidadeId, categoriaPadrao = "outros", hideHeader, className,
}: AttachmentPanelProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<CategoriaAnexo>(categoriaPadrao);
  const [observacao, setObservacao] = useState("");

  const enabled = !!entidadeId;
  const queryKey = ["anexos", entidade, entidadeId] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { anexos } = await listAnexosEntidade({
        data: { entidadeTipo: entidade, entidadeId: entidadeId! },
      });
      return anexos;
    },
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("entidadeTipo", entidade);
      fd.append("entidadeId", entidadeId!);
      fd.append("categoria", categoria);
      if (observacao.trim()) fd.append("observacao", observacao.trim());
      return uploadAnexoEntidade({ data: fd });
    },
    onSuccess: (res) => {
      toast.success(`Anexo enviado: ${res.anexo.nome}`);
      setObservacao("");
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message || "Falha no upload."),
  });

  const downloadMut = useMutation({
    mutationFn: (anexoId: string) =>
      signedUrlAnexoEntidade({ data: { anexoId } }),
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar link."),
  });

  const deleteMut = useMutation({
    mutationFn: (vars: { anexoId: string; motivo: string }) =>
      softDeleteAnexoEntidade({ data: vars }),
    onSuccess: () => {
      toast.success("Anexo excluído.");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao excluir."),
  });

  const onPickFile = useCallback(() => fileRef.current?.click(), []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadMut.mutate(f);
  };

  const onDelete = (a: AnexoRow) => {
    const motivo = window.prompt(`Motivo da exclusão de "${a.nome}" (mín. 3):`, "");
    if (!motivo || motivo.trim().length < 3) return;
    deleteMut.mutate({ anexoId: a.id, motivo: motivo.trim() });
  };

  if (!enabled) {
    return (
      <div className={cn("rounded border border-dashed border-border bg-muted/20 p-3 text-[12px] text-muted-foreground", className)}>
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5" /> Selecione um registro para visualizar anexos.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded border border-border bg-card p-3 text-[12px]", className)}>
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">Anexos</span>
          <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
            {data?.length ?? 0}
          </Badge>
        </div>
      )}

      {/* Upload form */}
      <div className="grid grid-cols-1 gap-2 rounded border border-border/70 bg-muted/30 p-2 md:grid-cols-[180px_1fr_auto]">
        <div className="flex flex-col gap-1">
          <Label className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Categoria</Label>
          <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaAnexo)}>
            <SelectTrigger className="h-7 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS_ANEXO.map((c) => (
                <SelectItem key={c} value={c} className="text-[12px]">{CATEGORIA_LABEL[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Observação (opcional)</Label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Descrição curta do documento…"
            rows={1}
            className="min-h-[28px] resize-none py-1 text-[12px]"
            maxLength={500}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            size="sm"
            className="h-7 w-full md:w-auto"
            onClick={onPickFile}
            disabled={uploadMut.isPending}
          >
            {uploadMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">Enviar arquivo</span>
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-1">
        {isLoading && (
          <div className="flex items-center gap-2 py-3 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando anexos…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 p-2 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{(error as Error).message}</span>
          </div>
        )}
        {!isLoading && !error && (data?.length ?? 0) === 0 && (
          <div className="py-3 text-center text-muted-foreground">
            Nenhum anexo registrado para este registro.
          </div>
        )}
        {data?.map((a) => {
          const Icon = iconForMime(a.mime);
          return (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded border border-border/70 bg-background px-2 py-1.5"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium" title={a.nome}>{a.nome}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                  <Badge variant="outline" className="h-4 px-1 text-[9.5px]">
                    {CATEGORIA_LABEL[a.categoria]}
                  </Badge>
                  <span>{formatBytes(a.tamanho)}</span>
                  <span>·</span>
                  <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  {a.observacao && (
                    <>
                      <span>·</span>
                      <span className="truncate" title={a.observacao}>{a.observacao}</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => downloadMut.mutate(a.id)}
                disabled={downloadMut.isPending}
                title="Baixar"
                aria-label="Baixar"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => onDelete(a)}
                disabled={deleteMut.isPending}
                title="Excluir"
                aria-label="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
