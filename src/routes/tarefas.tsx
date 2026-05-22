import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { CentralTarefas } from "@/components/app/CentralTarefas";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Meta Sun Gerencial" }] }),
  component: TarefasPage,
});

function TarefasPage() {
  return (
    <>
      <PageHeader title="Central de Tarefas" subtitle="Pendências operacionais por setor e usuário, com alertas automáticos." />
      <div className="mt-5">
        <CentralTarefas />
      </div>
    </>
  );
}
