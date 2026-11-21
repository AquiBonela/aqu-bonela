import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { TRAMITES } from "@/lib/tramites";
import { sourceKey } from "@/lib/procedure-editor";

export type ProcedureCategory = Database['public']['Tables']['procedure_categories']['Row'];
export type ProcedureRow = Database['public']['Tables']['procedures']['Row'];
export const procedureCategoriesQuery = queryOptions({
  queryKey: ["admin", "procedure-categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("procedure_categories").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },
});
export const adminProceduresQuery = queryOptions({
  queryKey: ["admin", "procedures"],
  queryFn: async () => {
    const { data, error } = await supabase.from("procedures").select("*").order("sort_order").order("title");
    if (error) throw new Error(error.message);
    return data;
  },
});
export function procedureList(rows: ProcedureRow[], categories: ProcedureCategory[]) {
  const saved = rows.map((r) => ({ id: r.id, title: r.title, cat: r.category_id, status: r.status, stored: true }));
  const templates = TRAMITES.filter((t) => !rows.some((r) => r.source_key === sourceKey(t))).map((t) => ({
    id: t.slug, title: t.title, cat: categories.find((c) => c.slug === t.cat)?.id ?? "", status: "sin-guardar", stored: false,
  }));
  return [...saved, ...templates];
}