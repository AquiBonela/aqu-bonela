import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReviewState } from "./listing-review";

/** Estado de revisión, historial y última aprobación de una ficha (panel). */
export const listingReviewQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "listing-review", id],
    queryFn: async () => {
      const [state, events, approval] = await Promise.all([
        supabase.rpc("listing_review_state", { p_listing_id: id }),
        supabase
          .from("listing_events")
          .select("id,kind,from_status,to_status,note,created_at")
          .eq("listing_id", id)
          .order("id", { ascending: false })
          .limit(15),
        supabase
          .from("listing_requests")
          .select("snapshot,decided_at")
          .eq("listing_id", id)
          .eq("status", "aprobada")
          .order("decided_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (state.error) throw new Error(state.error.message);
      return {
        review: (state.data ?? "sin_enviar") as ReviewState,
        events: events.data ?? [],
        lastApproval: approval.data,
      };
    },
  });
