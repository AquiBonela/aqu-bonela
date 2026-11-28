import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { CACHE } from "./lib/cache-policy";

export const getRouter = () => {
  // Datos públicos reutilizados entre páginas (ver src/lib/cache-policy.ts). Sin recargar al
  // volver a la pestaña: el formulario de fichas tiene su propia comprobación al recibir el foco.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { ...CACHE.default, refetchOnWindowFocus: false, retry: 1 },
    },
  });
  // El panel siempre trabaja con datos al día, como antes: ni plazo de reutilización ni pausa al
  // volver a la pestaña.
  queryClient.setQueryDefaults(["admin"], { staleTime: 0, refetchOnWindowFocus: true });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Al pasar por encima de un enlace se precargan solo los datos de esa página.
    defaultPreload: "intent",
    defaultPreloadStaleTime: CACHE.preload,
  });

  return router;
};
