import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function SessionLogTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["session_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_log")
        .select("id, user_email, evento, ip, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold">Logs de sessão</h2>
      <p className="text-xs text-muted-foreground">
        Eventos de login, logout e renovação de token. Você vê suas sessões; administradores veem todas.
      </p>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>User-Agent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">Sem registros</TableCell></TableRow>
            ) : data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs">{r.user_email ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.evento}</Badge></TableCell>
                <TableCell className="max-w-[420px] truncate text-[10px] text-muted-foreground">{r.user_agent ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
