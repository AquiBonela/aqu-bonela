import { brand, getMunicipality } from "@/config/municipality";

/** Metadatos de las páginas legales. */
export function legalHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — ${getMunicipality().appName}` },
      { name: "description", content: brand(description) },
      { property: "og:title", content: `${title} — ${getMunicipality().appName}` },
      { property: "og:description", content: brand(description) },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
