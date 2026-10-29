import { supabase } from "@/integrations/supabase/client";

/** The database's admin-only INSERT policy authorizes this operation. */
export async function createReviewToken(listingId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("approval_tokens").insert({
    listing_id: listingId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return { token, expiresAt };
}