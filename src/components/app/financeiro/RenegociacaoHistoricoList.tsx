import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, FileSearch } from "lucide-react";
import { useRenegociacoes } from "@/lib/fin-renegociacao-store";
import { useTitulos } from "@/lib/fin-titulos-store";
import { fmtBRLPrecise } from "@/lib/financeiro-store";
import { StatCard } from "@/components/app/StatCard";

const NIVEL_TONE: Record<string, string> = {
  auto: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  financeiro: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  diretoria: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};
const NIVEL_LABEL: Record<string, string> = {
  auto: "Auto",
  financeiro: "Financeiro",
  diretoria: "Diretoria",
};

export function RenegociacaoHistoricoList() {
  const renegs = useRenegociacoes();
  const titulos = useTitulos();
  const [q, setQ] = useState("");

  const tituloPorId = useMemo(() => {
    const m = new Map<string, (typeof titulos)[number]>();
    titulos.forEach((t) => m.set(t.id, t));
    return m;
  }, [titulos]);

  const filtradas = useMemo(() => {
    const b = q.trim().toLowerCase();
    return renegs.filter((r) => {
      if (!b) return true;
      const t = tituloPorId.get(r.tituloOriginalId);
      return (
        r.id.toLowerCase().includes(b) ||
        r.motivo.toLowerCase().includes(b) ||
        t?.descricao.toLowerCase().includes(b) ||
        t?.cliente?.toLowerCase().includes(b) ||
        t?.fornecedor?.toLowerCase().includes(b)
      );
    });
  }, [renegs, q, tituloPorId]);

  // KPIs
  const totalRenegs = renegs.length;
  const valorRenegociado = renegs.reduce((s, r) => s + r.valorFinal, 0);
  const descontoConcedido = renegs.reduce((s, r) => s + r.desconto, 0);
  const jurosRecuperado = renegs.reduce((s, r) => s + r.jurosAplicado + r.multaAplicada, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Renegociações" value={String(totalRenegs)} hint="No histórico" />
        <StatCard label="Valor renegociado" value={fmtBRLPrecise(valorRenegociado)} tone="primary" />
        <StatCard label="Desconto concedido" value={fmtBRLPrecise(descontoConcedido)} tone="warning" />
        <StatCard label="Juros + multa recuperados" value={fmtBRLPrecise(jurosRecuperado)} tone="success" />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Histórico de renegociações</div>
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Buscar por título, cliente, motivo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Renegociação</TableHead>
              <TableHead>Título original</TableHead>
              <TableHead>Contraparte</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Juros</TableHead>
              <TableHead className="text-right">Multa</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Valor final</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Aprovação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                  <FileSearch className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  Nenhuma renegociação registrada ainda.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((r) => {
              const t = tituloPorId.get(r.tituloOriginalId);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.data).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">{r.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{t?.descricao ?? r.tituloOriginalId}</div>
                    <div className="text-[10px] text-muted-foreground">{r.tituloOriginalId}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t?.tipo === "AP" ? t?.fornecedor : t?.cliente ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs">{fmtBRLPrecise(r.saldoNoMomento)}</TableCell>
                  <TableCell className="text-right text-xs">{fmtBRLPrecise(r.jurosAplicado)}</TableCell>
                  <TableCell className="text-right text-xs">{fmtBRLPrecise(r.multaAplicada)}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-600">
                    {fmtBRLPrecise(r.desconto)}
                    {r.descontoPct > 0 && <span className="ml-1 text-[10px]">({r.descontoPct.toFixed(1)}%)</span>}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRLPrecise(r.valorFinal)}</TableCell>
                  <TableCell className="text-xs">{r.parcelasGeradas.length}x</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${NIVEL_TONE[r.nivelAprovacao]} border text-[10px] font-semibold`}>
                      {NIVEL_LABEL[r.nivelAprovacao]}
                    </Badge>
                    {r.aprovadoPor && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">por {r.aprovadoPor}</div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
