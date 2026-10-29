import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { reviewQuery, submitReview } from "@/lib/review.functions";
import { groupHours, listingPath } from "@/lib/listing-detail";
import type { Hour, ReviewContact, ReviewListing } from "@/lib/review";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/revision/$token")({
  head: () => ({
    meta: [
      { title: "Revisión de ficha · Aquí Bonela" },
      { name: "description", content: "Revisa y autoriza la publicación de tu ficha en el directorio de Casarabonela." },
      { property: "og:title", content: "Revisión de ficha · Aquí Bonela" },
      { property: "og:description", content: "Revisa y autoriza la publicación de tu ficha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(reviewQuery(params.token)),
  component: Page,
  errorComponent: () => <div role="alert" className="p-8 text-center">No hemos podido cargar esta página.</div>,
});

function Page() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(reviewQuery(token));
  const [approvedUrl, setApprovedUrl] = useState<string | null>(null);

  if (!data.ok) {
    return (
      <Shell>
        <Estado
          title={data.reason === "expired" ? "El enlace ha caducado" : "El enlace no es válido"}
          text="Pide al administrador que te envíe uno nuevo por WhatsApp."
        />
      </Shell>
    );
  }
  if (data.done || approvedUrl !== null) {
    return (
      <Shell>
        <Done url={approvedUrl ?? listingPath(data.listing.type, data.listing.slug)} />
      </Shell>
    );
  }
  return (
    <Shell>
      <ReviewForm
        token={token}
        listing={data.listing}
        contact={data.contact}
        hours={data.hours}
        expiresAt={data.expiresAt}
        onApproved={setApprovedUrl}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-baseline justify-between">
          <span className="font-display text-lg font-bold">Aquí Bonela</span>
          <span className="text-xs uppercase tracking-widest text-accent">Revisión de ficha</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}

function Estado({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-3 py-10 text-center">
      <CircleAlert className="mx-auto h-10 w-10 text-terracotta" />
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Done({ url }: { url: string | null }) {
  return (
    <div className="space-y-4 py-10 text-center">
      <BadgeCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="font-display text-2xl font-bold">¡Gracias! Tu ficha está autorizada</h1>
      <p className="text-sm text-muted-foreground">Ya aparece publicada en el directorio de Casarabonela. Puedes cerrar esta página.</p>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center bg-primary px-5 text-sm font-medium text-primary-foreground">
          Ver mi ficha
        </a>
      )}
    </div>
  );
}

function ReviewForm({
  token,
  listing,
  contact,
  hours,
  expiresAt,
  onApproved,
}: {
  token: string;
  listing: ReviewListing;
  contact: ReviewContact | null;
  hours: Hour[];
  expiresAt: string;
  onApproved: (url: string | null) => void;
}) {
  const submit = useServerFn(submitReview);
  const [show, setShow] = useState({
    phone: contact?.show_phone ?? true,
    whatsapp: contact?.show_whatsapp ?? true,
    address: contact?.show_address ?? true,
    email: contact?.show_email ?? true,
  });
  const [comment, setComment] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      const res = await submit({
        data: {
          token,
          show_phone: show.phone,
          show_whatsapp: show.whatsapp,
          show_address: show.address,
          show_email: show.email,
          comment: comment.trim() || undefined,
        },
      });
      if (res.ok) {
        toast.success("Ficha autorizada y publicada");
        onApproved(res.url);
      } else {
        toast.error(res.reason === "expired" ? "El enlace ha caducado." : "El enlace ya no es válido.");
      }
    } catch {
      toast.error("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Revisa tu ficha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comprueba que todo está bien, elige qué datos se publican y autoriza. Este enlace caduca el{" "}
          {new Date(expiresAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>

      <article className="border">
        {listing.cover_url && <img src={listing.cover_url} alt={listing.name} className="h-44 w-full object-cover" />}
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`border px-2 py-0.5 ${listing.type === "comercio" ? "border-primary text-primary" : "border-terracotta text-terracotta"}`}>
              {listing.type === "comercio" ? "Comercio" : "Profesional"}
            </span>
            {listing.categoryName && <span className="text-muted-foreground">{listing.categoryName}</span>}
            {listing.activity && <span className="text-muted-foreground">· {listing.activity}</span>}
            {listing.urgent_24h && <span className="border border-destructive px-2 py-0.5 text-destructive">Urgencias 24h</span>}
          </div>
          <h2 className="font-display text-xl font-bold">{listing.name}</h2>
          {listing.description && <p className="text-sm text-foreground/80">{listing.description}</p>}
          {listing.labels.length > 0 && <p className="text-xs text-muted-foreground">{listing.labels.join(" · ")}</p>}
          {hours.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {groupHours(hours)
                .filter((g) => g.slots.length > 0)
                .map((g) => (
                  <p key={g.day}>
                    {g.day}: {g.slots.join(", ")}
                  </p>
                ))}
            </div>
          )}
        </div>
      </article>

      <fieldset className="space-y-3 border p-4">
        <legend className="px-1 text-sm font-medium">¿Qué datos autorizas publicar?</legend>
        <DataRow label="Teléfono" value={contact?.phone ?? null} show={show.phone} onChange={(v) => setShow((p) => ({ ...p, phone: v }))} />
        <DataRow label="WhatsApp" value={contact?.whatsapp ?? null} show={show.whatsapp} onChange={(v) => setShow((p) => ({ ...p, whatsapp: v }))} />
        <DataRow label="Dirección" value={contact?.address ?? null} show={show.address} onChange={(v) => setShow((p) => ({ ...p, address: v }))} />
        <DataRow label="Email" value={contact?.email ?? null} show={show.email} onChange={(v) => setShow((p) => ({ ...p, email: v }))} />
        <p className="text-xs text-muted-foreground">Si desmarcas un dato, dejará de verse en la ficha pública.</p>
      </fieldset>

      <Textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentario para el administrador (opcional)"
        aria-label="Comentario para el administrador"
      />

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>Confirmo que soy el titular de este negocio y autorizo la publicación de los datos marcados en Aquí Bonela.</span>
      </label>

      <button
        onClick={approve}
        disabled={busy || !agree}
        className="h-12 w-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Enviando…" : "Autorizo la publicación de estos datos"}
      </button>
      <p className="text-xs text-muted-foreground">
        Si algo no es correcto, no autorices: escribe un comentario en el cuadro de arriba y avisa al administrador.
      </p>
    </div>
  );
}

function DataRow({ label, value, show, onChange }: { label: string; value: string | null; show: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">
        {label}:{" "}
        {value ? <span className="font-medium">{value}</span> : <span className="text-muted-foreground">sin dato</span>}
      </span>
      {value && (
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={show} onCheckedChange={onChange} /> Publicar
        </label>
      )}
    </div>
  );
}
