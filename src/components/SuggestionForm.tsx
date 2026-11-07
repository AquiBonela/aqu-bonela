import { Text, useI18n } from "@/lib/i18n";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SuggestionForm({ business = false }: { business?: boolean }) {
  const { tr, locale } = useI18n();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await supabase
      .from("suggestions")
      .insert({ name: name.trim(), contact: contact.trim() || null, message: message.trim() });
    setState(error ? "error" : "sent");
  };

  return (
    <div>
        {state === "sent" ? (
          <div className="mt-8 border bg-secondary/40 p-5">
            <p className="font-display text-lg font-bold"><Text text="Gracias por tu aportación" /></p>
            <p className="mt-2 text-sm"><Text text="La revisaremos y, si encaja, la publicaremos en Aquí Bonela." /></p>
          </div>
        ) : (
          <form onSubmit={send} className="mt-6 grid gap-4">
            <label className="grid gap-1 text-sm font-medium">
              {tr(business ? "Nombre del negocio o servicio" : "¿De qué se trata?")}
              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={business ? "Nombre de tu comercio o actividad" : "Un comercio, un lugar, un evento…"}
                className="h-11 border bg-background px-2 text-base font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
               <Text text="Tu nombre, teléfono o correo (opcional)" /> <input
                maxLength={160}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={tr("Por si necesitamos aclarar algo")}
                className="h-11 border bg-background px-2 text-base font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
               <Text text="Cuéntanoslo" /> <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={tr("Dónde está, a qué se dedica, horarios, teléfono, cualquier detalle…")}
                className="border bg-background p-2 text-base font-normal"
              />
            </label>
            {state === "error" && (
              <p className="text-sm text-destructive"><Text text="No se ha podido enviar. Inténtalo de nuevo." /></p>
            )}
            <Button
              type="submit"
              disabled={state === "sending"}
              className="min-h-12 bg-primary font-semibold text-primary-foreground disabled:opacity-60"
            >
              {tr(state === "sending" ? "Enviando…" : "Enviar información")}
            </Button>
          </form>
        )}
    </div>
  );
}
