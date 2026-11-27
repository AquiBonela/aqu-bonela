import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPendingModule } from "@/components/admin/AdminPendingModule";
import { adminHead } from "@/components/admin/admin-areas";
import { Text } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/contenidos")({
  head: () => adminHead("Páginas y contenidos", "Páginas y contenidos de {app}."),
  component: () => (
    <AdminShell>
      <AdminPendingModule
        title="Páginas y contenidos"
        intro="Textos e información municipal que se publican en las páginas de la web."
        planned={[
          "Editar los textos de las páginas informativas.",
          "Mantener los contenidos municipales de cada página.",
        ]}
      >
        <section className="mt-6" aria-labelledby="ya-disponible">
          <h2 id="ya-disponible" className="font-display text-lg font-bold">
            <Text text="Ya disponible en esta área" />
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
      </AdminPendingModule>
    </AdminShell>
  ),
});
