import {
  Building2,
  Compass,
  House,
  Landmark,
  LayoutTemplate,
  Newspaper,
  Settings,
  Store,
  type LucideIcon,
} from "lucide-react";
import { brand } from "@/config/municipality";

/** Rutas del panel a las que enlaza la navegación por áreas. */
export type AdminRoute =
  | "/admin"
  | "/admin/identidad"
  | "/admin/portada"
  | "/admin/portada/aviso"
  | "/admin/portada/accesos"
  | "/admin/directorio"
  | "/admin/directorio/presentacion"
  | "/admin/avisos"
  | "/admin/sugerencias"
  | "/admin/servicios-publicos"
  | "/admin/tramites"
  | "/admin/actualidad"
  | "/admin/descubre"
  | "/admin/configuracion"
  | "/admin/configuracion/secciones"
  | "/admin/configuracion/legal"
  | "/admin/configuracion/ajustes";

/** Bandejas con elementos sin atender, cuyo número se muestra junto al enlace. */
export type AdminCounter = "reports" | "suggestions";

export type AdminSection = {
  to: AdminRoute;
  label: string;
  /** Prefijos de ruta que pertenecen a esta pestaña, además de `to`. */
  paths?: string[];
  counter?: AdminCounter;
};

export type AreaId =
  | "inicio"
  | "identidad"
  | "portada"
  | "directorio"
  | "servicios-publicos"
  | "actualidad"
  | "descubre"
  | "configuracion";

export type AdminArea = {
  id: AreaId;
  label: string;
  description: string;
  to: AdminRoute;
  icon: LucideIcon;
  /** Pestañas internas del área; solo se muestran si hay más de una. */
  sections: AdminSection[];
};

const HOME_SECTION: AdminSection = { to: "/admin", label: "Inicio" };

const HOME_AREA: AdminArea = {
  id: "inicio",
  label: "Inicio",
  description: "Estado del portal, publicación municipal y tareas pendientes.",
  to: "/admin",
  icon: House,
  sections: [HOME_SECTION],
};

/**
 * Estructura del panel: ocho áreas con responsabilidades separadas. En las páginas públicas,
 * «Configuración» organiza la página (secciones y cabecera) y las demás pestañas editan su
 * contenido. El Directorio publica con la aceptación del titular; el resto del contenido
 * municipal, con la conformidad del Ayuntamiento.
 */
export const ADMIN_AREAS: readonly AdminArea[] = [
  HOME_AREA,
  {
    id: "identidad",
    label: "Identidad municipal",
    description: "Nombre, datos institucionales, ubicación, logotipo y colores.",
    to: "/admin/identidad",
    icon: Building2,
    sections: [{ to: "/admin/identidad", label: "Identidad municipal" }],
  },
  {
    id: "portada",
    label: "Portada",
    description: "Imagen de cabecera, aviso temporal y accesos directos de la página principal.",
    to: "/admin/portada",
    icon: LayoutTemplate,
    sections: [
      { to: "/admin/portada", label: "Presentación" },
      { to: "/admin/portada/aviso", label: "Aviso" },
      { to: "/admin/portada/accesos", label: "Accesos directos" },
    ],
  },
  {
    id: "directorio",
    label: "Directorio",
    description: "Fichas, revisión de titulares, correcciones y sugerencias.",
    to: "/admin/directorio",
    icon: Store,
    sections: [
      { to: "/admin/directorio", label: "Fichas", paths: ["/admin/fichas"] },
      { to: "/admin/avisos", label: "Correcciones", counter: "reports" },
      { to: "/admin/sugerencias", label: "Sugerencias", counter: "suggestions" },
      { to: "/admin/directorio/presentacion", label: "Presentación" },
    ],
  },
  {
    id: "servicios-publicos",
    label: "Servicios públicos",
    description: "Secciones de la página y Guía de trámites.",
    to: "/admin/servicios-publicos",
    icon: Landmark,
    sections: [
      { to: "/admin/servicios-publicos", label: "Configuración" },
      { to: "/admin/tramites", label: "Guía de trámites" },
    ],
  },
  {
    id: "actualidad",
    label: "Actualidad",
    description: "Secciones y cabecera de la página.",
    to: "/admin/actualidad",
    icon: Newspaper,
    sections: [{ to: "/admin/actualidad", label: "Configuración" }],
  },
  {
    id: "descubre",
    label: "Descubre",
    description: "Secciones y cabecera de la página.",
    to: "/admin/descubre",
    icon: Compass,
    sections: [{ to: "/admin/descubre", label: "Configuración" }],
  },
  {
    id: "configuracion",
    label: "Configuración",
    description: "Menú, secciones, datos legales y ajustes generales.",
    to: "/admin/configuracion",
    icon: Settings,
    sections: [
      { to: "/admin/configuracion", label: "Menú" },
      { to: "/admin/configuracion/secciones", label: "Secciones" },
      { to: "/admin/configuracion/legal", label: "Datos legales" },
      { to: "/admin/configuracion/ajustes", label: "Ajustes" },
    ],
  },
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function cleanPath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** Pestaña interna que corresponde a una ruta del panel: la de prefijo más largo, si la hay. */
export function adminSectionForPath(pathname: string): AdminSection | undefined {
  const path = cleanPath(pathname);
  let best: { section: AdminSection; length: number } | undefined;
  for (const area of ADMIN_AREAS) {
    // Inicio es "/admin", prefijo de todo el panel: solo corresponde a esa ruta exacta.
    if (area === HOME_AREA) continue;
    for (const section of area.sections)
      for (const prefix of [section.to, ...(section.paths ?? [])])
        if (matches(path, prefix) && (!best || prefix.length > best.length))
          best = { section, length: prefix.length };
  }
  if (best) return best.section;
  return path === "/admin" ? HOME_SECTION : undefined;
}

/** Área del panel a la que pertenece una ruta; Inicio si no pertenece a ninguna. */
export function adminAreaForPath(pathname: string): AdminArea {
  const section = adminSectionForPath(pathname);
  return (section && ADMIN_AREAS.find((a) => a.sections.includes(section))) ?? HOME_AREA;
}

/** Metadatos comunes de las pantallas del panel: nunca se indexan. */
export function adminHead(title: string, description: string) {
  const fullTitle = brand(`${title} · Administración {app}`);
  const fullDescription = brand(description);
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: fullDescription },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: fullDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  };
}
