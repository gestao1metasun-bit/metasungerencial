/**
 * E.OS.4.b — AnexoSignedImage / AnexoSignedLink
 *
 * Renderiza preview/link com URL assinada via anexosRepo.getSignedUrl.
 * Usa lazy fetch — só pede URL quando o componente é montado.
 */
import { useEffect, useState } from "react";
import { anexosRepo } from "@/lib/repositories/anexos-repo";
import { Paperclip, ImageIcon } from "lucide-react";

export function AnexoSignedImage({ storagePath, nome, alt }: { storagePath: string; nome?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    anexosRepo.getSignedUrl(storagePath, 300)
      .then((u) => { if (active) setUrl(u); })
      .catch((e) => { if (active) setErr(e.message); });
    return () => { active = false; };
  }, [storagePath]);
  if (err) return <div className="text-[11px] text-red-600">Falha: {err}</div>;
  if (!url) return <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" />Carregando preview…</div>;
  return (
    <a href={url} target="_blank" rel="noreferrer" title={nome ?? alt ?? ""}>
      <img src={url} alt={alt ?? nome ?? "anexo"} className="max-h-32 max-w-full rounded border bg-white object-contain" />
    </a>
  );
}

export function AnexoSignedLink({ storagePath, nome }: { storagePath: string; nome: string }) {
  const [busy, setBusy] = useState(false);
  async function abrir() {
    setBusy(true);
    try {
      const url = await anexosRepo.getSignedUrl(storagePath, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert("Falha ao abrir: " + (e as Error).message);
    } finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={abrir} disabled={busy}
      className="inline-flex items-center gap-1 text-[12px] text-blue-700 hover:underline disabled:opacity-50">
      <Paperclip className="h-3 w-3" />{busy ? "Abrindo…" : nome}
    </button>
  );
}
