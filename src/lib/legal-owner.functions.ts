import { createServerFn } from "@tanstack/react-start";
import { fetchLegalOwner } from "./legal-owner";

// En el servidor el cliente compartido no tiene sesión: consulta como anon, con las políticas RLS.
export const getLegalOwner = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  return fetchLegalOwner(supabase);
});
