import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { SectionsEditor } from "@/components/admin/content/StructureEditors";
import { CONFIGURABLE_PAGES } from "@/lib/site-structure";
import { Text } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/configuracion/secciones")({
  head: () => adminHead("Secciones", "Secciones de las páginas de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Secciones de las páginas" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Activa, desactiva y ordena las secciones de cada página principal. Una sección desactivada desaparece de la web y su dirección da «no encontrada». La Portada y el Directorio no tienen secciones configurables." />
      </p>
      <div className="mt-6 grid gap-6">
        {CONFIGURABLE_PAGES.map((page) => (
          <SectionsEditor key={page} page={page} />
        ))}
      </div>
    </AdminShell>
  ),
});
