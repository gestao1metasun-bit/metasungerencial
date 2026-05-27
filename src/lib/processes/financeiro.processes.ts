/**
 * D6.13.3 — Registro de processos do módulo Financeiro.
 *
 * Processo piloto: `renegociar` (titulos_financeiros).
 *
 * IMPORTANTE: este arquivo é importado por efeitos colaterais a partir da
 * rota `/financeiro-titulos` (e futuramente do root). Nenhum import desta
 * lista deve disparar chamadas Supabase no carregamento — apenas registrar
 * a definição no engine.
 */
import { Undo2 } from "lucide-react";
import { registerProcess } from "@/lib/process-engine";

export type TituloProcessRow = {
  id: string;
  codigo: string | null;
  status: string;
  saldo: number;
  vencimento: string | null;
  cliente_id: string | null;
  tipo: string;
};

export type RenegociarExtras = {
  /** Tela injeta para abrir o RenegociarLoteDialog. */
  openRenegociarLoteDialog: () => void;
};

// ----------------------------------------------------------------------------
// Renegociar títulos (lote)
// ----------------------------------------------------------------------------
registerProcess<TituloProcessRow, RenegociarExtras>({
  entity: "titulos_financeiros",
  key: "renegociar",
  label: "Renegociar títulos",
  icon: Undo2,
  permissao: "financeiro.renegociar",
  requerSelecao: 1,
  permiteLote: true,
  requerMotivo: true,
  validate: ({ selectedRows }) => {
    if (selectedRows.length === 0) {
      return { ok: false, motivo: "Selecione ao menos um título." };
    }
    if (selectedRows.some((t) => !t.cliente_id)) {
      return { ok: false, motivo: "Há título(s) sem cliente — não é possível renegociar." };
    }
    const clientes = new Set(selectedRows.map((t) => t.cliente_id ?? "__sem__"));
    if (clientes.size > 1) {
      return { ok: false, motivo: "Selecione títulos de um único cliente." };
    }
    const tipos = new Set(selectedRows.map((t) => t.tipo));
    if (tipos.size > 1) {
      return { ok: false, motivo: "Não misture contas a receber e a pagar." };
    }
    const statusOk = new Set(["PENDENTE", "PARCIAL", "ATRASADO"]);
    const invalido = selectedRows.find((t) => !statusOk.has(t.status));
    if (invalido) {
      return {
        ok: false,
        motivo: `Título ${invalido.codigo ?? invalido.id.slice(0, 8)} em status ${invalido.status} não é renegociável.`,
      };
    }
    const saldo = selectedRows.reduce((s, t) => s + Number(t.saldo || 0), 0);
    if (saldo <= 0) {
      return { ok: false, motivo: "Saldo total dos selecionados é zero." };
    }
    return { ok: true };
  },
  run: ({ extras }) => {
    // Abre o modal — a confirmação efetiva (RPC renegociar_titulos_lote) e a
    // auditoria continuam dentro de RenegociarLoteDialog. O engine garante
    // que só chegamos aqui se seleção/permissão/validação passaram.
    extras.openRenegociarLoteDialog();
  },
  invalidates: [["titulos_financeiros"]],
});
