import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { PageConfiguration } from "@/components/admin/content/PageConfiguration";

export const Route = createFileRoute("/_authenticated/admin/servicios-publicos")({
  head: () => adminHead("Servicios públicos", "Configuración de Servicios públicos de {app}."),
  component: () => (
    <AdminShell>
      <PageConfiguration
        page="servicios-publicos"
        title="Servicios públicos"
        intro="Organización de la página: qué secciones tiene, en qué orden y su imagen de cabecera. La Guía de trámites se edita en su pestaña."
        pendingContent="Los contenidos de Emergencias, Vida cotidiana y Transporte y movilidad se gestionarán desde aquí en la próxima entrega del panel. Hasta entonces, esas secciones muestran lo que ya ofrece la instalación."
      />
    </AdminShell>
  ),
});
