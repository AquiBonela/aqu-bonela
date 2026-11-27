import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { listingPath } from "@/lib/listing-detail";
import {
  authorizedContactFields,
  TOKEN_RE,
  type Hour,
  type ReviewContact,
  type ReviewData,
  type SubmitResult,
} from "./review";

const tokenInput = z.object({ token: z.string().min(1).max(200) });
type ListingType = "comercio" | "profesional" | "publico" | "asociacion";

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** El token aleatorio del enlace es la única credencial del titular (no tiene cuenta). */
async function loadToken(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("approval_tokens")
    .select("id,listing_id,request_id,expires_at,used_at")
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle();
  return row ? { row, admin: supabaseAdmin } : null;
}

export const getReview = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => tokenInput.parse(d))
  .handler(async ({ data }): Promise<ReviewData> => {
    if (!TOKEN_RE.test(data.token)) return { ok: false, reason: "invalid" };
    const found = await loadToken(data.token);
    if (!found) return { ok: false, reason: "invalid" };
    const { row, admin } = found;
    const [l, c, h] = await Promise.all([
      admin
        .from("listings")
        .select(
          "id,slug,type,name,status,activity,labels,description,short_description,cover_url,cover_path,gallery_urls,featured,featured_until,tags,public_website,category_id,urgent_24h,categories(name,slug),listing_photos(storage_path,alt,sort_order)",
        )
        .eq("id", row.listing_id)
        .maybeSingle(),
      admin
        .from("listing_contacts")
        .select(
          "phone,phone_2,whatsapp,address,email,linkedin,facebook,youtube,x_twitter,instagram,tiktok,show_phone,show_phone_2,show_whatsapp,show_address,show_email,show_linkedin,show_facebook,show_youtube,show_x_twitter,show_instagram,show_tiktok,owner_name",
        )
        .eq("listing_id", row.listing_id)
        .maybeSingle(),
      admin
        .from("listing_hours")
        .select("weekday,opens,closes")
        .eq("listing_id", row.listing_id)
        .order("weekday"),
    ]);
    if (!l.data) return { ok: false, reason: "invalid" };
    const raw = l.data as {
      id: string;
      slug: string;
      type: "comercio" | "profesional" | "publico" | "asociacion";
      name: string;
      status: string;
      activity: string | null;
      labels: string[] | null;
      description: string | null;
      cover_url: string | null;
      gallery_urls: string[] | null;
      featured: boolean | null;
      urgent_24h: boolean | null;
      public_website: string | null;
      categories: { name?: string; slug?: string } | null;
      short_description: string | null;
      cover_path: string | null;
      featured_until: string | null;
      tags: string[] | null;
      category_id: string | null;
      listing_photos: { storage_path: string; alt: string; sort_order: number }[] | null;
    };
    const sorted = [...(raw.listing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const paths = [
      ...(raw.cover_path ? [raw.cover_path] : []),
      ...sorted.map((p) => p.storage_path),
    ];
    const { data: signed } = paths.length
      ? await admin.storage.from("listing-photos").createSignedUrls(paths, 3600)
      : { data: [] as { signedUrl: string }[] };
    const urls = (signed ?? []).map((x) => x?.signedUrl ?? "");
    const coverSigned = raw.cover_path ? urls[0] : "";
    const photoUrls = raw.cover_path ? urls.slice(1) : urls;
    const listing = {
      id: raw.id,
      slug: raw.slug,
      type: raw.type,
      name: raw.name,
      status: raw.status,
      activity: raw.activity ?? null,
      labels: raw.labels ?? [],
      description: raw.description ?? "",
      cover_url: coverSigned || raw.cover_url || null,
      gallery_urls: raw.gallery_urls ?? [],
      featured: !!raw.featured,
      urgent_24h: !!raw.urgent_24h,
      categoryName: raw.categories?.name ?? null,
      categorySlug: raw.categories?.slug ?? null,
      short_description: raw.short_description ?? "",
      featured_until: raw.featured_until ?? null,
      tags: raw.tags ?? [],
      public_website: raw.public_website ?? null,
      category_id: raw.category_id ?? null,
      photos: sorted
        .map((p, i) => ({ url: photoUrls[i] ?? "", alt: p.alt || raw.name }))
        .filter((p) => p.url),
    };
    return {
      ok: true,
      done: !!row.used_at || raw.status === "publicada",
      expiresAt: row.expires_at,
      listing,
      contact: (c.data as ReviewContact | null) ?? null,
      hours: (h.data as Hour[] | null) ?? [],
    };
  });

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().regex(TOKEN_RE),
        show_phone: z.boolean(),
        show_phone_2: z.boolean(),
        show_whatsapp: z.boolean(),
        show_address: z.boolean(),
        show_email: z.boolean(),
        show_linkedin: z.boolean(),
        show_facebook: z.boolean(),
        show_youtube: z.boolean(),
        show_x_twitter: z.boolean(),
        show_instagram: z.boolean(),
        show_tiktok: z.boolean(),
        show_hours: z.boolean().default(true),
        comment: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<SubmitResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Una sola transacción en la base (approve_listing_review): publica la ficha con la decisión
    // del titular sobre el horario, guarda la visibilidad de sus contactos (el trigger
    // sync_public_contact copia a public_* solo lo autorizado), registra el consentimiento y el
    // comentario y gasta el enlace. Si algo falla no se aplica nada y el enlace sigue sin usar.
    const { data: result, error } = await supabaseAdmin.rpc("approve_listing_review", {
      p_token_hash: await sha256Hex(data.token),
      p_visibility: {
        show_phone: data.show_phone,
        show_phone_2: data.show_phone_2,
        show_whatsapp: data.show_whatsapp,
        show_address: data.show_address,
        show_email: data.show_email,
        show_linkedin: data.show_linkedin,
        show_facebook: data.show_facebook,
        show_youtube: data.show_youtube,
        show_x_twitter: data.show_x_twitter,
        show_instagram: data.show_instagram,
        show_tiktok: data.show_tiktok,
      },
      p_show_hours: data.show_hours,
      p_authorized_fields: authorizedContactFields(data),
      ...(data.comment ? { p_comment: data.comment } : {}),
    });
    if (error) {
      console.error("approve_listing_review", error.code, error.message);
      return { ok: false, reason: "error" };
    }
    const r = (result ?? {}) as { status?: string; type?: ListingType; slug?: string };
    if (r.status === "ok" && r.type && r.slug)
      return { ok: true, url: listingPath(r.type, r.slug) };
    if (r.status === "used" || r.status === "expired" || r.status === "invalid")
      return { ok: false, reason: r.status };
    return { ok: false, reason: "error" };
  });

/** El titular pide correcciones sin autorizar: llega a la bandeja de Avisos; la ficha sigue sin publicar. */
export const sendCorrection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ token: z.string().regex(TOKEN_RE), comment: z.string().trim().min(1).max(1000) })
      .parse(d),
  )
  .handler(async ({ data }): Promise<SubmitResult> => {
    const found = await loadToken(data.token);
    if (!found) return { ok: false, reason: "invalid" };
    const { row, admin } = found;
    if (new Date(row.expires_at) < new Date()) return { ok: false, reason: "expired" };
    const { error } = await admin.from("listing_reports").insert({
      listing_id: row.listing_id,
      message: `[Corrección del titular] ${data.comment}`,
      contact: "Enlace de revisión",
    });
    if (error) throw new Error("No se pudo enviar");
    return { ok: true, url: null };
  });

export const reviewQuery = (token: string) =>
  queryOptions({ queryKey: ["review", token], queryFn: () => getReview({ data: { token } }) });
