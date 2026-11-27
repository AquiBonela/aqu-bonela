import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Plus, FolderCog, Search, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { slugify } from "@/lib/admin";
import { adminProceduresQuery, procedureCategoriesQuery, procedureList, type ProcedureCategory } from "@/lib/admin-procedures";
import { supabase } from "@/integrations/supabase/client";
import { brand } from "@/config/municipality";

export const Route = createFileRoute("/_authenticated/admin/tramites/")({
  head: () => ({ meta: [
    { title: brand("Trámites · Administración {app}") },
    { name: "description", content: brand("Administración de categorías y guías de trámites de {app}.") },
    { property: "og:title", content: brand("Trámites · Administración {app}") },
    { property: "og:description", content: "Gestión de categorías y guías de trámites." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: () => <AdminShell><Suspense fallback={<Loading />}><ProcedureList /></Suspense></AdminShell>,
  errorComponent: ({ error, reset }) => <AdminShell><LoadError message={error instanceof Error ? error.message : ""} retry={reset} /></AdminShell>,
});
function Loading() { const { tr } = useI18n(); return <p>{tr("Cargando…")}</p>; }
function LoadError({ message, retry }: { message: string; retry: () => void }) { const { tr } = useI18n(); return <div role="alert"><p>{tr("No se pudieron cargar los trámites.")}</p><p className="text-sm text-muted-foreground">{message}</p><Button className="mt-3" onClick={retry}>{tr("Reintentar")}</Button></div>; }

function ProcedureList() {
  const { tr } = useI18n();
  const { data: rows } = useSuspenseQuery(adminProceduresQuery);
  const { data: categories } = useSuspenseQuery(procedureCategoriesQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [editing, setEditing] = useState<ProcedureCategory | "new" | null>(null);
  const all = procedureList(rows, categories);
  const filtered = all.filter((r) => (!cat || r.cat === cat) && (!status || r.status === status) && slugify(r.title).includes(slugify(q)));
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold">{tr("Trámites")}</h1>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowCategories((v) => !v)} aria-expanded={showCategories}><FolderCog />{tr("Categorías")}</Button>
        <Button asChild><Link to="/admin/tramites/$id" params={{ id: "nuevo" }}><Plus />{tr("Nuevo trámite")}</Link></Button>
      </div>
    </div>
    <p className="mt-4 border-l-4 border-terracotta bg-muted p-3 text-sm">{tr("Los cambios del panel aún no se muestran en la guía pública: conexión pendiente.")}</p>
    {showCategories && <section className="mt-5 border-y py-5">
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{tr("Categorías de trámites")}</h2><Button size="sm" variant="outline" onClick={() => setEditing("new")}><Plus />{tr("Nueva categoría")}</Button></div>
      <ul className="mt-3 divide-y">{categories.map((c) => <li key={c.id} className="flex items-center gap-3 py-3">
        <span className="text-xs text-muted-foreground">{c.sort_order}</span>
        <div className="min-w-0 flex-1"><p className="break-words font-medium">{tr(c.title)}</p><p className="text-xs text-muted-foreground">{c.slug} · {tr(c.visible ? "Visible" : "Oculta")}</p></div>
        <Button variant="ghost" size="icon" title={tr("Editar categoría")} aria-label={`${tr("Editar categoría")} ${c.title}`} onClick={() => setEditing(c)}><Pencil /></Button>
      </li>)}</ul>
    </section>}
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={tr("Buscar trámite")} placeholder={tr("Buscar trámite")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
      <select aria-label={tr("Categoría")} value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 min-w-0 border bg-background px-3 text-sm"><option value="">{tr("Todas las categorías")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{tr(c.title)}</option>)}</select>
    </div>
    <div role="group" aria-label={tr("Estado de trámite")} className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {[{ value: "", label: "Todos" }, { value: "publicada", label: "Publicado" }, { value: "borrador", label: "Borrador" }, { value: "sin-guardar", label: "Guía actual sin guardar" }].map((s) => {
        const active = status === s.value;
        const count = s.value ? all.filter((r) => r.status === s.value).length : all.length;
        return <Button key={s.value || "all"} type="button" variant="outline" aria-pressed={active} onClick={() => setStatus(s.value)} className={`h-auto shrink-0 gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-none ${active ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "bg-background text-foreground"}`}>
          {tr(s.label)}<span className={`rounded-full px-1.5 text-xs ${active ? "bg-background/20" : "bg-secondary"}`}>{count}</span>
        </Button>;
      })}
    </div>
    <p className="my-3 text-sm text-muted-foreground">{filtered.length} {tr("trámites")}</p>
    {!filtered.length && <p className="py-8 text-center text-muted-foreground">{tr("No hay trámites con estos filtros.")}</p>}
    <ul className="divide-y border">{filtered.map((r) => <li key={r.id}><Link to="/admin/tramites/$id" params={{ id: r.id }} className="flex items-center gap-3 p-4 hover:bg-muted">
      <div className="min-w-0 flex-1"><p className="break-words font-semibold">{tr(r.title)}</p><p className="text-xs text-muted-foreground">{tr(categories.find((c) => c.id === r.cat)?.title ?? "")}</p></div>
      <span className="shrink-0 text-xs text-muted-foreground">{tr(r.status === "sin-guardar" ? "Guía actual sin guardar" : r.status === "publicada" ? "Publicado" : "Borrador")}</span><Pencil className="h-4 w-4 shrink-0" />
    </Link></li>)}</ul>
    {editing && <CategoryDialog key={editing === "new" ? "new" : editing.id} category={editing === "new" ? null : editing} close={() => setEditing(null)} />}
  </>;
}

function CategoryDialog({ category, close }: { category: ProcedureCategory | null; close: () => void }) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: category?.title ?? "", slug: category?.slug ?? "", description: category?.description ?? "", visible: category?.visible ?? true, sort_order: category?.sort_order ?? 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!f.title.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) { setError(tr("Completa el título y un identificador válido.")); return; }
    setBusy(true); setError("");
    try {
      const result = category ? await supabase.from("procedure_categories").update(f).eq("id", category.id).select("id").single() : await supabase.from("procedure_categories").insert(f).select("id").single();
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: procedureCategoriesQuery.queryKey });
      toast.success(tr("Categoría guardada")); close();
    } catch { setError(tr("No se pudo guardar. Revisa los datos y tus permisos.")); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(v) => { if (!v && !busy) close(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{tr(category ? "Editar categoría" : "Nueva categoría")}</DialogTitle></DialogHeader>
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4">
      <label className="block text-sm">{tr("Nombre")}<Input required value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value, slug: category || p.slug !== slugify(p.title) ? p.slug : slugify(e.target.value) }))} /></label>
      <label className="block text-sm">{tr("Identificador del enlace")}<Input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></label>
      <label className="block text-sm">{tr("Descripción")}<Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <label className="block text-sm">{tr("Orden")}<Input type="number" step="1" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></label>
      <label className="flex items-center justify-between text-sm">{tr("Visible")}<Switch checked={f.visible} onCheckedChange={(v) => setF({ ...f, visible: v })} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={close}><X />{tr("Cancelar")}</Button><Button disabled={busy}><Save />{tr(busy ? "Guardando…" : "Guardar")}</Button></div>
    </form>
  </DialogContent></Dialog>;
}