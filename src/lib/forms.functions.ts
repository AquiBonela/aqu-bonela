import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const REPORT_REASONS = ["Horario incorrecto", "Teléfono erróneo", "Cerrado / Mudado", "Otro motivo"] as const;

export type FormResult = { ok: true } | { ok: false; error: "invalid" | "rate_limited" | "verification" | "unavailable" };

const common = {
  session: z.string().max(200),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(200).optional(), // honeypot
};

const suggestionSchema = z.object({
  ...common,
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().max(160).optional(),
  message: z.string().trim().min(5).max(1000),
});

const reportSchema = z.object({
  ...common,
  listingId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  contact: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5).max(1000),
});

export const getFormProtection = createServerFn({ method: "GET" }).handler(async () => {
  const { issueFormSession } = await import("./antispam.server");
  return { siteKey: process.env["TURNSTILE_SITE_KEY"] ?? "", session: await issueFormSession() };
});

async function guard(
  scope: "sug" | "rep",
  action: string,
  input: { session: string; turnstileToken: string },
  maxSubmissions: number,
): Promise<FormResult> {
  const a = await import("./antispam.server");
  const request = getRequest();
  const ip = a.getTrustedClientIp(request.headers);
  const nonce = await a.verifyFormSession(input.session);
  if (!nonce) return { ok: false, error: "verification" };
  const subjects: Array<{ kind: "ip" | "ss"; value: string }> = [{ kind: "ss", value: nonce }];
  if (ip) subjects.unshift({ kind: "ip", value: ip });

  for (const s of subjects) if (!(await a.checkRateLimit("form", s, 10, 60))) return { ok: false, error: "rate_limited" };

  const host = new URL(request.url).hostname;
  if (!(await a.verifyTurnstile(input.turnstileToken, action, host, ip))) return { ok: false, error: "verification" };

  for (const s of subjects) if (!(await a.checkRateLimit(scope, s, maxSubmissions, 600))) return { ok: false, error: "rate_limited" };
  return { ok: true };
}

export const submitSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d)
  .handler(async ({ data }): Promise<FormResult> => {
    const parsed = suggestionSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const v = parsed.data;
    if (v.website) return { ok: true }; // honeypot: silent discard
    const g = await guard("sug", "suggestion", v, 3);
    if (!g.ok) return g;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("suggestions").insert({ name: v.name, contact: v.contact || null, message: v.message });
    if (error) { console.error("[forms] suggestion insert failed"); return { ok: false, error: "unavailable" }; }
    return { ok: true };
  });

export const submitReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d)
  .handler(async ({ data }): Promise<FormResult> => {
    const parsed = reportSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const v = parsed.data;
    if (v.website) return { ok: true };
    const g = await guard("rep", "report", v, 5);
    if (!g.ok) return g;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing } = await supabaseAdmin.from("listings").select("id").eq("id", v.listingId).eq("status", "publicada").maybeSingle();
    if (!listing) return { ok: false, error: "invalid" };
    const { error } = await supabaseAdmin.from("listing_reports").insert({
      listing_id: v.listingId,
      message: `[${v.reason}] ${v.message}`,
      contact: v.contact || null,
    });
    if (error) { console.error("[forms] report insert failed"); return { ok: false, error: "unavailable" }; }
    return { ok: true };
  });
