import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { listingPath } from "@/lib/listing-detail";
import { withHoursVisibility } from "@/lib/listing-availability";
import { TOKEN_RE, type Hour, type ReviewContact, type ReviewData, type SubmitResult } from "./review";

const tokenInput = z.object({ token: z.string().min(1).max(200) });

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
        .select("id,slug,type,name,status,activity,labels,description,short_description,cover_url,cover_path,gallery_urls,featured,featured_until,tags,category_id,urgent_24h,categories(name,slug),listing_photos(storage_path,alt,sort_order)")
        .eq("id", row.listing_id)
        .maybeSingle(),
      admin
        .from("listing_contacts")
        .select("phone,whatsapp,address,email,show_phone,show_whatsapp,show_address,show_email,owner_name")
        .eq("listing_id", row.listing_id)
        .maybeSingle(),
      admin.from("listing_hours").select("weekday,opens,closes").eq("listing_id", row.listing_id).order("weekday"),
    ]);
    if (!l.data) return { ok: false, reason: "invalid" };
    const raw = l.data as {
      id: string; slug: string; type: "comercio" | "profesional"; name: string; status: string;
      activity: string | null; labels: string[] | null; description: string | null;
      cover_url: string | null; gallery_urls: string[] | null; featured: boolean | null; urgent_24h: boolean | null;
      categories: { name?: string; slug?: string } | null;
      short_description: string | null; cover_path: string | null; featured_until: string | null;
      tags: string[] | null; category_id: string | null;
      listing_photos: { storage_path: string; alt: string; sort_order: number }[] | null;
    };
    const sorted = [...(raw.listing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const paths = [...(raw.cover_path ? [raw.cover_path] : []), ...sorted.map((p) => p.storage_path)];
    const { data: signed } = paths.length
      ? await admin.storage.from("listing-photos").createSignedUrls(paths, 3600)
      : { data: [] as { signedUrl: string }[] };
    const urls = (signed ?? []).map((x) => x?.signedUrl ?? "");
    const coverSigned = raw.cover_path ? urls[0] : "";
    const photoUrls = raw.cover_path ? urls.slice(1) : urls;
    const listing = {
      id: raw.id, slug: raw.slug, type: raw.type, name: raw.name, status: raw.status,
      activity: raw.activity ?? null, labels: raw.labels ?? [], description: raw.description ?? "",
      cover_url: coverSigned || raw.cover_url || null, gallery_urls: raw.gallery_urls ?? [],
      featured: !!raw.featured, urgent_24h: !!raw.urgent_24h, categoryName: raw.categories?.name ?? null,
      categorySlug: raw.categories?.slug ?? null, short_description: raw.short_description ?? "",
      featured_until: raw.featured_until ?? null, tags: raw.tags ?? [], category_id: raw.category_id ?? null,
      photos: sorted.map((p, i) => ({ url: photoUrls[i] ?? "", alt: p.alt || raw.name })).filter((p) => p.url),
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
        show_whatsapp: z.boolean(),
        show_address: z.boolean(),
        show_email: z.boolean(),
        show_hours: z.boolean().default(true),
        comment: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<SubmitResult> => {
    const found = await loadToken(data.token);
    if (!found) return { ok: false, reason: "invalid" };
    const { row, admin } = found;
    if (row.used_at) return { ok: true, url: null };
    if (new Date(row.expires_at) < new Date()) return { ok: false, reason: "expired" };
    const { data: l } = await admin.from("listings").select("id,type,slug,tags").eq("id", row.listing_id).maybeSingle();
    if (!l) return { ok: false, reason: "invalid" };

    // Solo se copian a public_* los campos que el titular autoriza (trigger sync_public_contact).
    await admin.from("listing_contacts").upsert({
      listing_id: l.id,
      show_phone: data.show_phone,
      show_whatsapp: data.show_whatsapp,
      show_address: data.show_address,
      show_email: data.show_email,
    });
    const authorized = [
      data.show_phone ? "teléfono" : null,
      data.show_whatsapp ? "whatsapp" : null,
      data.show_address ? "dirección" : null,
      data.show_email ? "email" : null,
      data.show_hours ? "horario" : null,
    ].filter(Boolean);
    await admin.from("consents").insert({
      listing_id: l.id,
      request_id: row.request_id ?? null,
      purpose: "publicacion_ficha",
      text_version: "v1",
      granted: true,
      authorized_fields: authorized,
      method: "enlace_privado",
    });
    if (data.comment) {
      await admin
        .from("listing_requests")
        .insert({ listing_id: l.id, status: "aprobada", notes: data.comment, decided_at: new Date().toISOString() });
    }
    await admin.from("listings").update({ status: "publicada", tags: withHoursVisibility((l as { tags: string[] | null }).tags ?? [], data.show_hours) }).eq("id", l.id);
    await admin.from("approval_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: true, url: listingPath(l.type, l.slug) };
  });

/** El titular pide correcciones sin autorizar: llega a la bandeja de Avisos; la ficha sigue sin publicar. */
export const sendCorrection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().regex(TOKEN_RE), comment: z.string().trim().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data }): Promise<SubmitResult> => {
    const found = await loadToken(data.token);
    if (!found) return { ok: false, reason: "invalid" };
    const { row, admin } = found;
    if (new Date(row.expires_at) < new Date()) return { ok: false, reason: "expired" };
    const { error } = await admin
      .from("listing_reports")
      .insert({ listing_id: row.listing_id, message: `[Corrección del titular] ${data.comment}`, contact: "Enlace de revisión" });
    if (error) throw new Error("No se pudo enviar");
    return { ok: true, url: null };
  });

export const reviewQuery = (token: string) =>
  queryOptions({ queryKey: ["review", token], queryFn: () => getReview({ data: { token } }) });
