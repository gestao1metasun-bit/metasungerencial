/**
 * D15.2 — Card de Purga LS legado (oficial)
 * Disponibiliza dry-run + execução da purga única e auditável.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eraser, ShieldAlert, RefreshCw } from 'lucide-react';
import { dryRunPurge, executarPurgaLegadoLS, type PurgeResult } from '@/lib/ls-purge';
import { getLsGuardStats } from '@/lib/ls-guard';
import { toast } from 'sonner';

export function PurgaLegadoLSCard() {
  const [dry, setDry] = useState<PurgeResult | null>(null);
  const [last, setLast] = useState<PurgeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [removerInd, setRemoverInd] = useState(false);
  const guardStats = getLsGuardStats();

  const onDry = () => setDry(dryRunPurge());
  const onExec = async () => {
    if (!confirm('Confirma a purga das chaves operacionais legadas em LocalStorage? Esta máquina perderá rascunhos locais não migrados.')) return;
    setBusy(true);
    try {
      const r = await executarPurgaLegadoLS({ removerIndeterminados: removerInd });
      setLast(r);
      toast.success(`Purga concluída: ${r.removed.length} chaves removidas`);
    } catch (e) {
      toast.error('Falha na purga: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Eraser className="h-4 w-4 text-muted-foreground" /> Purga LocalStorage Legado (D15.2)
        </CardTitle>
        <Badge variant={guardStats.violationCount > 0 ? 'destructive' : 'outline'} className="gap-1">
          <ShieldAlert className="h-3 w-3" /> Guard: {guardStats.violationCount} violações
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">
          Remove de forma única e auditável as chaves operacionais legadas (financeiro, contratos,
          comercial, estoque, engenharia, governança) preservando apenas tema, larguras de coluna,
          aba ativa e feature flags. Registra evento em <code>error_log</code> (categoria
          <code>ls-purge</code>).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onDry}>
            <RefreshCw className="h-3 w-3 mr-1" /> Simular (dry-run)
          </Button>
          <Button size="sm" variant="destructive" onClick={onExec} disabled={busy}>
            <Eraser className="h-3 w-3 mr-1" /> {busy ? 'Executando…' : 'Executar purga'}
          </Button>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={removerInd} onChange={(e) => setRemoverInd(e.target.checked)} />
            remover indeterminadas também
          </label>
        </div>
        {dry && (
          <div className="rounded border bg-muted/40 p-2">
            <div className="font-medium mb-1">Dry-run: {dry.totalScanned} chaves escaneadas</div>
            <div>A remover ({dry.removed.length}): <code className="text-destructive">{dry.removed.join(', ') || '—'}</code></div>
            <div className="mt-1">A manter ({dry.kept.length}): <code className="text-emerald-600">{dry.kept.slice(0, 12).join(', ') || '—'}{dry.kept.length > 12 ? '…' : ''}</code></div>
            {dry.unknown.length > 0 && (
              <div className="mt-1">Indeterminadas ({dry.unknown.length}): <code className="text-amber-600">{dry.unknown.join(', ')}</code></div>
            )}
          </div>
        )}
        {last && (
          <div className="rounded border border-emerald-600/40 bg-emerald-500/5 p-2">
            <div className="font-medium mb-1 text-emerald-700">Última execução: {new Date(last.executedAt).toLocaleString('pt-BR')}</div>
            <div>Removidas: {last.removed.length} · Mantidas: {last.kept.length} · Indeterminadas: {last.unknown.length}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
