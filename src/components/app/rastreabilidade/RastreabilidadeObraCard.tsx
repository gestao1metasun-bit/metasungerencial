import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Origem = {
  obra_codigo: string | null;
  contrato_codigo: string | null;
  projeto_descricao: string | null;
  pv_codigo: string | null;
  pv_status: string | null;
  cliente_nome: string | null;
  consultor_nome: string | null;
};

type Rastro = {
  qtd_pvs: number;
  qtd_reservas: number;
  qtd_entregas: number;
  qtd_titulos: number;
};

export function RastreabilidadeObraCard({ obraId }: { obraId: string }) {
  const [origem, setOrigem] = useState<Origem | null>(null);
  const [rastro, setRastro] = useState<Rastro | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!obraId || !UUID_RE.test(obraId)) return;
    setLoading(true);
    void Promise.all([
      (supabase as any).from("v_origem_obra_completa").select("*").eq("obra_id", obraId).maybeSingle(),
      (supabase as any).from("v_rastreabilidade_operacional").select("*").eq("obra_id", obraId).maybeSingle(),
    ]).then(([a, b]) => {
      setOrigem(a.data ?? null);
      setRastro(b.data ?? null);
      setLoading(false);
    });
  }, [obraId]);

  if (!obraId || !UUID_RE.test(obraId)) return null;

  const chain = [
    { label: "Contrato", val: origem?.contrato_codigo },
    { label: "Projeto", val: origem?.projeto_descricao },
    { label: "PV", val: origem?.pv_codigo },
    { label: "Obra", val: origem?.obra_codigo },
  ];

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Rastreabilidade operacional</span>
        {loading && <span className="text-[10px] text-muted-foreground">carregando…</span>}
      </div>

      <div className="flex flex-wrap items-center gap-1 text-xs">
        {chain.map((c, i) => (
          <span key={c.label} className="flex items-center gap-1">
            <Badge variant={c.val ? "secondary" : "outline"} className="font-mono">
              <span className="text-[10px] uppercase text-muted-foreground mr-1">{c.label}:</span>
              {c.val ?? "—"}
            </Badge>
            {i < chain.length - 1 && <span className="text-muted-foreground">→</span>}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <Cell label="PVs" v={rastro?.qtd_pvs} />
        <Cell label="Reservas" v={rastro?.qtd_reservas} />
        <Cell label="Entregas" v={rastro?.qtd_entregas} />
        <Cell label="Títulos fin." v={rastro?.qtd_titulos} />
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">
        Cliente: {origem?.cliente_nome ?? "—"} · Consultor: {origem?.consultor_nome ?? "—"}
      </div>
    </Card>
  );
}

function Cell({ label, v }: { label: string; v: number | undefined }) {
  return (
    <div className="rounded border bg-muted/30 p-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{v ?? 0}</div>
    </div>
  );
}
