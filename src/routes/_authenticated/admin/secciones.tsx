import { createFileRoute, redirect } from "@tanstack/react-router";

/** Dirección anterior de «Secciones y menús»: ahora es Configuración › Secciones. */
export const Route = createFileRoute("/_authenticated/admin/secciones")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/configuracion/secciones", replace: true });
  },
});
