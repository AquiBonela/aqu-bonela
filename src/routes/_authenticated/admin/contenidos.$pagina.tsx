import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeaderEditor } from "@/components/admin/PageHeaderEditor";
import { adminHead, type AdminRoute } from "@/components/admin/admin-areas";
import { Text } from "@/lib/i18n";
import { PAGE_LABELS } from "@/lib/page-headers";
import { PAGE_KEYS, type PageKey } from "@/lib/site-identity";

/** Dónde se editan hoy los demás contenidos de cada página. */
const OTHER_EDITORS: Partial<Record<PageKey, { to: AdminRoute; label: string }>> = {
  inicio: {
    to: "/admin/configuracion",
    label: "Los textos de la portada se editan en Configuración.",
  },
  directorio: { to: "/admin/directorio", label: "Las fichas se gestionan en el Directorio." },
  tramites: { to: "/admin/tramites", label: "Las guías se editan en Trámites." },
};

export const Route = createFileRoute("/_authenticated/admin/contenidos/$pagina")({
  beforeLoad: ({ params }) => {
    if (!(PAGE_KEYS as readonly string[]).includes(params.pagina)) throw notFound();
  },
  head: ({ params }) =>
    adminHead(`${PAGE_LABELS[params.pagina as PageKey] ?? "Página"}`, "Editor de página de {app}."),
  component: PageEditor,
});

function PageEditor() {
  const { pagina } = Route.useParams();
  const page = pagina as PageKey;
  const other = OTHER_EDITORS[page];
  return (
    <AdminShell>
      <Link
        to="/admin/contenidos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        <Text text="Páginas y contenidos" />
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold">{PAGE_LABELS[page]}</h1>
      {other && (
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to={other.to} className="underline">
            <Text text={other.label} />
          </Link>
        </p>
      )}
      <div className="mt-6">
        <PageHeaderEditor page={page} />
      </div>
    </AdminShell>
  );
}
