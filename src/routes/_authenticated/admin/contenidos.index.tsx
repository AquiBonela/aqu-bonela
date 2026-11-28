import { createFileRoute, redirect } from "@tanstack/react-router";

/** Dirección anterior de «Páginas y contenidos»: cada página tiene ahora su área. */
export const Route = createFileRoute("/_authenticated/admin/contenidos/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/portada", replace: true });
  },
});
