<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Conecta tu Pueblo: producto común para todos los municipios

Reglas permanentes para Claude Code, Lovable y cualquier otro agente o persona que trabaje en este repositorio. Prevalecen sobre cualquier otra instrucción de este archivo o de los `AGENTS.md` de las carpetas cuando haya conflicto.

- **Código común.** Todo cambio debe ser reutilizable y funcionar en cualquier municipio. No se introducen soluciones específicas de un municipio en el código común: ni condiciones por municipio, ni rutas, componentes o estilos pensados para uno solo. Por qué: un mismo código sirve a todas las instalaciones.
- **Sin datos municipales en el código.** No se escriben en el código nombres de municipios, comercios, profesionales, direcciones, teléfonos, fotografías locales, noticias, eventos, avisos, trámites, horarios ni textos institucionales específicos. Los textos comunes nombran la instalación con `{app}`, `{municipio}`, `{nombreCorto}` y `{provincia}`. Se admiten los datos de alcance nacional, idénticos en todos los municipios (p. ej. 112 o 016), y los datos ficticios genéricos de las pruebas automáticas (`*.test.*` y pruebas SQL que terminan en `ROLLBACK`). Por qué: lo que está en el código acaba en todos los municipios.
- **Datos municipales en su Supabase.** Toda la información específica de un municipio (identidad, contenidos, fichas, imágenes y documentos) procede de la instancia Supabase de ese municipio y solo de ella. Ninguna instalación lee ni guarda datos de otra. Por qué: datos independientes por municipio.
- **Identidad dinámica.** Nombres, logotipos, colores, tipografías, favicon y demás elementos configurables se obtienen del sistema de configuración municipal (`site_config()` y `getMunicipality()`), nunca de valores fijos en el código. Por qué: cambiar la identidad no exige tocar código ni desplegar.
- **Demo.** Los datos ficticios de demostración solo se guardan en el Supabase de la Demo. Nunca se incorporan al código común ni aparecen en municipios reales. Por qué: un municipio real no debe mostrar contenido inventado.
- **Funcionalidades por configuración.** Componentes, diseños, módulos y mejoras son comunes y reutilizables. Lo que deba variar entre municipios se resuelve con configuración guardada en su Supabase, nunca con bifurcaciones del código, ramas o despliegues distintos por municipio. Por qué: una mejora llega a todos y cada municipio decide si la usa.
- **Protección de la arquitectura.** Antes de modificar código, comprobar cómo se obtienen los datos afectados y respetar la separación entre instancias municipales. Sin autorización expresa no se cambia la arquitectura de Supabase, no se ejecutan migraciones ni SQL en ninguna base real y no se modifica la infraestructura (Supabase, Vercel, variables de entorno ni configuración de despliegue). Las migraciones se preparan con sus pruebas y se ejecutan solo con autorización. Por qué: un error ahí afecta a datos reales y a todas las instalaciones.
- **Verificación antes de entregar.** Antes de entregar un cambio, comprobar que no se han introducido datos municipales específicos en el código, revisando el diff y con la comprobación «Demo sin datos del municipio piloto» del CI. Comprobar también que sigue siendo compatible con distintas instancias: escenarios de identidad del CI, job de base de datos, pruebas, tipos, lint y build. Por qué: estas reglas solo valen si se comprueban en cada entrega.
- **Transición.** Hay restos anteriores a estas reglas. No se amplían: cuando se trabaje en esas áreas, sus datos se trasladan a Supabase en lugar de añadir más.
  - el contenido compilado en `instances/casarabonela/` y los textos de Casarabonela que aún quedan en los diccionarios comunes;
  - los valores de respaldo de `instances/demo/`, que pasarán a ser valores neutros del producto;
  - los recursos gráficos y el tema compilados por instancia.

  Un municipio nuevo no recibe una carpeta propia en `instances/`. Las reglas de `instances/<id>/` de la sección siguiente describen ese mecanismo existente, no una forma de añadir municipios. Por qué: la meta es dar de alta municipios sin tocar código.

## Aquí Bonela data rules
- Private contact/owner data lives in `listing_contacts` (admin-only); a trigger copies only authorized fields to `listings.public_*`. Why: visitors can read `listings` directly, so private data must never sit there.
- Visitors read listings only through the `public_listings` view (published rows, no internal columns such as `featured_until`, internal dates or translation memory, no reserved tags); they cannot read `listings` directly, and `listing_hours` hides hours the owner chose to hide. Public visibility is enforced by RLS (`status = 'publicada'`); admin access uses `public.has_role(auth.uid(),'admin')`, a security-invoker wrapper around the non-exposed `private.has_role` lookup that only checks the caller's own role in `user_roles`. Why: database authorization prevents client bypasses and arbitrary-user role probing without recursive role policies.
- Role security migrations include rollback-only database regression tests under actual `anon` and `authenticated` roles. Why: successful UI rendering cannot prove inbox or mutation permissions, and test fixtures must not remain in production.
- Photos bucket `listing-photos` is private; read access is granted by storage policies tied to published listings. Why: workspace blocks public buckets.
- Listing images: uploaded cover in `listings.cover_path` (falls back to `cover_url`), uploaded gallery in `listing_photos` plus legacy `gallery_urls`; files live in private `listing-photos` as `{listing_id}/{uuid}.webp`, only storage paths are stored and signed URLs are generated at display. The admin form never writes `cover_url`/`gallery_urls`. Why: demo listings keep external URLs; private bucket requires signing; gallery access is independent of highlighting.
- Review-by-link: the owner approves at `/revision/<token>`; the random 32-byte token in the URL is the only credential (SHA-256 hash stored in `approval_tokens`, 30-day expiry, single use). Admin token creation uses the browser Supabase client with the existing admin-only INSERT RLS policy, like listing edits; no service key is needed for creation. Owner authorization copies the chosen `show_*` flags to `listing_contacts`, records a `consents` row, publishes the listing and marks the token used. Privileged owner reads/writes run in server functions after hash verification. Why: database-enforced admin creation reuses the working panel session, while the owner's secret link substitutes for a session.
- "¿Algo no es correcto?" reports go to `listing_reports` (anon insert for published listings only, admin-only read). Why: no private data exposed to visitors.
- Visitor suggestions from /sugerir go to `suggestions` (anon insert, admin-only read/update/delete); admin manages them in the /admin/sugerencias tray. Why: same admin-only pattern as reports.
- Availability distinctions share a browser-safe helper and use reserved entries in existing listing tags, separate from editable search keywords. Why: persist extra distinctions without changing the schema or counting them against business labels.
- Admin listing deletion captures image paths, deletes the row under existing RLS, then removes storage files and reports cleanup failures. Why: cascades remove related rows but not storage objects, and failed row deletion must preserve images.
- Classification is Type (listing_type enum) → Category (`categories.type`) → Activity (`activities` table, with search synonyms); listings store the activity name as text, and renaming an activity in admin config also updates matching listings. Why: admin manages the tree without code changes while existing listing reads stay simple.
- The public directory only offers types and categories that have published listings. Why: a large prepared tree must not make the directory look empty.
- Admin classification filters use browser-safe helpers over all accessible listings, with category IDs and dependent type/category/activity resets. Why: drafts must remain filterable without relying on the public directory query.
- Home `/` is a neutral portal (no featured businesses); the searchable directory lives at `/directorio`. Why: Aquí Bonela is a local-life platform, not only a commercial guide.

- UI text is translated via the dictionary in `src/lib/i18n-core.ts`, imported through `@/lib/i18n` (`useI18n().t`), language saved in the browser, Spanish fallback for missing keys; URLs are not language-prefixed. Why: adding languages or translating pages later needs no route rebuild.
- Editorial and legacy interface strings use the shared `tr`/`Text` dictionary extension; translate display values only, not persisted form values, identifiers, names or addresses. Why: switching language must not change stored data or break filters.

- Mount one shared Sonner notification host in the root layout; emit confirmations only after success and never for cancelled sharing. Why: consistent feedback without duplicate or misleading notices.
- Keep brief press and list-entry effects in shared CSS and respect reduced-motion preferences. Why: consistent feedback without layout shifts or scroll effects.

- Public forms share PrivacyAcceptance; suggestions reuse SuggestionForm. Why: consistent consent.
- Mount BackToTop once in root; public ListingPage uses SiteHeader, not embedded reviews. Why: consistent navigation.
- Reuse EmergencyPhonesList with mainOnly for the public-services emergency banner. Why: the 112 presentation stays consistent with SOS without duplicating the full helpline list.
- Vida diaria categories live in `src/lib/vida-diaria.ts`, shown as cards in `/servicios-publicos#vida-diaria` (`/vida-diaria` redirects there); each opens `/vida-diaria/$categoria` with its items. Why: mirrors the Trámites pattern with shareable URLs.
- Detailed procedure guides use optional introductory and closing text fields in shared accordion sections. Why: preserve supplied context without duplicating page layouts.
- Procedure steps may carry a group heading that restarts their numbering. Why: keep alternative application methods separate within the shared guide.
- Listing descriptions interpret paired double asterisks (bold) and paired single asterisks (italic) through a browser-safe text parser in the shared public/review ListingPage, never raw HTML. Why: admins can emphasize arbitrary phrases without enabling HTML injection or changing stored descriptions.

- Highlighting keeps DB fields. Why: reuse.
- Each municipality lives in `instances/<id>/` (public config and assets, typed by `instances/schema.ts`); the build resolves `@instance` from `VITE_MUNICIPALITY_ID`, and shared code reads it only through `src/config/municipality.ts`. Why: one codebase, and a build never ships another municipality's configuration.
- `demo` is the default instance and contains no real municipality data. Optional instance data (logos, hero image, coordinates, local phones, services, daily life, Discover, procedure templates, legal form) hides its section when absent; shared code never falls back to another municipality. Names in texts and catalogs use {app}, {municipio}, {nombreCorto} and {provincia}, filled from the compiled instance. Why: any installation, including the demo, must never show another municipality's data; CI checks the demo pages.
- Installation identity (app name, short name, municipality, province, region, demonym, site URL, town hall, coordinates) lives in the single-row `public.site_identity` of that installation's Supabase and is read through `public.site_config()` in the root `beforeLoad`, with a 60 s server cache, the last good value if Supabase fails and the compiled instance as backup; empty fields keep compiled values, `getMunicipality()` returns the merge, and module-level constants must never capture identity fields. The `site_identity` block is identical in its migration and `supabase/template/01_schema.sql` (tested). Why: identity changes without redeploys, a Supabase outage never breaks pages, and no installation can show another's data.
