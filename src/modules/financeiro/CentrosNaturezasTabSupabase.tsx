/**
 * D15.3.e — Centros de Resultado e Naturezas Financeiras (read-only) 100% Supabase.
 * Cadastros oficiais ficam em /financeiro → "Cadastros estruturais" (CadastrosTab).
 * Esta aba apenas exibe leitura para conferência rápida.
 */
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useNaturezasFin, useCentrosResultado } from "@/lib/repositories/cadastros-repo";

export function CentrosNaturezasTabSupabase() {
  const naturezas = useNaturezasFin();
  const centros = useCentrosResultado();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="overflow-auto">
        <div className="px-3 py-2 border-b font-semibold text-sm">Centros de resultado</div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {centros.isLoading && (
              <TableRow><TableCell colSpan={2} className="text-center py-4"><Loader2 className="inline animate-spin h-4 w-4 mr-1" />Carregando…</TableCell></TableRow>
            )}
            {(centros.data ?? []).map((c) => (
              <TableRow key={c.id}><TableCell>{c.codigo}</TableCell><TableCell>{c.nome}</TableCell></TableRow>
            ))}
            {!centros.isLoading && (centros.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground">Nenhum centro cadastrado. Vá em Cadastros estruturais.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-auto">
        <div className="px-3 py-2 border-b font-semibold text-sm">Naturezas financeiras</div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {naturezas.isLoading && (
              <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="inline animate-spin h-4 w-4 mr-1" />Carregando…</TableCell></TableRow>
            )}
            {(naturezas.data ?? []).map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.codigo}</TableCell>
                <TableCell>{n.nome}</TableCell>
                <TableCell>{(n as { tipo?: string }).tipo ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!naturezas.isLoading && (naturezas.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Nenhuma natureza cadastrada. Vá em Cadastros estruturais.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
