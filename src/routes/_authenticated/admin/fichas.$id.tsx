import { Text, useI18n } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { CoverPicker, GalleryPicker } from "@/components/admin/ListingImages";
import { activitiesQuery, adminListingQuery, categoriesQuery, collaboratorUntil, siteSettingsQuery, slugify, STATUSES, type Status } from "@/lib/admin";
import { isFeatured, LISTING_TYPES, type ListingType } from "@/lib/directory";
import { listingPath, WEEKDAYS } from "@/lib/listing-detail";
import { createReviewToken } from "@/lib/review-token";
import { reviewMessage, whatsappShareUrl } from "@/lib/review";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AVAILABILITY_OPTIONS, reservedTags, searchTags, withAvailability } from "@/lib/listing-availability";
import { deleteListing } from "@/lib/delete-listing";

export const Route = createFileRoute("/_authenticated/admin/fichas/$id")({
  head: () => ({
    meta: [
      { title: "Editar ficha · Administración Aquí Bonela" },
      { name: "description", content: "Alta y edición de fichas del directorio." },
      { property: "og:title", content: "Editar ficha · Administración Aquí Bonela" },
      { property: "og:description", content: "Alta y edición de fichas del directorio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <EditPage />
    </AdminShell>
  ),
});

type Hour = { weekday: number; opens: string; closes: string };
type Form = {
  type: "comercio" | "profesional" | "publico" | "asociacion";
  category_id: string;
  activity: string;
  extra_activities: string[];
  website: string;
  home_service: boolean;
  service_area: string;
  labels: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  tags: string;
  phone: string;
  whatsapp: string;
  address: string;
  email: string;
  show_email: boolean;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_address: boolean;
  owner_name: string;
  owner_contact: string;
  collaborator: boolean;
  featured_until: string | null;
  urgent_24h: boolean;
  availability: string[];
  status: Status;
  hours: Hour[];
};

const empty: Form = {
  type: "comercio", category_id: "",  activity: "", extra_activities: [], website: "", home_service: false, service_area: "", labels: "", name: "", slug: "", short_description: "", description: "", tags: "",
  phone: "", whatsapp: "", address: "", email: "", show_email: false, show_phone: false, show_whatsapp: false, show_address: false,
  owner_name: "", owner_contact: "", collaborator: false, featured_until: null,
  urgent_24h: false, availability: [], status: "borrador", hours: [],
};

const normalizeUrl = (u: string) => {
  const t = u.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

const list = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean);

function EditPage() {
  const { tr, locale } = useI18n();
  const { id } = Route.useParams();
  const isNew = id === "nueva";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery(categoriesQuery);
  const { data: acts = [] } = useQuery(activitiesQuery);
  const { data: settings } = useQuery(siteSettingsQuery);
  const months = settings?.collaborator_months ?? 1;
  const { data, isLoading } = useQuery({ ...adminListingQuery(id), enabled: !isNew });
  const [f, setF] = useState<Form>(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewLink, setReviewLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  async function generarEnlace() {
    setLinkBusy(true);
    try {
      const res = await createReviewToken(id);
      setReviewLink({ url: `${window.location.origin}/revision/${res.token}`, expiresAt: res.expiresAt });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      toast.error(code === "42501"
        ? "Tu sesión no tiene permisos de administrador. Vuelve a iniciar sesión."
        : code === "23503"
          ? "La ficha ya no existe. Vuelve al listado y ábrela de nuevo."
          : "No se pudo guardar el enlace. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setLinkBusy(false);
    }
  }

  useEffect(() => {
    if (!data?.listing) return;
    const l = data.listing, c = data.contact;
    setF({
      type: l.type, category_id: l.category_id ?? "", activity: l.activity ?? "", website: l.public_website ?? "", home_service: l.home_service, service_area: l.service_area ?? "",
      extra_activities: data.activityIds.filter((aid) => acts.find((a) => a.id === aid)?.name !== l.activity), labels: l.labels.join(", "),
      name: l.name, slug: l.slug, short_description: l.short_description ?? "", description: l.description, tags: searchTags(l.tags).join(", "),
      phone: c?.phone ?? "", whatsapp: c?.whatsapp ?? "", address: c?.address ?? "", email: c?.email ?? "", show_email: c?.show_email ?? false,
      show_phone: c?.show_phone ?? false, show_whatsapp: c?.show_whatsapp ?? false, show_address: c?.show_address ?? false,
      owner_name: c?.owner_name ?? "", owner_contact: c?.owner_contact ?? "",
      collaborator: isFeatured(l), featured_until: l.featured_until, urgent_24h: l.urgent_24h,
      availability: reservedTags(l.tags),
      status: l.status, hours: data.hours.map((h) => ({ ...h, opens: h.opens.slice(0, 5), closes: h.closes.slice(0, 5) })),
    });
  }, [data, acts]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const labels = list(f.labels, /,/);
    if (labels.length > 3) { toast.error("Máximo 3 etiquetas destacadas."); return; }
    if (!f.category_id) { toast.error("Elige una categoría."); return; }
    setSaving(true);
    const featured_until = f.collaborator
      ? f.featured_until && new Date(f.featured_until) > new Date() ? f.featured_until : collaboratorUntil(new Date(), months)
      : null;
    const row = {
      type: f.type, category_id: f.category_id, activity: f.activity || null, labels, name: f.name.trim(),
      slug: f.slug || slugify(f.name), short_description: f.short_description.trim(), description: f.description, tags: withAvailability(list(f.tags, /,/), f.availability),
      featured: f.collaborator, featured_until,
      urgent_24h: f.urgent_24h, status: f.status,
      public_website: normalizeUrl(f.website), home_service: f.home_service, service_area: f.service_area.trim(),
    };
    try {
      let listingId = id;
      if (isNew) {
        const { data: ins, error } = await supabase.from("listings").insert(row).select("id").single();
        if (error) throw error;
        listingId = ins.id;
      } else {
        const { error } = await supabase.from("listings").update(row).eq("id", id);
        if (error) throw error;
      }
      const { error: cErr } = await supabase.from("listing_contacts").upsert({
        listing_id: listingId, phone: f.phone || null, whatsapp: f.whatsapp || null, address: f.address || null, email: f.email || null, show_email: f.show_email,
        show_phone: f.show_phone, show_whatsapp: f.show_whatsapp, show_address: f.show_address,
        owner_name: f.owner_name || null, owner_contact: f.owner_contact || null,
      });
      if (cErr) throw cErr;
      await supabase.from("listing_hours").delete().eq("listing_id", listingId);
      const hours = f.hours.filter((h) => h.opens && h.closes).map((h) => ({ ...h, listing_id: listingId }));
      if (hours.length) {
        const { error: hErr } = await supabase.from("listing_hours").insert(hours);
        if (hErr) throw hErr;
      }
      const mainId = acts.find((a) => a.category_id === f.category_id && a.name === f.activity)?.id;
      const actIds = [...new Set([mainId, ...f.extra_activities].filter((x): x is string => !!x))];
      const { error: dErr } = await supabase.from("listing_activities").delete().eq("listing_id", listingId);
      if (dErr) throw dErr;
      if (actIds.length) {
        const { error: aErr } = await supabase.from("listing_activities").insert(actIds.map((activity_id, i) => ({ listing_id: listingId, activity_id, sort_order: i })));
        if (aErr) throw aErr;
      }
      await qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      toast.success("Ficha guardada");
      if (isNew) navigate({ to: "/admin/fichas/$id", params: { id: listingId } });
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "";
      toast.error(msg.includes("duplicate") ? "Ya existe una ficha con esa dirección web (slug)." : `No se pudo guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar definitivamente «${f.name}»? Se borrarán también sus fotos, contactos, horarios, avisos y autorizaciones. Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const result = await deleteListing(id);
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await qc.invalidateQueries({ queryKey: ["directory"] });
      await qc.invalidateQueries({ queryKey: ["listing"] });
      if (result.cleanupFailed) toast.warning("Ficha eliminada, pero no se pudieron borrar algunos archivos de fotos.");
      else toast.success("Ficha eliminada");
      navigate({ to: "/admin" });
    } catch {
      toast.error("No se pudo eliminar la ficha. Comprueba tu conexión y tus permisos.");
    } finally {
      setDeleting(false);
    }
  }

  if (!isNew && isLoading) return <p className="text-sm text-muted-foreground"><Text text="Cargando…" /></p>;
  if (!isNew && !data?.listing) return <p><Text text="Ficha no encontrada." /></p>;

  return (
    <form onSubmit={save} className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold">{tr(isNew ? "Nueva ficha" : f.name || "Editar ficha")}</h1>
        {!isNew && f.status === "publicada" && (
          <a href={listingPath(f.type, f.slug)} target="_blank" rel="noreferrer" className="ml-auto text-sm text-terracotta underline">
             <Text text="Ver ficha pública" /> </a>
        )}
      </div>

      <Section title={tr("1. Tipo y categoría")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LISTING_TYPES.map(({ value: t, label }) => (
            <button
              type="button" key={t}
              onClick={() => setF((p) => p.type === t ? p : { ...p, type: t, category_id: "", activity: "" })}
              className={`min-h-10 flex-1 border px-2 py-1 text-sm font-medium ${f.type === t ? TYPE_BUTTON[t] : ""}`}
            >
              {tr(label)}
            </button>
          ))}
        </div>
        <Field label={tr("Categoría general")} hint={tr("Las categorías y actividades se crean en Configuración.")}>
          <select required value={f.category_id} onChange={(e) => setF((p) => ({ ...p, category_id: e.target.value, activity: "" }))} className="h-10 w-full border bg-background px-3 text-sm">
            <option value=""><Text text="Elige una categoría" /></option>
            {cats.filter((c) => c.type === f.type || c.id === f.category_id).map((c) => <option key={c.id} value={c.id}>{tr(c.name)}</option>)}
          </select>
        </Field>
        <Field label={tr("Actividad")}>
          <select value={f.activity} onChange={(e) => set("activity", e.target.value)} disabled={!f.category_id} className="h-10 w-full border bg-background px-3 text-sm disabled:opacity-60">
            <option value="">{tr(f.category_id ? "Elige una actividad" : "Elige antes una categoría")}</option>
            {f.activity && !acts.some((a) => a.category_id === f.category_id && a.name === f.activity) && (
              <option value={f.activity}>{f.activity}  <Text text="(no está en la lista)" /></option>
            )}
            {acts.filter((a) => a.category_id === f.category_id).map((a) => <option key={a.id} value={a.name}>{tr(a.name)}</option>)}
          </select>
        </Field>
        {f.category_id && (
          <Field label={tr("Otras actividades")} hint={tr("Opcional. Marca otros servicios que también ofrece; ayudan a encontrar la ficha.")}>
            <div className="flex flex-wrap gap-1.5">
              {acts
                .filter((a) => a.name !== f.activity && (a.category_id === f.category_id || f.extra_activities.includes(a.id)))
                .map((a) => {
                  const on = f.extra_activities.includes(a.id);
                  return (
                    <button
                      type="button" key={a.id} aria-pressed={on}
                      onClick={() => set("extra_activities", on ? f.extra_activities.filter((x) => x !== a.id) : [...f.extra_activities, a.id])}
                      className={`rounded-md border px-2.5 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {tr(a.name)}
                    </button>
                  );
                })}
            </div>
          </Field>
        )}
        <Field label={tr("Página web")} hint={tr("Opcional. Se mostrará en la ficha más adelante.")}>
          <Input type="url" inputMode="url" placeholder="https://…" value={f.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Toggle label={tr("Servicio a domicilio")} checked={f.home_service} onChange={(v) => set("home_service", v)} hint={tr("Se desplaza a casa del cliente.")} />
        <Field label={tr("Zona de servicio")} hint={tr("Opcional. Ej.: Casarabonela y alrededores")}>
          <Input value={f.service_area} onChange={(e) => set("service_area", e.target.value)} />
        </Field>
        <Field label={tr("Etiquetas destacadas")} hint={tr("Hasta 3, separadas por comas. Ej.: Pan de leña, Encargos")}>
          <Input value={f.labels} onChange={(e) => set("labels", e.target.value)} />
          {!!settings?.common_labels.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {settings.common_labels.map((t) => {
                const cur = f.labels.split(",").map((x) => x.trim()).filter(Boolean);
                const on = cur.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("labels", (on ? cur.filter((x) => x !== t) : [...cur, t]).join(", "))}
                    className={`rounded-soft border px-2.5 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      </Section>

      <Section title={tr("2. Datos básicos")}>
        <Field label={tr("Nombre")}>
          <Input required value={f.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
        </Field>
        <Field label={tr("Dirección web")} hint={`aquibonela…${listingPath(f.type, f.slug || "…")}`}>
          <Input value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
        </Field>
        <Field label={tr("Descripción corta")} hint={`Se ve en la tarjeta del directorio. ${f.short_description.length}/140`}>
          <Input maxLength={140} value={f.short_description} onChange={(e) => set("short_description", e.target.value)} />
        </Field>
        <Field label={tr("Descripción extensa")} hint={tr("Se ve en la página de la ficha.")}>
          <Textarea rows={7} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label={tr("Palabras de búsqueda (no visibles)")} hint={tr("Separadas por comas. Ej.: bollería, tartas, pan integral")}>
          <Input value={f.tags} onChange={(e) => set("tags", e.target.value)} />
        </Field>
      </Section>

      <Section title={tr("3. Contacto")} hint={tr("Solo se publica lo que marques como visible.")}>
        <ContactRow label={tr("Teléfono")} value={f.phone} onValue={(v) => set("phone", v)} show={f.show_phone} onShow={(v) => set("show_phone", v)} />
        <ContactRow label="WhatsApp" value={f.whatsapp} onValue={(v) => set("whatsapp", v)} show={f.show_whatsapp} onShow={(v) => set("show_whatsapp", v)} />
        <ContactRow label={tr("Dirección")} value={f.address} onValue={(v) => set("address", v)} show={f.show_address} onShow={(v) => set("show_address", v)} />
        <ContactRow label="Email" value={f.email} onValue={(v) => set("email", v)} show={f.show_email} onShow={(v) => set("show_email", v)} />
        <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
          <Field label={tr("Titular (privado)")}><Input value={f.owner_name} onChange={(e) => set("owner_name", e.target.value)} /></Field>
          <Field label={tr("Contacto del titular (privado)")} hint={tr("Para enviarle el enlace de revisión")}><Input value={f.owner_contact} onChange={(e) => set("owner_contact", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title={tr("4. Horario")}>
        {f.hours.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={h.weekday} onChange={(e) => set("hours", f.hours.map((x, j) => j === i ? { ...x, weekday: +e.target.value } : x))} className="h-10 border bg-background px-2 text-sm">
              {WEEKDAYS.map((d, k) => <option key={d} value={k + 1}>{tr(d)}</option>)}
            </select>
            <Input type="time" value={h.opens} onChange={(e) => set("hours", f.hours.map((x, j) => j === i ? { ...x, opens: e.target.value } : x))} className="h-10 w-28" />
            <span>–</span>
            <Input type="time" value={h.closes} onChange={(e) => set("hours", f.hours.map((x, j) => j === i ? { ...x, closes: e.target.value } : x))} className="h-10 w-28" />
            <button type="button" aria-label={tr("Quitar tramo")} onClick={() => set("hours", f.hours.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set("hours", [...f.hours, { weekday: 1, opens: "09:00", closes: "14:00" }])} className="inline-flex items-center gap-1 text-sm text-terracotta">
          <Plus className="h-4 w-4" />  <Text text="Añadir tramo" /> </button>
      </Section>

      <Section title={tr("5. Imágenes y distinciones")}>
        {isNew ? <p className="text-sm text-muted-foreground"><Text text="Guarda la ficha para poder subir imágenes." /></p> : <CoverPicker listingId={id} />}
        <Toggle label={tr("Colaborador (1 mes)")} checked={f.collaborator} onChange={(v) => set("collaborator", v)}
          hint={f.collaborator && f.featured_until && new Date(f.featured_until) > new Date() ? `Hasta el ${new Date(f.featured_until).toLocaleDateString(locale)}` : "Aparece en portada y con galería de fotos"} />
        {f.collaborator && !isNew && <GalleryPicker listingId={id} />}
        <Toggle label={tr("Urgencias 24h")} checked={f.urgent_24h} onChange={(v) => set("urgent_24h", v)} hint={tr("Fontaneros, cerrajeros, electricistas…")} />
        {AVAILABILITY_OPTIONS.map((option) => <Toggle key={option} label={option}
          checked={f.availability.includes(option)}
          onChange={(on) => set("availability", on ? [...f.availability, option] : f.availability.filter((value) => value !== option))} />)}
      </Section>

      <Section title={tr("6. Estado")}>
        <select value={f.status} onChange={(e) => set("status", e.target.value as Status)} className="h-10 w-full border bg-background px-3 text-sm sm:w-72">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{tr(s.label)}</option>)}
        </select>
        <div className="space-y-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
             <Text text="Genera un enlace privado y envíaselo al titular por WhatsApp: podrá revisar su ficha, marcar qué datos se publican y autorizarla. Válido 30 días." /> </p>
          {isNew ? (
            <p className="text-xs text-muted-foreground"><Text text="Guarda la ficha para poder generar el enlace." /></p>
          ) : !reviewLink ? (
            <button
              type="button"
              onClick={generarEnlace}
              disabled={linkBusy}
              className="h-10 bg-terracotta px-4 text-sm text-terracotta-foreground disabled:opacity-60"
            >
              {tr(linkBusy ? "Generando…" : "Generar enlace de revisión")}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="border bg-muted/40 break-all p-2 text-xs">{reviewLink.url}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(reviewLink.url);
                    toast.success("Enlace copiado");
                  }}
                  className="h-10 border px-4 text-sm"
                >
                   <Text text="Copiar enlace" /> </button>
                <a
                  href={whatsappShareUrl(reviewMessage(f.owner_name || null, reviewLink.url, settings?.whatsapp_template), f.owner_contact)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center bg-primary px-4 text-sm text-primary-foreground"
                >
                   <Text text="Abrir WhatsApp" /> </a>
              </div>
              <p className="text-xs text-muted-foreground">
                 <Text text="Caduca el" /> {new Date(reviewLink.expiresAt).toLocaleDateString(locale)}<Text text=". Puedes generar un enlace nuevo cuando quieras." /> </p>
            </div>
          )}
        </div>
      </Section>

      {!isNew && <div className="border-t pt-4">
        <Button type="button" variant="outline" disabled={deleting || saving} onClick={eliminar} className="border-destructive text-destructive shadow-none">
          <Trash2 aria-hidden /> {tr(deleting ? "Eliminando…" : "Eliminar ficha")}
        </Button>
      </div>}

      <div className="fixed inset-x-0 bottom-0 border-t bg-background">
        <div className="mx-auto flex max-w-5xl justify-end gap-2 px-4 py-3">
          <Link to="/admin" className="inline-flex h-11 items-center border px-4 text-sm"><Text text="Cancelar" /></Link>
          <Button type="submit" disabled={saving || deleting} className="h-11 bg-primary px-6 text-sm font-medium text-primary-foreground shadow-none disabled:opacity-60">
            {tr(saving ? "Guardando…" : "Guardar ficha")}
          </Button>
        </div>
      </div>
    </form>
  );
}

const TYPE_BUTTON: Record<ListingType, string> = {
  comercio: "border-primary bg-primary text-primary-foreground",
  profesional: "border-terracotta bg-terracotta text-terracotta-foreground",
  publico: "border-civic bg-civic text-primary-foreground",
  asociacion: "border-community bg-community text-primary-foreground",
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const { tr, locale } = useI18n();
  return (
    <section className="space-y-3 border p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{tr(title)}</h2>
        {hint && <p className="text-xs text-muted-foreground">{tr(hint)}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { tr, locale } = useI18n();
  return (
    <div className="space-y-1.5">
      <Label>{tr(label)}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{tr(hint)}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { tr, locale } = useI18n();
  return (
    <label className="flex items-center justify-between gap-3 border p-3">
      <span>
        <span className="block text-sm font-medium">{tr(label)}</span>
        {hint && <span className="block text-xs text-muted-foreground">{tr(hint)}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ContactRow({ label, value, onValue, show, onShow }: { label: string; value: string; onValue: (v: string) => void; show: boolean; onShow: (v: boolean) => void }) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1"><Field label={label}><Input value={value} onChange={(e) => onValue(e.target.value)} /></Field></div>
      <label className="flex h-10 items-center gap-2 text-xs">
        <Switch checked={show} onCheckedChange={onShow} />  <Text text="Visible" /> </label>
    </div>
  );
}
