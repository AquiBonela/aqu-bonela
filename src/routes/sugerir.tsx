import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/sugerir")({
  head: () => ({
    meta: [
      { title: "Sugerir un comercio o profesional — Aquí Bonela" },
      { name: "description", content: "¿Conoces un comercio o profesional de Casarabonela que debería estar en Aquí Bonela? Cuéntanoslo." },
      { property: "og:title", content: "Sugerir un comercio o profesional — Aquí Bonela" },
      { property: "og:description", content: "Ayúdanos a completar el directorio local de Casarabonela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sugerir,
});

function Sugerir() {
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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold">Sugerir un comercio o profesional</h1>
        <p className="mt-4 text-base leading-relaxed">
          Durante el piloto preparamos cada ficha en persona con su titular. Si conoces un comercio o profesional de
          Casarabonela que debería aparecer aquí, cuéntanoslo y nos pondremos en contacto.
        </p>

        {state === "sent" ? (
          <div className="mt-8 border bg-secondary/40 p-5">
            <p className="font-display text-lg font-bold">Gracias por la sugerencia</p>
            <p className="mt-2 text-sm">La revisaremos y, si encaja, contactaremos con su titular.</p>
          </div>
        ) : (
          <form onSubmit={send} className="mt-8 grid gap-4 border p-5">
            <label className="grid gap-1 text-sm font-medium">
              Nombre del comercio o profesional
              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Panadería El Horno"
                className="h-11 border bg-background px-2 text-base font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Correo o teléfono (opcional)
              <input
                maxLength={160}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Por si necesitamos aclarar algo"
                className="h-11 border bg-background px-2 text-base font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              ¿Qué nos quieres contar?
              <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dónde está, a qué se dedica, por qué crees que encaja en el directorio…"
                className="border bg-background p-2 text-base font-normal"
              />
            </label>
            {state === "error" && (
              <p className="text-sm text-destructive">No se ha podido enviar. Inténtalo de nuevo.</p>
            )}
            <button
              type="submit"
              disabled={state === "sending"}
              className="min-h-12 bg-primary font-semibold text-primary-foreground disabled:opacity-60"
            >
              {state === "sending" ? "Enviando…" : "Enviar sugerencia"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
