import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { PageHeaderEditor } from "@/components/admin/PageHeaderEditor";
import { homeAutomaticShortcuts, homeExtraShortcuts } from "@/lib/site-availability";
import { Text, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/portada/")({
  head: () => adminHead("Portada", "Portada de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Portada" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="La página principal del portal. Cada cambio se guarda como borrador y se publica con la conformidad del Ayuntamiento." />
      </p>
      <div className="mt-6 grid gap-6">
        <PageHeaderEditor page="inicio" />
        <HomeBlocks />
      </div>
    </AdminShell>
  ),
});

const PAGE_NAMES: Record<string, string> = {
  directorio: "Directorio",
  "servicios-publicos": "Servicios públicos",
  actualidad: "Actualidad",
  descubre: "Descubre",
};

/** Orden de los bloques de la portada tal como se publica ahora, y dónde se cambia cada uno. */
function HomeBlocks() {
  const { tr } = useI18n();
  const automatic = homeAutomaticShortcuts();
  const extra = homeExtraShortcuts();
  return (
    <section className="grid gap-3 border bg-card p-4" aria-labelledby="bloques-portada">
      <h2 id="bloques-portada" className="font-display text-lg font-bold">
        <Text text="Bloques de la portada" />
      </h2>
      <p className="text-sm text-muted-foreground">
        <Text text="Así se ordenan hoy los accesos de la portada publicada. El Directorio va siempre primero; después, las páginas activas en el orden del menú y, al final, los accesos directos adicionales." />
      </p>
      <ol className="grid gap-1 text-sm">
        {automatic.map((page, index) => (
          <li key={page} className="flex items-center gap-2 border bg-background px-3 py-2">
            <span className="w-6 text-muted-foreground">{index + 1}.</span>
            <span className="flex-1 font-medium">{tr(PAGE_NAMES[page] ?? page)}</span>
            <span className="text-xs text-muted-foreground">
              <Text text={page === "directorio" ? "Fijo" : "Según el menú"} />
            </span>
          </li>
        ))}
        {extra.map((shortcut, index) => (
          <li key={shortcut.id} className="flex items-center gap-2 border bg-background px-3 py-2">
            <span className="w-6 text-muted-foreground">{automatic.length + index + 1}.</span>
            <span className="flex-1 font-medium">{shortcut.title}</span>
            <span className="text-xs text-muted-foreground">
              <Text text="Acceso directo" />
            </span>
          </li>
        ))}
      </ol>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/admin/configuracion" className="underline">
          <Text text="Cambiar el orden y las páginas activas (Configuración › Menú)" />
        </Link>
        <Link to="/admin/portada/accesos" className="underline">
          <Text text="Gestionar los accesos directos" />
        </Link>
      </p>
    </section>
  );
}
