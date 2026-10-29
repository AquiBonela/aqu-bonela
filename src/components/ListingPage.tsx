import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Images, Mail, MapPin, MessageCircle, Navigation, Phone, Share2 } from "lucide-react";
import { isFeatured, whatsappUrl } from "@/lib/directory";
import { groupHours, mapsUrl, type ListingDetail } from "@/lib/listing-detail";
import { CollaboratorBadge, TypeLabel, UrgentBadge } from "@/components/ListingCard";
import { ReportDialog } from "@/components/ReportDialog";
import { availabilityTags, hashtag } from "@/lib/listing-availability";

export function ListingPage({ listing }: { listing: ListingDetail }) {
  const collaborator = isFeatured(listing);
  const hours = groupHours(listing.hours);
  const today = (new Date().getDay() + 6) % 7;
  const gallery = collaborator ? [...listing.gallery_urls.map((url) => ({ url, alt: listing.name })), ...listing.photos] : [];

  return (
    <div className="listing-page min-h-screen bg-background pb-8">
      <div className="mx-auto max-w-3xl px-4">
        <Link to="/" search={{ q: "", cat: "", of: "" }} className="inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold hover:text-terracotta">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver al directorio
        </Link>
      </div>
      {listing.cover_url && (
        <div className="mx-auto max-w-3xl sm:px-4">
          <img src={listing.cover_url} alt={listing.name} className="aspect-[16/9] w-full object-cover" />
        </div>
      )}
      <header className="mx-auto mt-5 max-w-3xl px-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <TypeLabel type={listing.type} />
            {listing.categoryName && listing.categorySlug && (
              <Link to="/" search={{ q: "", cat: listing.categorySlug, of: "" }} className="bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground hover:underline">
                {listing.categoryName}
              </Link>
            )}
            {listing.activity && <span className="bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{listing.activity}</span>}
            {collaborator && <CollaboratorBadge />}
          </div>
          <div className="flex max-w-40 flex-col items-end gap-1.5 text-right">
            {listing.urgent_24h && <UrgentBadge />}
            {availabilityTags(listing.tags).map((label) => <UrgentBadge key={label} label={label} />)}
          </div>
        </div>
        <h1 className="mt-3 break-words font-display text-3xl font-extrabold leading-tight sm:text-4xl">{listing.name}</h1>
        {listing.public_address && <p className="mt-3 flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-terracotta" aria-hidden />
          <span>{listing.public_address} · Casarabonela</span>
        </p>}
      </header>

      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
        <div className="space-y-4">
          {listing.description && <p className="whitespace-pre-line text-base text-pretty leading-relaxed">{listing.description}</p>}
          {listing.labels.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Etiquetas">
              {listing.labels.map((t) => (
                <li key={t} className="bg-hashtag px-2 py-0.5 text-xs font-semibold text-hashtag-foreground">{hashtag(t)}</li>
              ))}
            </ul>
          )}
        </div>

        {listing.hours.length > 0 && (
          <section className="border-t pt-5">
            <h2 className="flex items-center gap-2 font-display font-bold">
              <Clock className="h-5 w-5 text-primary" aria-hidden /> Horario
            </h2>
            <dl className="mt-2 divide-y">
              {hours.map((h, i) => (
                <div key={h.day} className={`flex justify-between gap-4 py-2 ${i === today ? "font-semibold" : ""}`}>
                  <dt>{h.day}{i === today && <span className="sr-only"> (hoy)</span>}</dt>
                  <dd className={h.slots.length ? "" : "text-muted-foreground"}>
                    {h.slots.length ? h.slots.join(" · ") : "Cerrado"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {gallery.length > 0 && (
          <section aria-labelledby="fotos">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 id="fotos" className="flex min-w-0 items-center gap-2 font-display font-bold"><Images className="h-5 w-5 shrink-0 text-primary" aria-hidden /> Galería</h2>
              <span className="shrink-0 text-xs text-muted-foreground">{gallery.length} {gallery.length === 1 ? "fotografía" : "fotografías"}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {gallery.map((p, i) => (
                <figure key={`${p.url}-${i}`} className={`relative min-w-0 overflow-hidden ${i === gallery.length - 1 && gallery.length % 2 === 1 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}>
                  <img src={p.url} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
                </figure>
              ))}
            </div>
          </section>
        )}

        {listing.public_email && (
          <a href={`mailto:${listing.public_email}`} className="inline-flex min-h-12 items-center gap-2 text-base font-semibold hover:text-terracotta">
            <Mail className="h-5 w-5 text-primary" aria-hidden /> {listing.public_email}
          </a>
        )}

        <footer className="space-y-3 border-t pt-5">
          <ShareButton name={listing.name} />
          <ReportDialog listingId={listing.id} listingName={listing.name} />
          <p className="text-xs font-semibold text-muted-foreground">Directorio municipal participativo de Casarabonela</p>
        </footer>
      </main>

      <nav
        aria-label="Contactar"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          {listing.public_phone && (
            <a href={`tel:${listing.public_phone}`} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap text-sm border bg-card font-semibold hover:bg-secondary">
              <Phone className="h-5 w-5" aria-hidden /> Llamar
            </a>
          )}
          {listing.public_whatsapp && (
            <a
              href={whatsappUrl(listing.public_whatsapp, listing.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap text-sm bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <MessageCircle className="h-5 w-5" aria-hidden /> Mensaje
            </a>
          )}
          {listing.public_address && (
            <a
              href={mapsUrl(listing.public_address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap text-sm border bg-card font-semibold hover:bg-secondary"
            >
              <Navigation className="h-5 w-5" aria-hidden /> Cómo llegar
            </a>
          )}
        </div>
      </nav>
    </div>
  );
}

function ShareButton({ name }: { name: string }) {
  const share = async () => {
    const url = window.location.href;
    const text = `${name} en Aquí Bonela`;
    if (navigator.share) {
      try { await navigator.share({ title: name, text, url }); } catch { /* cancelado */ }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, "_blank", "noopener,noreferrer");
  };
  return (
    <button type="button" onClick={share} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border bg-card px-4 text-base font-semibold hover:bg-secondary">
      <Share2 className="h-5 w-5" aria-hidden /> Compartir ficha
    </button>
  );
}

export function ListingNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="font-display text-2xl font-bold">Esta ficha no está disponible</h1>
      <p className="text-muted-foreground">Puede que se haya retirado o que el enlace no sea correcto.</p>
      <Link to="/" className="inline-flex min-h-11 items-center bg-primary px-4 font-semibold text-primary-foreground">
        Ver el directorio
      </Link>
    </div>
  );
}
