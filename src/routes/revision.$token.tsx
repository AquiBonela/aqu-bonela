import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { reviewQuery, submitReview } from "@/lib/review.functions";
import { listingPath, type ListingDetail } from "@/lib/listing-detail";
import { ListingPage } from "@/components/ListingPage";
import { hoursHidden } from "@/lib/listing-availability";
import type { Hour, ReviewContact, ReviewListing } from "@/lib/review";
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
    hours: !hoursHidden(listing.tags),
  });
  const preview: ListingDetail = {
    ...listing,
    public_phone: contact?.phone || null,
    public_whatsapp: contact?.whatsapp || null,
    public_address: contact?.address || null,
    public_email: contact?.email || null,
    hours,
  };
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
          show_hours: show.hours,
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
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Revisa tu ficha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comprueba que todo está bien, elige qué datos se publican y autoriza. Este enlace caduca el{" "}
          {new Date(expiresAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>

      <p className="rounded-xl bg-secondary px-4 py-3 text-base text-secondary-foreground">
        Así se verá tu ficha. Usa los interruptores <strong>«Se ve / Oculto»</strong> para elegir qué datos aparecen.
      </p>
    </div>

    <div className="-mx-4 border-y py-4">
      <ListingPage review={{ show, onToggle: (f, v) => setShow((p) => ({ ...p, [f]: v })) }} listing={preview} />
    </div>

    <div className="space-y-5">
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
    </div>
  );
}
