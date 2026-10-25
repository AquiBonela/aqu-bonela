import { Briefcase, MessageCircle, Phone, Star, Store } from "lucide-react";
import { whatsappUrl, type Listing } from "@/lib/directory";
import { cn } from "@/lib/utils";

export function TypeBadge({ type }: { type: Listing["type"] }) {
  const pro = type === "profesional";
  const Icon = pro ? Briefcase : Store;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        pro ? "bg-accent text-accent-foreground" : "bg-secondary text-primary",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {pro ? "Profesional" : "Comercio"}
    </span>
  );
}

export function ListingCard({
  listing,
  categoryName,
  featured,
}: {
  listing: Listing;
  categoryName?: string | undefined;
  featured: boolean;
}) {
  return (
    <article
      className={cn(
        "flex gap-3 rounded-[var(--radius)] border bg-card p-4 text-card-foreground",
        featured && "border-terracotta/50 shadow-sm",
      )}
    >
      {featured && (
        <div
          aria-hidden
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-2xl font-extrabold text-accent-foreground"
        >
          {listing.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={listing.type} />
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-terracotta px-2 py-0.5 text-xs font-semibold text-terracotta-foreground">
              <Star className="h-3 w-3" aria-hidden /> Destacado
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-display text-lg font-bold leading-tight">{listing.name}</h3>
        {categoryName && <p className="text-sm text-muted-foreground">{categoryName}</p>}
        <p className="mt-1 line-clamp-2 text-sm">{listing.description}</p>
        {(listing.public_phone || listing.public_whatsapp) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {listing.public_phone && (
              <a
                href={`tel:${listing.public_phone}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold hover:bg-secondary"
                aria-label={`Llamar a ${listing.name}`}
              >
                <Phone className="h-4 w-4" aria-hidden /> Llamar
              </a>
            )}
            {listing.public_whatsapp && (
              <a
                href={whatsappUrl(listing.public_whatsapp, listing.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                aria-label={`Escribir por WhatsApp a ${listing.name}`}
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
