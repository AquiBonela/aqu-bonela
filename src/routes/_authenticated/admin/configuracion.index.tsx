import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { MenuEditor } from "@/components/admin/content/StructureEditors";
import { Text } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/configuracion/")({
  head: () => adminHead("Menú de navegación", "Menú de navegación de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Menú de navegación" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Qué páginas principales tiene el portal y en qué orden aparecen en el menú y en la portada. Los cambios se publican con la conformidad del Ayuntamiento." />
      </p>
      <div className="mt-6">
        <MenuEditor />
      </div>
    </AdminShell>
  ),
});
