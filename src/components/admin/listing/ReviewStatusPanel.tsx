import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listingReviewQuery } from "@/lib/listing-review-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Text } from "@/lib/i18n";
import { fmtDate } from "@/lib/admin";
import {
  displayState,
  EVENT_LABELS,
  relevantChanges,
  type ReviewState,
} from "@/lib/listing-review";
import { STATUSES, type Status } from "@/lib/admin";

const statusLabel = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<
  string,
  string
>;

type Props = {
  listingId: string;
  status: Status;
  /** Datos actuales del formulario, para avisar de cambios desde la aprobación. */
  current: { listing: Record<string, unknown>; contact: Record<string, unknown> };
  onChanged: () => void;
};

/**
 * Estado combinado (publicación y revisión del titular), cambios desde la última aprobación,
 * historial de la ficha y registro de la retirada del consentimiento.
 */
export function ReviewStatusPanel({ listingId, status, current, onChanged }: Props) {
  const qc = useQueryClient();
  const { data } = useQuery(listingReviewQuery(listingId));
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const state = displayState(status, data.review);
  const changes = data.lastApproval ? relevantChanges(data.lastApproval.snapshot, current) : [];
  const tone = {
    neutral: "bg-secondary text-foreground",
    info: "bg-primary/10 text-primary",
    warning: "bg-terracotta/10 text-terracotta",
    success: "bg-primary text-primary-foreground",
    muted: "bg-muted text-muted-foreground",
  }[state.tone];

  async function withdraw() {
    const note = window.prompt(
      "Retirada del consentimiento: la ficha dejará de publicarse y de mostrar datos de contacto. ¿Cómo lo pidió el titular? (opcional)",
      "",
    );
    if (note === null) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("withdraw_listing_consent", {
        p_listing_id: listingId,
        p_note: note,
      });
      if (error)
        return void toast.error(
          "No se pudo registrar la retirada. Comprueba tu conexión y tus permisos.",
        );
      await qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["directory"] });
      qc.invalidateQueries({ queryKey: ["listing"] });
      onChanged();
      toast.success("Retirada registrada. La ficha ya no se publica.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">
          <Text text="Estado:" />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
          {state.label}
        </span>
      </p>
      {changes.length > 0 && (
        <p role="status" className="border-l-4 border-terracotta bg-muted p-3 text-sm">
          {`Desde la última aprobación del titular han cambiado: ${changes.join(", ")}. Conviene enviarle un enlace nuevo para que lo revise.`}
        </p>
      )}
      {data.events.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            <Text text="Historial de la ficha" />
          </summary>
          <ol className="mt-2 grid gap-1 border-l pl-3">
            {data.events.map((e) => (
              <li key={e.id} className="text-xs">
                <span className="text-muted-foreground">{fmtDate(e.created_at)} · </span>
                {e.kind === "estado"
                  ? `${e.from_status ? `${statusLabel[e.from_status] ?? e.from_status} → ` : "Creada como "}${statusLabel[e.to_status ?? ""] ?? e.to_status}`
                  : (EVENT_LABELS[e.kind] ?? e.kind)}
                {e.note && e.kind !== "estado" && (
                  <span className="text-muted-foreground"> — {e.note}</span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
      {(data.review === "aprobada" || data.review === "en_revision" || status === "publicada") && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void withdraw()}
          className="justify-self-start"
        >
          <Text text="Registrar retirada del consentimiento" />
        </Button>
      )}
    </div>
  );
}
