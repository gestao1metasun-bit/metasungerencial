// PropostaImpressao — visualização imprimível (PDF via window.print).
import { Printer, LayoutTemplate, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type PropostaFV,
  useInversoresFV, calcDimensionamento, calcPrecificacao,
  consumoEfetivo, fmtBRL, fmtNum,
} from "@/modules/propostas/store";
import { MODELOS_PROPOSTA, setModeloProposta, useModeloProposta } from "@/modules/propostas/proposta-modelo-store";
import { PropostaModeloPadrao } from "./PropostaModeloPadrao";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export function PropostaImpressao({ proposta, onClose }: { proposta: PropostaFV; onClose: () => void }) {
  const inversores = useInversoresFV();
  const dim = calcDimensionamento(proposta);
  const pre = calcPrecificacao(proposta);
  const modelo = useModeloProposta();

  function imprimir() {
    document.body.classList.add("print-proposta");
    window.print();
    setTimeout(() => document.body.classList.remove("print-proposta"), 500);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Visualização — {proposta.numero}</DialogTitle>
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

        {modelo === "META_SUN_2026" ? (
          <div className="proposta-print px-2">
            <PropostaModeloPadrao proposta={proposta} />
          </div>
        ) : (


        <div className="proposta-print space-y-6 px-2 text-sm text-foreground">
          <header className="flex items-start justify-between border-b pb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary">Meta Sun · Energia Solar</div>
              <h1 className="text-2xl font-semibold">Proposta Comercial Fotovoltaica</h1>
              <div className="mt-1 text-xs text-muted-foreground">Nº {proposta.numero} · Emitida em {proposta.criadoEm} · Válida até {proposta.validade}</div>
            </div>
            <div className="text-right text-xs">
              <div className="font-semibold">Status: {proposta.status}</div>
            </div>
          </header>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Cliente</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><strong>Nome:</strong> {proposta.clienteNome}</div>
              <div><strong>CPF/CNPJ:</strong> {proposta.clienteDoc || "—"}</div>
              <div><strong>Telefone:</strong> {proposta.clienteTelefone || "—"}</div>
              <div><strong>E-mail:</strong> {proposta.clienteEmail || "—"}</div>
              <div className="col-span-2"><strong>Endereço:</strong> {proposta.clienteEndereco || "—"} — {proposta.cidade}/{proposta.estado}</div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Sistema fotovoltaico proposto</h2>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Info label="Potência" value={`${fmtNum(dim.potenciaFinalKwp, 2)} kWp`} />
              <Info label="Quantidade de módulos" value={String(dim.qtdFinal)} />
              <Info label="Módulo" value={`${proposta.moduloMarca || "—"} ${proposta.moduloModelo || ""} (${proposta.moduloPotenciaWp}W)`} />
              <Info label="Área estimada" value={`${fmtNum(dim.areaTotal, 1)} m²`} />
              <Info label="Geração média mensal" value={`${fmtNum(dim.geracaoMensalKwh, 0)} kWh`} />
              <Info label="Geração média anual" value={`${fmtNum(dim.geracaoAnualKwh, 0)} kWh`} />
              <Info label="Concessionária" value={proposta.concessionaria || "—"} />
              <Info label="Tipo de instalação" value={proposta.tipoInstalacao} />
              <Info label="Tipo de telhado" value={proposta.tipoTelhado} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Inversores</h2>
            <ul className="list-disc pl-5 text-xs">
              {proposta.inversores.map((e, i) => {
                const inv = inversores.find((x) => x.id === e.inversorId);
                return inv ? <li key={i}>{e.quantidade}× {inv.marca} {inv.modelo} ({inv.potenciaKw} kW)</li> : null;
              })}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Comparativo energético</h2>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Info label="Consumo médio" value={`${fmtNum(consumoEfetivo(proposta), 0)} kWh/mês`} />
              <Info label="Geração média" value={`${fmtNum(dim.geracaoMensalKwh, 0)} kWh/mês`} />
              <Info label="Economia estimada" value={fmtBRL(dim.geracaoMensalKwh * (proposta.tarifa || 0))} />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Investimento</h2>
            <div className="rounded-md border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Valor total</span>
                <span className="text-2xl font-bold">{fmtBRL(pre.valorFinal)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Validade: {proposta.validade}</div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Garantias</h2>
            <ul className="list-disc pl-5 text-xs">
              <li>Módulos: 12 anos de produto · 25–30 anos de performance</li>
              <li>Inversores: 10 anos do fabricante</li>
              <li>Estrutura de fixação: 12 anos</li>
              <li>Instalação Meta Sun: 1 ano</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Por que escolher a Meta Sun</h2>
            <ul className="grid grid-cols-2 gap-1 pl-5 text-xs list-disc">
              <li>Mais de 750 projetos entregues</li>
              <li>Mais de 8 MW instalados/em operação</li>
              <li>Equipe de engenharia própria</li>
              <li>Atuação em todo o Brasil</li>
              <li>Atendimento personalizado</li>
              <li>Retorno garantido em contrato</li>
            </ul>
          </section>

          {proposta.obsCliente && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">Observações</h2>
              <p className="whitespace-pre-line text-xs">{proposta.obsCliente}</p>
            </section>
          )}

          <section className="grid grid-cols-2 gap-8 pt-8">
            <div className="text-center">
              <div className="border-t border-foreground pt-1 text-xs">Cliente</div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground pt-1 text-xs">Meta Sun · Energia Solar</div>
            </div>
          </section>

          <section className="pt-6 text-center text-xs text-muted-foreground">
            Telefone de contato: {proposta.clienteTelefone || "(__) _____-____"}
          </section>
        </div>
        )}

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><LayoutTemplate className="h-4 w-4" /> Modelo da proposta</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Modelo usado ao gerar</DropdownMenuLabel>
              {MODELOS_PROPOSTA.map((m) => (
                <DropdownMenuItem key={m.id} onSelect={() => setModeloProposta(m.id)} className="flex items-start gap-2">
                  <Check className={`mt-0.5 h-4 w-4 ${modelo === m.id ? "opacity-100" : "opacity-0"}`} />
                  <span>
                    <span className="block text-xs font-medium">{m.nome}</span>
                    <span className="block text-[11px] text-muted-foreground">{m.descricao}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={imprimir} className="gap-2"><Printer className="h-4 w-4" /> Imprimir / Salvar PDF</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
