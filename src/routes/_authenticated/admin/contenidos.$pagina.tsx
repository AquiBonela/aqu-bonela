import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { HEADER_ROUTES } from "@/lib/content-workflow";
import { PAGE_KEYS, type PageKey } from "@/lib/site-identity";

/** Dirección anterior del editor de cada página: lleva a la pantalla de su área. */
export const Route = createFileRoute("/_authenticated/admin/contenidos/$pagina")({
  beforeLoad: ({ params }) => {
    if (!(PAGE_KEYS as readonly string[]).includes(params.pagina)) throw notFound();
    throw redirect({ href: HEADER_ROUTES[params.pagina as PageKey], replace: true });
  },
});
