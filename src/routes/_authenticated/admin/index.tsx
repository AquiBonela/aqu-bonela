import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminListingsQuery, categoriesQuery, STATUSES } from "@/lib/admin";
import { isFeatured, isListingType, LISTING_TYPES } from "@/lib/directory";
import { changeAdminCategory, changeAdminType, emptyAdminFilters, filterAdminListings } from "@/lib/admin-listing-filters";
import { Button } from "@/components/ui/button";
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

const STATUS_PILLS = [
  { value: "publicada", label: "Publicadas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "borrador", label: "Borradores" },
];

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
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [filters, setFilters] = useState(emptyAdminFilters);
  const rows = filterAdminListings(data, filters);
  const availableCategories = categories.filter((c) => data.some((l) => l.category_id === c.id && (!filters.type || l.type === filters.type)));
  const activities = [...new Set(data.filter((l) => l.category_id === filters.category && (!filters.type || l.type === filters.type)).flatMap((l) => l.activity ? [l.activity] : []))].sort((a, b) => a.localeCompare(b, "es"));
  const hasFilters = Object.values(filters).some(Boolean);
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
          <Input aria-label="Buscar ficha" placeholder="Buscar ficha…" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} className="h-10 pl-9" />
        </div>
      </div>
      <div role="group" aria-label="Estado de ficha" className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[{ value: "", label: "Todas" }, ...STATUS_PILLS].map((s) => {
          const count = s.value ? data.filter((l) => l.status === s.value).length : data.length;
          const active = filters.status === s.value;
          return (
            <button key={s.value || "all"} type="button" aria-pressed={active} onClick={() => setFilters((p) => ({ ...p, status: s.value }))}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground"}`}>
              {s.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-background/20" : "bg-secondary"}`}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <select aria-label="Tipo de ficha" value={filters.type} onChange={(e) => {
          const value = e.target.value;
          if (value === "" || isListingType(value)) setFilters((p) => changeAdminType(p, value));
        }} className="h-10 w-full min-w-0 border bg-background px-3 text-sm">
          <option value="">Todos los tipos</option>
          {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.plural}</option>)}
        </select>
        <select aria-label="Categoría" value={filters.category} onChange={(e) => {
          const value = e.target.value;
          const category = categories.find((c) => c.id === value);
          setFilters((p) => changeAdminCategory(p, value, category?.type));
        }} className="h-10 w-full min-w-0 border bg-background px-3 text-sm">
          <option value="">Todas las categorías</option>
          {availableCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {filters.category && <select aria-label="Oficio / actividad" value={filters.activity} onChange={(e) => setFilters((p) => ({ ...p, activity: e.target.value }))} className="h-10 w-full min-w-0 border bg-background px-3 text-sm">
          <option value="">Todos los oficios</option>
          {activities.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
        </select>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm text-muted-foreground">{isLoading ? "Cargando…" : `${rows.length} fichas`}</p>
        {hasFilters && <Button variant="ghost" size="sm" onClick={() => setFilters(emptyAdminFilters)}><X aria-hidden /> Limpiar filtros</Button>}
      </div>
      {!isLoading && rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No hay fichas con estos filtros.</p>}
      <ul className="mt-2 divide-y border">
        {rows.map((l) => (
          <li key={l.id}>
            <Link to="/admin/fichas/$id" params={{ id: l.id }} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
              <span className={`w-1 self-stretch ${l.type === "comercio" ? "bg-primary" : l.type === "publico" ? "bg-civic" : l.type === "asociacion" ? "bg-community" : "bg-terracotta"}`} />
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
