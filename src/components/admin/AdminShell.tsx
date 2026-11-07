import { Text, useI18n } from "@/lib/i18n";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminReportsQuery, adminSuggestionsQuery, isAdminQuery } from "@/lib/admin";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import logo from "@/assets/logo-2.webp";

const ADMIN_ITEMS: HeaderItem[] = [
  { to: "/admin", label: "Panel de fichas" },
  { to: "/admin/configuracion", label: "Configuración" },
  { to: "/", search: { q: "", cat: "", of: "" }, label: "Ver web" },
];

function AdminTabs() {
  const { tr, locale } = useI18n();
  const { data: reports = [] } = useQuery(adminReportsQuery);
  const { data: suggestions = [] } = useQuery(adminSuggestionsQuery);
  const tabs = [
    { to: "/admin" as const, label: "Fichas", count: 0, exact: true },
    { to: "/admin/avisos" as const, label: "Avisos", count: reports.filter((r) => !r.resolved).length, exact: false },
    { to: "/admin/sugerencias" as const, label: "Sugerencias", count: suggestions.filter((s) => !s.handled).length, exact: false },
  ];
  return (
    <nav aria-label={tr("Secciones de administración")} className="mb-5 grid grid-cols-3 gap-1 rounded-full border bg-secondary/40 p-1">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeOptions={{ exact: t.exact }}
          className="flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground"
          activeProps={{ className: "bg-background text-foreground shadow-sm" }}
        >
          <span className="truncate">{tr(t.label)}</span>
          {t.count > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1.5 text-xs text-terracotta-foreground">{t.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { tr, locale } = useI18n();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery);

  const items: HeaderItem[] = [
    ...ADMIN_ITEMS,
    {
      label: "Salir",
      onClick: async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        navLabel={tr("Menú de administración")}
        footnote={tr("Administración del directorio Aquí Bonela")}
        brand={
          <Link to="/admin" className="inline-flex items-center gap-3 font-display text-lg font-medium">
            <img src={logo} alt="Aquí Bonela" className="h-9 w-auto" />
            <span className="hidden sm:inline"><Text text="Administración" /></span>
          </Link>
        }
        items={items.map((item) => ({ ...item, label: tr(item.label) }))}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {isLoading ? null : isAdmin ? (
          <>
            <AdminTabs />
            {children}
          </>
        ) : (
          <p className="border p-4 text-sm"><Text text="Esta cuenta no tiene permisos de administración." /></p>
        )}
      </main>
    </div>
  );
}
