# Aquí Bonela — Directorio municipal (piloto asistido)

## Lo que he entendido

- Un solo directorio de comercios y profesionales. Cada ficha muestra una distinción visual (etiqueta o icono y color) según sea comercio o profesional.
- URL propia por ficha: `/comercios/<slug>` y `/profesionales/<slug>`.
- **Piloto asistido:** no hay cuentas para negocios. La administración (tú, una sola persona) crea las fichas junto a cada titular.
- El titular recibe un **enlace privado sin cuenta**. Con él revisa la ficha completa, elige qué datos de contacto se publican y aprueba la publicación. Se guardan la aprobación, la fecha y los datos autorizados.
- Los cambios y las retiradas se piden por WhatsApp directo. La administración los aplica, y una retirada oculta la ficha de inmediato.
- Tras un rechazo o una devolución se crea una solicitud nueva, y se conserva el historial de la anterior.
- **Destacadas:** las activa solo la administración y duran 1 mes, con caducidad automática. Salen en la portada y al principio de su categoría, con una etiqueta visible. No llevan fotos extra.
- **Listado:** las fichas básicas aparecen sin imagen y las destacadas con una miniatura lateral pequeña. Todas tienen su página completa con fotos.
- **Acciones de la ficha:** Llamar, WhatsApp y "Cómo llegar" (abre Google Maps, sin mapa dentro de la web).
- **Tags:** sirven para la búsqueda, pero no se muestran (o apenas) al visitante.
- **Fuera del MVP:** IA, analítica, pagos, reseñas, chat, idiomas y cuentas de negocio.
- **Datos de prueba:** al menos 30 fichas inventadas, con categorías provisionales.
- **Estilo:** tomado de aquibonela.lovable.app (colores, tipografía y tono). Pensado primero para móvil y accesible.

## Fases (confirmo contigo al final de cada una)

1. **Estructura y base de datos:** tablas, seguridad por filas (RLS), roles, almacén de fotos, historial de solicitudes y registro de consentimientos. Incluye las 30 fichas y las categorías provisionales.
2. **Listado:** portada con buscador (nombre, descripción y tags), filtro por categoría y destacadas arriba.
3. **Ficha individual:** página completa con fotos, horario y botones de acción.
4. **Enlace privado del titular:** revisar la ficha, elegir los datos publicables, aceptar los consentimientos por separado (sin casillas premarcadas) y aprobar.
5. **Panel de administración:** acceso con cuenta de administrador. Crear y editar fichas, subir fotos, generar enlaces de aprobación, cambiar el estado (borrador, pendiente, publicada, rechazada u oculta), destacar 1 mes y ver el historial.
6. **Privacidad y SEO:** aviso de privacidad por capas y página legal (con la nota de que debe validarla un jurista), título, descripción y URL propios por ficha, sitemap.

## Dudas antes de empezar

1. **Supabase propio:** tienes que conectarlo tú desde Ajustes → General → External Supabase (yo no puedo enlazarlo desde el chat). Otra opción es Lovable Cloud, que se puede migrar más adelante. ¿Cuál prefieres?
2. **Vercel:** el proyecto usa TanStack Start (React), que se despliega en Vercel cambiando la configuración de salida. Lo dejaría preparado y documentado. ¿Te parece bien?
3. **Horario:** ¿basta con tramos por día de la semana (por ejemplo, Lun 9:00–14:00 y 17:00–20:00), sin festivos?
4. **Validez del enlace privado:** ¿caduca (propongo 30 días) o vale hasta que se use?
5. **Fotos:** ¿máximo 5 por ficha?

## Detalles técnicos

- Tablas: `categories`, `listings` (tipo, slug, estado, destacada y `featured_until`), `listing_photos`, `listing_hours`, `listing_tags`, `listing_contact_visibility`, `approval_tokens` (guardados con hash y caducidad), `consents` (finalidad, versión del texto, fecha y forma de recogida), `listing_requests` (historial) y `user_roles` con `has_role()`.
- RLS: el público solo lee fichas `publicada` y únicamente los campos de contacto autorizados (a través de una vista). El administrador tiene acceso completo. El enlace del titular se valida en el servidor, con la clave privada solo en variables de entorno y nunca en el código.
- El correo de la cuenta nunca se publica. No se recogen categorías especiales de datos.
