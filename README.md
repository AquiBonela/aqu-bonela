# Conecta tu Pueblo

**Plataforma digital municipal desarrollada por Groundwork.**

Conecta tu Pueblo es un producto tecnológico orientado a mejorar el acceso a la información, los servicios y la actividad de los municipios. Su objetivo es facilitar la conexión entre vecinos, visitantes, comercios, profesionales, asociaciones y administraciones locales.

El objetivo es que cada municipio disponga de un portal con identidad visual, dominio y configuración propios sobre una base tecnológica común. **La replicación a otros municipios todavía no se ha probado**: hoy solo existe una implantación.

> **Nombres en uso.** Producto: *Conecta tu Pueblo*. Repositorio: `daflagel/conecta_tu_pueblo`. Paquete npm: `groundwork-municipal-platform`. Proyecto en Lovable y URL provisional del piloto: `bonela-local-finds`. Los tres se refieren a este mismo código.

## 1. Producto y municipio piloto

| | Qué es |
|---|---|
| **Conecta tu Pueblo** | Producto común: código, funcionalidades, esquema de base de datos y plantilla de instalación. Lo desarrolla y mantiene Groundwork. |
| **Aquí Bonela** | Portal de **Casarabonela** (Málaga), primer municipio piloto. Es hoy la única instancia, en `instances/casarabonela/`. |

Gran parte del repositorio sigue siendo específica del piloto:

- `supabase/migrations/` es el **historial de la base de datos de Casarabonela**, no una instalación genérica (ver apartado 6).
- Recursos de `src/assets/` y `public/` (logos, imágenes, favicon, manifiesto PWA).
- Contenido escrito en el código: guías de trámites, servicios públicos, teléfonos, páginas Descubre y Sobre, textos legales y parte de los diccionarios de traducción.

Separar este contenido del código común es trabajo pendiente ([roadmap.md](roadmap.md), Bloque A, Prioridad 4).

**Titularidad.** Groundwork desarrolla y mantiene el producto. Quién es el titular legal de cada portal se define en cada instalación y **todavía no está resuelto**: el aviso legal actual de Aquí Bonela lo describe como una iniciativa privada gestionada por una persona física, y la plantilla de instalación no presupone que el titular sea Groundwork ni el Ayuntamiento. El modelo debe revisarse con asesoramiento legal antes de comercializar el servicio (roadmap, Bloque A, Prioridad 4). Ningún portal es una web oficial del Ayuntamiento.

## 2. Objetivos

- Centralizar información municipal útil.
- Facilitar el descubrimiento de comercios y profesionales locales.
- Mejorar el acceso a servicios públicos y recursos municipales.
- Dar visibilidad a asociaciones, actividades y acontecimientos.
- Mantener información organizada, accesible y actualizada.

## 3. Tecnología

| Ámbito | Tecnología |
|---|---|
| Framework | **TanStack Start** (React 19, SSR, rutas por archivos en `src/routes/`, funciones de servidor con `createServerFn`) |
| Datos en cliente | TanStack Query |
| Interfaz | Tailwind CSS 4, componentes Radix (estilo shadcn en `src/components/ui/`) |
| Validación | Zod |
| Base de datos, autenticación y archivos | Supabase (PostgreSQL con RLS, Auth, Storage con buckets privados) |
| Pruebas | Vitest + Testing Library |
| Gestor de paquetes | Bun (CI con 1.4.5 y lockfile congelado) |
| Build | `@lovable.dev/vite-tanstack-config` sobre Vite; incluye Nitro con Cloudflare como destino por defecto |
| Desarrollo asistido | Lovable (sincronizado con este repositorio, ver apartado 8) |

**Idiomas públicos:** español (origen), inglés, alemán, neerlandés, francés y ucraniano. Las traducciones se sirven desde catálogos guardados en `src/lib/locales/` y desde la base de datos; las visitas no generan llamadas de traducción. El panel de administración está solo en español.

**Servicios externos de los que depende el producto:**

- **Supabase:** crítico; sin él no funciona nada.
- **Cloudflare Turnstile:** obligatorio para los formularios públicos (sugerencias y avisos). Sin configurarlo, los formularios no envían.
- **Pasarela de IA de Lovable** (`ai.gateway.lovable.dev`): opcional; solo la usa la traducción asistida del panel. Eliminar esta dependencia está pendiente (roadmap, Prioridad 5).
- **Open-Meteo:** el clima de la cabecera.

### Despliegue: pendiente de confirmar

**No está confirmado dónde se despliega el piloto.** La documentación anterior indicaba Vercel, y el código contempla Vercel para obtener la IP del visitante (`src/lib/antispam.server.ts`). Sin embargo, la configuración de build usa Cloudflare como destino por defecto, no existe `vercel.json` y `siteUrl` apunta todavía a la URL provisional de Lovable. Hasta confirmarlo (roadmap, Bloque A, Prioridad 1), no hay un procedimiento de despliegue documentado.

## 4. Estructura del repositorio

| Ruta | Contenido |
|---|---|
| `src/routes/` | Páginas (rutas por archivos). `_authenticated/admin/` es el panel de administración. |
| `src/components/` | Componentes compartidos; `admin/` para el panel y `ui/` para la base de interfaz. |
| `src/lib/` | Lógica de dominio, funciones de servidor (`*.functions.ts`, `*.server.ts`) e i18n. |
| `instances/<id>/` | Configuración (`config.ts`), contenido estable (`content.ts`), recursos (`assets/`) y archivos públicos (`public/`) de cada municipio. Contrato en `instances/schema.ts`. `instances/demo/` es un municipio ficticio y la instancia predeterminada. |
| `src/config/municipality.ts` | Acceso del código común a la instancia compilada. |
| `src/integrations/supabase/` | Clientes de Supabase (navegador y servidor) y tipos generados. |
| `supabase/migrations/` | Historial de migraciones de **Casarabonela**. |
| `supabase/template/` | Plantilla de instalación limpia para un proyecto Supabase nuevo. |
| `supabase/tests/` | Pruebas SQL de permisos por rol que se deshacen con rollback. |
| `.github/workflows/ci.yml` | Integración continua. |

## 5. Desarrollo local

Requisitos: Bun (el CI usa la versión 1.4.5) y acceso a un proyecto Supabase.

Scripts definidos en `package.json`:

```sh
bun install --frozen-lockfile   # dependencias (igual que en CI)
bun run dev                     # servidor de desarrollo
bun run test                    # pruebas (Vitest)
bun run build                   # build de producción
bun run lint                    # ESLint + Prettier (hoy falla por formato)
```

**Variables de entorno.** `.env.example` solo incluye las variables de Supabase; completarlo está pendiente (roadmap, Prioridad 2). Las variables que lee el código son:

| Variable | Tipo | Uso |
|---|---|---|
| `VITE_MUNICIPALITY_ID` | Pública | Municipio de la instalación (carpeta de `instances/`). Si está vacía se usa `demo`, un municipio ficticio; un valor sin carpeta hace fallar la compilación. |
| `VITE_SUPABASE_URL`, `SUPABASE_URL` | Pública | URL del proyecto Supabase. |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | Pública | Clave publicable. |
| `VITE_SUPABASE_PROJECT_ID` | Pública | Referencia del proyecto. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta** | Operaciones de servidor (formularios, revisión por enlace). |
| `RATE_LIMIT_SECRET` | **Secreta** | Firma de la sesión de formularios. |
| `TURNSTILE_SITE_KEY` | Pública | Widget de Turnstile. |
| `TURNSTILE_SECRET_KEY` | **Secreta** | Verificación de Turnstile. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Servidor | Dominios permitidos, separados por comas. |
| `TRUSTED_CLIENT_IP_HEADER` | Opcional | Cabecera de IP de confianza si hay otro proxy delante. |
| `LOVABLE_API_KEY` | Secreta, opcional | Traducción asistida del panel. |

Nunca se incorporan secretos al repositorio: `.env` y `.env.*` están en `.gitignore`, salvo `.env.example`.

## 6. Incorporar un municipio nuevo

> **Estado: procedimiento documentado pero no probado.** No se ha implantado ningún segundo municipio, y la plantilla solo se ha ejecutado en un PostgreSQL local con esquemas `auth`/`storage` simulados, no en un proyecto Supabase real.

El procedimiento detallado está en **[supabase/template/README.md](supabase/template/README.md)**. Resumen:

1. Crear `instances/<id>/config.ts` (y sus recursos en `instances/<id>/assets/`): nombre, coordenadas, `siteUrl`, datos institucionales, recursos y tema. El tema se valida y lo comprueba `municipality.test.ts`.
2. Crear un proyecto Supabase vacío y ejecutar `01_schema.sql` y `02_seed_universal.sql`.
3. Crear el primer administrador en Supabase Auth y ejecutar `03_init_instance.sql`, que incluye los datos `legal_*` del titular.
4. Ejecutar `04_verify.sql`, que debe terminar con `VERIFICACIÓN SUPERADA`.
5. Configurar las variables del apartado 5, el dominio y un widget de Turnstile para ese dominio.

**Limitaciones actuales** (roadmap, Bloque A, Prioridad 4). Iconos, manifiesto, contenido local y nombres ya son propios de cada instancia, y una sección sin datos se oculta. Todavía:

- los diccionarios comunes conservan textos de Casarabonela (Descubre, portada), que viajan en el JavaScript aunque no se muestren;
- los textos legales son los del piloto, con el nombre de cada instancia, y necesitan revisión jurídica;
- `supabase/config.toml` apunta a un proyecto concreto.

Tampoco hay todavía una política de versiones por municipio ni una administración central.

**Mantenimiento de la plantilla:** cada migración nueva en `supabase/migrations/` debe reflejarse también en `supabase/template/` y pasar `04_verify.sql`. Hoy esta comprobación es manual.

## 7. Seguridad y privacidad

Criterios aplicados en el código:

- **RLS** en todas las tablas `public`; los visitantes solo leen contenido publicado.
- **Datos privados separados:** los contactos de cada ficha viven en `listing_contacts`, solo para administración, y un trigger copia a `listings` únicamente los campos autorizados.
- **Rol de administrador** comprobado en base de datos con `public.has_role`.
- **Formularios públicos** procesados solo en servidor: validación Zod, honeypot, límite de envíos atómico, Turnstile e inserción con la clave de servicio.
- **Archivos** en buckets privados con URLs firmadas.
- **Revisión por enlace:** token aleatorio guardado como hash, de un solo uso y con caducidad.

Las reglas detalladas y sus motivos están en los AGENTS.md (apartado 9).

Riesgos conocidos:

- `anon` y `authenticated` conservan privilegios de tabla amplios, por lo que la protección depende de RLS (roadmap, Prioridad 5).
- Varias medidas están implementadas en código pero su aplicación en producción no está verificada, como la retirada de las inserciones públicas directas en formularios (roadmap, Bloque B, B1).

Que una medida exista en el código no implica que esté desplegada ni auditada.

## 8. Calidad, CI y flujo de trabajo

**CI** (`.github/workflows/ci.yml`) se ejecuta en cada Pull Request y en cada push a `main`:

1. Instalación con Bun y lockfile congelado.
2. Pruebas (`bun run test`).
3. Build de producción, con **valores ficticios de Supabase**.
4. Lint, en un trabajo aparte **informativo y no bloqueante** hasta corregir los errores de formato existentes.

**Lo que el CI no valida:**

- la base de datos: no ejecuta `supabase/tests/` ni `04_verify.sql`;
- el entorno de producción;
- el comportamiento con un Supabase real.

Que las pruebas pasen no equivale a una validación en producción. Incorporar las pruebas SQL al CI está pendiente (roadmap, Prioridad 3).

**Sincronización con Lovable.** El proyecto está conectado a Lovable:

- Los commits enviados a la rama conectada se sincronizan con el editor de Lovable, así que esa rama debe quedar siempre en un estado funcional.
- **No se debe reescribir historial publicado** (force push, ni rebase, amend o squash de commits ya enviados), porque se perdería el historial del proyecto en Lovable.
- Algunos archivos los mantiene Lovable, como `.lovable/` y `src/routeTree.gen.ts` (generado automáticamente).

**Principios de desarrollo:**

- Trabajar en ramas y Pull Requests.
- No introducir cambios fuera del alcance aprobado.
- Proteger los datos y la independencia de cada municipio.
- Priorizar soluciones sencillas de mantener.
- Considerar terminada una funcionalidad solo cuando esté implementada **y verificada** en el entorno que corresponda.

## 9. Documentación relacionada

- **[roadmap.md](roadmap.md):** hoja de ruta maestra, con el estado real de cada tarea (Bloque A, producto; Bloque B, piloto Aquí Bonela).
- **[supabase/template/README.md](supabase/template/README.md):** instalación limpia de un municipio nuevo.
- **AGENTS.md** con reglas de datos, seguridad y convenciones y su justificación:
  - [AGENTS.md](AGENTS.md): reglas generales y de datos. Su descripción de los formularios está desactualizada (roadmap, Prioridad 2); prevalece [src/lib/AGENTS.md](src/lib/AGENTS.md).
  - [src/lib/AGENTS.md](src/lib/AGENTS.md): formularios y anti-spam, traducciones, trámites y configuración pública.
  - [src/components/admin/AGENTS.md](src/components/admin/AGENTS.md): panel de administración.
  - [src/routes/tramites/AGENTS.md](src/routes/tramites/AGENTS.md): páginas públicas de trámites.
  - [supabase/template/AGENTS.md](supabase/template/AGENTS.md): mantenimiento de la plantilla.
- [src/routes/README.md](src/routes/README.md): convenciones de rutas de TanStack Start.

---

**Conecta tu Pueblo — Un producto de Groundwork.**
