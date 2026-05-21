// ContratoImpressao — renderiza o contrato completo (template Meta Sun) com
// cláusulas dinâmicas, dados do cliente, forma de pagamento e personalizações.
// Suporta modo "pré-visualização" — exibe o contrato montado ANTES da geração
// efetiva, com botões "Voltar para edição" e "Confirmar geração".
import { Printer, CheckCircle2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtBRL } from "@/lib/mock-data";
import type { ContratoFull } from "@/lib/contratos-store";
import { clausulasBase, aplicarCustom, CONTRATADA } from "@/lib/contrato-template";

export function ContratoImpressao({
  contrato,
  onClose,
  preview,
  onConfirm,
  onBack,
}: {
  contrato: ContratoFull;
  onClose: () => void;
  /** Quando true, mostra o contrato como "pré-visualização" antes da geração. */
  preview?: boolean;
  /** Disparado ao clicar em "Confirmar geração" (apenas em modo preview). */
  onConfirm?: () => void;
  /** Disparado ao clicar em "Voltar para edição" (apenas em modo preview). */
  onBack?: () => void;
}) {
  const cf = contrato.clienteFull;
  const clausulas = aplicarCustom(clausulasBase(contrato), contrato.clausulasCustom);
  const isPJ = (cf?.doc ?? "").replace(/\D/g, "").length === 14;
  const cidadeForo = `${cf?.cidade ?? "Porto Velho"}/${cf?.uf ?? "RO"}`;
  const dataAssin = contrato.dataAssinatura ?? contrato.data ?? new Date().toISOString().slice(0, 10);

  function imprimir() {
    document.body.classList.add("print-contrato");
    window.print();
    setTimeout(() => document.body.classList.remove("print-contrato"), 500);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>
            {preview ? `Pré-visualização — contrato ${contrato.id}` : `Contrato ${contrato.id} — visualização`}
          </DialogTitle>
          {preview && (
            <p className="text-xs text-muted-foreground">
              Revise o contrato montado abaixo. Ele <b>ainda não foi gerado</b>. Volte para a edição se algo estiver errado,
              ou confirme a geração para registrar o contrato redigido.
            </p>
          )}
        </DialogHeader>

        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 22mm 20mm 22mm 20mm;
              @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 10px; color: #555; font-family: ui-sans-serif, system-ui, sans-serif; }
            }
            body.print-contrato * { visibility: hidden !important; }
            body.print-contrato .contrato-print, body.print-contrato .contrato-print * { visibility: visible !important; }
            body.print-contrato .contrato-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; color: #000; }
            body.print-contrato .no-print { display: none !important; }
            .clausula { page-break-inside: avoid; break-inside: avoid; }
            .assinaturas-bloco { page-break-inside: avoid; break-inside: avoid; }
            .manter-junto-assinaturas { page-break-inside: avoid; break-inside: avoid; }
          }
        `}</style>

        <div className="contrato-print space-y-6 px-2 text-[13px] leading-relaxed text-foreground">
          <header className="border-b pb-4 text-center">
            <div className="text-xs uppercase tracking-widest text-primary">Meta Sun · Energia Solar</div>
            <h1 className="text-xl font-bold mt-1">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
            <div className="text-xs text-muted-foreground mt-1">
              Nº {contrato.id} · Proposta {contrato.propostaNumero ?? "—"}
            </div>
          </header>

          {clausulas.slice(0, -1).map((c) => (
            <section key={c.numero} className="clausula">
              {c.titulo && (
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">
                  CLÁUSULA {romano(c.numero)} — {c.titulo}
                </h2>
              )}
              {c.paragrafos.map((p, i) => (
                <p key={i} className="mb-2 text-justify whitespace-pre-line">{p}</p>
              ))}
            </section>
          ))}

          {/* Última cláusula (geralmente "DO FORO" / 7) é mantida na mesma página das assinaturas */}
          <div className="manter-junto-assinaturas space-y-6">
            {clausulas.slice(-1).map((c) => (
              <section key={c.numero} className="clausula">
                {c.titulo && (
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">
                    CLÁUSULA {romano(c.numero)} — {c.titulo}
                  </h2>
                )}
                {c.paragrafos.map((p, i) => (
                  <p key={i} className="mb-2 text-justify whitespace-pre-line">{p}</p>
                ))}
              </section>
            ))}

            <section className="pt-2 text-justify">
              <p>
                E por estarem assim, justas e contratadas, firmam as partes o presente instrumento
                em 02 (duas) vias de igual teor e forma.
              </p>
              <p className="mt-3">{cidadeForo}, {fmtDataExtenso(dataAssin)}.</p>
            </section>

            <section className="assinaturas-bloco pt-16 grid grid-cols-1 gap-20">
              <div className="text-center text-xs">
                <div className="mx-auto w-3/4 border-t border-foreground pt-2">CONTRATANTE</div>
                <div className="mt-2 font-semibold">{cf?.nome ?? contrato.cliente}</div>
                <div className="text-muted-foreground">{isPJ ? "CNPJ" : "CPF"}: {cf?.doc ?? "—"}</div>
                <div className="text-muted-foreground">Telefone: {cf?.telefone ?? "—"}</div>
                {isPJ && contrato.responsavel && (
                  <div className="text-muted-foreground">Representada por {contrato.responsavel}{contrato.responsavelDoc ? ` — CPF ${contrato.responsavelDoc}` : ""}</div>
                )}
              </div>
              <div className="text-center text-xs">
                <div className="mx-auto w-3/4 border-t border-foreground pt-2">CONTRATADA</div>
                <div className="mt-2 font-semibold">{CONTRATADA.razao}</div>
                <div className="text-muted-foreground">CNPJ: {CONTRATADA.cnpj}</div>
                <div className="text-muted-foreground">Representada por {CONTRATADA.representante} — CPF {CONTRATADA.representanteCpf}</div>
              </div>
            </section>
          </div>

          <footer className="pt-6 border-t text-[10px] text-muted-foreground flex justify-between no-print">
            <span>Valor total: {fmtBRL(contrato.valor)}</span>
            <span>Forma de pagamento: {contrato.pagamentoTipo ?? contrato.pagamento ?? "—"}</span>
          </footer>
        </div>

        <DialogFooter className="no-print">
          {preview ? (
            <>
              <Button variant="outline" onClick={onBack ?? onClose} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Voltar para edição
              </Button>
              <Button variant="outline" onClick={imprimir} className="gap-1.5">
                <Printer className="h-4 w-4" /> Imprimir prévia
              </Button>
              <Button onClick={onConfirm} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                <CheckCircle2 className="h-4 w-4" /> Confirmar geração
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              <Button onClick={imprimir} className="gap-1.5">
                <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function romano(n: string): string {
  const base = parseInt(n, 10);
  const map: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X" };
  return map[base] ?? n;
}

function fmtDataExtenso(iso: string): string {
  try {
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d.getTime())) return iso;
    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  } catch { return iso; }
}
