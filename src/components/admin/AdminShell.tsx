import { Text, useI18n } from "@/lib/i18n";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminReportsQuery, adminSuggestionsQuery, isAdminQuery } from "@/lib/admin";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import { getMunicipality, getSiteConfigSnapshot } from "@/config/municipality";
import {
  ADMIN_AREAS,
  adminAreaForPath,
  adminSectionForPath,
  type AdminCounter,
} from "@/components/admin/admin-areas";

const ADMIN_ITEMS: HeaderItem[] = [
  { to: "/admin", label: "Inicio del panel", activeOptions: { exact: true } },
  { to: "/", search: { q: "", cat: "", of: "" }, label: "Ver web" },
];

/** Elementos sin atender de las bandejas del Directorio. */
function useAdminCounters(): Record<AdminCounter, number> {
  const { data: reports = [] } = useQuery(adminReportsQuery);
  const { data: suggestions = [] } = useQuery(adminSuggestionsQuery);
  return {
    reports: reports.filter((r) => !r.resolved).length,
    suggestions: suggestions.filter((s) => !s.handled).length,
  };
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-terracotta px-1.5 text-xs text-terracotta-foreground">
      <span className="sr-only">, </span>
      {count}
      <span className="sr-only">
        {" "}
        <Text text="sin atender" />
      </span>
    </span>
  );
}

function usePathname() {
  return useRouterState({ select: (s) => s.location.pathname });
}

/**
 * «page» solo en el enlace de la pantalla exacta; «true» cuando se está dentro de su
 * área o pestaña (por ejemplo, Directorio mientras se edita una ficha).
 */
function ariaCurrent(pathname: string, to: string, active: boolean) {
  if (!active) return undefined;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return path === to ? ("page" as const) : ("true" as const);
}

/** Navegación por áreas: lateral en escritorio y desplazable en móvil. */
function AdminAreasNav({ counters }: { counters: Record<AdminCounter, number> }) {
  const { tr } = useI18n();
  const pathname = usePathname();
  const current = adminAreaForPath(pathname);
  const activeRef = useRef<HTMLAnchorElement>(null);
  // En móvil la lista se desplaza en horizontal: el área actual debe quedar a la vista.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [current.id]);
  return (
    <nav aria-label={tr("Áreas de administración")} className="md:sticky md:top-20 md:self-start">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:overflow-visible md:p-0">
        {ADMIN_AREAS.map((area) => {
          const active = area.id === current.id;
          const pendingCount = area.sections.reduce(
            (sum, s) => sum + (s.counter ? counters[s.counter] : 0),
            0,
          );
          const Icon = area.icon;
          return (
            <li key={area.id} className="shrink-0">
              <Link
                to={area.to}
                ref={active ? activeRef : undefined}
                aria-current={ariaCurrent(pathname, area.to, active)}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium md:rounded-md md:border-transparent ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 md:truncate">{tr(area.label)}</span>
                <CountBadge count={pendingCount} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Pestañas internas del área actual (por ejemplo, Fichas, Avisos y Sugerencias). */
function AdminAreaTabs({ counters }: { counters: Record<AdminCounter, number> }) {
  const { tr } = useI18n();
  const pathname = usePathname();
  const area = adminAreaForPath(pathname);
  const current = adminSectionForPath(pathname);
  if (area.sections.length < 2) return null;
  return (
    <nav
      aria-label={tr("Secciones de {area}", { area: tr(area.label) })}
      className="mb-5 grid auto-cols-fr grid-flow-col gap-1 rounded-full border bg-secondary/40 p-1"
    >
      {area.sections.map((section) => (
        <Link
          key={section.to}
          to={section.to}
          aria-current={ariaCurrent(pathname, section.to, section === current)}
          className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium ${
            section === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <span className="truncate">{tr(section.label)}</span>
          <CountBadge count={section.counter ? counters[section.counter] : 0} />
        </Link>
      ))}
    </nav>
  );
}

function AdminLayout({ children }: { children: ReactNode }) {
  const counters = useAdminCounters();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <AdminAreasNav counters={counters} />
      <main className="mt-4 min-w-0 md:mt-0">
        <AdminAreaTabs counters={counters} />
        {children}
      </main>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { tr } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery);

  const items: HeaderItem[] = [
    ...ADMIN_ITEMS,
    {
      label: "Salir",
      onClick: async () => {
        await supabase.auth.signOut();
        // Los datos del panel no se quedan en la memoria del navegador tras salir.
        queryClient.removeQueries({ queryKey: ["admin"] });
        navigate({ to: "/auth" });
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        admin
        navLabel={tr("Menú de administración")}
        footnote={tr("Centro de gestión municipal {app}")}
        brand={
          <Link to="/admin" className="inline-flex min-w-0 items-center justify-center">
            {getMunicipality().assets.logoAdmin ? (
              <img
                src={getMunicipality().assets.logoAdmin}
                alt={getMunicipality().appName}
                // El logotipo compilado del piloto es blanco y se oscurece; uno subido se muestra tal cual.
                className={`h-9 max-w-full object-contain ${getSiteConfigSnapshot().branding?.logoPath ? "" : "brightness-0"}`}
              />
            ) : (
              <span className="truncate font-display text-lg font-extrabold">
                {getMunicipality().appName}
              </span>
            )}
          </Link>
        }
        items={items.map((item) => ({ ...item, label: tr(item.label) }))}
      />
      {isLoading ? null : isAdmin ? (
        <AdminLayout>{children}</AdminLayout>
      ) : (
        <main className="mx-auto max-w-5xl px-4 py-6">
          <p className="border p-4 text-sm">
            <Text text="Esta cuenta no tiene permisos de administración." />
          </p>
        </main>
      )}
    </div>
  );
}
