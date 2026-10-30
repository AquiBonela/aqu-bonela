import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/sugerir")({
  head: () => ({
    meta: [
      { title: "Enviar información — Aquí Bonela" },
      { name: "description", content: "Ayúdanos a mantener Casarabonela conectado y actualizado: envíanos negocios, lugares, eventos, noticias o correcciones." },
      { property: "og:title", content: "Enviar información — Aquí Bonela" },
      { property: "og:description", content: "Ayúdanos a mantener Casarabonela conectado y actualizado." },
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
        <h1 className="font-display text-3xl font-extrabold text-pretty">¿Conoces algo que debería estar en Aquí Bonela?</h1>

        <div className="mt-5 grid gap-3 text-base leading-relaxed">
          <p>
            Puedes enviarnos información sobre comercios, profesionales, lugares de interés, eventos, noticias o
            cualquier otro contenido que consideres útil para Casarabonela.
          </p>
          <p>
            También puedes comunicarnos errores, sugerir cambios o contarnos cómo podemos mejorar Aquí Bonela.
          </p>
          <p>Toda aportación es bienvenida. Revisaremos la información antes de publicarla.</p>
        </div>

        {state === "sent" ? (
          <div className="mt-8 border bg-secondary/40 p-5">
            <p className="font-display text-lg font-bold">Gracias por tu aportación</p>
            <p className="mt-2 text-sm">La revisaremos y, si encaja, la publicaremos en Aquí Bonela.</p>
          </div>
        ) : (
          <form onSubmit={send} className="mt-8 grid gap-4 border p-5">
            <label className="grid gap-1 text-sm font-medium">
              ¿De qué se trata?
              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Un comercio, un lugar, un evento…"
                className="h-11 border bg-background px-2 text-base font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Tu nombre, teléfono o correo (opcional)
              <input
                maxLength={160}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Por si necesitamos aclarar algo"
                className="h-11 border bg-background px-2 text-base font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Cuéntanoslo
              <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dónde está, a qué se dedica, horarios, teléfono, cualquier detalle…"
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
              {state === "sending" ? "Enviando…" : "Enviar información"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
