import { Text, useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import type { Listing } from "@/lib/directory";
import { cn } from "@/lib/utils";
import { availabilityTags } from "@/lib/listing-availability";
import { listingText } from '@/lib/content-translations';

const typeLabel = (t: Listing["type"]) =>
  t === "profesional" ? "Profesional" : t === "publico" ? "Servicio público" : t === "asociacion" ? "Asociación" : "Comercio";

/** Clases de color por tipo: franja, texto y etiqueta. */
const typeTheme = (t: Listing["type"]) =>
  t === "profesional"
    ? { border: "border-l-terracotta", text: "text-terracotta", chip: "bg-accent text-terracotta" }
    : t === "publico"
      ? { border: "border-l-civic", text: "text-civic", chip: "bg-civic-soft text-civic" }
      : t === "asociacion"
        ? { border: "border-l-community", text: "text-community", chip: "bg-community-soft text-community" }
        : { border: "border-l-primary", text: "text-primary", chip: "bg-secondary text-primary" };

export function TypeLabel({ type, className }: { type: Listing["type"]; className?: string }) {
  const { tr } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold uppercase",
        typeTheme(type).chip,
        className,
      )}
    >
      {tr(typeLabel(type))}
    </span>
  );
}

function actionText(l: Listing, tr: (text: string) => string) {
  const parts = [l.public_phone && tr("teléfono"), l.public_whatsapp && "WhatsApp", l.public_address && tr("ubicación")].filter(Boolean) as string[];
  if (!parts.length) return `${tr("Ver ficha")} →`;
  const last = parts.pop();
  return `${tr("Ver")} ${parts.length ? parts.join(", ") + tr(" y ") : ""}${last} →`;
}

export function ListingCard({
  listing,
  categoryName,
  highlighted,
}: {
  listing: Listing;
  categoryName?: string | undefined;
  highlighted: boolean;
}) {
  const { tr, locale, lang } = useI18n();
  const theme = typeTheme(listing.type);
  const subtitle = [categoryName, listing.activity].filter((value): value is string => Boolean(value)).map((x) => tr(x)).join(" · ");
  const marks = [...(listing.urgent_24h ? ["Urgencias 24h"] : []), ...availabilityTags(listing.tags)];
  return (
    <article className={cn("relative flex overflow-hidden rounded-soft transition-transform duration-200 hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100 border border-l-[6px] bg-card text-card-foreground", theme.border)}>
      <div className="flex min-w-0 flex-1 flex-col">
      {highlighted && listing.cover_url && (
        <img src={listing.cover_url} alt="" loading="lazy" className="h-40 w-full object-cover sm:h-48" />
      )}
      <div className="min-w-0 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TypeLabel type={listing.type} />
        </div>
        <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-foreground">
          <Link
            to={listing.type === "profesional" ? "/profesionales/$slug" : listing.type === "publico" ? "/servicios/$slug" : listing.type === "asociacion" ? "/asociaciones/$slug" : "/comercios/$slug"}
            params={{ slug: listing.slug }}
            className="after:absolute after:inset-0"
          >
            {listing.name}
          </Link>
        </h3>
        {subtitle && <p className={cn("mt-1 text-base font-bold", theme.text)}>{tr(subtitle)}</p>}
        <p className="mt-2 line-clamp-3 text-[17px] leading-relaxed text-pretty text-foreground">{listingText(listing, lang, 'short_description') || listingText(listing, lang, 'description')}</p>
        <p className={cn("mt-3 text-base font-bold", theme.text)} aria-hidden>
          {actionText(listing, tr)}
        </p>
      </div>
      </div>
      {marks.length > 0 && (
        <div className="flex shrink-0 divide-x divide-availability-border border-l border-availability-border bg-availability text-availability-foreground" aria-label={marks.map((x) => tr(x)).join(", ")}>
          {marks.map((m) => (
            <span key={m} className="flex w-9 items-center justify-center py-3" aria-hidden>
              <span className="whitespace-nowrap text-sm font-bold uppercase tracking-wide [writing-mode:vertical-rl] rotate-180">
                {m.toLowerCase().startsWith("urgencias") ? "⚡ " : ""}{tr(m)}
              </span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export function UrgentBadge({ label = "Urgencias 24h" }: { label?: string }) {
  const { tr, locale } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 border border-availability-border bg-availability px-2.5 py-1 text-sm font-semibold text-availability-foreground">
      <span className="h-2 w-2 shrink-0 rounded-full bg-availability-foreground" aria-hidden /> {tr(label)}
    </span>
  );
}
