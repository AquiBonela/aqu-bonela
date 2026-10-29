// Client-side middleware: attaches the Supabase bearer token to server function
// requests. The server validates it via requireSupabaseAuth; the browser read
// of the session is acceptable because the server re-validates the token.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  if (typeof window === "undefined") return next();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
