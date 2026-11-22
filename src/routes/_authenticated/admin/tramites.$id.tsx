import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ArrowLeft, Save, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProcedureText } from "@/components/ProcedureText";
import { euroAmount, hasProcedureLink } from '@/lib/procedure-display';
import { AdminShell } from "@/components/admin/AdminShell";
import { ProcedureFields, SECTION_FIELDS } from "@/components/admin/ProcedureFields";
import { ProcedureSectionsEditor } from '@/components/admin/ProcedureSectionsEditor';
import { ProcedureSections } from '@/components/ProcedureSections';
import { modularContent, alignedModuleContent } from '@/lib/procedure-sections';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { LANGS, LANGUAGE_OPTIONS, translateText, type Lang, useI18n } from "@/lib/i18n";
import { ContentLanguages } from '@/components/admin/ContentLanguages';
import { useContentTranslations } from '@/components/admin/useContentTranslations';
import { TranslationSaveDialog } from '@/components/admin/TranslationSaveDialog';
import { catalogContent, editTranslation, languagesToGenerate, mapContent, readTranslations, record, sourceChanged, type Content, type Translations } from '@/lib/content-translations';
import { slugify } from "@/lib/admin";
import { TAG_LABEL, TRAMITES } from "@/lib/tramites";
import { adminProceduresQuery, procedureCategoriesQuery, procedureDeletionMarker, type ProcedureRow } from "@/lib/admin-procedures";
import { PROCEDURE_SECTIONS, editableContent, existingProcedure, procedureContentSchema, readVisibility, sourceKey, translateContent, visibleContent, isDeletedProcedure, matchesProcedureSource } from "@/lib/procedure-editor";
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
  if ((row && isDeletedProcedure(row)) || (template && rows.some((r) => isDeletedProcedure(r) && matchesProcedureSource(r, template, categories)))) return <p>{tr("Este trámite no existe.")}</p>;
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
    return modularContent(parsed.success ? parsed.data : editableContent(template), readVisibility(row?.visibility));
  });
  const [translations, setTranslations] = useState<Translations>(() => {
    const saved = readTranslations(row?.translations);
    if (template && !row) {
      const source = editableContent(template);
      for (const lang of LANGS) if (lang !== 'es' && !saved[lang]) saved[lang] = { source, content: catalogContent(source, lang), manual: false };
    }
    const parsed = procedureContentSchema.safeParse(row?.content_en);
    if (parsed.success && !saved.en) saved.en = { content: parsed.data, source: content, manual: true };
    for (const lang of LANGS) {
      const version = saved[lang];
      if (version) saved[lang] = { ...version, content: modularContent(version.content, readVisibility(row?.visibility), (s) => translateText(s, lang)), source: modularContent(version.source, readVisibility(row?.visibility)) };
    }
    return saved;
  });
  const [language, setLanguage] = useState<Lang>('es');
  const { generate, translating, translationError } = useContentTranslations();
  const [title, setTitle] = useState(row?.title ?? template?.title ?? "");
  const [slug, setSlug] = useState(row?.slug ?? template?.slug ?? "");
  const [category, setCategory] = useState(row?.category_id ?? categories.find((c) => c.slug === template?.cat)?.id ?? categories[0]?.id ?? "");
  const [status, setStatus] = useState(row?.status ?? "borrador");
  const [order, setOrder] = useState(row?.sort_order ?? 0);
  const [visibility, setVisibility] = useState(() => readVisibility(row?.visibility));
  const [busy, setBusy] = useState(false);
  const [confirmTranslations, setConfirmTranslations] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const currentCategory = categories.find((c) => c.id === category);
  const source: Content = { ...content, title: title.trim(), slug, cat: currentCategory?.slug ?? '' };
  const selected = language === 'es' ? content : alignedModuleContent(source, translations[language]?.content ?? record(mapContent(source, () => '')));
  const update = (value: Content) => language === 'es' ? setContent(value) : setTranslations((p) => editTranslation(p, language, value, source));

  async function save(choice?: boolean) {
    setError("");
    if (!title.trim() || !category || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setError(tr("Completa el título y un identificador válido.")); return; }
    if (busy || translating) return;
    if (choice === undefined && languagesToGenerate(translations, source).length) { setConfirmTranslations(true); return; }
    const prepared = choice ? await generate(source, translations, setTranslations, true) : translations;
    if (!prepared) { setConfirmTranslations(false); return; }
    setConfirmTranslations(false);
    const full = source;
    const fullEn = { ...prepared.en?.content, slug, cat: currentCategory?.slug ?? '' };
    const validated = procedureContentSchema.safeParse(full);
    const validatedEn = procedureContentSchema.safeParse(fullEn);
    if (!validated.success) { setError(tr("Revisa los enlaces y campos del trámite.")); return; }
    setBusy(true);
    try {
      const payload = { category_id: category, title: title.trim(), slug, summary: typeof content['summary'] === "string" ? content['summary'] : "", status,
        content: full as Json, content_en: (validatedEn.success ? fullEn : {}) as Json, translations: prepared as unknown as Json, visibility, sort_order: order, source_key: row?.source_key ?? (template ? sourceKey(template) : null) };
      const result = row ? await supabase.from("procedures").update(payload).eq("id", row.id).select("id").single() : await supabase.from("procedures").insert(payload).select("id").single();
      if (result.error || !result.data) throw result.error ?? new Error("Missing saved row");
      await qc.invalidateQueries({ queryKey: adminProceduresQuery.queryKey });
      await qc.invalidateQueries({ queryKey: ['public-procedures'] });
      toast.success(tr("Trámite guardado"));
      await navigate({ to: "/admin/tramites/$id", params: { id: result.data.id } });
    } catch { setError(tr("No se pudo guardar. Revisa los datos y tus permisos.")); } finally { setBusy(false); }
  }
  async function remove() {
    if (busy || translating) return;
    const legacy = row ? TRAMITES.find((t) => matchesProcedureSource(row, t, categories)) : template;
    if (!row && !legacy) return;
    setBusy(true); setError("");
    try {
      const categoryId = categories.find((c) => c.slug === legacy?.cat)?.id;
      if (legacy && !row && !categoryId) throw new Error("Missing template category");
      const marker = legacy ? procedureDeletionMarker(legacy, categoryId ?? '', row) : null;
      const mutation = row
        ? marker ? supabase.from("procedures").update(marker).eq("id", row.id) : supabase.from("procedures").delete().eq("id", row.id)
        : marker ? supabase.from("procedures").insert(marker) : null;
      if (!mutation) throw new Error("Missing deletion target");
      const result = await mutation.select("id").single();
      if (result.error || !result.data) throw result.error ?? new Error("Missing deleted row");
      await qc.invalidateQueries({ queryKey: adminProceduresQuery.queryKey });
      await qc.invalidateQueries({ queryKey: ['public-procedures'] });
      toast.success(tr("Trámite eliminado"));
      await navigate({ to: "/admin/tramites" });
    } catch { setError(tr("No se pudo eliminar el trámite.")); } finally { setBusy(false); }
  }
  const previewContent = visibleContent(language === "es" ? { ...content, title } : selected, visibility);
  return <>
    <Link to="/admin/tramites" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />{tr("Trámites")}</Link>
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="my-5 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold">{tr(id === "nuevo" ? "Nuevo trámite" : "Editar trámite")}</h1><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setPreview(true)}><Eye />{tr("Vista previa")}</Button><Button disabled={busy}><Save />{tr(busy ? "Guardando…" : "Guardar")}</Button></div></div>
      <fieldset disabled={busy || translating} className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">{tr("Título")}<Input required value={title} onChange={(e) => { setTitle(e.target.value); if (!row && slug === slugify(title)) setSlug(slugify(e.target.value)); }} /></label>
          <label className="block text-sm font-medium">{tr("Identificador del enlace")}<Input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
          <label className="block text-sm font-medium">{tr("Categoría")}<select required value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full border bg-background px-3 text-sm"><option value="">{tr("Selecciona categoría")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{tr(c.title)}</option>)}</select></label>
          <label className="block text-sm font-medium">{tr("Estado")}<select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full border bg-background px-3 text-sm"><option value="borrador">{tr("Borrador")}</option><option value="publicada">{tr("Publicado")}</option></select></label>
          <label className="block text-sm font-medium">{tr("Orden")}<Input type="number" step="1" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></label>
        </div>
        <ContentLanguages value={language} onChange={setLanguage} busy={busy || translating} onGenerate={() => void generate(source, translations, setTranslations, true)} stale={Boolean(language !== 'es' && translations[language] && sourceChanged(translations[language], source))} translations={translations} onVersionsChange={setTranslations} />
        {language !== 'es' && <label className="block text-sm font-medium">{`Título · ${LANGUAGE_OPTIONS[language].name}`}<Input value={typeof selected['title'] === 'string' ? selected['title'] : ''} onChange={(e) => update({ ...selected, title: e.target.value })} /></label>}
        <label className="block text-sm font-medium">{tr("Subtítulo")}<Textarea aria-label="Subtítulo" value={typeof selected['summary'] === "string" ? selected['summary'] : ""} onChange={(e) => update({ ...selected, summary: e.target.value })} /></label>
        <label className="block text-sm font-medium">{tr("Descripción corta")}<Textarea aria-label="Descripción corta" value={typeof selected['cardDescription'] === 'string' ? selected['cardDescription'] : typeof selected['summary'] === 'string' ? selected['summary'] : typeof selected['short'] === 'string' ? selected['short'] : ''} onChange={(e) => update({ ...selected, cardDescription: e.target.value })} /></label>
        <Accordion type="multiple" className="border-t">{PROCEDURE_SECTIONS.filter((section) => ['short', 'primaryAction', 'tags'].includes(section.key)).map((section) => <AccordionItem key={section.key} value={section.key} className="border-b">
          <div className="flex items-center gap-4"><AccordionTrigger className="min-w-0 flex-1 text-left">{tr(section.title)}</AccordionTrigger><Switch aria-label={`${tr("Mostrar")} ${tr(section.title)}`} checked={visibility[section.key] !== false} onCheckedChange={(v) => setVisibility((p) => ({ ...p, [section.key]: v }))} /></div>
          <AccordionContent className="px-1 pb-5">{section.key === "tags" ? <div className="flex flex-wrap gap-4">{(["gratis", "online", "presencial"] as const).map((tag) => {
            const tags = Array.isArray(content['tags']) ? content['tags'] : [];
            return <label key={tag} className="flex items-center gap-2 text-sm"><Checkbox checked={tags.includes(tag)} onCheckedChange={(v) => {
              const next = v ? [...tags.filter((t) => t !== tag), tag] : tags.filter((t) => t !== tag);
              setContent((p) => ({ ...p, tags: next }));
            }} />{tr(TAG_LABEL[tag])}</label>;
          })}</div> : <ProcedureFields fields={SECTION_FIELDS[section.key] ?? []} value={selected} onChange={update} />}</AccordionContent>
        </AccordionItem>)}</Accordion>
        <ProcedureSectionsEditor value={selected} onChange={update} structureEditable={language === 'es'} />
        {translationError && <p role="alert" className="text-sm text-destructive">{translationError}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-3"><Button disabled={busy}><Save />{tr(busy ? "Guardando…" : "Guardar")}</Button>{(row || template) && <Button type="button" variant="ghost" onClick={() => setDeleting(true)} className="text-destructive"><Trash2 />{tr("Eliminar trámite")}</Button>}</div>
      </fieldset>
    </form>
    <TranslationSaveDialog open={confirmTranslations} onOpenChange={setConfirmTranslations} source={source} translations={translations} busy={busy || translating} onSave={(choice) => void save(choice)} />
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{tr("Vista previa")}</DialogTitle></DialogHeader><ProcedurePreview content={previewContent} /></DialogContent></Dialog>
    <Dialog open={deleting} onOpenChange={(open) => { if (!busy) setDeleting(open); }}><DialogContent><DialogHeader><DialogTitle>{tr("Eliminar trámite")}</DialogTitle></DialogHeader><p>{tr("¿Eliminar este trámite del panel?")}</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(false)}>{tr("Cancelar")}</Button><Button variant="destructive" disabled={busy || translating} onClick={() => void remove()}><Trash2 />{tr("Eliminar")}</Button></div></DialogContent></Dialog>
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
      if ('url' in fields && 'label' in fields) return hasProcedureLink(fields) ? <a className="text-sm text-primary underline" href={fields.url} target={fields.url.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer"><ProcedureText text={fields.label} linkPuntoVuela={false} /></a> : null;
      if (typeof fields['title'] === 'string' && Array.isArray(fields['requisitos'])) return <div className="space-y-2"><h4 className="font-semibold"><ProcedureText text={fields['title']} /></h4>{render(fields['requisitos'])}</div>;
      return <div className="space-y-2">{Object.values(fields).map((v, i) => <div key={i}>{render(v)}</div>)}</div>;
    }
    return null;
  }
  return <article className="space-y-5">
    <div className="flex flex-wrap gap-2">{Array.isArray(content['tags']) && content['tags'].map((tag) => <span key={String(tag)} className="bg-muted px-2 py-1 text-xs">{tr(TAG_LABEL[tag as keyof typeof TAG_LABEL] ?? String(tag))}</span>)}</div>
    <h2 className="font-display text-2xl font-bold"><ProcedureText text={String(content['title'] ?? "")} linkPuntoVuela={false} /></h2>
    {typeof content['summary'] === 'string' && content['summary'] && <p className="text-lg text-muted-foreground"><ProcedureText text={content['summary']} linkPuntoVuela={false} /></p>}
    {render(content['short'])}{render(content['primaryAction'])}
    {Array.isArray(content['sections']) ? <ProcedureSections sections={content['sections']} notes={typeof content['notes'] === 'string' ? content['notes'] : ''} /> : PROCEDURE_SECTIONS.filter((s) => !["short", "primaryAction", "tags"].includes(s.key)).map((s) => {
      const keys: Record<string, string[]> = { para: ["paraIntro", "paraNota"], quien: ["quienIntro", "quienNota"], necesitas: ["necesitasIntro", "necesitasNota"], coste: ["costeTitulo", "costeImporte", "costeTexto"] };
      const parts = [content[s.key], ...(s.key === 'necesitas' ? [content['requisitosGrupos']] : []), ...(keys[s.key] ?? [s.key]).map((k) => k === 'costeImporte' && typeof guide[k] === 'string' ? euroAmount(guide[k]) : guide[k])].filter(hasContent);
      return parts.length ? <section key={s.key} className="space-y-2 border-t pt-4"><h3 className="font-semibold">{tr(s.title)}</h3>{parts.map((v, i) => <div key={i}>{render(v)}</div>)}</section> : null;
    })}
  </article>;
}