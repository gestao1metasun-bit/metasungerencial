import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StatusMaterial =
  | "SEM_RESERVA"
  | "RESERVA_COMPLETA"
  | "ENTREGA_PARCIAL"
  | "ENTREGA_COMPLETA"
  | "PENDENTE_MATERIAL";

export type ObraMaterialItem = {
  produto_id: string;
  codigo: string;
  nome: string;
  unidade: string;
  custo_unitario: number;
  qtd_reservada: number;
  qtd_entregue: number;
  qtd_pendente: number;
  custo_estimado: number;
};

export type ObraMaterialStatus = {
  obra_id: string;
  total_reservado: number;
  total_entregue: number;
  total_pendente: number;
  qtd_reservas: number;
  status_material: StatusMaterial;
};

export function statusMaterialLabel(s: StatusMaterial): string {
  switch (s) {
    case "SEM_RESERVA": return "Sem reserva";
    case "RESERVA_COMPLETA": return "Reserva completa";
    case "ENTREGA_PARCIAL": return "Entrega parcial";
    case "ENTREGA_COMPLETA": return "Entrega completa";
    case "PENDENTE_MATERIAL": return "Pendente material";
  }
}

export function statusMaterialTone(s: StatusMaterial): string {
  switch (s) {
    case "SEM_RESERVA": return "bg-muted text-muted-foreground";
    case "RESERVA_COMPLETA": return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
    case "ENTREGA_PARCIAL": return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "ENTREGA_COMPLETA": return "bg-success/15 text-success";
    case "PENDENTE_MATERIAL": return "bg-destructive/15 text-destructive";
  }
}

export function useObraMaterialStatus(obraId: string | undefined | null) {
  const [data, setData] = useState<ObraMaterialStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!obraId || !UUID_RE.test(obraId)) { setData(null); return; }
    setLoading(true);
    const { data: row } = await (supabase as any)
      .from("v_status_material_obra")
      .select("*")
      .eq("obra_id", obraId)
      .maybeSingle();
    if (row) {
      setData({
        obra_id: row.obra_id,
        total_reservado: Number(row.total_reservado ?? 0),
        total_entregue: Number(row.total_entregue ?? 0),
        total_pendente: Number(row.total_pendente ?? 0),
        qtd_reservas: Number(row.qtd_reservas ?? 0),
        status_material: (row.status_material ?? "SEM_RESERVA") as StatusMaterial,
      });
    } else {
      setData({ obra_id: obraId, total_reservado: 0, total_entregue: 0, total_pendente: 0, qtd_reservas: 0, status_material: "SEM_RESERVA" });
    }
    setLoading(false);
  }, [obraId]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, reload: load };
}

export function useObraMateriais(obraId: string | undefined | null) {
  const [items, setItems] = useState<ObraMaterialItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!obraId || !UUID_RE.test(obraId)) { setItems([]); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("materiais_reservados_por_obra")
      .select("*")
      .eq("obra_id", obraId)
      .order("codigo");
    setItems((data ?? []).map((r: any) => ({
      produto_id: r.produto_id, codigo: r.codigo, nome: r.nome, unidade: r.unidade,
      custo_unitario: Number(r.custo_unitario ?? 0),
      qtd_reservada: Number(r.qtd_reservada ?? 0),
      qtd_entregue: Number(r.qtd_entregue ?? 0),
      qtd_pendente: Number(r.qtd_pendente ?? 0),
      custo_estimado: Number(r.custo_estimado ?? 0),
    })));
    setLoading(false);
  }, [obraId]);

  useEffect(() => { void load(); }, [load]);
  return { items, loading, reload: load };
}
