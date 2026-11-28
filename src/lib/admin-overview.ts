/**
 * Datos de Inicio del panel: borradores del contenido municipal por estado, última publicación y
 * operaciones recientes. Solo los lee la administración (RLS); nada de esto llega a la web.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DraftStatus } from "./content-workflow";
import type { AuditEntry } from "./admin-activity";

export type DraftSummary = {
  draft_key: string;
  status: DraftStatus;
  updated_at: string;
  submitted_at: string | null;
};

export const adminDraftsQuery = queryOptions({
  queryKey: ["admin", "drafts"],
  queryFn: async () => {
    const [drafts, last] = await Promise.all([
      supabase
        .from("content_drafts")
        .select("draft_key,status,updated_at,submitted_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("content_publications")
        .select("draft_key,published_at")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (drafts.error) throw new Error(drafts.error.message);
    if (last.error) throw new Error(last.error.message);
    return {
      drafts: (drafts.data ?? []) as DraftSummary[],
      lastPublication: last.data as { draft_key: string; published_at: string } | null,
    };
  },
});

/** Últimas operaciones; Inicio muestra las que tienen sentido para el administrador. */
export const adminActivityQuery = queryOptions({
  queryKey: ["admin", "activity"],
  queryFn: async (): Promise<AuditEntry[]> => {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select(
        "id,occurred_at,operation,table_name,record_key,changed_columns,state,actor,actor_role",
      )
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []) as AuditEntry[];
  },
});
