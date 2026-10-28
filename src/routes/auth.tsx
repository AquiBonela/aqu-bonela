import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso administración · Aquí Bonela" },
      { name: "description", content: "Acceso privado para la administración del directorio Aquí Bonela." },
      { property: "og:title", content: "Acceso administración · Aquí Bonela" },
      { property: "og:description", content: "Acceso privado para la administración del directorio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("Correo o contraseña incorrectos.");
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1 className="font-display text-2xl font-bold">Administración</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acceso solo para el equipo del directorio.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Contraseña</Label>
            <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="h-11 w-full bg-primary font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
