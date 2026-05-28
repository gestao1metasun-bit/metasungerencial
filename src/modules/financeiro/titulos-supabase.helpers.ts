/**
 * D15.3.a — Helpers do TitulosTabSupabase
 *
 * Wrappers finos que reexportam hooks oficiais (cadastros + lançamentos)
 * e adicionam tratamento de erro padronizado para o módulo financeiro.
 */
import { toast } from "sonner";
import {
  useNaturezasFin, useCentrosResultado, useContasFinanceirasOficiais,
} from "@/lib/repositories/cadastros-repo";
import { useCriarLancamento, type NovoLancamentoInput } from "@/lib/repositories/lancamentos-repo";
import { errorLogRepo } from "@/lib/repositories/error-log-repo";

export const useCadastrosNaturezas = useNaturezasFin;
export const useCadastrosCentros = useCentrosResultado;
export const useCadastrosContas = useContasFinanceirasOficiais;

export function useCriarLancamentoForm() {
  const mut = useCriarLancamento();
  return {
    pending: mut.isPending,
    criar: (input: NovoLancamentoInput, onSuccess: () => void) => {
      mut.mutate(
        { input },
        {
          onSuccess: () => {
            toast.success("Lançamento criado via RPC oficial.");
            onSuccess();
          },
          onError: (err: unknown) => {
            const msg = (err as Error)?.message ?? "Falha ao criar lançamento";
            toast.error(msg);
            void errorLogRepo.log({
              modulo: "financeiro",
              tela: "titulos.novo-lancamento",
              acao: "rpc_lancamento_criar",
              mensagem: msg,
              payload: input as unknown as Record<string, unknown>,
              severidade: "error",
            });
          },
        },
      );
    },
  };
}
