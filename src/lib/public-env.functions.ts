import { createServerFn } from "@tanstack/react-start";
import { readServerEnv } from "./runtime-env";
import type { PublicEnv } from "./public-env";

// Devuelve exclusivamente la URL y la clave publicable de Supabase.
export const getPublicEnv = createServerFn({ method: "GET" }).handler(async (): Promise<PublicEnv> => ({
  SUPABASE_URL: readServerEnv("SUPABASE_URL") ?? "",
  SUPABASE_PUBLISHABLE_KEY: readServerEnv("SUPABASE_PUBLISHABLE_KEY") ?? "",
}));
