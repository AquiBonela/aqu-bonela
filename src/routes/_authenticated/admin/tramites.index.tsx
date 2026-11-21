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

export const Route = createFileRoute("/_authenticated/admin/tramites/")({
  head: () => ({ meta: [
    { title: "Trámites · Administración Aquí Bonela" },
    { name: "description", content: "Administración de categorías y guías de trámites de Aquí Bonela." },
    { property: "og:title", content: "Trámites · Administración Aquí Bonela" },
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
    {showCategories && <section className="mt-5 border-y py-5">
      <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{tr("Categorías de trámites")}</h2><Button size="sm" variant="outline" onClick={() => setEditing("new")}><Plus />{tr("Nueva categoría")}</Button></div>
      <ul className="mt-3 divide-y">{categories.map((c) => <li key={c.id} className="flex items-center gap-3 py-3">
        <span className="text-xs text-muted-foreground">{c.sort_order}</span>
        <div className="min-w-0 flex-1"><p className="break-words font-medium">{c.title}</p><p className="text-xs text-muted-foreground">{c.slug} · {tr(c.visible ? "Visible" : "Oculta")}</p></div>
        <Button variant="ghost" size="icon" title={tr("Editar categoría")} aria-label={`${tr("Editar categoría")} ${c.title}`} onClick={() => setEditing(c)}><Pencil /></Button>
      </li>)}</ul>
    </section>}
    <div className="mt-5 grid gap-2 sm:grid-cols-3">
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={tr("Buscar trámite")} placeholder={tr("Buscar trámite")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
      <select aria-label={tr("Categoría")} value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 min-w-0 border bg-background px-3 text-sm"><option value="">{tr("Todas las categorías")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <select aria-label={tr("Estado")} value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 border bg-background px-3 text-sm"><option value="">{tr("Todos los estados")}</option><option value="publicada">{tr("Publicado")}</option><option value="borrador">{tr("Borrador")}</option><option value="sin-guardar">{tr("Guía actual sin guardar")}</option></select>
    </div>
    <p className="my-3 text-sm text-muted-foreground">{filtered.length} {tr("trámites")}</p>
    {!filtered.length && <p className="py-8 text-center text-muted-foreground">{tr("No hay trámites con estos filtros.")}</p>}
    <ul className="divide-y border">{filtered.map((r) => <li key={r.id}><Link to="/admin/tramites/$id" params={{ id: r.id }} className="flex items-center gap-3 p-4 hover:bg-muted">
      <div className="min-w-0 flex-1"><p className="break-words font-semibold">{r.title}</p><p className="text-xs text-muted-foreground">{categories.find((c) => c.id === r.cat)?.title}</p></div>
      <span className="shrink-0 text-xs text-muted-foreground">{tr(r.status === "sin-guardar" ? "Guía actual sin guardar" : r.status === "publicada" ? "Publicado" : "Borrador")}</span><Pencil className="h-4 w-4 shrink-0" />
    </Link></li>)}</ul>
    {editing && <CategoryDialog key={editing === "new" ? "new" : editing.id} category={editing === "new" ? null : editing} close={() => setEditing(null)} />}
  </>;
}

function CategoryDialog({ category, close }: { category: ProcedureCategory | null; close: () => void }) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: category?.title ?? "", slug: category?.slug ?? "", description: category?.description ?? "", title_en: category?.title_en ?? "", description_en: category?.description_en ?? "", visible: category?.visible ?? true, sort_order: category?.sort_order ?? 0 });
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
      <label className="block text-sm">{tr("Nombre en inglés")}<Input value={f.title_en} onChange={(e) => setF({ ...f, title_en: e.target.value })} /></label>
      <label className="block text-sm">{tr("Descripción en inglés")}<Textarea value={f.description_en} onChange={(e) => setF({ ...f, description_en: e.target.value })} /></label>
      <label className="block text-sm">{tr("Orden")}<Input type="number" step="1" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></label>
      <label className="flex items-center justify-between text-sm">{tr("Visible")}<Switch checked={f.visible} onCheckedChange={(v) => setF({ ...f, visible: v })} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={close}><X />{tr("Cancelar")}</Button><Button disabled={busy}><Save />{tr(busy ? "Guardando…" : "Guardar")}</Button></div>
    </form>
  </DialogContent></Dialog>;
}