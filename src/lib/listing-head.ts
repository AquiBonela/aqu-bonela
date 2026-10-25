import { SITE_URL, listingPath, type ListingDetail } from "@/lib/listing-detail";

export function listingHead(loaderData: ListingDetail | undefined) {
  if (!loaderData) {
    return { meta: [{ title: "Ficha no disponible — Aquí Bonela" }, { name: "robots", content: "noindex" }] };
  }
  const l = loaderData;
  const url = SITE_URL + listingPath(l.type, l.slug);
  const title = `${l.name}${l.categoryName ? ` · ${l.categoryName}` : ""} en Casarabonela — Aquí Bonela`;
  const description = (l.description || `${l.name} en Casarabonela.`).slice(0, 155);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "business.business" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
