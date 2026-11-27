import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type LegalOwner = { name: string; nif: string; address: string; email: string };

type LegalRow = Pick<
  Database["public"]["Tables"]["site_settings"]["Row"],
  "legal_name" | "legal_nif" | "legal_address" | "legal_email"
>;

/** Sin dato configurado se muestra un marcador neutro, nunca el titular de otra instalación. */
export function toLegalOwner(row: Partial<LegalRow> | null): LegalOwner {
  return {
    name: row?.legal_name?.trim() || "[Titular pendiente]",
    nif: row?.legal_nif?.trim() || "[NIF pendiente]",
    address: row?.legal_address?.trim() || "[Domicilio pendiente]",
    email: row?.legal_email?.trim() || "[Correo pendiente]",
  };
}

/** Un fallo de consulta se propaga: no equivale a «sin configurar». */
export async function fetchLegalOwner(client: SupabaseClient<Database>): Promise<LegalOwner> {
  const { data, error } = await client
    .from("site_settings")
    .select("legal_name,legal_nif,legal_address,legal_email")
    .maybeSingle();
  if (error) {
    console.error("[legal-owner]", error.message);
    throw new Error("No se pudieron cargar los datos del titular.");
  }
  return toLegalOwner(data);
}
