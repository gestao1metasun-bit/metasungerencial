import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SistemaTab() {
  const qc = useQueryClient();

  const flagsQ = useQuery({
    queryKey: ["feature_flags_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("*").order("key");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const sysQ = useQuery({
    queryKey: ["system_flags_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_flags").select("*").order("key");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const setSys = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase.from("system_flags")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["system_flags_admin"] }); qc.invalidateQueries({ queryKey: ["system_flag"] }); toast.success("Atualizado"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const setFF = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("feature_flags")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feature_flags_admin"] }); qc.invalidateQueries({ queryKey: ["feature_flag"] }); },
    onError: (e: any) => toast.error(e?.message),
  });

  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const addFF = useMutation({
    mutationFn: async () => {
      if (!/^[a-z0-9_.-]{2,}$/.test(newKey)) throw new Error("Chave inválida (use a-z, 0-9, _, -, .)");
      const { error } = await supabase.from("feature_flags").insert({ key: newKey, description: newDesc || null, enabled: false });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setNewKey(""); setNewDesc(""); toast.success("Flag criada"); qc.invalidateQueries({ queryKey: ["feature_flags_admin"] }); },
    onError: (e: any) => toast.error(e?.message),
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-base font-semibold">Modo do sistema</h2>
        <p className="text-xs text-muted-foreground">Flags globais. Apenas administradores podem alterar.</p>
        <div className="mt-4 space-y-3">
          {sysQ.data?.map((f: any) => {
            const checked = f.value === true || f.value === "true";
            return (
              <div key={f.key} className="flex items-center justify-between rounded-md border bg-card/40 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{f.key}</div>
                  <div className="text-[11px] text-muted-foreground">{f.description ?? "—"}</div>
                </div>
                <Switch checked={checked} onCheckedChange={(v) => setSys.mutate({ key: f.key, value: v })} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Feature flags</h2>
            <p className="text-xs text-muted-foreground">Funcionalidades opt-in; podem ser ativadas gradualmente.</p>
          </div>
          <div className="flex items-end gap-2">
            <div><Label className="text-xs">Chave</Label><Input className="h-8 w-48" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="ex: dre_v2" /></div>
            <div><Label className="text-xs">Descrição</Label><Input className="h-8 w-60" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} /></div>
            <Button size="sm" className="h-8 gap-1" onClick={() => addFF.mutate()}><Plus className="h-3.5 w-3.5" /> Criar</Button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Chave</TableHead><TableHead>Descrição</TableHead><TableHead>Escopo</TableHead><TableHead className="text-right">Ativada</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(flagsQ.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">Sem flags</TableCell></TableRow>
              ) : flagsQ.data!.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.key}</TableCell>
                  <TableCell className="text-xs">{f.description ?? "—"}</TableCell>
                  <TableCell className="text-xs">{f.scope}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={f.enabled} onCheckedChange={(v) => setFF.mutate({ id: f.id, enabled: v })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
