import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPendingModule } from "@/components/admin/AdminPendingModule";
import { adminHead } from "@/components/admin/admin-areas";

export const Route = createFileRoute("/_authenticated/admin/identidad")({
  head: () => adminHead("Identidad municipal", "Identidad municipal de {app}."),
  component: () => (
    <AdminShell>
      <AdminPendingModule
        title="Identidad municipal"
        intro="Datos que identifican al municipio y a la plataforma en toda la web."
        planned={[
          "Revisar el nombre de la plataforma, del municipio y de la provincia.",
          "Mantener los datos institucionales del Ayuntamiento.",
          "Gestionar los logotipos, la imagen principal y los colores.",
        ]}
      />
    </AdminShell>
  ),
});
