import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ImageIcon } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { getSiteConfigSnapshot } from "@/config/municipality";
import { Text } from "@/lib/i18n";
import { PAGE_LABELS } from "@/lib/page-headers";
import { PAGE_KEYS } from "@/lib/site-identity";

export const Route = createFileRoute("/_authenticated/admin/contenidos/")({
  head: () => adminHead("Páginas y contenidos", "Páginas y contenidos de {app}."),
  component: ContentsHome,
});

function ContentsHome() {
  const headers = getSiteConfigSnapshot().pageHeaders ?? {};
  return (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Páginas y contenidos" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Cada página pública tiene su editor. Desde él se cambia su imagen de cabecera; los textos de cada página se irán incorporando a su editor." />
      </p>

      <section className="mt-6" aria-labelledby="paginas">
        <h2 id="paginas" className="font-display text-lg font-bold">
          <Text text="Páginas" />
        </h2>
        <ul className="mt-3 divide-y border bg-card">
          {PAGE_KEYS.map((page) => (
            <li key={page}>
              <Link
                to="/admin/contenidos/$pagina"
                params={{ pagina: page }}
                className="flex items-center gap-3 p-4 hover:bg-secondary/50"
              >
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{PAGE_LABELS[page]}</span>
                  <span className="block text-sm text-muted-foreground">
                    <Text
                      text={headers[page] ? "Con imagen de cabecera" : "Sin imagen: fondo de color"}
                    />
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="herramientas">
        <h2 id="herramientas" className="font-display text-lg font-bold">
          <Text text="Contenidos" />
        </h2>
        <Link
          to="/admin/tramites"
          className="mt-3 flex items-center gap-3 border bg-card p-4 hover:bg-secondary/50"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              <Text text="Trámites" />
            </span>
            <span className="block text-sm text-muted-foreground">
              <Text text="Guías de trámites y sus categorías." />
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </section>
    </AdminShell>
  );
}
