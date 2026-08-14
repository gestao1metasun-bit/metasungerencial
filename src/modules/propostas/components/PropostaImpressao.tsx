// PropostaImpressao — visualização imprimível (impressão + download real de PDF).
// Modelo oficial único: Meta Sun 2026.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Printer, Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type PropostaFV } from "@/modules/propostas/store";
import { PropostaModeloPadrao } from "./PropostaModeloPadrao";

// html2canvas não entende cores modernas (lab/oklch/color-mix) usadas pelos tokens do tema.
// Convertemos toda cor computada para rgb() no clone antes da captura.
const PROPS_COR = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "columnRuleColor",
] as const;

function criarConversor() {
  const cache = new Map<string, string>();
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  return (valor: string): string | null => {
    if (!valor || !/lab\(|lch\(|oklab\(|oklch\(|color\(|color-mix\(/i.test(valor)) return null;
    const emCache = cache.get(valor);
    if (emCache) return emCache;
    if (!ctx) return "rgb(0, 0, 0)";
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000000";
      ctx.fillStyle = valor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const rgb = a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      cache.set(valor, rgb);
      return rgb;
    } catch {
      return "rgb(0, 0, 0)";
    }
  };
}

function normalizarCores(doc: Document) {
  const converter = criarConversor();
  const alvos = [doc.documentElement, doc.body, ...Array.from(doc.querySelectorAll<HTMLElement>("*"))];
  for (const el of alvos) {
    if (!el || !(el instanceof (el.ownerDocument.defaultView?.HTMLElement ?? HTMLElement))) continue;
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    if (!cs) continue;
    for (const prop of PROPS_COR) {
      const rgb = converter(cs[prop] as string);
      if (rgb) el.style.setProperty(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), rgb, "important");
    }
    const bgImg = cs.backgroundImage;
    if (bgImg && /lab\(|lch\(|oklch\(|color-mix\(/i.test(bgImg)) {
      el.style.setProperty("background-image", "none", "important");
    }
  }
}

export function PropostaImpressao({ proposta, onClose }: { proposta: PropostaFV; onClose: () => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [gerando, setGerando] = useState(false);

  async function imprimir() {
    const raiz = areaRef.current;
    if (!raiz) return;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const printWindow = frame.contentWindow;
    const printDocument = frame.contentDocument;
    if (!printWindow || !printDocument) {
      frame.remove();
      toast.error("Não foi possível abrir a impressão.");
      return;
    }

    printDocument.open();
    printDocument.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <base href="${window.location.origin}/" />
          <title>Proposta ${proposta.numero || "Meta Sun"}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
            .proposta-print { margin: 0 !important; padding: 0 !important; width: 210mm !important; }
            .proposta-modelo .mp-page { margin: 0 !important; box-shadow: none !important; break-after: page !important; page-break-after: always !important; }
            .proposta-modelo .mp-page:last-child { break-after: auto !important; page-break-after: auto !important; }
          </style>
        </head>
        <body><main class="proposta-print">${raiz.innerHTML}</main></body>
      </html>`);
    printDocument.close();

    try {
      await printDocument.fonts?.ready;
      const imagens = Array.from(printDocument.images);
      await Promise.all(imagens.map((img) => img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })));
      printWindow.focus();
      printWindow.print();
    } catch (erro) {
      console.error(erro);
      toast.error("Não foi possível imprimir a proposta.");
    } finally {
      window.setTimeout(() => frame.remove(), 1_000);
    }
  }

  async function baixarPdf() {
    const raiz = areaRef.current;
    if (!raiz || gerando) return;
    setGerando(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const paginas = Array.from(raiz.querySelectorAll<HTMLElement>(".mp-page"));
      if (!paginas.length) throw new Error("Nada para exportar");

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const larguraA4 = 210;
      const alturaA4 = 297;

      for (let i = 0; i < paginas.length; i++) {
        const canvas = await html2canvas(paginas[i], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          onclone: (doc) => normalizarCores(doc),
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        const altura = Math.min((canvas.height * larguraA4) / canvas.width, alturaA4);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, larguraA4, altura);
      }

      const nome = `Proposta_${(proposta.numero || "").replace(/[^\w-]+/g, "_")}_${(proposta.clienteNome || "cliente").replace(/[^\w-]+/g, "_")}.pdf`;
      pdf.save(nome);
      toast.success("PDF gerado com sucesso");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o PDF. Use Imprimir > Salvar como PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Proposta {proposta.numero}</DialogTitle>
        </DialogHeader>

        <div ref={areaRef} className="proposta-print px-2">
          <PropostaModeloPadrao proposta={proposta} />
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="outline" onClick={imprimir} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={baixarPdf} disabled={gerando} className="gap-2">
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {gerando ? "Gerando PDF..." : "Baixar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
