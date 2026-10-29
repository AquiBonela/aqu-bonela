import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminListingQuery, categoriesQuery, collaboratorUntil, siteSettingsQuery, slugify, STATUSES, type Status } from "@/lib/admin";
import { isFeatured } from "@/lib/directory";
import { listingPath, WEEKDAYS } from "@/lib/listing-detail";
import { createReviewToken } from "@/lib/review-token";
import { reviewMessage, whatsappShareUrl } from "@/lib/review";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  type: "comercio" | "profesional";
  category_id: string;
  activity: string;
  labels: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  tags: string;
  phone: string;
  whatsapp: string;
  address: string;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_address: boolean;
  owner_name: string;
  owner_contact: string;
  cover_url: string;
  gallery_urls: string;
  collaborator: boolean;
  featured_until: string | null;
  urgent_24h: boolean;
  status: Status;
  hours: Hour[];
};

const empty: Form = {
  type: "comercio", category_id: "", activity: "", labels: "", name: "", slug: "", short_description: "", description: "", tags: "",
  phone: "", whatsapp: "", address: "", show_phone: false, show_whatsapp: false, show_address: false,
  owner_name: "", owner_contact: "", cover_url: "", gallery_urls: "", collaborator: false, featured_until: null,
  urgent_24h: false, status: "borrador", hours: [],
};

const list = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean);

function EditPage() {
  const { id } = Route.useParams();
  const isNew = id === "nueva";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(siteSettingsQuery);
  const months = settings?.collaborator_months ?? 1;
  const { data, isLoading } = useQuery({ ...adminListingQuery(id), enabled: !isNew });
  const [f, setF] = useState<Form>(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
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
      type: l.type, category_id: l.category_id ?? "", activity: l.activity ?? "", labels: l.labels.join(", "),
      name: l.name, slug: l.slug, short_description: l.short_description ?? "", description: l.description, tags: l.tags.join(", "),
      phone: c?.phone ?? "", whatsapp: c?.whatsapp ?? "", address: c?.address ?? "",
      show_phone: c?.show_phone ?? false, show_whatsapp: c?.show_whatsapp ?? false, show_address: c?.show_address ?? false,
      owner_name: c?.owner_name ?? "", owner_contact: c?.owner_contact ?? "",
      cover_url: l.cover_url ?? "", gallery_urls: l.gallery_urls.join("\n"),
      collaborator: isFeatured(l), featured_until: l.featured_until, urgent_24h: l.urgent_24h,
      status: l.status, hours: data.hours.map((h) => ({ ...h, opens: h.opens.slice(0, 5), closes: h.closes.slice(0, 5) })),
    });
  }, [data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const labels = list(f.labels, /,/);
    const gallery = list(f.gallery_urls, /\n/);
    if (labels.length > 3) { toast.error("Máximo 3 etiquetas destacadas."); return; }
    if (gallery.length > 5) { toast.error("Máximo 5 fotos en la galería."); return; }
    if (!f.category_id) { toast.error("Elige una categoría."); return; }
    setSaving(true);
    const featured_until = f.collaborator
      ? f.featured_until && new Date(f.featured_until) > new Date() ? f.featured_until : collaboratorUntil(new Date(), months)
      : null;
    const row = {
      type: f.type, category_id: f.category_id, activity: f.activity || null, labels, name: f.name.trim(),
      slug: f.slug || slugify(f.name), short_description: f.short_description.trim(), description: f.description, tags: list(f.tags, /,/),
      cover_url: f.cover_url || null, gallery_urls: gallery, featured: f.collaborator, featured_until,
      urgent_24h: f.urgent_24h, status: f.status,
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
        listing_id: listingId, phone: f.phone || null, whatsapp: f.whatsapp || null, address: f.address || null,
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

  if (!isNew && isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!isNew && !data?.listing) return <p>Ficha no encontrada.</p>;

  return (
    <form onSubmit={save} className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold">{isNew ? "Nueva ficha" : f.name || "Editar ficha"}</h1>
        {!isNew && f.status === "publicada" && (
          <a href={listingPath(f.type, f.slug)} target="_blank" rel="noreferrer" className="ml-auto text-sm text-terracotta underline">
            Ver ficha pública
          </a>
        )}
      </div>

      <Section title="1. Tipo y categoría">
        <div className="flex gap-2">
          {(["comercio", "profesional"] as const).map((t) => (
            <button
              type="button" key={t} onClick={() => set("type", t)}
              className={`h-10 flex-1 border text-sm font-medium ${f.type === t ? (t === "comercio" ? "border-primary bg-primary text-primary-foreground" : "border-terracotta bg-terracotta text-terracotta-foreground") : ""}`}
            >
              {t === "comercio" ? "Comercio" : "Profesional"}
            </button>
          ))}
        </div>
        <Field label="Categoría general">
          <select required value={f.category_id} onChange={(e) => set("category_id", e.target.value)} className="h-10 w-full border bg-background px-3 text-sm">
            <option value="">Elige una categoría</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Actividad / oficio principal" hint="Ej.: Panadería, Fontanero, Pintor">
          <Input value={f.activity} onChange={(e) => set("activity", e.target.value)} />
        </Field>
        <Field label="Etiquetas destacadas" hint="Hasta 3, separadas por comas. Ej.: Pan de leña, Encargos">
          <Input value={f.labels} onChange={(e) => set("labels", e.target.value)} />
        </Field>
      </Section>

      <Section title="2. Datos básicos">
        <Field label="Nombre">
          <Input required value={f.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
        </Field>
        <Field label="Dirección web" hint={`aquibonela…${listingPath(f.type, f.slug || "…")}`}>
          <Input value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
        </Field>
        <Field label="Descripción corta" hint={`Se ve en la tarjeta del directorio. ${f.short_description.length}/140`}>
          <Input maxLength={140} value={f.short_description} onChange={(e) => set("short_description", e.target.value)} />
        </Field>
        <Field label="Descripción extensa" hint="Se ve en la página de la ficha.">
          <Textarea rows={7} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Palabras de búsqueda (no visibles)" hint="Separadas por comas. Ej.: bollería, tartas, pan integral">
          <Input value={f.tags} onChange={(e) => set("tags", e.target.value)} />
        </Field>
      </Section>

      <Section title="3. Contacto" hint="Solo se publica lo que marques como visible.">
        <ContactRow label="Teléfono" value={f.phone} onValue={(v) => set("phone", v)} show={f.show_phone} onShow={(v) => set("show_phone", v)} />
        <ContactRow label="WhatsApp" value={f.whatsapp} onValue={(v) => set("whatsapp", v)} show={f.show_whatsapp} onShow={(v) => set("show_whatsapp", v)} />
        <ContactRow label="Dirección" value={f.address} onValue={(v) => set("address", v)} show={f.show_address} onShow={(v) => set("show_address", v)} />
        <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
          <Field label="Titular (privado)"><Input value={f.owner_name} onChange={(e) => set("owner_name", e.target.value)} /></Field>
          <Field label="Contacto del titular (privado)" hint="Para enviarle el enlace de revisión"><Input value={f.owner_contact} onChange={(e) => set("owner_contact", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="4. Horario">
        {f.hours.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={h.weekday} onChange={(e) => set("hours", f.hours.map((x, j) => j === i ? { ...x, weekday: +e.target.value } : x))} className="h-10 border bg-background px-2 text-sm">
              {WEEKDAYS.map((d, k) => <option key={d} value={k + 1}>{d}</option>)}
            </select>
            <Input type="time" value={h.opens} onChange={(e) => set("hours", f.hours.map((x, j) => j === i ? { ...x, opens: e.target.value } : x))} className="h-10 w-28" />
            <span>–</span>
            <Input type="time" value={h.closes} onChange={(e) => set("hours", f.hours.map((x, j) => j === i ? { ...x, closes: e.target.value } : x))} className="h-10 w-28" />
            <button type="button" aria-label="Quitar tramo" onClick={() => set("hours", f.hours.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set("hours", [...f.hours, { weekday: 1, opens: "09:00", closes: "14:00" }])} className="inline-flex items-center gap-1 text-sm text-terracotta">
          <Plus className="h-4 w-4" /> Añadir tramo
        </button>
      </Section>

      <Section title="5. Imágenes y distinciones">
        <Field label="Imagen de cabecera (URL)">
          <Input value={f.cover_url} onChange={(e) => set("cover_url", e.target.value)} placeholder="https://…" />
        </Field>
        {f.cover_url && <img src={f.cover_url} alt="" className="h-32 w-full object-cover sm:w-64" />}
        <Toggle label="Colaborador (1 mes)" checked={f.collaborator} onChange={(v) => set("collaborator", v)}
          hint={f.collaborator && f.featured_until && new Date(f.featured_until) > new Date() ? `Hasta el ${new Date(f.featured_until).toLocaleDateString("es-ES")}` : "Aparece en portada y con galería de fotos"} />
        {f.collaborator && (
          <Field label="Galería (URLs, una por línea)" hint="Máximo 5">
            <Textarea rows={4} value={f.gallery_urls} onChange={(e) => set("gallery_urls", e.target.value)} />
          </Field>
        )}
        <Toggle label="Urgencias 24h" checked={f.urgent_24h} onChange={(v) => set("urgent_24h", v)} hint="Fontaneros, cerrajeros, electricistas…" />
      </Section>

      <Section title="6. Estado">
        <select value={f.status} onChange={(e) => set("status", e.target.value as Status)} className="h-10 w-full border bg-background px-3 text-sm sm:w-72">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="space-y-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Genera un enlace privado y envíaselo al titular por WhatsApp: podrá revisar su ficha, marcar qué datos se
            publican y autorizarla. Válido 30 días.
          </p>
          {isNew ? (
            <p className="text-xs text-muted-foreground">Guarda la ficha para poder generar el enlace.</p>
          ) : !reviewLink ? (
            <button
              type="button"
              onClick={generarEnlace}
              disabled={linkBusy}
              className="h-10 bg-terracotta px-4 text-sm text-terracotta-foreground disabled:opacity-60"
            >
              {linkBusy ? "Generando…" : "Generar enlace de revisión"}
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
                  Copiar enlace
                </button>
                <a
                  href={whatsappShareUrl(reviewMessage(f.owner_name || null, reviewLink.url), f.owner_contact)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center bg-primary px-4 text-sm text-primary-foreground"
                >
                  Abrir WhatsApp
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Caduca el {new Date(reviewLink.expiresAt).toLocaleDateString("es-ES")}. Puedes generar un enlace nuevo
                cuando quieras.
              </p>
            </div>
          )}
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background">
        <div className="mx-auto flex max-w-5xl justify-end gap-2 px-4 py-3">
          <Link to="/admin" className="inline-flex h-11 items-center border px-4 text-sm">Cancelar</Link>
          <button disabled={saving} className="h-11 bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {saving ? "Guardando…" : "Guardar ficha"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border p-4">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 border p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
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
        <Switch checked={show} onCheckedChange={onShow} /> Visible
      </label>
    </div>
  );
}
