// PropostaImpressao — visualização imprimível (impressão + download real de PDF).
// Modelo oficial único: Meta Sun 2026.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Printer, Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type PropostaFV } from "@/modules/propostas/store";
import { PropostaModeloPadrao } from "./PropostaModeloPadrao";

export function PropostaImpressao({ proposta, onClose }: { proposta: PropostaFV; onClose: () => void }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [gerando, setGerando] = useState(false);

  function imprimir() {
    document.body.classList.add("print-proposta");
    window.print();
    setTimeout(() => document.body.classList.remove("print-proposta"), 500);
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

        <style>{`
          @media print {
            @page { size: A4; margin: 12mm 10mm 12mm 10mm; }
            body.print-proposta * { visibility: hidden !important; }
            body.print-proposta .proposta-print, body.print-proposta .proposta-print * { visibility: visible !important; }
            body.print-proposta .proposta-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
            body.print-proposta .no-print { display: none !important; }
          }
        `}</style>

        <div className="proposta-print px-2">
          <PropostaModeloPadrao proposta={proposta} />
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="outline" onClick={imprimir} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={imprimir} className="gap-2">
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
