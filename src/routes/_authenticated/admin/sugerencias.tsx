import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminSuggestionsQuery, fmtDate } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/sugerencias")({
  head: () => ({
    meta: [
      { title: "Sugerencias · Administración Aquí Bonela" },
      { name: "description", content: "Sugerencias de comercios y profesionales enviadas por visitantes." },
      { property: "og:title", content: "Sugerencias · Administración Aquí Bonela" },
      { property: "og:description", content: "Bandeja de sugerencias del directorio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSuggestions,
});

function AdminSuggestions() {
  return (
    <AdminShell>
      <SuggestionsBody />
    </AdminShell>
  );
}

function SuggestionsBody() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery(adminSuggestionsQuery);

  const toggle = useMutation({
    mutationFn: async ({ id, handled }: { id: string; handled: boolean }) => {
      const { error } = await supabase.from("suggestions").update({ handled }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "suggestions"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suggestions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "suggestions"] }),
  });

  const open = data.filter((s) => !s.handled).length;

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Sugerencias</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {isLoading ? "Cargando…" : `${open} sin atender`}
      </p>
      {!isLoading && data.length === 0 && (
        <p className="mt-6 border p-4 text-sm text-muted-foreground">Todavía no hay sugerencias.</p>
      )}
      <ul className="mt-4 grid gap-3">
        {data.map((s) => (
          <li key={s.id} className={`border p-4 ${s.handled ? "bg-secondary/40" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{s.name}</p>
              <span className="text-xs text-muted-foreground">{fmtDate(s.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{s.message}</p>
            {s.contact && (
              <p className="mt-2 text-sm text-muted-foreground">Contacto: <span className="font-medium">{s.contact}</span></p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ id: s.id, handled: !s.handled })}
                className="min-h-10 border px-3 text-sm font-medium hover:bg-secondary disabled:opacity-60"
              >
                {s.handled ? "Reabrir" : "Marcar atendida"}
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm("¿Descartar esta sugerencia definitivamente?")) remove.mutate(s.id);
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
