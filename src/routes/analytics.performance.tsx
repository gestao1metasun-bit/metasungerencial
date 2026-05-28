import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Gauge } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const Route = createFileRoute('/analytics/performance')({
  component: PerformancePage,
  head: () => ({
    meta: [
      { title: 'Performance | Meta Sun' },
      { name: 'description', content: 'P50 e P95 dos eventos de boot, login, navegação e carregamento de dados.' },
    ],
  }),
});

type Row = {
  evento: string;
  rota: string;
  amostras: number;
  p50_ms: number;
  p95_ms: number;
  max_ms: number;
  min_ms: number;
};

const SLA: Record<string, number> = {
  'auth.ok': 800,
  'shell.ready': 2000,
  'route.ready': 1000,
  'data.ready': 1500,
  'perms.ready': 500,
};

function badgeFor(evento: string, p95: number): { label: string; variant: 'default' | 'destructive' | 'secondary' } {
  // pega o prefixo (auth.ok, shell.ready, route.<id>.ready, data.<k>.ready, perms.ready)
  let key = evento;
  if (evento.startsWith('route.') && evento.endsWith('.ready')) key = 'route.ready';
  if (evento.startsWith('data.') && evento.endsWith('.ready')) key = 'data.ready';
  const sla = SLA[key];
  if (sla == null) return { label: '—', variant: 'secondary' };
  if (p95 <= sla) return { label: `≤ ${sla}ms ✓`, variant: 'default' };
  return { label: `> ${sla}ms ✗`, variant: 'destructive' };
}

function PerformancePage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['perf', 'p95-7d'],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('v_perf_p95_7d')
        .select('evento, rota, amostras, p50_ms, p95_ms, max_ms, min_ms');
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="h-5 w-5" /> Performance do ERP
          </h1>
          <p className="text-xs text-muted-foreground">
            P50/P95 dos últimos 7 dias · fonte oficial <code>v_perf_p95_7d</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> D16.PERF</Badge>
          <button
            onClick={() => void refetch()}
            className="text-xs border rounded px-2 py-1 hover:bg-accent disabled:opacity-50"
            disabled={isFetching}
          >
            {isFetching ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(SLA).map(([ev, sla]) => (
          <Card key={ev}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{ev}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">SLA ≤ {sla}ms</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">P50 / P95 por evento</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-sm text-muted-foreground py-6 text-center">Carregando medições…</div>}
          {error && <div className="text-sm text-destructive py-6 text-center">Erro: {(error as Error).message}</div>}
          {!isLoading && !error && (!data || data.length === 0) && (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma medição registrada ainda. Faça login e navegue pelo ERP para popular o painel.
            </div>
          )}
          {data && data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead className="text-right">Amostras</TableHead>
                  <TableHead className="text-right">P50 (ms)</TableHead>
                  <TableHead className="text-right">P95 (ms)</TableHead>
                  <TableHead className="text-right">Máx</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r, i) => {
                  const b = badgeFor(r.evento, r.p95_ms);
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.evento}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.rota}</TableCell>
                      <TableCell className="text-right">{r.amostras}</TableCell>
                      <TableCell className="text-right">{r.p50_ms}</TableCell>
                      <TableCell className="text-right font-medium">{r.p95_ms}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.max_ms}</TableCell>
                      <TableCell><Badge variant={b.variant}>{b.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Acesso restrito a admin (RLS em <code>perf_log</code>). Gravação via <code>rpc_perf_log</code> com rate-limit 200/5min/usuário.
      </p>
    </div>
  );
}
