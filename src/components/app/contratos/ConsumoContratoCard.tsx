/**
 * C-ENT.7 — Card de Consumo do Contrato.
 * Mostra valor / potência / módulos: global, consumido pelos projetos, saldo, %.
 * Alerta vermelho quando saldo < 0.
 */
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Layers, AlertTriangle } from "lucide-react";
import type { ConsumoContrato } from "@/lib/repositories/contratos-supabase-repo";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Row({
  label,
  global,
  consumido,
  saldo,
  pct,
  formatter,
}: {
  label: string;
  global: string;
  consumido: string;
  saldo: number;
  pct: number;
  formatter: (n: number) => string;
}) {
  const excedido = saldo < 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={excedido ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {pct}% consumido
        </span>
      </div>
      <Progress value={Math.min(pct, 100)} className={excedido ? "[&>div]:bg-destructive" : ""} />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Global</div>
          <div className="tabular-nums">{global}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Consumido</div>
          <div className="tabular-nums">{consumido}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Saldo</div>
          <div
            className={"tabular-nums " + (excedido ? "text-destructive font-semibold" : "")}
          >
            {formatter(saldo)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConsumoContratoCard({ consumo }: { consumo: ConsumoContrato }) {
  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Layers className="h-4 w-4" /> Consumo do contrato
        </h3>
        <div className="flex items-center gap-1">
          <Badge variant="outline">{consumo.projetos_qtde} projeto(s)</Badge>
          {consumo.excedido && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Limite excedido
            </Badge>
          )}
        </div>
      </div>

      <Row
        label="Valor"
        global={fmtBRL(consumo.valor_global)}
        consumido={fmtBRL(consumo.valor_consumido)}
        saldo={consumo.valor_saldo}
        pct={consumo.valor_pct}
        formatter={fmtBRL}
      />
      <Row
        label="Potência (kWp)"
        global={consumo.potencia_global.toFixed(2)}
        consumido={consumo.potencia_consumida.toFixed(2)}
        saldo={consumo.potencia_saldo}
        pct={consumo.potencia_pct}
        formatter={(n) => n.toFixed(2)}
      />
      <Row
        label="Módulos"
        global={String(consumo.modulos_globais)}
        consumido={String(consumo.modulos_consumidos)}
        saldo={consumo.modulos_saldo}
        pct={consumo.modulos_pct}
        formatter={(n) => String(n)}
      />
    </Card>
  );
}
