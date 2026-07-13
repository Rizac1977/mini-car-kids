import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Per-request QueryClient (safe for SSR) with sane defaults:
  // - staleTime: 60s → evita refetch instantâneo ao remontar rotas/componentes
  // - gcTime: 5min → mantém cache em memória por navegação
  // - refetchOnWindowFocus: false → sem thrashing ao trocar aba/foco no mobile
  // - retry: 1 → falhas de rede não geram cascata de tentativas
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // staleTime 0 + refetchOnMount garante que ao trocar de página
        // (remontagem do componente) os dados sejam revalidados no servidor,
        // evitando ver informações defasadas após iniciar/finalizar locações,
        // cadastrar veículos, etc. gcTime mantém a UI instantânea enquanto
        // o refetch em background acontece.
        staleTime: 0,
        gcTime: 5 * 60_000,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
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
    // Precarrega rotas ao passar o mouse/toque para navegação instantânea.
    defaultPreload: "intent",
    // Deixa o TanStack Query controlar a frescura dos dados; o router não bloqueia.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
