import { useEffect, useState } from "react";
import { Flag, X, PencilLine, Store, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const REASONS = ["Horario incorrecto", "Teléfono erróneo", "Cerrado / Mudado", "Otro motivo"] as const;

export function ReportDialog({ listingId, listingName }: { listingId: string; listingName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setState("sending");
    const { error } = await supabase.from("listing_reports").insert({
      listing_id: listingId,
      message: `[${reason}] ${message.trim()}`,
      contact: contact.trim() || null,
    });
    setState(error ? "error" : "sent");
  };

  function close() {
    setOpen(false);
    if (state === "sent") {
      setMessage("");
      setContact("");
      setReason(REASONS[0]);
      setState("idle");
    }
  }

  return (
    <>
      <Button variant="ghost" type="button" onClick={() => setOpen(true)} className="h-auto justify-start whitespace-normal p-0 text-left text-sm font-medium text-foreground hover:bg-transparent hover:underline">
        <Flag className="shrink-0" aria-hidden /> ¿Algo no es correcto en esta ficha? Avísanos
      </Button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="fixed inset-0 z-50 flex justify-center bg-foreground/50 sm:items-center sm:p-4">
          <div className="flex h-full w-full flex-col overflow-y-auto bg-card sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl sm:border">
            <div className="flex items-start gap-3 border-b p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <PencilLine className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="report-title" className="font-display text-xl font-bold leading-tight sm:text-2xl">Avisar sobre un dato incorrecto</h2>
                <p className="mt-1 flex items-center gap-1.5 text-base text-muted-foreground">
                  <Store className="h-4 w-4 shrink-0" aria-hidden /> Ficha: <span className="font-semibold text-foreground">{listingName}</span>
                </p>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full hover:bg-secondary">
                <X className="h-7 w-7" />
              </button>
            </div>

            {state === "sent" ? (
              <div className="grid gap-5 p-5">
                <p className="text-lg">Gracias. Lo revisaremos lo antes posible.</p>
                <button type="button" onClick={close} className="min-h-14 rounded-xl bg-primary text-lg font-semibold text-primary-foreground">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={send} className="grid flex-1 content-start gap-5 p-5">
                <label className="grid gap-2">
                  <span className="text-lg font-semibold">Motivo</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}
                    className="h-14 w-full rounded-xl border-2 bg-background px-3 text-lg focus:border-primary focus:outline-none">
                    {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-lg font-semibold">¿Qué hay que corregir?</span>
                  <textarea required minLength={5} maxLength={1000} rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe el dato correcto…"
                    className="rounded-xl border-2 bg-background p-3 text-lg font-normal focus:border-primary focus:outline-none" />
                </label>

                <label className="grid gap-2">
                  <span className="text-lg font-semibold">Tu teléfono o email <span className="text-base font-normal text-muted-foreground">(opcional)</span></span>
                  <input maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Por si necesitamos consultarte"
                    className="h-14 w-full rounded-xl border-2 bg-background px-3 text-lg font-normal focus:border-primary focus:outline-none" />
                </label>

                {state === "error" && <p className="text-base font-medium text-destructive">No se ha podido enviar. Inténtalo de nuevo.</p>}

                <button type="submit" disabled={state === "sending"} className="mt-auto flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-60 sm:mt-0">
                  <Send className="h-5 w-5" aria-hidden /> {state === "sending" ? "Enviando…" : "Enviar aviso"}
                </button>
                <p className="border-t pt-4 text-center text-base text-muted-foreground">
                  Tu reporte ayuda a mantener actualizado el directorio municipal de Casarabonela. Sin spam ni datos públicos.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
