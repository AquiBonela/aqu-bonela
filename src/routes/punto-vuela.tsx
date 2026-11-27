import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getInstanceContent } from "@/config/municipality";

// Enlace antiguo a la ficha de Punto Vuela; solo existe si la instancia la tiene.
export const Route = createFileRoute("/punto-vuela")({
  beforeLoad: () => {
    const slug = getInstanceContent().publicServices?.puntoVuela?.slug;
    if (!slug) throw notFound();
    throw redirect({ to: "/servicios/$slug", params: { slug }, statusCode: 301, replace: true });
  },
});
