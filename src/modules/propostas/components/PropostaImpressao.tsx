// PropostaImpressao — visualização imprimível (PDF via window.print).
// Modelo oficial único: Meta Sun 2026.
import { Printer, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type PropostaFV } from "@/modules/propostas/store";
import { PropostaModeloPadrao } from "./PropostaModeloPadrao";

export function PropostaImpressao({ proposta, onClose }: { proposta: PropostaFV; onClose: () => void }) {
  function imprimir() {
    document.body.classList.add("print-proposta");
    window.print();
    setTimeout(() => document.body.classList.remove("print-proposta"), 500);
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
