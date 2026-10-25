import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, MessageCircle, Navigation, Phone, Star } from "lucide-react";
import { isFeatured, whatsappUrl } from "@/lib/directory";
import { groupHours, mapsUrl, type ListingDetail } from "@/lib/listing-detail";
import { TypeBadge } from "@/components/ListingCard";

export function ListingPage({ listing }: { listing: ListingDetail }) {
  const featured = isFeatured(listing);
  const hours = groupHours(listing.hours);
  const today = (new Date().getDay() + 6) % 7;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-primary px-4 pb-6 pt-4 text-primary-foreground">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold opacity-90 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Volver al directorio
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TypeBadge type={listing.type} />
            {featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-terracotta px-2 py-0.5 text-xs font-semibold text-terracotta-foreground">
                <Star className="h-3 w-3" aria-hidden /> Destacado
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{listing.name}</h1>
          {listing.categoryName && listing.categorySlug && (
            <Link
              to="/"
              search={{ q: "", cat: listing.categorySlug }}
              className="mt-1 inline-block text-sm font-medium underline-offset-4 opacity-90 hover:underline"
            >
              {listing.categoryName}
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
        {listing.photos.length > 0 && (
          <section aria-label="Fotos" className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4">
            {listing.photos.map((p) => (
              <img
                key={p.url}
                src={p.url}
                alt={p.alt}
                loading="lazy"
                className="h-56 w-[85%] shrink-0 snap-center rounded-[var(--radius)] object-cover sm:w-80"
              />
            ))}
          </section>
        )}

        {listing.description && <p className="text-base leading-relaxed">{listing.description}</p>}

        {listing.public_address && (
          <section className="rounded-[var(--radius)] border bg-card p-4">
            <h2 className="flex items-center gap-2 font-display font-bold">
              <MapPin className="h-5 w-5 text-primary" aria-hidden /> Dirección
            </h2>
            <p className="mt-1">{listing.public_address}, Casarabonela</p>
          </section>
        )}

        {listing.hours.length > 0 && (
          <section className="rounded-[var(--radius)] border bg-card p-4">
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
      </main>

      <nav
        aria-label="Contactar"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          {listing.public_phone && (
            <a href={`tel:${listing.public_phone}`} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border bg-card font-semibold hover:bg-secondary">
              <Phone className="h-5 w-5" aria-hidden /> Llamar
            </a>
          )}
          {listing.public_whatsapp && (
            <a
              href={whatsappUrl(listing.public_whatsapp, listing.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <MessageCircle className="h-5 w-5" aria-hidden /> WhatsApp
            </a>
          )}
          {listing.public_address && (
            <a
              href={mapsUrl(listing.public_address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border bg-card font-semibold hover:bg-secondary"
            >
              <Navigation className="h-5 w-5" aria-hidden /> Cómo llegar
            </a>
          )}
        </div>
      </nav>
    </div>
  );
}

export function ListingNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="font-display text-2xl font-bold">Esta ficha no está disponible</h1>
      <p className="text-muted-foreground">Puede que se haya retirado o que el enlace no sea correcto.</p>
      <Link to="/" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-primary-foreground">
        Ver el directorio
      </Link>
    </div>
  );
}
