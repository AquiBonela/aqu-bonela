# Panel de administración (etapa 2B)

Cómo está organizado el panel, cómo funciona el circuito de publicación municipal y cómo añadir pantallas sin romperlo. La seguridad está en `docs/seguridad.md`.

## Estructura

La navegación se define una sola vez en `src/components/admin/admin-areas.ts`.

| Área | Pestañas | Circuito |
| --- | --- | --- |
| Inicio | Estado del portal, publicación municipal, pendientes, actividad | — |
| Identidad municipal | Datos, colores, logotipos y vista previa | Conformidad municipal |
| Portada | Presentación (cabecera y orden de bloques), Aviso, Accesos directos | Conformidad municipal |
| Directorio | Fichas, Correcciones, Sugerencias, Presentación | Fichas: aceptación del titular. Presentación: conformidad |
| Servicios públicos | Configuración (secciones y cabecera), Guía de trámites | Conformidad (configuración); trámites con su editor |
| Actualidad | Configuración | Conformidad |
| Descubre | Configuración | Conformidad |
| Configuración | Menú, Secciones, Datos legales, Ajustes | Conformidad; los ajustes internos se guardan al momento |

**Separación entre configuración y edición:** en cada página principal, «Configuración» decide cómo se organiza la página (secciones y cabecera) y las demás pestañas editan su contenido.

**Lo que falta en esta entrega:** las pestañas de contenido de Emergencias, Vida cotidiana, Transporte, Actualidad y Descubre llegan en los PR 2B-2 a 2B-4. Mientras tanto, la pestaña de configuración lo dice y no muestra controles vacíos.

**Direcciones anteriores:** `/admin/secciones`, `/admin/contenidos` y `/admin/contenidos/<página>` redirigen a su pantalla nueva.

## Circuito de publicación municipal

1. **Guardar borrador:** `save_content_draft`, sobre la versión cargada. La web no cambia.
2. **Presentar al Ayuntamiento:** `submit_content_draft` comprueba que lo publicado no cambió, la forma del contenido y los archivos. Después aplica el contenido en una prueba que se deshace, de modo que las restricciones de las tablas también se comprueban.
3. **Registrar la conformidad:** `record_content_conformity` anota quién la dio, la fecha (ni futura ni anterior a la presentación), el medio y una referencia opcional.
   - El Ayuntamiento no tiene panel: Groundwork anota lo que recibe.
   - «Volver a borrador» (`return_content_draft`) deshace la presentación si el Ayuntamiento pide cambios.
4. **Revisar y publicar:** `publish_content_draft` exige la conformidad registrada y la revisión final de Groundwork (la casilla del diálogo).
   - Bloquea lo publicado, vuelve a validar, aplica todo en una transacción y borra el borrador.
   - Registra en `content_publications` quién publica, cuándo, la nota, la conformidad, lo publicado y lo anterior.
5. **Si el contenido cambia** después de presentarlo, el borrador vuelve a «borrador»: la conformidad se dio sobre otro contenido.

**Conflictos:** un borrador desfasado (lo publicado cambió después de empezarlo) no se presenta ni se publica. Hay que descartarlo y empezar otro. Los conflictos entre sesiones (`PT409`) muestran el estado actual sin perder lo que se estaba editando.

**Cómo se usa en código:**
- `useContentDraft(clave, codec)`: estado, acciones y recarga sin perder lo no guardado.
- `<DraftWorkflow>`: estado, pasos y diálogos de conformidad y publicación.
- `src/lib/content-codecs.ts`: formulario ↔ contenido con las claves exactas que valida la base.

**Imágenes:** se suben al guardar el borrador (propiedad `prepare` de `DraftWorkflow`), nunca al elegirlas.

## Añadir una pantalla con borrador

1. Clave nueva en `content_drafts_key` y en `private.published_content`, `private.validate_draft_content`, `private.apply_content_draft` y `private.lock_published_content`, en una migración con sus pruebas.
2. Un codec en `src/lib/content-codecs.ts`, con sus pruebas.
3. La pantalla, con `useContentDraft` y `DraftWorkflow`, y su entrada en `draftScreen()` (`src/lib/content-workflow.ts`).

## Rendimiento

- **Configuración pública:** `site_config()` entrega en una sola llamada la identidad, las cabeceras, el menú, las secciones y los accesos.
  - El servidor la guarda 60 s por instalación y conserva el último valor bueno si Supabase falla.
  - Tras publicar, la sesión del administrador la recarga al momento; los visitantes ven el cambio en un minuto como máximo.
  - No se añade una caché más compleja: el servidor corre en varias instancias, invalidarlas todas exigiría un almacén compartido, y el minuto de espera es aceptable para contenido institucional.
- **Datos públicos:** caché por tipo en `src/lib/cache-policy.ts` (React Query, precarga por intención, recursos de `/marca/` inmutables).
- **Panel:** cada pantalla consulta solo su borrador, que ya trae lo publicado, en una llamada. Inicio añade tres consultas pequeñas a las que ya tenía (borradores, última publicación y las 60 últimas operaciones).
- **Imágenes:** WebP con tamaño máximo (cabeceras de 2000 px para escritorio y 900 px para móvil, accesos de 1200 px) y rutas inmutables.
- **Medición:** pendiente con datos representativos. La Demo está vacía y cargarle datos sería una escritura que necesita autorización. Antes de la etapa 5 conviene medir la portada y el directorio con unas 500 fichas.

## Analítica (preparada, sin activar)

`src/lib/analytics.ts` define los eventos (visitas, búsquedas, fichas vistas, clics en teléfono, WhatsApp, correo y enlaces externos, uso de secciones) y un único listener delegado que los clasifica por el propio enlace.

**Cómo se activará:** basta con montar `installLinkTracking(enviar)` en la raíz con un proveedor sin cookies o con consentimiento. No hay que tocar las páginas: los atributos opcionales `data-analytics` y `data-analytics-listing` precisan sección y ficha.

**Privacidad:** nunca se envían números, correos ni URL completas.
