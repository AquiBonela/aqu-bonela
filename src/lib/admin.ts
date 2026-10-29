import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalize } from "@/lib/directory";

export const STATUSES = [
  { value: "borrador", label: "Borrador" },
  { value: "pendiente", label: "Pendiente de aprobación" },
  { value: "publicada", label: "Publicada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "oculta", label: "Oculta" },
] as const;
export type Status = (typeof STATUSES)[number]["value"];

export function slugify(text: string) {
  return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Colaborador dura 1 mes desde la activación. */
export function collaboratorUntil(from = new Date(), months = 1) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export const isAdminQuery = queryOptions({
  queryKey: ["admin", "is-admin"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return false;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
    return !!data?.length;
  },
});

export const adminListingsQuery = queryOptions({
  queryKey: ["admin", "listings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("id,slug,type,name,status,featured,featured_until,urgent_24h,activity,updated_at,categories(name)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["admin", "categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("id,name").order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },
});

export const adminListingQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "listing", id],
    queryFn: async () => {
      const [l, c, h] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).maybeSingle(),
        supabase.from("listing_contacts").select("*").eq("listing_id", id).maybeSingle(),
        supabase.from("listing_hours").select("weekday,opens,closes").eq("listing_id", id).order("weekday"),
      ]);
      if (l.error) throw new Error(l.error.message);
      return { listing: l.data, contact: c.data, hours: h.data ?? [] };
    },
  });

export const adminReportsQuery = queryOptions({
  queryKey: ["admin", "reports"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("listing_reports")
      .select("id, listing_id, message, contact, resolved, created_at, listings(name, slug)")
      .order("resolved", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const adminSuggestionsQuery = queryOptions({
  queryKey: ["admin", "suggestions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("suggestions")
      .select("*")
      .order("handled", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
});

/** Fecha corta en español, p. ej. «12 mar 2026». */
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export type SiteSettings = {
  hero_title: string;
  hero_subtitle: string;
  contact_email: string;
  admin_whatsapp: string;
  collaborator_months: number;
  legal_name: string;
  legal_nif: string;
  legal_address: string;
  legal_email: string;
  whatsapp_template: string;
  banner_enabled: boolean;
  banner_text: string;
  common_labels: string[];
};

const SETTINGS_COLS =
  "hero_title,hero_subtitle,contact_email,admin_whatsapp,collaborator_months,legal_name,legal_nif,legal_address,legal_email,whatsapp_template,banner_enabled,banner_text,common_labels";

/** Completa campos ausentes (datos antiguos o en caché) para que el formulario nunca falle. */
export function withSettingsDefaults(d: Partial<SiteSettings> | null | undefined): SiteSettings {
  return {
    hero_title: d?.hero_title ?? "",
    hero_subtitle: d?.hero_subtitle ?? "",
    contact_email: d?.contact_email ?? "",
    admin_whatsapp: d?.admin_whatsapp ?? "",
    collaborator_months: d?.collaborator_months ?? 1,
    legal_name: d?.legal_name ?? "",
    legal_nif: d?.legal_nif ?? "",
    legal_address: d?.legal_address ?? "",
    legal_email: d?.legal_email ?? "",
    whatsapp_template: d?.whatsapp_template ?? "",
    banner_enabled: d?.banner_enabled ?? false,
    banner_text: d?.banner_text ?? "",
    common_labels: Array.isArray(d?.common_labels) ? d.common_labels : [],
  };
}

export const siteSettingsQuery = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select(SETTINGS_COLS)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return withSettingsDefaults(data as Partial<SiteSettings> | null);
  },
});

export const adminCategoriesQuery = queryOptions({
  queryKey: ["admin", "categories-full"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,sort_order,is_provisional")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },
});
