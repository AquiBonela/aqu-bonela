import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminListingsQuery, STATUSES } from "@/lib/admin";
import { isFeatured, normalize } from "@/lib/directory";
import { Input } from "@/components/ui/input";
import { CollaboratorBadge } from "@/components/ListingCard";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Fichas · Administración Aquí Bonela" },
      { name: "description", content: "Gestión de fichas del directorio Aquí Bonela." },
      { property: "og:title", content: "Fichas · Administración Aquí Bonela" },
      { property: "og:description", content: "Gestión de fichas del directorio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminList,
});

const statusLabel = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

function AdminList() {
  return (
    <AdminShell>
      <ListBody />
    </AdminShell>
  );
}

function ListBody() {
  const { data = [], isLoading } = useQuery(adminListingsQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const rows = data.filter(
    (l) => (!status || l.status === status) && (!q || normalize(`${l.name} ${l.activity ?? ""}`).includes(normalize(q))),
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Fichas</h1>
        <Link
          to="/admin/fichas/$id"
          params={{ id: "nueva" }}
          className="inline-flex h-10 items-center gap-2 bg-terracotta px-4 text-sm font-medium text-terracotta-foreground"
        >
          <Plus className="h-4 w-4" /> Nueva ficha
        </Link>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar ficha…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 border bg-background px-3 text-sm">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{isLoading ? "Cargando…" : `${rows.length} fichas`}</p>
      <ul className="mt-2 divide-y border">
        {rows.map((l) => (
          <li key={l.id}>
            <Link to="/admin/fichas/$id" params={{ id: l.id }} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
              <span className={`w-1 self-stretch ${l.type === "comercio" ? "bg-primary" : l.type === "publico" ? "bg-civic" : "bg-terracotta"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 break-words font-medium">{l.name}</p>
                  {isFeatured(l) && <CollaboratorBadge />}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {l.categories?.name ?? "Sin categoría"}{l.activity ? ` · ${l.activity}` : ""}
                    {l.urgent_24h ? " · Urgencias 24h" : ""}
                </p>
              </div>
              <span className="shrink-0 border px-2 py-0.5 text-xs">{statusLabel[l.status]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
