// D15.3.c — Histórico de renegociações 100% Supabase.
// Lê v_renegociacoes_enriquecido. Sem dependência de LS operacional.
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, FileSearch } from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { useRenegociacoes } from "@/lib/repositories/renegociacoes-repo";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const UI_KEY = "ui.fin.renegociacoes.v1";

export function RenegociacaoHistoricoListSupabase() {
  const { data: renegs = [], isLoading } = useRenegociacoes();
  const [q, setQ] = useState("");

  useEffect(() => {
    try { const raw = localStorage.getItem(UI_KEY); if (raw) setQ(JSON.parse(raw).q ?? ""); } catch {/* */}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(UI_KEY, JSON.stringify({ q })); } catch {/* */}
  }, [q]);

  const filtradas = useMemo(() => {
    const b = q.trim().toLowerCase();
    if (!b) return renegs;
    return renegs.filter((r) =>
      (r.titulo_novo_codigo ?? "").toLowerCase().includes(b) ||
      (r.cliente_nome ?? "").toLowerCase().includes(b) ||
      (r.motivo ?? "").toLowerCase().includes(b),
    );
  }, [renegs, q]);

  const valorRenegociado = renegs.reduce((s, r) => s + Number(r.valor_renegociado_total || 0), 0);
  const descontoConcedido = renegs.reduce((s, r) => s + Number(r.desconto_aplicado || 0), 0);
  const jurosRecuperado = renegs.reduce((s, r) => s + Number(r.juros_aplicado || 0) + Number(r.multa_aplicada || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Renegociações" value={String(renegs.length)} hint="No histórico" />
        <StatCard label="Valor renegociado" value={fmtBRL(valorRenegociado)} tone="primary" />
        <StatCard label="Desconto concedido" value={fmtBRL(descontoConcedido)} tone="warning" />
        <StatCard label="Juros + multa recuperados" value={fmtBRL(jurosRecuperado)} tone="success" />
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
              <TableHead>Novo título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Saldo original</TableHead>
              <TableHead className="text-right">Juros</TableHead>
              <TableHead className="text-right">Multa</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Valor final</TableHead>
              <TableHead>Consolidados</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={10} className="py-6 text-center text-xs text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  <FileSearch className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  Nenhuma renegociação registrada.
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-mono text-xs text-primary">
                  {r.titulo_novo_codigo ?? r.titulo_novo_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-xs">{r.cliente_nome ?? "—"}</TableCell>
                <TableCell className="text-right text-xs">{fmtBRL(Number(r.valor_original_total))}</TableCell>
                <TableCell className="text-right text-xs">{fmtBRL(Number(r.juros_aplicado))}</TableCell>
                <TableCell className="text-right text-xs">{fmtBRL(Number(r.multa_aplicada))}</TableCell>
                <TableCell className="text-right text-xs text-emerald-600">{fmtBRL(Number(r.desconto_aplicado))}</TableCell>
                <TableCell className="text-right font-semibold">{fmtBRL(Number(r.valor_renegociado_total))}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline" className="text-[10px]">{r.qtd_titulos_consolidados}x</Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs" title={r.motivo}>{r.motivo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
