import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useErrorLog, useMarcarErroResolvido, type ErrorStatus } from "@/lib/repositories/error-log-repo";

export const Route = createFileRoute("/paineis/erros")({
  component: PainelErros,
});

const STATUS_OPTS: Array<{ value: ErrorStatus | "all"; label: string }> = [
  { value: "aberto", label: "Abertos" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "ignorado", label: "Ignorados" },
  { value: "all", label: "Todos" },
];

function PainelErros() {
  const [status, setStatus] = useState<ErrorStatus | "all">("aberto");
  const { data, isLoading, error, refetch } = useErrorLog(
    status === "all" ? undefined : status
  );
  const marcar = useMarcarErroResolvido();

  return (
    <div className="p-3 text-[13px]">
      <header className="mb-3 flex items-center gap-3 border-b pb-2">
        <h1 className="text-base font-semibold">Registro Central de Erros</h1>
        <span className="text-muted-foreground">D15.1 · operação assistida</span>
        <div className="ml-auto flex items-center gap-2">
          {STATUS_OPTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`px-2 py-0.5 border rounded text-xs ${
                status === s.value ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              {s.label}
            </button>
          ))}
          <button onClick={() => refetch()} className="px-2 py-0.5 border rounded text-xs">
            Atualizar
          </button>
        </div>
      </header>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {error && (
        <p className="text-destructive">
          Falha ao carregar: {(error as Error).message}
        </p>
      )}

      {data && (
        <div className="overflow-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-1.5">Quando</th>
                <th className="text-left p-1.5">Sev</th>
                <th className="text-left p-1.5">Módulo</th>
                <th className="text-left p-1.5">Tela</th>
                <th className="text-left p-1.5">Ação</th>
                <th className="text-left p-1.5">Mensagem</th>
                <th className="text-left p-1.5">Status</th>
                <th className="p-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-muted-foreground">
                    Nenhum erro registrado.
                  </td>
                </tr>
              )}
              {data.map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/40">
                  <td className="p-1.5 whitespace-nowrap">
                    {new Date(e.ocorrido_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-1.5">{e.severidade}</td>
                  <td className="p-1.5">{e.modulo ?? "—"}</td>
                  <td className="p-1.5 max-w-[180px] truncate" title={e.tela ?? ""}>
                    {e.tela ?? "—"}
                  </td>
                  <td className="p-1.5">{e.acao ?? "—"}</td>
                  <td className="p-1.5 max-w-[360px] truncate" title={e.mensagem}>
                    {e.mensagem}
                  </td>
                  <td className="p-1.5">{e.status}</td>
                  <td className="p-1.5">
                    {e.status !== "resolvido" && (
                      <button
                        className="text-xs underline"
                        onClick={() =>
                          marcar.mutate({ id: e.id, nota: "resolvido via painel" })
                        }
                      >
                        resolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
