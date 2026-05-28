import { createFileRoute } from '@tanstack/react-router';
import { useSaudeSistema } from '@/lib/repositories/use-saude-sistema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity, Database, FileWarning, Clock, CheckCircle2 } from 'lucide-react';
import { PurgaLegadoLSCard } from '@/components/app/PurgaLegadoLSCard';

export const Route = createFileRoute('/analytics/saude-sistema')({
  component: SaudeSistemaPage,
  head: () => ({
    meta: [
      { title: 'Saúde do Sistema | Meta Sun' },
      { name: 'description', content: 'Painel operacional de saúde do ERP: auditoria, integrações, anexos, aprovações.' },
    ],
  }),
});

function Metric({ label, value, intent = 'neutral', icon }: { label: string; value: number; intent?: 'good' | 'warn' | 'bad' | 'neutral'; icon?: React.ReactNode }) {
  const color = intent === 'bad' ? 'text-destructive' : intent === 'warn' ? 'text-amber-600' : intent === 'good' ? 'text-emerald-600' : 'text-foreground';
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${color}`}>{value.toLocaleString('pt-BR')}</div>
      </CardContent>
    </Card>
  );
}

function SaudeSistemaPage() {
  const { data, isLoading, error } = useSaudeSistema();

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando saúde do sistema…</div>;
  if (error) return <div className="p-4 text-sm text-destructive">Erro: {(error as Error).message}</div>;
  if (!data) return <div className="p-4 text-sm">Sem dados.</div>;

  const intIntent = (n: number) => (n > 0 ? 'bad' : 'good');
  const apIntent = (n: number) => (n > 5 ? 'bad' : n > 0 ? 'warn' : 'good');

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Saúde do Sistema</h1>
          <p className="text-xs text-muted-foreground">Verdade oficial: <code>v_saude_sistema</code> · atualizado {new Date(data.gerado_em).toLocaleString('pt-BR')}</p>
        </div>
        <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3" /> D15 Onda 8</Badge>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Auditoria</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Metric label="Eventos 24h" value={data.auditoria_24h} icon={<Database className="h-4 w-4 text-muted-foreground" />} intent="good" />
          <Metric label="Eventos 7 dias" value={data.auditoria_7d} icon={<Database className="h-4 w-4 text-muted-foreground" />} intent="neutral" />
          <Metric label="Governance pendentes" value={data.governance_pendentes} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} intent={data.governance_pendentes > 0 ? 'warn' : 'good'} />
          <Metric label="Anexos órfãos (títulos)" value={data.anexos_orfaos_titulos} icon={<FileWarning className="h-4 w-4 text-muted-foreground" />} intent={data.anexos_orfaos_titulos > 0 ? 'warn' : 'good'} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Integrações Fiscais/Contábeis</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Metric label="Títulos com erro" value={data.integracao_titulos_erro} intent={intIntent(data.integracao_titulos_erro)} />
          <Metric label="Parcelas com erro" value={data.integracao_parcelas_erro} intent={intIntent(data.integracao_parcelas_erro)} />
          <Metric label="Movimentações com erro" value={data.integracao_mov_erro} intent={intIntent(data.integracao_mov_erro)} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Financeiro Operacional</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Metric label="Títulos em aberto" value={data.titulos_em_aberto} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
          <Metric label="Títulos vencidos" value={data.titulos_vencidos} icon={<Clock className="h-4 w-4 text-destructive" />} intent={data.titulos_vencidos > 0 ? 'bad' : 'good'} />
          <Metric label="Títulos com alta edição (>10)" value={data.titulos_alta_edicao} intent={data.titulos_alta_edicao > 0 ? 'warn' : 'good'} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Workflow / Aprovações</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Metric label="Aprovações pendentes" value={data.aprovacoes_pendentes} intent={apIntent(data.aprovacoes_pendentes)} />
          <Metric label="Atrasadas (>48h)" value={data.aprovacoes_atrasadas} intent={data.aprovacoes_atrasadas > 0 ? 'bad' : 'good'} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Plataforma — LocalStorage</h2>
        <PurgaLegadoLSCard />
      </section>
    </div>
  );
}
