import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { PageConfiguration } from "@/components/admin/content/PageConfiguration";

export const Route = createFileRoute("/_authenticated/admin/descubre")({
  head: () => adminHead("Descubre", "Configuración de Descubre de {app}."),
  component: () => (
    <AdminShell>
      <PageConfiguration
        page="descubre"
        title="Descubre"
        intro="Organización de la página: qué secciones tiene, en qué orden y su imagen de cabecera."
        pendingContent="Los contenidos de las diez secciones (historia, lugares, miradores, entorno, rutas, cultura, gastronomía, consejos, dónde comer y dónde dormir) se editarán desde aquí en una próxima entrega del panel. Mientras no haya contenido, la página no se muestra en la web."
      />
    </AdminShell>
  ),
});
