import { useState } from "react";
import { Flag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function ReportDialog({ listingId, listingName }: { listingId: string; listingName: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setState("sending");
    const { error } = await supabase
      .from("listing_reports")
      .insert({ listing_id: listingId, message: message.trim(), contact: contact.trim() || null });
    setState(error ? "error" : "sent");
  };

  const close = () => {
    setOpen(false);
    if (state === "sent") {
      setMessage("");
      setContact("");
      setState("idle");
    }
  };

  return (
    <>
      <Button variant="ghost" type="button" onClick={() => setOpen(true)} className="h-auto justify-start whitespace-normal p-0 text-left text-sm font-medium text-foreground hover:bg-transparent hover:underline">
        <Flag className="shrink-0" aria-hidden /> ¿Algo no es correcto en esta ficha? Avísanos
      </Button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/50 sm:items-center">
          <div className="w-full max-w-md border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <h2 id="report-title" className="font-display text-lg font-bold">Avísanos sobre {listingName}</h2>
              <button type="button" onClick={close} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            {state === "sent" ? (
              <p className="mt-3">Gracias. Lo revisaremos lo antes posible.</p>
            ) : (
              <form onSubmit={send} className="mt-3 grid gap-3">
                <label className="grid gap-1 text-sm font-medium">
                  ¿Qué hay que corregir?
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="border bg-background p-2 text-base font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Correo o teléfono (opcional, solo para aclarar dudas)
                  <input
                    maxLength={120}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="h-11 border bg-background px-2 text-base font-normal"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Usaremos estos datos solo para gestionar tu aviso y los borraremos al resolverlo.
                </p>
                {state === "error" && <p className="text-sm text-destructive">No se ha podido enviar. Inténtalo de nuevo.</p>}
                <button type="submit" disabled={state === "sending"} className="min-h-12 bg-primary font-semibold text-primary-foreground disabled:opacity-60">
                  {state === "sending" ? "Enviando…" : "Enviar aviso"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
