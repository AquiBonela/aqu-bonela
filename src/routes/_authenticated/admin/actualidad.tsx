import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { PageConfiguration } from "@/components/admin/content/PageConfiguration";

export const Route = createFileRoute("/_authenticated/admin/actualidad")({
  head: () => adminHead("Actualidad", "Configuración de Actualidad de {app}."),
  component: () => (
    <AdminShell>
      <PageConfiguration
        page="actualidad"
        title="Actualidad"
        intro="Organización de la página: qué secciones tiene, en qué orden y su imagen de cabecera."
        pendingContent="Noticias, avisos, agenda y fiestas se crearán y editarán desde aquí en una próxima entrega del panel. Mientras no haya contenido, la página no se muestra en la web."
      />
    </AdminShell>
  ),
});
