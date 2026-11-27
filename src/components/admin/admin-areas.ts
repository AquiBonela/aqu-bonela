import {
  Building2,
  FileText,
  House,
  LayoutList,
  Settings,
  Store,
  type LucideIcon,
} from "lucide-react";
import { brand } from "@/config/municipality";

/** Rutas del panel a las que enlaza la navegación por áreas. */
export type AdminRoute =
  | "/admin"
  | "/admin/directorio"
  | "/admin/avisos"
  | "/admin/sugerencias"
  | "/admin/identidad"
  | "/admin/secciones"
  | "/admin/contenidos"
  | "/admin/tramites"
  | "/admin/configuracion";

/** Bandejas con elementos sin atender, cuyo número se muestra junto al enlace. */
export type AdminCounter = "reports" | "suggestions";

export type AdminSection = {
  to: AdminRoute;
  label: string;
  /** Prefijos de ruta que pertenecen a esta pestaña, además de `to`. */
  paths?: string[];
  counter?: AdminCounter;
};

export type AdminArea = {
  id: "inicio" | "directorio" | "identidad" | "secciones" | "contenidos" | "configuracion";
  label: string;
  description: string;
  to: AdminRoute;
  icon: LucideIcon;
  /** Pestañas internas del área; solo se muestran si hay más de una. */
  sections: AdminSection[];
  /** Módulo aún sin funciones propias: su pantalla solo lo presenta. */
  pending?: boolean;
};

const HOME_SECTION: AdminSection = { to: "/admin", label: "Inicio" };

const HOME_AREA: AdminArea = {
  id: "inicio",
  label: "Inicio",
  description: "Resumen del municipio y tareas pendientes.",
  to: "/admin",
  icon: House,
  sections: [HOME_SECTION],
};

export const ADMIN_AREAS: readonly AdminArea[] = [
  HOME_AREA,
  {
    id: "directorio",
    label: "Directorio",
    description: "Fichas, avisos de visitantes y sugerencias.",
    to: "/admin/directorio",
    icon: Store,
    sections: [
      { to: "/admin/directorio", label: "Fichas", paths: ["/admin/fichas"] },
      { to: "/admin/avisos", label: "Avisos", counter: "reports" },
      { to: "/admin/sugerencias", label: "Sugerencias", counter: "suggestions" },
    ],
  },
  {
    id: "identidad",
    label: "Identidad municipal",
    description: "Nombre, datos institucionales y ubicación del municipio.",
    to: "/admin/identidad",
    icon: Building2,
    sections: [{ to: "/admin/identidad", label: "Identidad municipal" }],
  },
  {
    id: "secciones",
    label: "Secciones y menús",
    description: "Secciones visibles de la web y orden de los menús.",
    to: "/admin/secciones",
    icon: LayoutList,
    sections: [{ to: "/admin/secciones", label: "Secciones y menús" }],
    pending: true,
  },
  {
    id: "contenidos",
    label: "Páginas y contenidos",
    description: "Páginas informativas y guías de trámites.",
    to: "/admin/contenidos",
    icon: FileText,
    sections: [
      { to: "/admin/contenidos", label: "General" },
      { to: "/admin/tramites", label: "Trámites" },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    description: "Portada, datos legales, avisos y ajustes del panel.",
    to: "/admin/configuracion",
    icon: Settings,
    sections: [{ to: "/admin/configuracion", label: "Configuración" }],
  },
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function cleanPath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** Pestaña interna que corresponde a una ruta del panel, si la hay. */
export function adminSectionForPath(pathname: string): AdminSection | undefined {
  const path = cleanPath(pathname);
  for (const area of ADMIN_AREAS) {
    // Inicio es "/admin", prefijo de todo el panel: solo corresponde a esa ruta exacta.
    if (area === HOME_AREA) continue;
    const section = area.sections.find((s) =>
      [s.to, ...(s.paths ?? [])].some((prefix) => matches(path, prefix)),
    );
    if (section) return section;
  }
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
