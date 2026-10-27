import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { isFeatured, whatsappUrl } from "@/lib/directory";
import { groupHours, mapsUrl, type ListingDetail } from "@/lib/listing-detail";
import { CollaboratorBadge, TypeLabel } from "@/components/ListingCard";
import { ReportDialog } from "@/components/ReportDialog";
import { cn } from "@/lib/utils";

export function ListingPage({ listing }: { listing: ListingDetail }) {
  const collaborator = isFeatured(listing);
  const hours = groupHours(listing.hours);
  const today = (new Date().getDay() + 6) % 7;
  const pro = listing.type === "profesional";
  const gallery = collaborator ? [...listing.gallery_urls.map((url) => ({ url, alt: listing.name })), ...listing.photos] : [];

  return (
    <div className="min-h-screen bg-background pb-28">
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
      <header className={cn("mx-auto mt-5 max-w-3xl border-l-4 px-4", pro ? "border-terracotta" : "border-primary")}>
        <div className="flex flex-wrap items-center gap-2">
          <TypeLabel type={listing.type} />
          {collaborator && <CollaboratorBadge />}
        </div>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{listing.name}</h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {listing.categoryName && listing.categorySlug && (
            <Link to="/" search={{ q: "", cat: listing.categorySlug, of: "" }} className="hover:underline">
              {listing.categoryName}
            </Link>
          )}
          {listing.activity && ` · ${listing.activity}`}
        </p>
      </header>

      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
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
            <a href={`tel:${listing.public_phone}`} className="flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm border bg-card font-semibold hover:bg-secondary">
              <Phone className="h-5 w-5" aria-hidden /> Llamar
            </a>
          )}
          {listing.public_whatsapp && (
            <a
              href={whatsappUrl(listing.public_whatsapp, listing.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <MessageCircle className="h-5 w-5" aria-hidden /> WhatsApp
            </a>
          )}
          {listing.public_address && (
            <a
              href={mapsUrl(listing.public_address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm border bg-card font-semibold hover:bg-secondary"
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
