import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ArrowLeft, Save, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProcedureText } from "@/components/ProcedureText";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProcedureFields, SECTION_FIELDS } from "@/components/admin/ProcedureFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";
import { slugify } from "@/lib/admin";
import { TAG_LABEL } from "@/lib/tramites";
import { adminProceduresQuery, procedureCategoriesQuery, type ProcedureRow } from "@/lib/admin-procedures";
import { PROCEDURE_SECTIONS, editableContent, existingProcedure, procedureContentSchema, readVisibility, sourceKey, translateContent, visibleContent } from "@/lib/procedure-editor";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/tramites/$id")({
  head: () => ({ meta: [
    { title: "Editar trámite · Administración Aquí Bonela" }, { name: "description", content: "Editor de guías, pasos y visibilidad de trámites." },
    { property: "og:title", content: "Editar trámite · Administración Aquí Bonela" }, { property: "og:description", content: "Editor de trámites de Aquí Bonela." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: () => { const { id } = Route.useParams(); return <AdminShell><Suspense fallback={<Loading />}><EditorLoader key={id} id={id} /></Suspense></AdminShell>; },
  errorComponent: ({ reset }) => <AdminShell><EditorError retry={reset} /></AdminShell>,
});
function Loading() { const { tr } = useI18n(); return <p>{tr("Cargando…")}</p>; }
function EditorError({ retry }: { retry: () => void }) { const { tr } = useI18n(); return <div role="alert"><p>{tr("No se pudieron cargar los trámites.")}</p><Button onClick={retry}>{tr("Reintentar")}</Button></div>; }
function EditorLoader({ id }: { id: string }) {
  const { data: rows } = useSuspenseQuery(adminProceduresQuery);
  const { data: categories } = useSuspenseQuery(procedureCategoriesQuery);
  const { tr } = useI18n();
  const row = rows.find((r) => r.id === id);
  const template = existingProcedure(id);
  if (!row && !template && id !== "nuevo") return <p>{tr("Este trámite no existe.")}</p>;
  return <ProcedureEditor id={id} row={row} categories={categories} />;
}

export function ProcedureEditor({ id, row, categories }: { id: string; row: ProcedureRow | undefined; categories: import("@/lib/admin-procedures").ProcedureCategory[] }) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const template = existingProcedure(id);
  const [content, setContent] = useState<Record<string, unknown>>(() => {
    const parsed = procedureContentSchema.safeParse(row?.content);
    return parsed.success ? parsed.data : editableContent(template);
  });
  const [english, setEnglish] = useState<Record<string, unknown>>(() => {
    const parsed = procedureContentSchema.safeParse(row?.content_en);
    return parsed.success ? parsed.data : translateContent(editableContent(template)) as Record<string, unknown>;
  });
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [title, setTitle] = useState(row?.title ?? template?.title ?? "");
  const [slug, setSlug] = useState(row?.slug ?? template?.slug ?? "");
  const [category, setCategory] = useState(row?.category_id ?? categories.find((c) => c.slug === template?.cat)?.id ?? categories[0]?.id ?? "");
  const [status, setStatus] = useState(row?.status ?? "borrador");
  const [order, setOrder] = useState(row?.sort_order ?? 0);
  const [visibility, setVisibility] = useState(() => readVisibility(row?.visibility));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const selected = language === "es" ? content : english;
  const update = language === "es" ? setContent : setEnglish;
  const currentCategory = categories.find((c) => c.id === category);

  async function save() {
    setError("");
    if (!title.trim() || !category || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setError(tr("Completa el título y un identificador válido.")); return; }
    const full = { ...content, title: title.trim(), slug, cat: currentCategory?.slug ?? "" };
    const fullEn = { ...english, slug, cat: currentCategory?.slug ?? "" };
    const validated = procedureContentSchema.safeParse(full);
    const validatedEn = procedureContentSchema.safeParse(fullEn);
    if (!validated.success || !validatedEn.success) { setError(tr("Revisa los enlaces y campos del trámite.")); return; }
    setBusy(true);
    try {
      const payload = { category_id: category, title: title.trim(), slug, summary: typeof content['summary'] === "string" ? content['summary'] : "", status,
        content: full as Json, content_en: fullEn as Json, visibility, sort_order: order, source_key: row?.source_key ?? (template ? sourceKey(template) : null) };
      const result = row ? await supabase.from("procedures").update(payload).eq("id", row.id).select("id").single() : await supabase.from("procedures").insert(payload).select("id").single();
      if (result.error || !result.data) throw result.error ?? new Error("Missing saved row");
      await qc.invalidateQueries({ queryKey: adminProceduresQuery.queryKey });
      toast.success(tr("Trámite guardado"));
      await navigate({ to: "/admin/tramites/$id", params: { id: result.data.id } });
    } catch { setError(tr("No se pudo guardar. Revisa los datos y tus permisos.")); } finally { setBusy(false); }
  }
  async function remove() {
    if (!row) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.from("procedures").delete().eq("id", row.id).select("id").single();
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: adminProceduresQuery.queryKey });
      toast.success(tr("Trámite eliminado"));
      await navigate({ to: "/admin/tramites" });
    } catch { setError(tr("No se pudo eliminar el trámite.")); } finally { setBusy(false); }
  }
  const previewContent = visibleContent(language === "es" ? { ...content, title } : english, visibility);
  return <>
    <Link to="/admin/tramites" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />{tr("Trámites")}</Link>
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="my-5 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold">{tr(id === "nuevo" ? "Nuevo trámite" : "Editar trámite")}</h1><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setPreview(true)}><Eye />{tr("Vista previa")}</Button><Button disabled={busy}><Save />{tr(busy ? "Guardando…" : "Guardar")}</Button></div></div>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">{tr("Título")}<Input required value={title} onChange={(e) => { setTitle(e.target.value); if (!row && slug === slugify(title)) setSlug(slugify(e.target.value)); }} /></label>
          <label className="block text-sm font-medium">{tr("Identificador del enlace")}<Input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
          <label className="block text-sm font-medium">{tr("Categoría")}<select required value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full border bg-background px-3 text-sm"><option value="">{tr("Selecciona categoría")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{tr(c.title)}</option>)}</select></label>
          <label className="block text-sm font-medium">{tr("Estado")}<select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full border bg-background px-3 text-sm"><option value="borrador">{tr("Borrador")}</option><option value="publicada">{tr("Publicado")}</option></select></label>
          <label className="block text-sm font-medium">{tr("Orden")}<Input type="number" step="1" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></label>
        </div>
        <div role="group" aria-label={tr("Idioma del contenido")} className="flex gap-2 border-t pt-5"><Button type="button" variant={language === "es" ? "default" : "outline"} aria-pressed={language === "es"} onClick={() => setLanguage("es")}>Español</Button><Button type="button" variant={language === "en" ? "default" : "outline"} aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</Button></div>
        {language === "en" && <label className="block text-sm font-medium">{tr("Nombre en inglés")}<Input value={typeof english['title'] === "string" ? english['title'] : ""} onChange={(e) => setEnglish({ ...english, title: e.target.value })} /></label>}
        <label className="block text-sm font-medium">{tr("Resumen para el listado")}<Textarea value={typeof selected['summary'] === "string" ? selected['summary'] : ""} onChange={(e) => update({ ...selected, summary: e.target.value })} /></label>
        <Accordion type="multiple" className="border-t">{PROCEDURE_SECTIONS.map((section) => <AccordionItem key={section.key} value={section.key} className="border-b">
          <div className="flex items-center gap-4"><AccordionTrigger className="min-w-0 flex-1 text-left">{tr(section.title)}</AccordionTrigger><Switch aria-label={`${tr("Mostrar")} ${tr(section.title)}`} checked={visibility[section.key] !== false} onCheckedChange={(v) => setVisibility((p) => ({ ...p, [section.key]: v }))} /></div>
          <AccordionContent className="px-1 pb-5">{section.key === "tags" ? <div className="flex flex-wrap gap-4">{(["gratis", "online", "presencial"] as const).map((tag) => {
            const tags = Array.isArray(content['tags']) ? content['tags'] : [];
            return <label key={tag} className="flex items-center gap-2 text-sm"><Checkbox checked={tags.includes(tag)} onCheckedChange={(v) => {
              const next = v ? [...tags.filter((t) => t !== tag), tag] : tags.filter((t) => t !== tag);
              setContent((p) => ({ ...p, tags: next })); setEnglish((p) => ({ ...p, tags: next }));
            }} />{tr(TAG_LABEL[tag])}</label>;
          })}</div> : <ProcedureFields fields={SECTION_FIELDS[section.key] ?? []} value={selected} onChange={update} />}</AccordionContent>
        </AccordionItem>)}</Accordion>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-3"><Button disabled={busy}><Save />{tr(busy ? "Guardando…" : "Guardar")}</Button>{row && <Button type="button" variant="ghost" onClick={() => setDeleting(true)} className="text-destructive"><Trash2 />{tr("Eliminar trámite")}</Button>}</div>
      </fieldset>
    </form>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{tr("Vista previa")}</DialogTitle></DialogHeader><ProcedurePreview content={previewContent} /></DialogContent></Dialog>
    <Dialog open={deleting} onOpenChange={setDeleting}><DialogContent><DialogHeader><DialogTitle>{tr("Eliminar trámite")}</DialogTitle></DialogHeader><p>{tr("¿Eliminar este trámite del panel?")}</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(false)}>{tr("Cancelar")}</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}><Trash2 />{tr("Eliminar")}</Button></div></DialogContent></Dialog>
  </>;
}

function ProcedurePreview({ content }: { content: Record<string, unknown> }) {
  const { tr } = useI18n();
  const guide = content['guia'] && typeof content['guia'] === "object" ? content['guia'] as Record<string, unknown> : {};
  function hasContent(value: unknown): boolean {
    if (typeof value === "string") return Boolean(value.trim());
    if (Array.isArray(value)) return value.some(hasContent);
    return Boolean(value && typeof value === "object" && Object.values(value).some(hasContent));
  }
  function render(value: unknown): import("react").ReactNode {
    if (typeof value === "string") return value ? <p className="whitespace-pre-line text-sm leading-relaxed"><ProcedureText text={value} /></p> : null;
    if (Array.isArray(value)) return value.map((v, i) => <div key={i} className="space-y-2 py-1">{render(v)}</div>);
    if (value && typeof value === "object") {
      const fields = value as Record<string, unknown>;
      if (typeof fields['url'] === "string" && typeof fields['label'] === "string" && fields['url']) return /^(https?:\/\/|tel:|\/[^/])/.test(fields['url']) ? <a className="text-sm text-primary underline" href={fields['url']} target="_blank" rel="noopener noreferrer"><ProcedureText text={fields['label']} linkPuntoVuela={false} /></a> : null;
      return <div className="space-y-2">{Object.values(fields).map((v, i) => <div key={i}>{render(v)}</div>)}</div>;
    }
    return null;
  }
  return <article className="space-y-5">
    <div className="flex flex-wrap gap-2">{Array.isArray(content['tags']) && content['tags'].map((tag) => <span key={String(tag)} className="bg-muted px-2 py-1 text-xs">{tr(TAG_LABEL[tag as keyof typeof TAG_LABEL] ?? String(tag))}</span>)}</div>
    <h2 className="font-display text-2xl font-bold"><ProcedureText text={String(content['title'] ?? "")} linkPuntoVuela={false} /></h2>
    {render(content['short'])}{render(content['primaryAction'])}
    {PROCEDURE_SECTIONS.filter((s) => !["short", "primaryAction", "tags"].includes(s.key)).map((s) => {
      const keys: Record<string, string[]> = { para: ["paraIntro", "paraNota"], quien: ["quienIntro", "quienNota"], necesitas: ["necesitasIntro", "necesitasNota"], coste: ["costeTitulo", "costeImporte", "costeTexto"] };
      const parts = [content[s.key], ...(keys[s.key] ?? [s.key]).map((k) => guide[k])].filter(hasContent);
      return parts.length ? <section key={s.key} className="space-y-2 border-t pt-4"><h3 className="font-semibold">{tr(s.title)}</h3>{parts.map((v, i) => <div key={i}>{render(v)}</div>)}</section> : null;
    })}
  </article>;
}