import { useEffect, useState } from "react";
import { Flag, X, PencilLine, Store, ShieldCheck, Send, Contact } from "lucide-react";
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
              <form onSubmit={send} className="grid flex-1 content-start gap-6 p-5">
                <fieldset className="grid gap-3">
                  <legend className="mb-3 text-lg font-semibold">Motivo principal de la corrección</legend>
                  <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                    {REASONS.map((r) => {
                      const active = reason === r;
                      return (
                        <label key={r} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-base font-medium transition-colors ${active ? "border-primary bg-secondary text-foreground" : "border-border bg-background hover:border-primary/50"}`}>
                          <input type="radio" name="reason" value={r} checked={active} onChange={() => setReason(r)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
                          {r}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="grid gap-2">
                  <span className="flex items-baseline justify-between gap-2 text-lg font-semibold">
                    Detalle de la corrección
                    <span className="text-sm font-medium text-muted-foreground">Obligatorio</span>
                  </span>
                  <textarea required minLength={5} maxLength={1000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Indica con detalle la información corregida o actualizada para que podamos revisarla…"
                    className="rounded-xl border-2 bg-background p-3 text-lg font-normal focus:border-primary focus:outline-none" />
                </label>

                <label className="grid gap-2">
                  <span className="text-lg font-semibold">Teléfono o email de contacto <span className="text-base font-normal text-muted-foreground">(opcional)</span></span>
                  <span className="relative">
                    <Contact className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <input maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ej. vecino@bonela.es o 654 321 000"
                      className="h-14 w-full rounded-xl border-2 bg-background pl-11 pr-3 text-lg font-normal focus:border-primary focus:outline-none" />
                  </span>
                  <span className="text-base text-muted-foreground">Solo por si necesitamos contrastar el dato.</span>
                </label>

                <div className="flex gap-3 rounded-xl bg-secondary p-4 text-base">
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
                  <p>Tu aviso ayuda a mantener actualizado el directorio colaborativo de Casarabonela. Sin spam ni datos públicos.</p>
                </div>

                {state === "error" && <p className="text-base font-medium text-destructive">No se ha podido enviar. Inténtalo de nuevo.</p>}

                <button type="submit" disabled={state === "sending"} className="mt-auto flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-60">
                  <Send className="h-5 w-5" aria-hidden /> {state === "sending" ? "Enviando…" : "Enviar aviso"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
