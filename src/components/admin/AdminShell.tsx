import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminQuery } from "@/lib/admin";
import { Toaster } from "@/components/ui/sonner";

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/admin" className="font-display text-lg font-bold">
            Aquí Bonela · <span className="font-medium opacity-80">Administración</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" search={{ q: "", cat: "", of: "" }} className="hover:underline">Ver web</Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="hover:underline"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
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
