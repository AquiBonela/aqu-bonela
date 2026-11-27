import { Text, type Lang, LANGS, useI18n } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { CoverPicker, GalleryPicker } from "@/components/admin/ListingImages";
import {
  activitiesQuery,
  adminListingQuery,
  categoriesQuery,
  collaboratorUntil,
  siteSettingsQuery,
  slugify,
  STATUSES,
  type Status,
} from "@/lib/admin";
import { isFeatured, LISTING_TYPES, type ListingType } from "@/lib/directory";
import { listingPath, WEEKDAYS } from "@/lib/listing-detail";
import { createReviewToken } from "@/lib/review-token";
import { reviewMessage, whatsappShareUrl } from "@/lib/review";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AVAILABILITY_OPTIONS,
  availabilityTags,
  hoursHidden,
  listingTags,
  searchTags,
} from "@/lib/listing-availability";
import { deleteListing } from "@/lib/delete-listing";
import type { Json } from "@/integrations/supabase/types";
import { ContentLanguages } from "@/components/admin/ContentLanguages";
import { useContentTranslations } from "@/components/admin/useContentTranslations";
import { TranslationSaveDialog } from "@/components/admin/TranslationSaveDialog";
import {
  catalogContent,
  editTranslation,
  languagesToGenerate,
  readTranslations,
  sourceChanged,
  type Translations,
} from "@/lib/content-translations";
import { brand } from "@/config/municipality";

export const Route = createFileRoute("/_authenticated/admin/fichas/$id")({
  head: () => ({
    meta: [
      { title: brand("Editar ficha · Administración {app}") },
      { name: "description", content: "Alta y edición de fichas del directorio." },
      { property: "og:title", content: brand("Editar ficha · Administración {app}") },
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
  phone_2: string;
  whatsapp: string;
  address: string;
  email: string;
  linkedin: string;
  facebook: string;
  youtube: string;
  x_twitter: string;
  instagram: string;
  tiktok: string;
  show_email: boolean;
  show_phone: boolean;
  show_phone_2: boolean;
  show_whatsapp: boolean;
  show_address: boolean;
  show_linkedin: boolean;
  show_facebook: boolean;
  show_youtube: boolean;
  show_x_twitter: boolean;
  show_instagram: boolean;
  show_tiktok: boolean;
  owner_name: string;
  owner_contact: string;
  highlighted: boolean;
  featured_until: string | null;
  urgent_24h: boolean;
  availability: string[];
  status: Status;
  hours: Hour[];
  /** El horario se ve en la ficha pública (si no, se guarda pero los visitantes no lo reciben). */
  show_hours: boolean;
};

const empty: Form = {
  type: "comercio",
  category_id: "",
  activity: "",
  extra_activities: [],
  website: "",
  home_service: false,
  service_area: "",
  labels: "",
  name: "",
  slug: "",
  short_description: "",
  description: "",
  tags: "",
  phone: "",
  phone_2: "",
  whatsapp: "",
  address: "",
  email: "",
  linkedin: "",
  facebook: "",
  youtube: "",
  x_twitter: "",
  instagram: "",
  tiktok: "",
  show_email: false,
  show_phone: false,
  show_phone_2: false,
  show_whatsapp: false,
  show_address: false,
  show_linkedin: false,
  show_facebook: false,
  show_youtube: false,
  show_x_twitter: false,
  show_instagram: false,
  show_tiktok: false,
  owner_name: "",
  owner_contact: "",
  highlighted: false,
  featured_until: null,
  urgent_24h: false,
  availability: [],
  status: "borrador",
  hours: [],
  show_hours: true,
};

const normalizeUrl = (u: string) => {
  const t = u.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

const LISTING_CHANGED_CODE = "PT409";
const LISTING_CHANGED =
  "La ficha ha cambiado desde que la abriste y no se ha guardado nada. Recárgala para ver la versión actual.";
/** updated_at llega como texto ISO; se comparan instantes, no el formato. */
const sameVersion = (a: string, b: string) => a === b || Date.parse(a) === Date.parse(b);

const list = (s: string, sep: RegExp) =>
  s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

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
  const { data, isLoading, refetch } = useQuery({ ...adminListingQuery(id), enabled: !isNew });
  const [f, setF] = useState<Form>(empty);
  const [language, setLanguage] = useState<Lang>("es");
  const [translations, setTranslations] = useState<Translations>({});
  const { generate, translating, translationError } = useContentTranslations();
  const source = { short_description: f.short_description, description: f.description };
  const selected =
    language === "es"
      ? source
      : (translations[language]?.content ?? { short_description: "", description: "" });
  const shortText =
    typeof selected["short_description"] === "string" ? selected["short_description"] : "";
  const longText = typeof selected["description"] === "string" ? selected["description"] : "";
  const setTranslatedField = (field: "short_description" | "description", value: string) => {
    if (language === "es") setF((p) => ({ ...p, [field]: value }));
    else
      setTranslations((p) => editTranslation(p, language, { ...selected, [field]: value }, source));
  };
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [confirmTranslations, setConfirmTranslations] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewLink, setReviewLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  async function generarEnlace() {
    setLinkBusy(true);
    try {
      const res = await createReviewToken(id);
      setReviewLink({
        url: `${window.location.origin}/revision/${res.token}`,
        expiresAt: res.expiresAt,
      });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      toast.error(
        tr(
          code === "42501"
            ? "Tu sesión no tiene permisos de administrador. Vuelve a iniciar sesión."
            : code === "23503"
              ? "La ficha ya no existe. Vuelve al listado y ábrela de nuevo."
              : "No se pudo guardar el enlace. Comprueba tu conexión e inténtalo de nuevo.",
        ),
      );
    } finally {
      setLinkBusy(false);
    }
  }

  // Versión de la ficha en la base, tal como la muestra el formulario.
  const server = useMemo(() => {
    if (!data?.listing) return null;
    const l = data.listing,
      c = data.contact;
    const saved = readTranslations(l.translations);
    const source = { short_description: l.short_description ?? "", description: l.description };
    for (const lang of LANGS)
      if (lang !== "es" && !saved[lang]) {
        const translated = catalogContent(source, lang);
        if (
          translated["description"] !== source.description &&
          translated["short_description"] !== source.short_description
        )
          saved[lang] = { content: translated, source, manual: false };
      }
    const form: Form = {
      type: l.type,
      category_id: l.category_id ?? "",
      activity: l.activity ?? "",
      website: l.public_website ?? "",
      home_service: l.home_service,
      service_area: l.service_area ?? "",
      extra_activities: data.activityIds.filter(
        (aid) => acts.find((a) => a.id === aid)?.name !== l.activity,
      ),
      labels: l.labels.join(", "),
      name: l.name,
      slug: l.slug,
      short_description: l.short_description ?? "",
      description: l.description,
      tags: searchTags(l.tags).join(", "),
      phone: c?.phone ?? "",
      phone_2: c?.phone_2 ?? "",
      whatsapp: c?.whatsapp ?? "",
      address: c?.address ?? "",
      email: c?.email ?? "",
      linkedin: c?.linkedin ?? "",
      facebook: c?.facebook ?? "",
      youtube: c?.youtube ?? "",
      x_twitter: c?.x_twitter ?? "",
      instagram: c?.instagram ?? "",
      tiktok: c?.tiktok ?? "",
      show_email: c?.show_email ?? false,
      show_phone: c?.show_phone ?? false,
      show_phone_2: c?.show_phone_2 ?? false,
      show_whatsapp: c?.show_whatsapp ?? false,
      show_address: c?.show_address ?? false,
      show_linkedin: c?.show_linkedin ?? false,
      show_facebook: c?.show_facebook ?? false,
      show_youtube: c?.show_youtube ?? false,
      show_x_twitter: c?.show_x_twitter ?? false,
      show_instagram: c?.show_instagram ?? false,
      show_tiktok: c?.show_tiktok ?? false,
      owner_name: c?.owner_name ?? "",
      owner_contact: c?.owner_contact ?? "",
      highlighted: isFeatured(l),
      featured_until: l.featured_until,
      urgent_24h: l.urgent_24h,
      availability: availabilityTags(l.tags),
      show_hours: !hoursHidden(l.tags),
      status: l.status,
      hours: data.hours.map((h) => ({
        ...h,
        opens: h.opens.slice(0, 5),
        closes: h.closes.slice(0, 5),
      })),
    };
    return { version: l.updated_at, form, translations: saved };
  }, [data, acts]);
  // Versión sobre la que se está editando. El guardado solo se aplica si la ficha sigue en ella.
  const [base, setBase] = useState<typeof server>(null);
  // La base rechazó el guardado porque la ficha había cambiado.
  const [conflict, setConflict] = useState(false);
  const dirty =
    base !== null &&
    (JSON.stringify(f) !== JSON.stringify(base.form) ||
      JSON.stringify(translations) !== JSON.stringify(base.translations));
  // La ficha cambió (por ejemplo, el titular la aprobó) mientras había cambios sin guardar.
  const stale = !!server && !!base && dirty && !sameVersion(server.version, base.version);

  // Carga la versión de la base salvo que haya cambios locales: esos no se pisan nunca.
  useEffect(() => {
    if (!server || server === base || (base && dirty)) return;
    setF(server.form);
    setTranslations(server.translations);
    setBase(server);
    setConflict(false);
  }, [server, base, dirty]);

  // React Query solo recarga al volver a una pestaña oculta; esto cubre también volver desde
  // otra ventana (por ejemplo, la del enlace de revisión).
  useEffect(() => {
    if (isNew) return;
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isNew, refetch]);

  async function reload() {
    const fresh = await refetch();
    if (fresh.error) {
      toast.error(tr("No se pudo recargar la ficha. Comprueba tu conexión."));
      return;
    }
    // La versión nueva llega por «server»; se carga aunque haya cambios locales.
    setBase(null);
    setConflict(false);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save(choice?: boolean): Promise<void> {
    const labels = list(f.labels, /,/);
    if (labels.length > 3) {
      toast.error(tr("Máximo 3 etiquetas destacadas."));
      return;
    }
    if (!f.category_id) {
      toast.error(tr("Elige una categoría."));
      return;
    }
    if (saving || translating) return;
    if (!isNew && (stale || conflict)) {
      toast.error(tr(LISTING_CHANGED));
      return;
    }
    if (choice === undefined && languagesToGenerate(translations, source).length) {
      setConfirmTranslations(true);
      return;
    }
    const prepared = choice
      ? await generate(source, translations, setTranslations, true)
      : translations;
    if (!prepared) {
      setConfirmTranslations(false);
      return;
    }
    setConfirmTranslations(false);
    setSaving(true);
    const featured_until = f.highlighted
      ? f.featured_until && new Date(f.featured_until) > new Date()
        ? f.featured_until
        : collaboratorUntil(new Date(), months)
      : null;
    const row = {
      type: f.type,
      category_id: f.category_id,
      activity: f.activity || null,
      labels,
      name: f.name.trim(),
      slug: f.slug || slugify(f.name),
      short_description: f.short_description.trim(),
      description: f.description,
      tags: listingTags(list(f.tags, /,/), f.availability, f.show_hours),
      translations: prepared as unknown as Json,
      featured: f.highlighted,
      featured_until,
      urgent_24h: f.urgent_24h,
      status: f.status,
      public_website: normalizeUrl(f.website),
      home_service: f.home_service,
      service_area: f.service_area.trim(),
    };
    const contact = {
      phone: f.phone || null,
      phone_2: f.phone_2 || null,
      whatsapp: f.whatsapp || null,
      address: f.address || null,
      email: f.email || null,
      linkedin: normalizeUrl(f.linkedin),
      facebook: normalizeUrl(f.facebook),
      youtube: normalizeUrl(f.youtube),
      x_twitter: normalizeUrl(f.x_twitter),
      instagram: normalizeUrl(f.instagram),
      tiktok: normalizeUrl(f.tiktok),
      show_email: f.show_email,
      show_phone: f.show_phone,
      show_phone_2: f.show_phone_2,
      show_whatsapp: f.show_whatsapp,
      show_address: f.show_address,
      show_linkedin: f.show_linkedin,
      show_facebook: f.show_facebook,
      show_youtube: f.show_youtube,
      show_x_twitter: f.show_x_twitter,
      show_instagram: f.show_instagram,
      show_tiktok: f.show_tiktok,
      owner_name: f.owner_name || null,
      owner_contact: f.owner_contact || null,
    };
    const hours = f.hours
      .filter((h) => h.opens && h.closes)
      .map(({ weekday, opens, closes }) => ({ weekday, opens, closes }));
    const mainId = acts.find((a) => a.category_id === f.category_id && a.name === f.activity)?.id;
    const actIds = [...new Set([mainId, ...f.extra_activities].filter((x): x is string => !!x))];
    try {
      // Ficha, contactos, horario y actividades en una sola transacción (save_listing). Al
      // editar, solo se aplica si la ficha sigue en la versión que se abrió; si no, nada cambia.
      const { data: result, error } = await supabase.rpc("save_listing", {
        p_listing: row as unknown as Json,
        p_contact: contact,
        p_hours: hours,
        p_activity_ids: actIds,
        // Sin versión cargada la base lo trata como conflicto: nunca guarda a ciegas.
        ...(isNew ? {} : { p_id: id, ...(base ? { p_expected_updated_at: base.version } : {}) }),
      });
      if (error) throw error;
      const saved = result as { id: string; updated_at: string };
      const listingId = saved.id;
      setBase({ version: saved.updated_at, form: f, translations: prepared });
      setTranslations(prepared);
      await qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      qc.invalidateQueries({ queryKey: ["listing"] });
      toast.success(tr("Ficha guardada"));
      if (isNew) navigate({ to: "/admin/fichas/$id", params: { id: listingId } });
    } catch (err) {
      if ((err as { code?: string }).code === LISTING_CHANGED_CODE) {
        setConflict(true);
        toast.error(tr(LISTING_CHANGED));
        void refetch();
        return;
      }
      const msg = (err as { message?: string }).message ?? "";
      toast.error(
        tr(
          msg.includes("duplicate")
            ? "Ya existe una ficha con esa dirección web (slug)."
            : `No se pudo guardar: ${msg}`,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (
      !window.confirm(
        tr(
          `¿Eliminar definitivamente «${f.name}»? Se borrarán también sus fotos, contactos, horarios, avisos y autorizaciones. Esta acción no se puede deshacer.`,
        ),
      )
    )
      return;
    setDeleting(true);
    try {
      const result = await deleteListing(id);
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await qc.invalidateQueries({ queryKey: ["directory"] });
      await qc.invalidateQueries({ queryKey: ["listing"] });
      if (result.cleanupFailed)
        toast.warning(tr("Ficha eliminada, pero no se pudieron borrar algunos archivos de fotos."));
      else toast.success(tr("Ficha eliminada"));
      navigate({ to: "/admin/directorio" });
    } catch {
      toast.error(tr("No se pudo eliminar la ficha. Comprueba tu conexión y tus permisos."));
    } finally {
      setDeleting(false);
    }
  }

  if (!isNew && isLoading)
    return (
      <p className="text-sm text-muted-foreground">
        <Text text="Cargando…" />
      </p>
    );
  if (!isNew && !data?.listing)
    return (
      <p>
        <Text text="Ficha no encontrada." />
      </p>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-6 pb-24"
    >
      <div className="flex items-center gap-3">
        <Link
          to="/admin/directorio"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold">
          {tr(isNew ? "Nueva ficha" : f.name || "Editar ficha")}
        </h1>
        {!isNew && f.status === "publicada" && (
          <a
            href={listingPath(f.type, f.slug)}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-sm text-terracotta underline"
          >
            <Text text="Ver ficha pública" />{" "}
          </a>
        )}
      </div>

      {!isNew && (stale || conflict) && (
        <div role="alert" className="space-y-2 border border-destructive/50 p-4 text-sm">
          <p className="font-semibold text-destructive">
            <Text text="Esta ficha ha cambiado desde que la abriste" />
          </p>
          <p>
            <Text text="Se ha modificado mientras la editabas (por ejemplo, el titular la ha autorizado desde su enlace). Para no sobrescribir esos cambios, no se puede guardar. Tus cambios siguen en el formulario: anota lo que necesites y recarga la ficha para ver la versión actual." />
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            <Text text="Recargar la ficha" />
          </Button>
        </div>
      )}

      <Section title={tr("1. Tipo y categoría")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LISTING_TYPES.map(({ value: t, label }) => (
            <button
              type="button"
              key={t}
              onClick={() =>
                setF((p) => (p.type === t ? p : { ...p, type: t, category_id: "", activity: "" }))
              }
              className={`min-h-10 flex-1 border px-2 py-1 text-sm font-medium ${f.type === t ? TYPE_BUTTON[t] : ""}`}
            >
              {tr(label)}
            </button>
          ))}
        </div>
        <Field
          label={tr("Categoría general")}
          hint={tr("Las categorías y actividades se crean en Configuración.")}
        >
          <select
            required
            value={f.category_id}
            onChange={(e) => setF((p) => ({ ...p, category_id: e.target.value, activity: "" }))}
            className="h-10 w-full border bg-background px-3 text-sm"
          >
            <option value="">
              <Text text="Elige una categoría" />
            </option>
            {cats
              .filter((c) => c.type === f.type || c.id === f.category_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {tr(c.name)}
                </option>
              ))}
          </select>
        </Field>
        <Field label={tr("Actividad")}>
          <select
            value={f.activity}
            onChange={(e) => set("activity", e.target.value)}
            disabled={!f.category_id}
            className="h-10 w-full border bg-background px-3 text-sm disabled:opacity-60"
          >
            <option value="">
              {tr(f.category_id ? "Elige una actividad" : "Elige antes una categoría")}
            </option>
            {f.activity &&
              !acts.some((a) => a.category_id === f.category_id && a.name === f.activity) && (
                <option value={f.activity}>
                  {f.activity} <Text text="(no está en la lista)" />
                </option>
              )}
            {acts
              .filter((a) => a.category_id === f.category_id)
              .map((a) => (
                <option key={a.id} value={a.name}>
                  {tr(a.name)}
                </option>
              ))}
          </select>
        </Field>
        {f.category_id && (
          <Field
            label={tr("Otras actividades")}
            hint={tr(
              "Opcional. Marca otros servicios que también ofrece; ayudan a encontrar la ficha.",
            )}
          >
            <div className="flex flex-wrap gap-1.5">
              {acts
                .filter(
                  (a) =>
                    a.name !== f.activity &&
                    (a.category_id === f.category_id || f.extra_activities.includes(a.id)),
                )
                .map((a) => {
                  const on = f.extra_activities.includes(a.id);
                  return (
                    <button
                      type="button"
                      key={a.id}
                      aria-pressed={on}
                      onClick={() =>
                        set(
                          "extra_activities",
                          on
                            ? f.extra_activities.filter((x) => x !== a.id)
                            : [...f.extra_activities, a.id],
                        )
                      }
                      className={`rounded-md border px-2.5 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {tr(a.name)}
                    </button>
                  );
                })}
            </div>
          </Field>
        )}
        <Field
          label={tr("Página web")}
          hint={tr("Opcional. Se mostrará en la ficha más adelante.")}
        >
          <Input
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={f.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </Field>
        <Toggle
          label={tr("Servicio a domicilio")}
          checked={f.home_service}
          onChange={(v) => set("home_service", v)}
          hint={tr("Se desplaza a casa del cliente.")}
        />
        <Field label={tr("Zona de servicio")} hint={tr("Opcional. Ej.: {municipio} y alrededores")}>
          <Input value={f.service_area} onChange={(e) => set("service_area", e.target.value)} />
        </Field>
        <Field
          label={tr("Etiquetas destacadas")}
          hint={tr("Hasta 3, separadas por comas. Ej.: Pan de leña, Encargos")}
        >
          <Input value={f.labels} onChange={(e) => set("labels", e.target.value)} />
          {!!settings?.common_labels.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {settings.common_labels.map((t) => {
                const cur = f.labels
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean);
                const on = cur.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set("labels", (on ? cur.filter((x) => x !== t) : [...cur, t]).join(", "))
                    }
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
          <Input
            required
            value={f.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
          />
        </Field>
        <Field
          label={tr("Dirección web")}
          hint={`aquibonela…${listingPath(f.type, f.slug || "…")}`}
        >
          <Input
            value={f.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", slugify(e.target.value));
            }}
          />
        </Field>
        <ContentLanguages
          value={language}
          onChange={setLanguage}
          busy={saving || translating}
          onGenerate={() => void generate(source, translations, setTranslations, true)}
          stale={Boolean(
            language !== "es" &&
            translations[language] &&
            sourceChanged(translations[language], source),
          )}
          translations={translations}
          onVersionsChange={setTranslations}
        />
        {translationError && (
          <p role="alert" className="text-sm text-destructive">
            {translationError}
          </p>
        )}
        <Field
          label={tr("Descripción corta")}
          hint={`${tr("Se ve en la tarjeta del directorio.")} ${shortText.length}/140`}
        >
          <Input
            aria-label="Descripción corta"
            maxLength={140}
            disabled={translating}
            value={shortText}
            onChange={(e) => setTranslatedField("short_description", e.target.value)}
          />
        </Field>
        <Field label={tr("Descripción extensa")} hint={tr("Se ve en la página de la ficha.")}>
          <Textarea
            aria-label="Descripción extensa"
            rows={7}
            disabled={translating}
            value={longText}
            onChange={(e) => setTranslatedField("description", e.target.value)}
          />
        </Field>
        <Field
          label={tr("Palabras de búsqueda (no visibles)")}
          hint={tr("Separadas por comas. Ej.: bollería, tartas, pan integral")}
        >
          <Input value={f.tags} onChange={(e) => set("tags", e.target.value)} />
        </Field>
      </Section>

      <Section title={tr("3. Contacto")} hint={tr("Solo se publica lo que marques como visible.")}>
        <ContactRow
          label={tr("Teléfono")}
          type="tel"
          value={f.phone}
          onValue={(v) => set("phone", v)}
          show={f.show_phone}
          onShow={(v) => set("show_phone", v)}
        />
        <ContactRow
          label={tr("Segundo teléfono")}
          type="tel"
          value={f.phone_2}
          onValue={(v) => set("phone_2", v)}
          show={f.show_phone_2}
          onShow={(v) => set("show_phone_2", v)}
        />
        <ContactRow
          label="WhatsApp"
          type="tel"
          value={f.whatsapp}
          onValue={(v) => set("whatsapp", v)}
          show={f.show_whatsapp}
          onShow={(v) => set("show_whatsapp", v)}
        />
        <ContactRow
          label={tr("Dirección")}
          value={f.address}
          onValue={(v) => set("address", v)}
          show={f.show_address}
          onShow={(v) => set("show_address", v)}
        />
        <ContactRow
          label="Email"
          type="email"
          value={f.email}
          onValue={(v) => set("email", v)}
          show={f.show_email}
          onShow={(v) => set("show_email", v)}
        />
        <div className="border-t pt-3">
          <h3 className="text-sm font-semibold">
            <Text text="Redes sociales" />
          </h3>
          <p className="text-xs text-muted-foreground">
            <Text text="Pega el enlace completo del perfil o canal y marca si quieres mostrarlo." />
          </p>
        </div>
        <ContactRow
          label="LinkedIn"
          type="url"
          placeholder="https://www.linkedin.com/…"
          value={f.linkedin}
          onValue={(v) => set("linkedin", v)}
          show={f.show_linkedin}
          onShow={(v) => set("show_linkedin", v)}
        />
        <ContactRow
          label="Facebook"
          type="url"
          placeholder="https://www.facebook.com/…"
          value={f.facebook}
          onValue={(v) => set("facebook", v)}
          show={f.show_facebook}
          onShow={(v) => set("show_facebook", v)}
        />
        <ContactRow
          label="YouTube"
          type="url"
          placeholder="https://www.youtube.com/…"
          value={f.youtube}
          onValue={(v) => set("youtube", v)}
          show={f.show_youtube}
          onShow={(v) => set("show_youtube", v)}
        />
        <ContactRow
          label="X (Twitter)"
          type="url"
          placeholder="https://x.com/…"
          value={f.x_twitter}
          onValue={(v) => set("x_twitter", v)}
          show={f.show_x_twitter}
          onShow={(v) => set("show_x_twitter", v)}
        />
        <ContactRow
          label="Instagram"
          type="url"
          placeholder="https://www.instagram.com/…"
          value={f.instagram}
          onValue={(v) => set("instagram", v)}
          show={f.show_instagram}
          onShow={(v) => set("show_instagram", v)}
        />
        <ContactRow
          label="TikTok"
          type="url"
          placeholder="https://www.tiktok.com/@…"
          value={f.tiktok}
          onValue={(v) => set("tiktok", v)}
          show={f.show_tiktok}
          onShow={(v) => set("show_tiktok", v)}
        />
        <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
          <Field label={tr("Titular (privado)")}>
            <Input value={f.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
          </Field>
          <Field
            label={tr("Contacto del titular (privado)")}
            hint={tr("Para enviarle el enlace de revisión")}
          >
            <Input value={f.owner_contact} onChange={(e) => set("owner_contact", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title={tr("4. Horario")}>
        {f.hours.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={h.weekday}
              onChange={(e) =>
                set(
                  "hours",
                  f.hours.map((x, j) => (j === i ? { ...x, weekday: +e.target.value } : x)),
                )
              }
              className="h-10 border bg-background px-2 text-sm"
            >
              {WEEKDAYS.map((d, k) => (
                <option key={d} value={k + 1}>
                  {tr(d)}
                </option>
              ))}
            </select>
            <Input
              type="time"
              value={h.opens}
              onChange={(e) =>
                set(
                  "hours",
                  f.hours.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)),
                )
              }
              className="h-10 w-28"
            />
            <span>–</span>
            <Input
              type="time"
              value={h.closes}
              onChange={(e) =>
                set(
                  "hours",
                  f.hours.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)),
                )
              }
              className="h-10 w-28"
            />
            <button
              type="button"
              aria-label={tr("Quitar tramo")}
              onClick={() =>
                set(
                  "hours",
                  f.hours.filter((_, j) => j !== i),
                )
              }
              className="p-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set("hours", [...f.hours, { weekday: 1, opens: "09:00", closes: "14:00" }])
          }
          className="inline-flex items-center gap-1 text-sm text-terracotta"
        >
          <Plus className="h-4 w-4" /> <Text text="Añadir tramo" />{" "}
        </button>
        <Toggle
          label="Mostrar el horario en la ficha pública"
          hint="Si lo desactivas, el horario se guarda pero los visitantes no lo ven. El titular también puede decidirlo en el enlace de revisión."
          checked={f.show_hours}
          onChange={(v) => set("show_hours", v)}
        />
      </Section>

      <Section title={tr("5. Imágenes y distinciones")}>
        {isNew ? (
          <p className="text-sm text-muted-foreground">
            <Text text="Guarda la ficha para poder subir imágenes." />
          </p>
        ) : (
          <CoverPicker
            listingId={id}
            version={base?.version}
            onSaved={(version) => setBase((b) => (b ? { ...b, version } : b))}
            onConflict={() => {
              setConflict(true);
              void refetch();
            }}
          />
        )}
        <Toggle
          label={tr("Resaltado")}
          checked={f.highlighted}
          onChange={(v) => set("highlighted", v)}
          hint={
            f.highlighted && f.featured_until && new Date(f.featured_until) > new Date()
              ? `${tr("Hasta el")} ${new Date(f.featured_until).toLocaleDateString(locale)}`
              : tr("Muestra la imagen de portada en la tarjeta del directorio.")
          }
        />
        {!isNew && <GalleryPicker listingId={id} />}
        <Toggle
          label={tr("Urgencias 24h")}
          checked={f.urgent_24h}
          onChange={(v) => set("urgent_24h", v)}
          hint={tr("Fontaneros, cerrajeros, electricistas…")}
        />
        {AVAILABILITY_OPTIONS.map((option) => (
          <Toggle
            key={option}
            label={option}
            checked={f.availability.includes(option)}
            onChange={(on) =>
              set(
                "availability",
                on
                  ? [...f.availability, option]
                  : f.availability.filter((value) => value !== option),
              )
            }
          />
        ))}
      </Section>

      <Section title={tr("6. Estado")}>
        <select
          value={f.status}
          onChange={(e) => set("status", e.target.value as Status)}
          className="h-10 w-full border bg-background px-3 text-sm sm:w-72"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {tr(s.label)}
            </option>
          ))}
        </select>
        <div className="space-y-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            <Text text="Genera un enlace privado y envíaselo al titular por WhatsApp: podrá revisar su ficha, marcar qué datos se publican y autorizarla. Válido 30 días." />{" "}
          </p>
          {isNew ? (
            <p className="text-xs text-muted-foreground">
              <Text text="Guarda la ficha para poder generar el enlace." />
            </p>
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
                    toast.success(tr("Enlace copiado"));
                  }}
                  className="h-10 border px-4 text-sm"
                >
                  <Text text="Copiar enlace" />{" "}
                </button>
                <a
                  href={whatsappShareUrl(
                    reviewMessage(
                      f.owner_name || null,
                      reviewLink.url,
                      settings?.whatsapp_template,
                    ),
                    f.owner_contact,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center bg-primary px-4 text-sm text-primary-foreground"
                >
                  <Text text="Abrir WhatsApp" />{" "}
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                <Text text="Caduca el" />{" "}
                {new Date(reviewLink.expiresAt).toLocaleDateString(locale)}
                <Text text=". Puedes generar un enlace nuevo cuando quieras." />{" "}
              </p>
            </div>
          )}
        </div>
      </Section>

      {!isNew && (
        <div className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={deleting || saving}
            onClick={eliminar}
            className="border-destructive text-destructive shadow-none"
          >
            <Trash2 aria-hidden /> {tr(deleting ? "Eliminando…" : "Eliminar ficha")}
          </Button>
        </div>
      )}

      <TranslationSaveDialog
        open={confirmTranslations}
        onOpenChange={setConfirmTranslations}
        source={source}
        translations={translations}
        busy={saving || translating}
        onSave={(choice) => void save(choice)}
      />
      <div className="fixed inset-x-0 bottom-0 border-t bg-background">
        <div className="mx-auto flex max-w-5xl justify-end gap-2 px-4 py-3">
          <Link
            to="/admin/directorio"
            className="inline-flex h-11 items-center border px-4 text-sm"
          >
            <Text text="Cancelar" />
          </Link>
          <Button
            type="submit"
            disabled={saving || deleting || translating}
            className="h-11 bg-primary px-6 text-sm font-medium text-primary-foreground shadow-none disabled:opacity-60"
          >
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { tr, locale } = useI18n();
  return (
    <div className="space-y-1.5">
      <Label>{tr(label)}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{tr(hint)}</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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

function ContactRow({
  label,
  value,
  onValue,
  show,
  onShow,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onValue: (v: string) => void;
  show: boolean;
  onShow: (v: boolean) => void;
  type?: "text" | "tel" | "email" | "url";
  placeholder?: string;
}) {
  const { tr } = useI18n();
  return (
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <Field label={label}>
          <Input
            type={type}
            inputMode={type === "url" ? "url" : undefined}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onValue(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex h-10 shrink-0 items-center gap-2 text-xs">
        <Switch aria-label={`${tr("Visible")}: ${label}`} checked={show} onCheckedChange={onShow} />{" "}
        <Text text="Visible" />{" "}
      </label>
    </div>
  );
}
