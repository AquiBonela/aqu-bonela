import { Text, useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { reviewQuery, sendCorrection, submitReview } from "@/lib/review.functions";
import { listingPath, type ListingDetail } from "@/lib/listing-detail";
import { ListingPage } from "@/components/ListingPage";
import { hoursHidden } from "@/lib/listing-availability";
import {
  submitErrorMessage,
  type Hour,
  type ReviewContact,
  type ReviewListing,
} from "@/lib/review";
import { Textarea } from "@/components/ui/textarea";
import { brand, getMunicipality } from "@/config/municipality";
import { composeAddress } from "@/lib/listing-details";
import { REVIEW_TERMS, REVIEW_TERMS_VERSION } from "@/lib/listing-review";

export const Route = createFileRoute("/revision/$token")({
  head: () => ({
    meta: [
      { title: brand("Revisión de ficha · {app}") },
      {
        name: "description",
        content: brand(
          "Revisa y autoriza la publicación de tu ficha en el directorio de {municipio}.",
        ),
      },
      { property: "og:title", content: brand("Revisión de ficha · {app}") },
      { property: "og:description", content: "Revisa y autoriza la publicación de tu ficha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(reviewQuery(params.token)),
  component: Page,
  errorComponent: () => (
    <div role="alert" className="p-8 text-center">
      <Text text="No hemos podido cargar esta página." />
    </div>
  ),
});

function Page() {
  const { tr, locale } = useI18n();
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(reviewQuery(token));
  const [approvedUrl, setApprovedUrl] = useState<string | null>(null);

  if (!data.ok) {
    return (
      <Shell>
        <Estado
          title={data.reason === "expired" ? "El enlace ha caducado" : "El enlace no es válido"}
          text={tr("Pide al administrador que te envíe uno nuevo por WhatsApp.")}
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
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-baseline justify-between">
          <span className="font-display text-lg font-bold">{getMunicipality().appName}</span>
          <span className="text-xs uppercase tracking-widest text-foreground">
            <Text text="Revisión de ficha" />
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}

function Estado({ title, text }: { title: string; text: string }) {
  const { tr, locale } = useI18n();
  return (
    <div className="space-y-3 py-10 text-center">
      <CircleAlert className="mx-auto h-10 w-10 text-terracotta" />
      <h1 className="font-display text-2xl font-bold">{tr(title)}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Done({ url }: { url: string | null }) {
  return (
    <div className="space-y-4 py-10 text-center">
      <BadgeCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="font-display text-2xl font-bold">
        <Text text="¡Gracias! Tu ficha está autorizada" />
      </h1>
      <p className="text-sm text-muted-foreground">
        <Text text="Ya aparece publicada en el directorio de {municipio}. Puedes cerrar esta página." />
      </p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          <Text text="Ver mi ficha" />{" "}
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
  const { tr, locale } = useI18n();
  const submit = useServerFn(submitReview);
  const [show, setShow] = useState({
    phone: contact?.show_phone ?? true,
    phone_2: contact?.show_phone_2 ?? true,
    whatsapp: contact?.show_whatsapp ?? true,
    address: contact?.show_address ?? true,
    email: contact?.show_email ?? true,
    linkedin: contact?.show_linkedin ?? true,
    facebook: contact?.show_facebook ?? true,
    youtube: contact?.show_youtube ?? true,
    x_twitter: contact?.show_x_twitter ?? true,
    instagram: contact?.show_instagram ?? true,
    tiktok: contact?.show_tiktok ?? true,
    hours: !hoursHidden(listing.tags),
    website: contact?.show_website ?? true,
    service_area: listing.show_service_area ?? true,
  });
  const exactAddress = composeAddress(contact ?? {});
  const locality = [contact?.postal_code, contact?.locality].filter(Boolean).join(" ");
  // Si no quiere publicar la dirección exacta, puede publicar solo la zona aproximada.
  const [approximate, setApproximate] = useState(contact?.show_approximate_location ?? false);
  const preview: ListingDetail = {
    ...listing,
    public_phone: contact?.phone || null,
    public_phone_2: contact?.phone_2 || null,
    public_whatsapp: contact?.whatsapp || null,
    public_address: exactAddress || null,
    public_locality: locality || null,
    public_website: contact?.website || listing.public_website || null,
    public_home_service: listing.home_service ?? false,
    public_service_area: listing.service_area ?? "",
    cover_alt: listing.cover_alt ?? "",
    hours_note: listing.hours_note ?? "",
    periods: listing.periods ?? [],
    public_email: contact?.email || null,
    public_linkedin: contact?.linkedin || null,
    public_facebook: contact?.facebook || null,
    public_youtube: contact?.youtube || null,
    public_x_twitter: contact?.x_twitter || null,
    public_instagram: contact?.instagram || null,
    public_tiktok: contact?.tiktok || null,
    hours,
  };
  const [comment, setComment] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const correct = useServerFn(sendCorrection);

  async function notify() {
    setBusy(true);
    try {
      const res = await correct({ data: { token, comment: comment.trim() } });
      if (res.ok) setSent(true);
      else toast.error(tr(submitErrorMessage(res.reason)));
    } catch {
      toast.error(tr("No se pudo enviar. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    try {
      const res = await submit({
        data: {
          token,
          show_phone: show.phone,
          show_phone_2: show.phone_2,
          show_whatsapp: show.whatsapp,
          show_address: show.address,
          show_email: show.email,
          show_linkedin: show.linkedin,
          show_facebook: show.facebook,
          show_youtube: show.youtube,
          show_x_twitter: show.x_twitter,
          show_instagram: show.instagram,
          show_tiktok: show.tiktok,
          show_hours: show.hours,
          show_website: show.website,
          show_service_area: show.service_area,
          show_approximate_location: !show.address && approximate,
          accepted_terms: true,
        },
      });
      if (res.ok) {
        toast.success(
          tr(
            res.published === false
              ? "Ficha autorizada. La publicaremos en breve."
              : "Ficha autorizada y publicada",
          ),
        );
        onApproved(res.url);
      } else {
        toast.error(tr(submitErrorMessage(res.reason)));
      }
    } catch {
      toast.error(tr("No se pudo guardar. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold">
            <Text text="Revisa tu ficha" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Text text="Comprueba que todo está bien, elige qué datos se publican y autoriza. Este enlace caduca el" />{" "}
            {new Date(expiresAt).toLocaleDateString(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        </div>

        <p className="rounded-xl bg-secondary px-4 py-3 text-base text-secondary-foreground">
          <Text text="Así se verá tu ficha. Usa los interruptores" />{" "}
          <strong>
            <Text text="«Se ve / Oculto»" />
          </strong>{" "}
          <Text text="para elegir qué datos aparecen." />{" "}
        </p>
      </div>

      <div className="-mx-4 border-y py-4">
        <ListingPage
          review={{ show, onToggle: (f, v) => setShow((p) => ({ ...p, [f]: v })) }}
          listing={preview}
        />
      </div>

      <div className="space-y-5">
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="font-display text-lg font-bold">
            <Text text="Si todo está correcto" />
          </h2>
          {exactAddress && !show.address && locality && (
            <label className="flex items-start gap-2 text-base">
              <input
                type="checkbox"
                checked={approximate}
                onChange={(e) => setApproximate(e.target.checked)}
                className="mt-1 h-5 w-5"
              />
              <span>
                <Text text="Mostrar solo la zona aproximada (localidad y un mapa con un kilómetro de margen), sin calle ni número." />
              </span>
            </label>
          )}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-semibold">
              <Text text="Condiciones de publicación" />
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {REVIEW_TERMS.map((term) => (
                <li key={term}>
                  <Text text={term} />
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">{`Versión ${REVIEW_TERMS_VERSION}`}</p>
          </div>
          <label className="flex items-start gap-2 text-base">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span>
              <Text text="Confirmo que soy el titular de este negocio, acepto las condiciones y autorizo la publicación de los datos marcados en {app}." />
            </span>
          </label>
          <button
            onClick={approve}
            disabled={busy || !agree}
            className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {tr(busy ? "Enviando…" : "Autorizo la publicación de estos datos")}
          </button>
        </section>

        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="font-display text-lg font-bold">
            <Text text="Si algo no es correcto" />
          </h2>
          {sent ? (
            <p className="text-base">
              <Text text="Mensaje enviado. Corregiremos la ficha y te enviaremos un enlace nuevo para que la revises." />
            </p>
          ) : (
            <>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={tr("Escribe qué hay que corregir")}
                aria-label={tr("Qué hay que corregir")}
                className="text-base"
              />
              <button
                onClick={notify}
                disabled={busy || comment.trim().length < 5}
                className="h-12 w-full rounded-xl border bg-card text-base font-semibold disabled:opacity-60"
              >
                <Text text="Avisar al administrador" />{" "}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
