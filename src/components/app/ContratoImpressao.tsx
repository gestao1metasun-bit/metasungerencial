// ContratoImpressao — visualização imprimível do contrato (PDF via window.print).
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtBRL } from "@/lib/mock-data";
import type { ContratoFull } from "@/lib/contratos-store";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function ContratoImpressao({ contrato, onClose }: { contrato: ContratoFull; onClose: () => void }) {
  const cf = contrato.clienteFull;
  function imprimir() {
    document.body.classList.add("print-contrato");
    window.print();
    setTimeout(() => document.body.classList.remove("print-contrato"), 500);
  }
  const enderecoLinha = cf
    ? `${cf.rua}, ${cf.numero}${cf.complemento ? " - " + cf.complemento : ""} - ${cf.bairro} - ${cf.cidade}/${cf.uf} - CEP ${cf.cep}`
    : "—";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Contrato {contrato.id} — visualização</DialogTitle>
        </DialogHeader>

        <style>{`
          @media print {
            body.print-contrato * { visibility: hidden !important; }
            body.print-contrato .contrato-print, body.print-contrato .contrato-print * { visibility: visible !important; }
            body.print-contrato .contrato-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
            body.print-contrato .no-print { display: none !important; }
          }
        `}</style>

        <div className="contrato-print space-y-5 px-2 text-sm text-foreground">
          <header className="flex items-start justify-between border-b pb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary">Meta Sun · Energia Solar</div>
              <h1 className="text-xl font-bold">Contrato {contrato.id}</h1>
              <div className="text-xs text-muted-foreground">
                Proposta {contrato.propostaNumero ?? "—"} · Emissão {contrato.data}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Valor total<br />
              <span className="text-lg font-bold text-foreground">{fmtBRL(contrato.valor)}</span>
            </div>
          </header>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contratante</h2>
            <div className="grid grid-cols-2 gap-2">
              <Info label="Nome / Razão social" value={cf?.nome ?? contrato.cliente} />
              <Info label="CPF / CNPJ" value={cf?.doc ?? "—"} />
              <Info label="Telefone" value={cf?.telefone ?? "—"} />
              <Info label="E-mail" value={cf?.email ?? "—"} />
            </div>
            <div className="mt-2"><Info label="Endereço" value={enderecoLinha} /></div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Objeto do contrato</h2>
            <div className="grid grid-cols-3 gap-2">
              <Info label="Módulos" value={String(contrato.modulos ?? "—")} />
              <Info label="Potência (kWp)" value={String(contrato.kwp ?? "—")} />
              <Info label="Inversor" value={contrato.inv1 ?? "—"} />
            </div>
            <p className="mt-3 text-justify text-xs leading-relaxed text-muted-foreground">
              A CONTRATADA Meta Sun Energia Solar compromete-se a fornecer e instalar o sistema fotovoltaico
              descrito acima no endereço do CONTRATANTE, conforme especificações técnicas da proposta
              {contrato.propostaNumero ? ` ${contrato.propostaNumero}` : ""} parte integrante deste contrato.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor e pagamento</h2>
            <div className="grid grid-cols-3 gap-2">
              <Info label="Valor total" value={fmtBRL(contrato.valor)} />
              <Info label="Forma de pagamento" value={contrato.pagamento || "—"} />
              <Info label="Vendedor" value={contrato.vendedor || "—"} />
            </div>
          </section>

          <section className="pt-6">
            <div className="grid grid-cols-2 gap-12 pt-10 text-center text-xs">
              <div>
                <div className="border-t pt-2">CONTRATANTE</div>
                <div className="mt-1 text-muted-foreground">{cf?.nome ?? contrato.cliente}</div>
              </div>
              <div>
                <div className="border-t pt-2">CONTRATADA</div>
                <div className="mt-1 text-muted-foreground">Meta Sun Energia Solar</div>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={imprimir} className="gap-1.5">
            <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
