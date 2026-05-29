import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // D16.PERF P2 — defaults conservadores para evitar refetch agressivo
  // sem mascarar erros nem reduzir segurança/RLS (cada query continua
  // passando pelo Supabase com a sessão do usuário).
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // D19.1.fix F6 — prefetch ao hover/foco em <Link>. Reduz first-paint
    // percebido em troca de módulo sem alterar RLS/auditoria/regras.
    defaultPreload: 'intent',
    defaultPreloadDelay: 50,
  });

  return router;
};
