import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPendingModule } from "@/components/admin/AdminPendingModule";
import { adminHead } from "@/components/admin/admin-areas";

export const Route = createFileRoute("/_authenticated/admin/secciones")({
  head: () => adminHead("Secciones y menús", "Secciones y menús de {app}."),
  component: () => (
    <AdminShell>
      <AdminPendingModule
        title="Secciones y menús"
        intro="Organización de la web pública: qué secciones se ofrecen y cómo se llega a ellas."
        planned={[
          "Activar u ocultar las secciones de la web pública.",
          "Ordenar los enlaces de los menús.",
        ]}
      />
    </AdminShell>
  ),
});
