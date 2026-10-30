import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminQuery } from "@/lib/admin";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import logo from "@/assets/logo-2.webp";

const ADMIN_ITEMS: HeaderItem[] = [
  { to: "/admin", label: "Fichas", activeOptions: { exact: true } },
  { to: "/admin/avisos", label: "Avisos" },
  { to: "/admin/sugerencias", label: "Sugerencias" },
  { to: "/admin/configuracion", label: "Configuración" },
  { to: "/", search: { q: "", cat: "", of: "" }, label: "Ver web" },
];

export function AdminShell({ children }: { children: ReactNode }) {
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
        navLabel="Menú de administración"
        footnote="Administración del directorio Aquí Bonela"
        brand={
          <Link to="/admin" className="inline-flex items-center gap-3 font-display text-lg font-medium">
            <img src={logo} alt="Aquí Bonela" className="h-9 w-auto" />
            <span className="hidden sm:inline">Administración</span>
          </Link>
        }
        items={items}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {isLoading ? null : isAdmin ? (
          children
        ) : (
          <p className="border p-4 text-sm">Esta cuenta no tiene permisos de administración.</p>
        )}
      </main>
      <Toaster />
    </div>
  );
}
