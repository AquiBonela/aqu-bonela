import { HeartHandshake } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Listing } from "@/lib/directory";
import { cn } from "@/lib/utils";
import { availabilityTags, hashtag } from "@/lib/listing-availability";

export const typeLabel = (t: Listing["type"]) => (t === "profesional" ? "Profesional" : "Comercio");

export function TypeLabel({ type, className }: { type: Listing["type"]; className?: string }) {
  const pro = type === "profesional";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase",
        pro ? "bg-accent text-terracotta" : "bg-secondary text-primary",
        className,
      )}
    >
      {typeLabel(type)}
    </span>
  );
}

export function CollaboratorBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
      <HeartHandshake className="h-3.5 w-3.5" aria-hidden /> Colaborador
    </span>
  );
}

export function ListingCard({
  listing,
  categoryName,
  collaborator,
}: {
  listing: Listing;
  categoryName?: string | undefined;
  collaborator: boolean;
}) {
  const pro = listing.type === "profesional";
  const subtitle = [categoryName, listing.activity].filter(Boolean).join(" · ");
  return (
    <article className="relative flex border bg-card text-card-foreground">
      <span aria-hidden className={cn("w-1.5 shrink-0", pro ? "bg-terracotta" : "bg-primary")} />
      {collaborator && listing.cover_url && (
        <img
          src={listing.cover_url}
          alt=""
          loading="lazy"
          className="w-28 shrink-0 self-stretch object-cover sm:w-36"
        />
      )}
      <div className="min-w-0 flex-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <TypeLabel type={listing.type} />
          {collaborator && <CollaboratorBadge />}
          {listing.urgent_24h && <UrgentBadge />}
          {availabilityTags(listing.tags).map((label) => <UrgentBadge key={label} label={label} />)}
        </div>
        <h3 className="mt-1 font-display text-lg font-bold leading-tight">
          <Link
            to={pro ? "/profesionales/$slug" : "/comercios/$slug"}
            params={{ slug: listing.slug }}
            className="after:absolute after:inset-0 hover:underline"
          >
            {listing.name}
          </Link>
        </h3>
        {subtitle && <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>}
        <p className="mt-1 line-clamp-2 text-sm">{listing.short_description || listing.description}</p>
        {listing.labels.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5 border-t pt-3" aria-label="Etiquetas">
            {listing.labels.slice(0, 3).map((t) => (
              <li key={t} className="bg-hashtag px-2 py-0.5 text-xs font-semibold text-hashtag-foreground">
                {hashtag(t)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function UrgentBadge({ label = "Urgencias 24h" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-availability-border bg-availability px-2 py-0.5 text-xs font-semibold text-availability-foreground">
      <span className="h-2 w-2 shrink-0 rounded-full bg-availability-foreground" aria-hidden /> {label}
    </span>
  );
}
