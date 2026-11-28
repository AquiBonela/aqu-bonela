/**
 * Base común para la analítica futura (etapa 2B: preparada, no activada). Apto para navegador.
 *
 * - Un único listener delegado clasifica los clics por el propio enlace (teléfono, WhatsApp,
 *   correo, enlace externo) y por atributos `data-analytics` opcionales, así que medir no obliga a
 *   tocar cada página ni componente.
 * - No hay proveedor configurado: `installLinkTracking` no se monta en ningún sitio todavía. Activarlo
 *   exigirá un proveedor sin cookies o con consentimiento, y aparecer en la política de privacidad.
 * - Privacidad: nunca se envían el número, el correo ni la URL completa; solo el tipo de enlace, la
 *   ruta de la página y, si existe, el identificador público de la ficha (`data-analytics-listing`).
 *   Se respeta «No rastrear» (Do Not Track / Global Privacy Control).
 */

export type AnalyticsEvent =
  | { kind: "page_view"; path: string }
  | { kind: "search"; path: string; resultCount: number }
  | { kind: "listing_view"; path: string; listing: string }
  | {
      kind: "contact_click";
      channel: "phone" | "whatsapp" | "email";
      path: string;
      listing?: string;
    }
  | { kind: "external_click"; host: string; path: string; listing?: string }
  | { kind: "section_click"; section: string; path: string };

export type AnalyticsSender = (event: AnalyticsEvent) => void;

/** Tipo de un enlace a partir de su href, sin conservar datos personales. */
export function classifyLink(
  href: string,
  origin: string,
): { channel: "phone" | "whatsapp" | "email" } | { host: string } | null {
  const value = href.trim();
  if (/^tel:/i.test(value)) return { channel: "phone" };
  if (/^mailto:/i.test(value)) return { channel: "email" };
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return null;
  }
  if (url.hostname === "wa.me" || url.hostname.endsWith(".whatsapp.com"))
    return { channel: "whatsapp" };
  if (url.origin === new URL(origin).origin || !/^https?:$/.test(url.protocol)) return null;
  return { host: url.hostname };
}

/** El visitante ha pedido no ser rastreado. */
export function trackingDeclined(nav: {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
}) {
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/**
 * Escucha los clics de toda la página y envía eventos de contacto, enlaces externos y secciones.
 * Devuelve la función para dejar de escuchar. Sin `send`, no hace nada.
 */
export function installLinkTracking(send: AnalyticsSender | undefined, doc: Document = document) {
  const win = doc.defaultView;
  if (!send || !win || trackingDeclined(win.navigator as never)) return () => {};
  const onClick = (event: MouseEvent) => {
    const target =
      event.target instanceof Element ? event.target.closest("a, [data-analytics]") : null;
    if (!target) return;
    const path = win.location.pathname;
    const listing =
      target.closest("[data-analytics-listing]")?.getAttribute("data-analytics-listing") ??
      undefined;
    const section = target.getAttribute("data-analytics");
    if (section) send({ kind: "section_click", section, path });
    const href = target.getAttribute("href");
    if (!href) return;
    const link = classifyLink(href, win.location.origin);
    if (!link) return;
    if ("channel" in link)
      send({ kind: "contact_click", channel: link.channel, path, ...(listing ? { listing } : {}) });
    else send({ kind: "external_click", host: link.host, path, ...(listing ? { listing } : {}) });
  };
  doc.addEventListener("click", onClick, { capture: true });
  return () => doc.removeEventListener("click", onClick, { capture: true });
}
