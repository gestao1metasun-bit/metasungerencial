// Banner visual persistente quando há mês(es) com fechamento global ativo.
// Mostra ao usuário que edições/baixas em períodos fechados serão bloqueadas
// — evita descobrir só no submit.
import { Lock } from "lucide-react";
import { useMemo } from "react";
import { useFechamentos } from "@/lib/fin-fechamento-store";

function fmtMesBR(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const i = Math.max(1, Math.min(12, Number(m))) - 1;
  return `${meses[i]}/${y.slice(2)}`;
}

export function PeriodoFechadoBanner() {
  const fechs = useFechamentos();
  const mesesFechados = useMemo(() => {
    const ativos = fechs.filter((f) => !f.reabertoEm && (!f.contaId || f.contaId === ""));
    const set = new Set(ativos.map((f) => f.mes));
    return Array.from(set).sort().reverse();
  }, [fechs]);

  if (mesesFechados.length === 0) return null;

  const mesAtual = new Date().toISOString().slice(0, 7);
  const incluiAtual = mesesFechados.includes(mesAtual);

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
        incluiAtual
          ? "border-rose-300 bg-rose-50 text-rose-800"
          : "border-amber-300 bg-amber-50 text-amber-800"
      }`}
    >
      <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div className="leading-relaxed">
        <strong>{mesesFechados.length} mês(es) com fechamento global ativo:</strong>{" "}
        {mesesFechados.slice(0, 6).map(fmtMesBR).join(" · ")}
        {mesesFechados.length > 6 ? " · …" : ""}.
        <span className="ml-1 opacity-90">
          Baixas, edições e exclusões em títulos desses períodos estão bloqueadas.
          {incluiAtual ? " O mês corrente está fechado." : ""}
        </span>
      </div>
    </div>
  );
}
