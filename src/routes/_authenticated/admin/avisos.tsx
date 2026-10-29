import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminReportsQuery, fmtDate } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos · Administración Aquí Bonela" },
      { name: "description", content: "Avisos «¿Algo no es correcto?» del directorio Aquí Bonela." },
      { property: "og:title", content: "Avisos · Administración Aquí Bonela" },
      { property: "og:description", content: "Bandeja de avisos del directorio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReports,
});

function AdminReports() {
  return (
    <AdminShell>
      <ReportsBody />
    </AdminShell>
  );
}

function ReportsBody() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery(adminReportsQuery);
  const [showResolved, setShowResolved] = useState(false);
  const rows = showResolved ? data : data.filter((r) => !r.resolved);

  const toggle = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase.from("listing_reports").update({ resolved }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listing_reports").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });

  const pending = data.filter((r) => !r.resolved).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Avisos</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Mostrar resueltos
        </label>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {isLoading ? "Cargando…" : `${pending} pendiente${pending === 1 ? "" : "s"}`}
      </p>
      {!isLoading && rows.length === 0 && (
        <p className="mt-6 border p-4 text-sm text-muted-foreground">No hay avisos{showResolved ? "" : " pendientes"}.</p>
      )}
      <ul className="mt-4 grid gap-3">
        {rows.map((r) => (
          <li key={r.id} className={`border p-4 ${r.resolved ? "bg-secondary/40" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                Ficha:{" "}
                <Link to="/admin/fichas/$id" params={{ id: r.listing_id }} className="underline underline-offset-4">
                  {r.listings?.name ?? "Ficha eliminada"}
                </Link>
              </p>
              <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>
            {r.contact && (
              <p className="mt-2 text-sm text-muted-foreground">Contacto: <span className="font-medium">{r.contact}</span></p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ id: r.id, resolved: !r.resolved })}
                className="min-h-10 border px-3 text-sm font-medium hover:bg-secondary disabled:opacity-60"
              >
                {r.resolved ? "Reabrir" : "Marcar resuelto"}
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm("¿Descartar este aviso definitivamente?")) remove.mutate(r.id);
                }}
                className="min-h-10 border px-3 text-sm text-destructive hover:bg-secondary disabled:opacity-60"
              >
                Descartar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
