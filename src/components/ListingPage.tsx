import { useEffect, useState } from "react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Images, Mail, MapPin, MessageCircle, Navigation, Phone, Share2, X } from "lucide-react";
import { isFeatured, whatsappUrl } from "@/lib/directory";
import { groupHours, mapsUrl, type ListingDetail } from "@/lib/listing-detail";
import { CollaboratorBadge, TypeLabel, UrgentBadge } from "@/components/ListingCard";
import { ReportDialog } from "@/components/ReportDialog";
import { availabilityTags, hashtag, hoursHidden } from "@/lib/listing-availability";
import { Switch } from "@/components/ui/switch";

export type ReviewField = "address" | "phone" | "whatsapp" | "email" | "hours";
export type ReviewControls = { show: Record<ReviewField, boolean>; onToggle: (f: ReviewField, v: boolean) => void };

function Toggle({ review, field, label }: { review: ReviewControls | undefined; field: ReviewField; label: string }) {
  if (!review) return null;
  const on = review.show[field];
  return (
    <label className="ml-auto flex shrink-0 items-center gap-2 rounded-full border-2 border-primary/40 bg-background px-3 py-1.5 text-sm font-semibold">
      <Switch checked={on} onCheckedChange={(v) => review.onToggle(field, v)} aria-label={`Mostrar ${label}`} />
      {on ? "Se ve" : "Oculto"}
    </label>
  );
}


type GalleryPhoto = { url: string; alt: string };

export function ListingPage({ listing, review }: { listing: ListingDetail; review?: ReviewControls | undefined }) {
  const dim = (f: ReviewField) => (review && !review.show[f] ? "opacity-40 line-through" : "");
  const showHours = review ? listing.hours.length > 0 : listing.hours.length > 0 && !hoursHidden(listing.tags);
  const collaborator = isFeatured(listing);
  const hours = groupHours(listing.hours);
  const today = (new Date().getDay() + 6) % 7;
  const gallery: GalleryPhoto[] = collaborator ? [...listing.gallery_urls.map((url) => ({ url, alt: listing.name })), ...listing.photos] : [];
  const [lightbox, setLightbox] = useState<number | null>(null);

  type C = { icon: typeof Phone; label: string; value: string; field: ReviewField };
  const contact: C[] = [];
  if (listing.public_phone) contact.push({ icon: Phone, label: "Teléfono", value: listing.public_phone, field: "phone" });
  if (listing.public_whatsapp) contact.push({ icon: MessageCircle, label: "WhatsApp", value: listing.public_whatsapp, field: "whatsapp" });
  if (listing.public_email) contact.push({ icon: Mail, label: "Email", value: listing.public_email, field: "email" });

  return (
    <div className={review ? "bg-background" : "listing-page min-h-screen bg-background pb-8"}>
      {!review && <div className="mx-auto max-w-3xl px-4">
        <BackLink className="inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold hover:text-terracotta">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver al directorio
        </BackLink>
      </div>}
      {listing.cover_url && (
        <div className="mx-auto max-w-3xl sm:px-4">
          <img src={listing.cover_url} alt={listing.name} className="aspect-[16/9] w-full object-cover" />
        </div>
      )}
      <header className="mx-auto mt-5 max-w-3xl px-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <TypeLabel type={listing.type} />
            {listing.categoryName && listing.categorySlug && (review ? (
              <span className="bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{listing.categoryName}</span>
            ) : (
              <Link to="/" search={{ q: "", cat: listing.categorySlug, of: "" }} className="bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground hover:underline">
                {listing.categoryName}
              </Link>
            ))}
            {listing.activity && <span className="bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{listing.activity}</span>}
            {collaborator && <CollaboratorBadge />}
          </div>
          <div className="flex max-w-40 flex-col items-end gap-1.5 text-right">
            {listing.urgent_24h && <UrgentBadge />}
            {availabilityTags(listing.tags).map((label) => <UrgentBadge key={label} label={label} />)}
          </div>
        </div>
        <h1 className="mt-3 break-words font-display text-3xl font-extrabold leading-tight sm:text-4xl">{listing.name}</h1>
        {listing.public_address && <div className="mt-3 flex items-center gap-2 text-base font-medium">
          <MapPin className="h-4 w-4 shrink-0 text-terracotta" aria-hidden />
          <span className={dim("address")}>{listing.public_address}</span>
          <Toggle review={review} field="address" label="dirección" />
        </div>}
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

        {contact.length > 0 && (
          <section className="border-t pt-5">
            <ul className="space-y-1.5 text-base">
              {contact.map((c) => (
                <li key={c.label} className="flex items-center gap-2 break-words">
                  <c.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {review ? <span className={dim(c.field)}>{c.value}</span> : <CopyValue label={c.label} value={c.value} />}
                  <Toggle review={review} field={c.field} label={c.label} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {showHours && (
          <section className="border-t pt-5">
            <div className="flex items-center gap-2">
              <h2 className="flex items-center gap-2 font-display font-bold">
                <Clock className="h-5 w-5 text-primary" aria-hidden /> Horario
              </h2>
              <Toggle review={review} field="hours" label="horario" />
            </div>
            <dl className={`mt-2 divide-y ${review && !review.show.hours ? "opacity-40" : ""}`}>
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
                <button
                  key={`${p.url}-${i}`}
                  type="button"
                  onClick={() => setLightbox(i)}
                  aria-label={`Ampliar fotografía ${i + 1} de ${listing.name}`}
                  className={`relative min-w-0 cursor-zoom-in overflow-hidden ${i === gallery.length - 1 && gallery.length % 2 === 1 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}
                >
                  <img src={p.url} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        {!review && <footer className="space-y-3 border-t pt-5">
          {/* Botones de acción en web: apilados encima de «Compartir ficha» */}
          <div className="hidden flex-col gap-3 sm:flex">
            <ActionLinks listing={listing} vertical />
          </div>
          <ShareButton name={listing.name} />
          <ReportDialog listingId={listing.id} listingName={listing.name} />
        </footer>}
      </main>

      {/* Botonera fija inferior: solo en móvil */}
      {!review && <nav
        aria-label="Contactar"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur sm:hidden"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <ActionLinks listing={listing} />
        </div>
      </nav>}

      {lightbox !== null && gallery.length > 0 && (
        <Lightbox photos={gallery} initial={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function ActionLinks({ listing, vertical = false }: { listing: ListingDetail; vertical?: boolean }) {
  const shape = vertical ? "w-full rounded-xl" : "flex-1";
  return (
    <>
      {listing.public_phone && (
        <a href={`tel:${listing.public_phone}`} className={`flex min-h-12 ${shape} items-center justify-center gap-1.5 whitespace-nowrap text-sm border bg-card font-semibold hover:bg-secondary`}>
          <Phone className="h-5 w-5" aria-hidden /> Llamar
        </a>
      )}
      {listing.public_whatsapp && (
        <a
          href={whatsappUrl(listing.public_whatsapp, listing.name)}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex min-h-12 ${shape} items-center justify-center gap-1.5 whitespace-nowrap text-sm bg-primary font-semibold text-primary-foreground hover:bg-primary/90`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden /> Mensaje
        </a>
      )}
      {listing.public_address && (
        <a
          href={mapsUrl(listing.public_address)}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex min-h-12 ${shape} items-center justify-center gap-1.5 whitespace-nowrap text-sm border bg-card font-semibold hover:bg-secondary`}
        >
          <Navigation className="h-5 w-5" aria-hidden /> Cómo llegar
        </a>
      )}
    </>
  );
}

function Lightbox({ photos, initial, onClose }: { photos: GalleryPhoto[]; initial: number; onClose: () => void }) {
  const [index, setIndex] = useState(initial);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  useEffect(() => setZoom(false), [index]);
  const pointTo = (clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100));
    setOrigin(`${x}% ${y}%`);
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  const photo = photos[index];
  if (!photo) return null;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div role="dialog" aria-modal="true" aria-label="Fotografía ampliada" className="fixed inset-0 z-50 flex flex-col bg-foreground/95" onClick={onClose}>
      <div className="flex items-center justify-between p-3" onClick={stop}>
        <span className="text-sm font-semibold text-background">{index + 1} / {photos.length}</span>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center text-background">
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center gap-1 px-2 pb-6">
        {photos.length > 1 && (
          <button type="button" onClick={(e) => { stop(e); setIndex((i) => (i - 1 + photos.length) % photos.length); }} aria-label="Fotografía anterior" className="flex h-11 w-11 shrink-0 items-center justify-center text-background">
            <ChevronLeft className="h-8 w-8" aria-hidden />
          </button>
        )}
        <div className="relative flex max-h-[75vh] max-w-full items-center justify-center overflow-hidden" onClick={stop}>
          <img
            src={photo.url}
            alt={photo.alt}
            draggable={false}
            className={`max-h-[75vh] max-w-full object-contain transition-transform duration-200 ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            style={{ transform: zoom ? "scale(2.5)" : "scale(1)", transformOrigin: origin, touchAction: zoom ? "none" : "pan-y" }}
            onClick={(e) => { pointTo(e.clientX, e.clientY, e.currentTarget); setZoom((z) => !z); }}
            onMouseMove={(e) => { if (zoom) pointTo(e.clientX, e.clientY, e.currentTarget); }}
            onTouchMove={(e) => { const t = e.touches[0]; if (zoom && t) pointTo(t.clientX, t.clientY, e.currentTarget); }}
          />
        </div>
        {photos.length > 1 && (
          <button type="button" onClick={(e) => { stop(e); setIndex((i) => (i + 1) % photos.length); }} aria-label="Fotografía siguiente" className="flex h-11 w-11 shrink-0 items-center justify-center text-background">
            <ChevronRight className="h-8 w-8" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* sin permiso */ }
  };
  return (
    <button type="button" onClick={copy} title="Toca para copiar" className="select-text text-left hover:text-primary">
      <span className="font-semibold">{label}:</span> {value}
      <span aria-live="polite" className="ml-2 text-sm font-semibold text-primary">{copied ? "Copiado ✓" : ""}</span>
    </button>
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

/** Vuelve atrás conservando búsqueda y filtros; si se entró directo, va a la portada. */
function BackLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <Link
      to="/"
      className={className}
      onClick={(e) => {
        if (!canGoBack) return;
        e.preventDefault();
        router.history.back();
      }}
    >
      {children}
    </Link>
  );
}
