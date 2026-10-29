import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listingPath, TOKEN_RE, type Hour, type ReviewContact, type ReviewData, type SubmitResult } from "./review";

const tokenInput = z.object({ token: z.string().regex(TOKEN_RE) });

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
    const found = await loadToken(data.token);
    if (!found) return { ok: false, reason: "invalid" };
    const { row, admin } = found;
    const [l, c, h] = await Promise.all([
      admin
        .from("listings")
        .select("id,slug,type,name,status,activity,labels,description,cover_url,gallery_urls,featured,urgent_24h,categories(name)")
        .eq("id", row.listing_id)
        .maybeSingle(),
      admin
        .from("listing_contacts")
        .select("phone,whatsapp,address,show_phone,show_whatsapp,show_address,owner_name")
        .eq("listing_id", row.listing_id)
        .maybeSingle(),
      admin.from("listing_hours").select("weekday,opens,closes").eq("listing_id", row.listing_id).order("weekday"),
    ]);
    if (!l.data) return { ok: false, reason: "invalid" };
    const raw = l.data as {
      id: string; slug: string; type: "comercio" | "profesional"; name: string; status: string;
      activity: string | null; labels: string[] | null; description: string | null;
      cover_url: string | null; gallery_urls: string[] | null; featured: boolean | null; urgent_24h: boolean | null;
      categories: { name?: string } | null;
    };
    const listing = {
      id: raw.id, slug: raw.slug, type: raw.type, name: raw.name, status: raw.status,
      activity: raw.activity ?? null, labels: raw.labels ?? [], description: raw.description ?? "",
      cover_url: raw.cover_url ?? null, gallery_urls: raw.gallery_urls ?? [],
      featured: !!raw.featured, urgent_24h: !!raw.urgent_24h, categoryName: raw.categories?.name ?? null,
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
    const { data: l } = await admin.from("listings").select("id,type,slug").eq("id", row.listing_id).maybeSingle();
    if (!l) return { ok: false, reason: "invalid" };

    // Solo se copian a public_* los campos que el titular autoriza (trigger sync_public_contact).
    await admin.from("listing_contacts").upsert({
      listing_id: l.id,
      show_phone: data.show_phone,
      show_whatsapp: data.show_whatsapp,
      show_address: data.show_address,
    });
    const authorized = [
      data.show_phone ? "teléfono" : null,
      data.show_whatsapp ? "whatsapp" : null,
      data.show_address ? "dirección" : null,
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
    await admin.from("listings").update({ status: "publicada" }).eq("id", l.id);
    await admin.from("approval_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: true, url: listingPath(l.type, l.slug) };
  });

export const createReviewToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("approval_tokens").insert({
      listing_id: data.listingId,
      token_hash: await sha256Hex(token),
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
    return { token, expiresAt };
  });

export const reviewQuery = (token: string) =>
  queryOptions({ queryKey: ["review", token], queryFn: () => getReview({ data: { token } }) });
