/**
 * Cuánto tiempo se reutiliza cada tipo de dato antes de volver a pedirlo a Supabase.
 * Una sola tabla para toda la web, para no repartir cifras por el código.
 *
 * Capas de caché (sin dependencias nuevas):
 * - Servidor: la identidad y las cabeceras (site_config) se guardan 60 s por instalación
 *   (site-config.server.ts), con el último valor bueno si Supabase falla.
 * - Navegador, React Query: los datos públicos se reutilizan entre páginas durante estos plazos;
 *   lo que cambia la administración en esta sesión invalida su clave al guardar.
 * - Archivos de /marca/: inmutables (cada subida es una dirección nueva); el manifiesto, 5 min.
 * Nada privado se guarda en cachés compartidas: las respuestas públicas del servidor no llevan
 * datos de sesión, y los datos del panel solo viven en la memoria de la sesión que los pide.
 * Cada instalación tiene su dominio y su Supabase, así que ninguna caché mezcla municipios.
 */
const MINUTE = 60_000;

export const CACHE = {
  /** Por defecto: suficiente para navegar sin repetir consultas, corto para no quedar obsoleto. */
  default: { staleTime: 60_000, gcTime: 15 * MINUTE },
  /** Directorio completo (categorías, actividades y fichas publicadas): cambia poco. */
  directory: { staleTime: 5 * MINUTE, gcTime: 30 * MINUTE },
  /** Ficha pública concreta. */
  listing: { staleTime: 2 * MINUTE, gcTime: 15 * MINUTE },
  /** Guías de trámites publicadas. */
  procedures: { staleTime: 10 * MINUTE, gcTime: 30 * MINUTE },
  /** Precarga al pasar por encima de un enlace: se reutiliza si la visita llega pronto. */
  preload: 30_000,
} as const;
