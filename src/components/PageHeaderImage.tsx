import type { HeaderImage } from "@/lib/page-headers";

/**
 * Imagen de cabecera adaptada: versión ligera en móvil, encuadre elegido en el editor y carga
 * prioritaria cuando está arriba de la página. Ocupa el contenedor (que debe ser relative).
 */
export function PageHeaderImage({
  image,
  priority = false,
  decorative = false,
  className = "absolute inset-0 h-full w-full object-cover",
}: {
  image: HeaderImage;
  priority?: boolean;
  /** Imagen de adorno (tarjetas): sin texto alternativo para lectores de pantalla. */
  decorative?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src={image.src}
      alt={decorative ? "" : image.alt}
      aria-hidden={decorative || undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      style={{ objectPosition: image.position }}
      className={className}
    />
  );
  if (!image.srcSmall) return img;
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={image.srcSmall} type="image/webp" />
      {img}
    </picture>
  );
}
