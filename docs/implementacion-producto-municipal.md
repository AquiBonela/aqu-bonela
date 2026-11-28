# Implementación integral: identidad visual, cabeceras, fichas, revisión y caché

Documento técnico del PR `feat/producto-municipal-completo`. Describe qué cambia, cómo se pone en marcha en una instalación existente (la Demo) o nueva, qué necesita autorización manual y qué queda pendiente.

## 1. Resumen por bloques

| Bloque | Qué hay | Dónde |
|---|---|---|
| Identidad municipal | Código postal; selector de zona horaria IANA (Europe/Madrid por defecto, conserva valores poco habituales); dos colores con vista previa y contraste AA | `admin/identidad.tsx`, `identity-form.ts`, `BrandColors.tsx` |
| Personalización visual | La paleta completa (claro y oscuro, 20 tokens) se calcula con una función común que garantiza WCAG AA; sin colores en Supabase se usa el tema compilado | `brand-palette.ts` |
| Recursos gráficos | Logotipo y versión clara: subir, sustituir, eliminar y previsualizar; al subir se generan favicon, icono de Apple e iconos PWA; manifiesto dinámico | `LogoManager.tsx`, `site-assets.ts`, `/marca/*`, `/app.webmanifest` |
| Cabeceras por página | Un único editor (`PageHeaderEditor`) en el editor de cada página: Portada (Configuración), Directorio, Trámites y, en Páginas y contenidos, todas las páginas comunes (incluidas Tablón y Actualidad, cuya cabecera alimenta su tarjeta de la portada). Escritorio y móvil, encuadre, texto alternativo | `PageHeaderEditor.tsx`, `page-headers.ts`, `PageHeaderImage.tsx` |
| Fichas | Calle, número, código postal, localidad, coordenadas, ubicación aproximada; web con permiso; servicio a domicilio y zona con permiso; texto alternativo de la portada | `fichas.$id.tsx`, `listing-details.ts`, `ListingPage.tsx` |
| Horarios | Varios tramos por día (ya existía), cierres excepcionales, vacaciones, temporadas con su horario, nota de horario, festivos y guardias (distintivos existentes). La ficha pública muestra el horario vigente sin contradicciones y anuncia cambios de los próximos 60 días | `HourPeriodsEditor.tsx`, `hoursOn()` |
| Revisión y aprobación | Enlace de un solo uso con caducidad; un enlace nuevo anula los anteriores; vista previa; aceptación expresa de condiciones con versión; correcciones del titular; nueva revisión de fichas publicadas; aviso de cambios relevantes desde la aprobación; retirada del consentimiento; historial | `review.functions.ts`, `revision.$token.tsx`, `ReviewStatusPanel.tsx`, `listing-review.ts` |
| Estados y publicación | Borrador, En revisión, Pendiente de correcciones, Aprobada, Publicada (y Oculta, Rechazada). La base impide publicar sin aprobación del titular salvo servicios públicos | `listing_review_flow`, `displayState()`, `canPublish()` |
| Rendimiento y caché | Plazos por tipo de dato, precarga al pasar por un enlace, recursos inmutables, panel siempre al día y borrado de sus datos al salir | `cache-policy.ts`, `router.tsx` |

## 2. Decisiones de arquitectura

- **Estados sin ampliar el ENUM.** `listing_status` no cambia: una vuelta atrás de valores de ENUM con políticas que dependen de la columna no es segura. El estado de revisión se deduce del registro `listing_events` (`listing_review_state()`), y la publicación sigue en `status`. El panel combina ambos en un estado legible.
- **Regla de publicación en la base** (`listings_publish_rule`, código `PT422`): ningún cliente puede publicar una ficha de comercio, profesional o asociación sin la aprobación vigente de su titular. Excepciones: servicios públicos y volver a publicar una ficha oculta que ya estuvo publicada (si no se retiró el consentimiento).
- **Publicar al aprobar** (`site_settings.publish_on_owner_approval`, por defecto activado) conserva el comportamiento anterior. Desactivado, la ficha aprobada queda como «Aprobada» hasta que la administración la publique.
- **Recursos gráficos sin URL firmadas.** Bucket privado `site-assets` (el espacio de trabajo no admite buckets públicos). Los visitantes solo pueden leer los archivos que la identidad o una cabecera usan en ese momento (política de Storage). La web los sirve desde su propio dominio en `/marca/<ruta>` con la clave publicable y caché inmutable: cada subida crea una carpeta o un nombre nuevos, así un cambio nunca muestra la imagen anterior.
- **Consentimientos y solicitudes de solo lectura** para el navegador: los escriben las funciones del servidor (`approve_listing_review`, `request_listing_corrections`) o la función de retirada, que comprueba el rol.
- **Compatibilidad durante el despliegue.** `save_listing` conserva los campos que un formulario antiguo no envía; `approve_listing_review` acepta la llamada anterior (la versión de condiciones tiene valor por defecto).
- **Sin datos de un municipio en el código.** Se retiró el texto del piloto del texto alternativo de la cabecera del Directorio. Colores, logotipos, iconos y cabeceras viven en el Supabase de cada instalación.

## 3. Migraciones (no aplicadas)

| Orden | Migración | Afecta | Vuelta atrás |
|---|---|---|---|
| 1 | `20261201090000_identity_branding.sql` | `site_identity` (7 columnas, 3 restricciones), tabla `page_headers` (RLS, 4 políticas, trigger), 2 políticas de Storage para `site-assets`, `site_config()` | `supabase/rollback/20261201090000_identity_branding.sql` |
| 2 | `20261201091000_listing_details.sql` | `listing_contacts` (9 columnas), `listings` (7 columnas), `sync_public_contact`, vista `public_listings` (columnas nuevas al final), tabla `listing_hour_periods`, `listing_hours.period_id`, `save_listing` (nueva firma con `p_periods`); copia la web publicada a la parte privada sin cambiar ninguna ficha pública | `supabase/rollback/20261201091000_listing_details.sql` |
| 3 | `20261201092000_listing_review_flow.sql` | Tabla `listing_events`, `listing_review_state()`, triggers de regla de publicación, registro de estados y emisión de enlaces, `approve_listing_review` (nueva firma), `request_listing_corrections`, `withdraw_listing_consent`, políticas de `consents` y `listing_requests`, `site_settings.publish_on_owner_approval` | `supabase/rollback/20261201092000_listing_review_flow.sql` |

Las tres están reflejadas literalmente en `supabase/template/01_schema.sql` (comprobado por `src/lib/product-migrations-sql.test.ts`) y `04_verify.sql` comprueba el resultado con roles reales. El job de base de datos del CI aplica las migraciones sobre la plantilla anterior, ejecuta las pruebas SQL y prueba la vuelta atrás.

Pérdida de datos de las vueltas atrás (inevitable, documentada en cada script): las columnas y tablas nuevas y su contenido. Los consentimientos, solicitudes, avisos y la web publicada se conservan.

## 4. Puesta en marcha en una instalación existente (Demo `wldwhbvjefvtkuxqbvpl`)

> El historial de migraciones de la Demo termina en `20261127110852` aunque su esquema está completo (se instaló con la plantilla). **No usar `supabase db push`**: intentaría crear de nuevo objetos que ya existen. Las migraciones se ejecutan una a una desde el SQL Editor.

1. **Copia de seguridad** de la Demo (o exportación de `site_identity`, `site_settings` y `listings`).
2. **Crear el bucket** `site-assets` por la API o el panel de Storage: privado, 5 MB, tipos `image/webp` e `image/png`.
3. **Ejecutar las migraciones en orden** (1, 2, 3) en el SQL Editor.
4. **Ejecutar `supabase/template/04_verify.sql`**: debe terminar con «VERIFICACIÓN SUPERADA».
5. **Fusionar el PR**: Vercel despliega `main`. Desplegar antes de migrar haría fallar el guardado de fichas, la aprobación y la carga de la ficha pública, porque el código nuevo usa las columnas y funciones nuevas.
6. **Comprobar en la web**: Identidad (colores, logotipo), una cabecera, una ficha con dirección y temporada, y un enlace de revisión completo.

Para deshacer: ejecutar las vueltas atrás en orden inverso (3, 2, 1) y volver a desplegar la versión anterior.

## 5. Instalación nueva

La plantilla ya incluye todo: crear los tres buckets por la API (`supabase/template/README.md`, apartado 3) y ejecutar `01`, `02`, `03` y `04`.

## 6. Cambios que requieren autorización manual

| Acción | Quién | Notas |
|---|---|---|
| Crear el bucket `site-assets` en la Demo | Daniel | Storage → New bucket (privado, 5 MB, `image/webp`, `image/png`) |
| Ejecutar las 3 migraciones en la Demo | Daniel | En orden, desde el SQL Editor; no `db push` |
| Ejecutar `04_verify.sql` en la Demo | Daniel | Solo lectura neta (se deshace) |
| Fusionar el PR | Daniel | Después de migrar |
| Medición Lighthouse «después» | Daniel | El preview de Vercel está protegido; ver apartado 7 |

## 7. Rendimiento

**Antes** (Demo pública, `main` en `9afe237`, Lighthouse 12, móvil simulado, 28-11-2026):

| Página | Rendimiento | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| Portada | 61 | 5,4 s | 7,0 s | 50 ms | 0 |
| Directorio | 42 | 5,3 s | 5,3 s | 60 ms | 1,002 |
| Servicios públicos | 65 | 5,5 s | 5,5 s | 120 ms | 0 |

**Cambios de caché**: plazos por tipo de dato (`cache-policy.ts`), sin recargas al volver a la pestaña en la web pública, precarga al pasar por un enlace (solo los datos de esa página), recursos de `/marca/` inmutables, manifiesto con 5 minutos, identidad y cabeceras en la misma llamada ya cacheada 60 s en el servidor. La portada no descarga el directorio hasta que se escribe en el buscador (ya era así).

**Después**: pendiente de medir sobre el preview del PR o tras el despliegue (el preview exige sesión de Vercel; Lighthouse no puede entrar sin un enlace temporal, que no se ha creado sin autorización). Mismo comando:

```
npx lighthouse@12 <url> --only-categories=performance --form-factor=mobile
```

**Hallazgos para una mejora posterior** (fuera de este PR): en el Directorio se desplaza todo el `<body>` al cargar (CLS 1,0); la hoja de Google Fonts bloquea el primer pintado (~1,4 s según Lighthouse).

## 8. Pruebas

- **TypeScript, lint, build y pruebas unitarias e integración** (Vitest): paleta y contraste, lectura de identidad y cabeceras, servicio de recursos, manifiesto, formulario de identidad (código postal, colores, zona horaria), gestor de logotipo (orden de subida, guardado y borrado; fallos), cabeceras, detalle de fichas (dirección, coordenadas, web, periodos, horario vigente), revisión (condiciones, correcciones, nueva revisión), estados y caché.
- **SQL con roles reales** (todas terminan en `ROLLBACK`): `identity_branding_permissions.sql`, `listing_details_privacy.sql`, `listing_review_flow.sql`, más las existentes adaptadas y `04_verify.sql`.

## 9. Riesgos y limitaciones

- **Orden de despliegue**: migrar antes de fusionar (apartado 4).
- **Publicación más estricta**: la administración ya no puede publicar una ficha de comercio, profesional o asociación sin la aprobación de su titular. Es lo pedido; conviene avisar a quien gestione contenidos.
- **Coordenadas aproximadas**: se redondean a dos decimales (alrededor de 1 km).
- **Iconos**: se generan en el navegador a partir del logotipo, sobre fondo blanco. Un logotipo muy apaisado queda pequeño en el icono; si hace falta, se puede añadir un icono propio más adelante.
- **Tablón y Actualidad**: sus páginas aún no existen; su cabecera se usa en la tarjeta de la portada.
- **Textos de cada página**: el editor de página gestiona hoy la cabecera; los textos (salvo la portada, en Configuración) siguen en código o en la instancia.
