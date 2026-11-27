import { listingPath, siteUrl, type ListingDetail } from "@/lib/listing-detail";
import { brand } from "@/config/municipality";

export function listingHead(loaderData: ListingDetail | undefined) {
  if (!loaderData) {
    return {
      meta: [
        { title: brand("Ficha no disponible — {app}") },
        { name: "description", content: "Esta ficha no está disponible." },
        { property: "og:title", content: brand("Ficha no disponible — {app}") },
        { property: "og:description", content: "Esta ficha no está disponible." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  }
  const l = loaderData;
  const url = siteUrl() + listingPath(l.type, l.slug);
  const title = `${l.name}${l.categoryName ? ` · ${l.categoryName}` : ""}${brand(" en {municipio} — {app}")}`;
  const description = (l.description || `${l.name}${brand(" en {municipio}.")}`).slice(0, 155);
  const image = listingShareImage(l.cover_url);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "business.business" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      ...(image
        ? [
            { property: "og:image", content: image },
            { name: "twitter:image", content: image },
            { property: "og:image:alt", content: l.name },
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Uploaded covers are already resized WebP; size legacy remote photos for sharing. */
export function listingShareImage(cover: string | null): string | null {
  if (!cover) return null;
  try {
    const url = new URL(cover);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "images.unsplash.com") {
      url.searchParams.set("w", "1200");
      url.searchParams.set("h", "630");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("auto", "format");
      url.searchParams.set("q", "80");
    }
    return url.href;
  } catch {
    return null;
  }
}
