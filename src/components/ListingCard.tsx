import { HeartHandshake } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Listing } from "@/lib/directory";
import { cn } from "@/lib/utils";
import { availabilityTags } from "@/lib/listing-availability";

export const typeLabel = (t: Listing["type"]) => (t === "profesional" ? "Profesional" : "Comercio");

export function TypeLabel({ type, className }: { type: Listing["type"]; className?: string }) {
  const pro = type === "profesional";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold uppercase",
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
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-sm font-semibold text-accent-foreground">
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
  const marks = [...(listing.urgent_24h ? ["Urgencias 24h"] : []), ...availabilityTags(listing.tags)];
  return (
    <article className={cn("relative flex overflow-hidden rounded-soft transition-transform duration-200 hover:scale-[1.015] motion-reduce:transition-none motion-reduce:hover:scale-100 border border-l-[6px] bg-card text-card-foreground", pro ? "border-l-terracotta" : "border-l-primary")}>
      <div className="flex min-w-0 flex-1 flex-col">
      {collaborator && listing.cover_url && (
        <img src={listing.cover_url} alt="" loading="lazy" className="h-40 w-full object-cover sm:h-48" />
      )}
      <div className="min-w-0 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TypeLabel type={listing.type} />
          {collaborator && <CollaboratorBadge />}
        </div>
        <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-foreground">
          <Link
            to={pro ? "/profesionales/$slug" : "/comercios/$slug"}
            params={{ slug: listing.slug }}
            className="after:absolute after:inset-0"
          >
            {listing.name}
          </Link>
        </h3>
        {subtitle && <p className={cn("mt-1 text-base font-bold", pro ? "text-terracotta" : "text-primary")}>{subtitle}</p>}
        <p className="mt-2 line-clamp-3 text-[17px] leading-relaxed text-foreground">{listing.short_description || listing.description}</p>
      </div>
      </div>
      {marks.length > 0 && (
        <div className="flex shrink-0 divide-x divide-availability-border border-l border-availability-border bg-availability text-availability-foreground" aria-label={marks.join(", ")}>
          {marks.map((m) => (
            <span key={m} className="flex w-9 items-center justify-center py-3" aria-hidden>
              <span className="whitespace-nowrap text-sm font-bold uppercase tracking-wide [writing-mode:vertical-rl] rotate-180">
                {m.toLowerCase().startsWith("urgencias") ? "⚡ " : ""}{m}
              </span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export function UrgentBadge({ label = "Urgencias 24h" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-availability-border bg-availability px-2.5 py-1 text-sm font-semibold text-availability-foreground">
      <span className="h-2 w-2 shrink-0 rounded-full bg-availability-foreground" aria-hidden /> {label}
    </span>
  );
}
