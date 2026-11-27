# Conecta tu Pueblo — Hoja de ruta maestra

**Documento único de seguimiento del producto, desarrollo técnico, implantación municipal y portal piloto.** Se mantienen dos ámbitos dentro del mismo documento: el producto común de Groundwork (Bloque A) y la implantación local de Casarabonela (Bloque B).

- **Producto:** Conecta tu Pueblo.
- **Empresa operadora y responsable del producto:** Groundwork.
- **Municipio piloto:** Casarabonela.
- **Nombre del portal local:** Aquí Bonela.
- **Estado general:** producto en desarrollo. Hay funcionalidades implementadas y pruebas automatizadas, pero aún faltan validaciones en producción y un procedimiento de alta municipal probado de principio a fin.

## Cómo interpretar los estados

Cada tarea pendiente indica su estado con una etiqueta **Estado:**.

- **Sin iniciar:** todavía no existe implementación en el repositorio.
- **Pendiente de comprobación:** no requiere desarrollo; falta revisar o confirmar algo con los accesos disponibles.
- **Implementado en código:** existe en el repositorio; no implica que esté desplegado ni operativo.
- **Probado en entorno controlado:** cuenta con pruebas automatizadas o con comprobaciones manuales mediante datos aislados, sesiones simuladas o respuestas interceptadas.
- **Verificado en producción:** comprobado en el servicio y entorno reales.
- **Bloqueado:** no se puede completar hasta disponer de acceso, credenciales, configuración, datos o una decisión pendiente. Se indica siempre el motivo.

No se deben confundir las pruebas simuladas con una validación de producción. Las marcas `[x]` del historial indican que el cambio se implementó o se comprobó en el alcance descrito en su nota; no certifican por sí solas su funcionamiento en producción.

## Terminología

- **Avisos:** comunicaciones de «¿Algo no es correcto?» que envían los visitantes sobre una ficha publicada (tabla `listing_reports`). Se gestionan en `/admin/avisos`, donde el panel puede leerlos, marcarlos como resueltos y eliminarlos; no se crean ni se editan desde el panel.
- **Sugerencias:** propuestas enviadas desde `/sugerir` y las ventanas de alta (tabla `suggestions`), gestionadas en `/admin/sugerencias`.
- **Notificaciones por correo:** mensajes de correo que avisarían a la administración de nuevos envíos de formularios. No confundir con los avisos de `listing_reports`.

---

# BLOQUE A — Producto común: Conecta tu Pueblo

## A1. Estado y prioridades del producto

### Prioridad 1 — Definir el despliegue y validar la instalación limpia

- [ ] Confirmar dónde está desplegado realmente el portal piloto (Vercel o Cloudflare) y documentar el proceso de despliegue, variables y dominios. **Estado:** Pendiente de comprobación — el README menciona Vercel, mientras que `vite.config.ts` usa la configuración de Lovable (destino Cloudflare por defecto) y no existe `vercel.json`; hay que comprobarlo en el servicio de alojamiento y alinear documentación y configuración.
- [x] Plantilla de instalación limpia en `supabase/template` (esquema, semilla, configuración, verificación) probada en PostgreSQL local.
- [x] Instalar y verificar la plantilla segura en la demo conectada `wldwhbvjefvtkuxqbvpl`, sin datos locales de Casarabonela. **Estado:** Verificado en instancia demo real — 04 superado, dos buckets privados, limpieza horaria, 28 categorías, 155 actividades y seis categorías de trámites; cero fichas/contactos/trámites/usuarios. 309 pruebas pasan y compilación correcta; portada/directorio leen exclusivamente la demo sin errores en móvil/escritorio. No certifica producción ni flujos administrativos.
- [ ] Crear el primer administrador de la demo y completar sus datos legales antes de publicar. **Estado:** Bloqueado — falta usuario real y datos del titular; no se copian desde Casarabonela. La identidad visual local sigue en código y su adaptación pertenece a A1, Prioridad 4.
- Las comprobaciones del Supabase y del entorno de producción de Casarabonela (migración de la fase 4, Turnstile y variables secretas) se siguen en el Bloque B, apartado B1 «Seguridad y formularios».

### Prioridad 2 — Corregir documentación y configuración técnica

- [ ] Actualizar el `AGENTS.md` de la raíz para que refleje el flujo actual de formularios con inserciones exclusivamente desde servidor, sin contradecir `src/lib/AGENTS.md` ni el código. **Estado:** Sin iniciar.
- [ ] Completar `.env.example` con todas las variables necesarias (`VITE_MUNICIPALITY_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SECRET`, `TURNSTILE_*`, `LOVABLE_API_KEY`…), sin incluir secretos reales. **Estado:** Sin iniciar.
- [ ] Mover a configuración las URLs `lovable.app` que siguen escritas directamente en el código (`src/lib/translate.server.ts`, `src/routes/vida-diaria.$categoria.tsx`). **Estado:** Sin iniciar.
- [ ] Revisar `supabase/config.toml`, que apunta al proyecto Supabase de Casarabonela, y definir cómo evitar que una instalación nueva herede esa referencia. **Estado:** Sin iniciar.

### Prioridad 3 — Hacer fiable el control de calidad

- [ ] Corregir los problemas de formato que hacen fallar el lint. **Estado:** Sin iniciar — el lint se ejecuta en CI como comprobación informativa.
- [ ] Cuando el lint esté limpio, retirar `continue-on-error` para que vuelva a bloquear el CI si falla. **Estado:** Bloqueado — depende de la tarea anterior.
- [ ] Incorporar al CI la ejecución de las pruebas SQL de permisos de `supabase/tests/`. **Estado:** Sin iniciar — las pruebas existen pero no se ejecutan en CI.
- [ ] Incorporar al CI una comprobación reproducible de la plantilla, incluyendo `04_verify.sql` sobre PostgreSQL. **Estado:** Sin iniciar.
- [ ] Definir una comprobación que detecte si la plantilla de instalación queda desactualizada respecto de las migraciones. **Estado:** Sin iniciar — hoy la sincronización es manual.

### Prioridad 4 — Preparar la replicación municipal

- [ ] Extraer de los componentes y rutas el contenido específico de Casarabonela (trámites, servicios públicos, teléfonos, Descubre, Sobre, metadatos) para que cada municipio tenga sus propios datos sin modificar el código común. **Estado:** Sin iniciar — la configuración municipal básica (nombre, coordenadas, recursos gráficos y tema) ya está implementada en `src/config/municipality.ts`.
- [ ] Preparar recursos públicos por municipio: favicon, iconos, imágenes y manifiesto PWA. **Estado:** Sin iniciar — los archivos de `public/` son únicos para todas las instalaciones; el manifiesto identifica Aquí Bonela/Casarabonela y su `theme_color` no coincide con el de la configuración del tema.
- [ ] Llevar a configuración los textos legales y revisar su adecuación al modelo de Groundwork con asesoramiento legal antes de comercializar el servicio. **Estado:** Sin iniciar — el aviso legal está escrito en el código.
- [ ] Definir una política de versiones y despliegues por municipio que mantenga un código común; no crear ramas permanentes por municipio sin resolver antes cómo se actualizarían. **Estado:** Bloqueado — requiere una decisión de producto.
- [ ] Documentar y probar el alta de un municipio nuevo de principio a fin. **Estado:** Sin iniciar.
- [ ] Implantar un segundo municipio real como prueba de replicabilidad. **Estado:** Bloqueado — depende de las tareas anteriores de esta prioridad y de la Prioridad 1.
- [ ] Comprobar que los datos, archivos, dominios y configuraciones de cada municipio permanecen aislados. **Estado:** Bloqueado — requiere un segundo municipio implantado.

### Prioridad 5 — Operación y evolución del producto

- [ ] Notificaciones por correo de los formularios: elegir proveedor, implementar el envío conservando la copia en el panel, configurar un dominio de correo propio y probar la entregabilidad. **Estado:** Sin iniciar — no existe código de envío de correo; solo está identificado el email de destino en Configuración.
- [ ] Incorporar un sitemap y comprobar su generación para cada municipio. **Estado:** Sin iniciar — estaba previsto en la fase de privacidad y SEO del plan original.
- [ ] Definir copias de seguridad, recuperación y monitorización para cada instalación. **Estado:** Sin iniciar.
- [ ] Diseñar un plan para eliminar la dependencia del servicio de traducción de Lovable (`ai.gateway.lovable.dev`). **Estado:** Sin iniciar.
- [ ] Evaluar las políticas de permisos de tablas y reforzar la seguridad más allá de depender únicamente de RLS cuando corresponda. **Estado:** Sin iniciar — `anon`/`authenticated` conservan privilegios de tabla amplios y la protección depende de RLS.
- [ ] Permitir que el titular revise y cambie desde un enlace nuevo una ficha que ya está publicada. **Estado:** Sin iniciar — previsto para la etapa 5 (Nuevo Directorio y fichas), decisión del 27-11-2026. Hoy `getReview` presenta como «autorizada» cualquier ficha publicada (`done` si `status = 'publicada'`), así que un enlace nuevo no muestra los interruptores; una prueba de `src/lib/review.functions.test.ts` fija ese comportamiento para que el cambio sea deliberado. Al abordarlo, decidir si el titular puede cambiar la visibilidad de contactos y horario sin despublicar la ficha y cómo se registra el nuevo consentimiento.
- [ ] Valorar una administración central de Groundwork cuando la replicación de un segundo municipio esté probada. No es un requisito para cerrar el piloto inicial. **Estado:** Bloqueado — depende de la Prioridad 4.

---

# BLOQUE B — Implantación piloto: Aquí Bonela (Casarabonela)

## B1. Validaciones pendientes del portal piloto

### Panel de administración — una única sesión de validación

- [ ] Realizar una sesión completa con una cuenta real de administrador en el Supabase de producción y comprobar: **Estado:** Bloqueado — no hay una sesión real de administrador disponible. Probado en entorno controlado: las comprobaciones con datos aislados o sesiones simuladas no sustituyen esta sesión.
  - [ ] Guardado y lectura de fichas, incluidos los campos de contacto y sus traducciones, desde el navegador.
  - [ ] Carga de fotos y guardado de Resaltado.
  - [ ] Lectura, marcado como resuelto y eliminación de avisos.
  - [ ] Guardado de distinciones y eliminación de fichas.
  - [ ] Guardado de trámites y sus traducciones desde el navegador.
  - [ ] Guardado y lectura del editor modular de trámites.
  - [ ] Subida y lectura de imágenes privadas de trámites.
  - [ ] Guardado del email de notificaciones en Configuración.
  - [ ] Eliminación real de «Tarjeta sanitaria europea» desde el panel, si sigue siendo necesario.
  - [ ] Traducciones del panel y flujo de revisión mediante un enlace/token válido.

### Seguridad y formularios

- [ ] Confirmar en el Supabase de producción si está aplicada la migración `20261124153932…sql` (anti-spam fase 4), que retira el INSERT directo de `anon`/`authenticated` y las policies públicas en `suggestions` y `listing_reports`. **Estado:** Implementado en código — también incluido en la plantilla SQL; pendiente de comprobar su aplicación en producción. No volver a tratarla como desarrollo pendiente.
- [ ] Confirmar que Turnstile está autorizado para los dominios reales y que `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` y `TURNSTILE_ALLOWED_HOSTNAMES` están configuradas en producción antes de dar por operativos los formularios. **Estado:** Pendiente de comprobación — si la fase 4 está aplicada sin Turnstile configurado, los formularios de sugerencias y avisos no envían.
- [ ] Probar desde la web publicada el envío real de sugerencias y avisos, y comprobar que quedan registrados en el panel. **Estado:** Bloqueado — depende de las dos comprobaciones anteriores.
- [ ] Ejecutar la regresión reversible de permisos de traducción (`supabase/tests/content_translation_permissions.sql`) en el Supabase de producción. **Estado:** Bloqueado — la herramienta de consultas disponible solo lee y el acceso de diagnóstico no admite este proveedor; políticas y permisos inspeccionados sin cambios.

### Correo e instalación móvil

- [ ] Activar y comprobar las notificaciones por correo de todos los formularios sin quitar su copia del panel. **Estado:** Bloqueado — depende de la tarea de notificaciones por correo del Bloque A, Prioridad 5, y de configurar y verificar un dominio de correo propio.
- [ ] Probar la instalación de Aquí Bonela en un móvil real después de publicar. **Estado:** Probado en entorno controlado — evento de Android simulado; falta la prueba en un dispositivo real.
- [ ] Comprobar en WhatsApp la vista previa con la portada de la ficha al compartir. **Estado:** Probado en entorno controlado — etiquetas presentes en el HTML inicial; requiere publicar.

### Configuración y contenido municipal

- [ ] Cambiar `siteUrl` de Casarabonela a `https://aquibonela.es` en la configuración municipal. **Estado:** Bloqueado — pendiente de que el dominio esté conectado y operativo (el cambio se aplicó y se revirtió por este motivo).
- [ ] Completar horarios y webs oficiales de servicios públicos. **Estado:** Bloqueado — pendiente de datos reales y fiables aportados por el usuario o el municipio.
- [ ] Revisar la información institucional y los teléfonos con las fuentes responsables antes de publicar cambios. **Estado:** Sin iniciar.

---

## Registro histórico de trabajo implementado en Aquí Bonela

Las tareas siguientes se conservan como historial de cambios del portal piloto. Sus marcas `[x]` reflejan el estado anotado cuando se realizaron; no implican validación de producción salvo que la descripción lo indique expresamente. Los recuentos de pruebas y otros datos (número de elementos del editor, idiomas) corresponden al momento en que se anotaron y pueden no coincidir con el estado actual.

### Directorio, fichas y avisos

- [x] Etiquetas sin iconos; urgencias y hashtags como la referencia.
- [x] Guardia fin de semana y atención en festivos en el formulario y fichas.
- [x] Eliminación con confirmación en administración.
- [x] Sustituir Colaborador por Resaltado sin etiqueta pública; habilitar cinco fotos para todas las fichas; pruebas de portada/galería y navegación pública verificadas.
- [x] Reparar enlaces de avisos usando el identificador de la ficha.
- [x] Desplegables de categoría/oficio y filtro por tipo.
- [x] Ejecutar pruebas y verificar la navegación pública.
- [x] Reordenar ficha: etiquetas, nombre, dirección, descripción, hashtags, horario, galería y pie.
- [x] Galería en dos columnas con última imagen impar a todo el ancho.
- [x] Alinear distinciones amarillas a la derecha en fichas y tarjetas; verificar presentación.
- [x] Añadir filtros de tipo, categoría y actividad al listado admin, combinables con búsqueda y estado.
- [x] Abrir alta de negocio en una ventana desde portada y directorio, reutilizando el formulario de sugerencias; verificar apertura, campos y cierre en móvil y escritorio.
- [x] Abrir Enviar información en ventana y añadir separación antes de la tarjeta Directorio en portada.
- [x] Añadir cabecera a fichas y flecha circular compartida en todas las páginas; verificar en móvil y escritorio.
- [x] Añadir segundo teléfono y redes sociales con visibilidad individual en alta, revisión y ficha pública; 68 pruebas y sincronización de visibilidad verificadas.
- [x] Habilitar negrita con doble asterisco en las descripciones compartidas por fichas y revisión; 11 pruebas pasan y presentación verificada en móvil y escritorio con respuesta de lectura interceptada, sin alterar datos guardados.
- [x] Incluir la portada de cada ficha en los avisos de compartir cuando tenga imagen; foto real accesible y etiquetas presentes en HTML inicial; requiere publicar para WhatsApp.

### Navegación, interfaz y experiencia móvil

- [x] Logo pequeño y arriba dentro del menú verde (cabecera de la portada: solo el grande).
- [x] Barra fija de Descubrir: visible solo al quedar anclada arriba.
- [x] Incorporar respuesta táctil, transiciones de resultados, sugerencias animadas y confirmaciones flotantes; comprobar búsquedas, compartir y movimiento reducido en navegador.
- [x] Quitar el logo de la cabecera (móvil y escritorio).
- [x] Mostrar idioma móvil y estado del clima en cabecera, y texto Aquí Bonela sobre Directorio en menú.
- [x] Poner Actualidad y Clasificados en gris y sin animación en la portada mientras no estén activos.
- [x] Reordenar los horarios del autobús en Servicios Públicos: dos bloques (Hacia Málaga / Desde Málaga) con días y horas alineados; verificar en móvil y escritorio.
- [x] Simplificar contactos locales, añadir Alozaina y explicar reciclaje; verificar móvil e inglés.
- [x] Quitar recuadros de las preguntas, subir etiquetas y enlazar Punto Vuela a su ficha; verificar móvil, escritorio e inglés.
- [x] Renombrar categoría y Certificado Digital, y mantener los enlaces legales en una línea; verificado en móvil, escritorio e inglés.
- [x] Mostrar un resumen de dos o tres líneas en las tarjetas de trámites, conservando la descripción completa en cada ficha; verificado en móvil, escritorio e inglés.
- [x] Poner cada línea de Punto Vuela en una sola línea, acortando «Ayuda con gestiones online» y agrandando la letra; verificado en móvil (320–480), escritorio, ambos idiomas y los dos temas.
- [x] Mantener fija la cabecera en todas las páginas y dejar libres los filtros del directorio al desplazarse; 169 pruebas pasan y guardado, subtítulo, portada, ficha y directorio comprobados en móvil sin errores.
- [x] Evitar que los paneles de portada tapen las sugerencias del buscador; comprobado en 390, 602 y 1280 px.

### Páginas informativas y servicios públicos

- [x] Página «Sobre Aquí Bonela» con enlace activo en el menú.
- [x] Ampliar la ficha del Certificado Digital con desplegables, acceso FNMT y traducciones; verificar móvil, escritorio e inglés.
- [x] Crear la guía completa del NIE con la estructura de Certificado Digital, enlaces oficiales y traducciones; verificado en móvil, escritorio e inglés.
- [x] Quitar Punto Vuela del bloque «Dónde» de Certificado Digital y usar cita previa como acción principal del NIE; verificado en móvil, escritorio e inglés.
- [x] Actualizar Empadronamiento con la información aportada, desplegables y traducción al inglés; ficha y listado comprobados en móvil y escritorio.
- [x] Limitar etiquetas de trámites a Gratuito, Online y Requiere acudir en persona, y crear la guía de Cl@ve; pruebas y navegación verificadas en español e inglés, móvil y escritorio.
- [x] Crear TIE con el contenido aportado, traducciones y cita previa; verificados listado, siete desplegables, cinco pasos y acceso a Punto Vuela en móvil/escritorio y ambos idiomas.
- [x] Unificar Punto Vuela en su ficha, conservar redirección antigua y admitir enlaces internos sin barra, sin enlaces automáticos; 48 pruebas y navegación pública verificadas.
- [x] Presentar el bloque 03 «Trámites y gestiones» de Servicios públicos con pregunta de apertura, guía explicativa, caja de descargo («Aquí Bonela no realiza trámites…») y botón a la guía; 261 pruebas pasan y presentación verificada en 390 y 1280 px con las tres frases traducidas a los cinco idiomas.

### Trámites y editores

- [x] Fase 1: página propia de Trámites con buscador y categorías; sección 03 compacta; búsqueda, fichas, regreso y sugerencias verificados en móvil/escritorio y ES/EN; 80 pruebas pasan.
- [x] Fase 2: gestión de categorías y editor completo en `/admin/tramites`, visibilidad por apartado, ES/EN, borrador/publicado y guardado protegido; 103 pruebas y regresión de permisos anon/usuario/admin pasan; guías públicas intactas.
- [x] Activar negrita y cursiva en textos, tarjetas y vista previa de trámites; 42 pruebas pasan; formato y enlaces comprobados en ES/EN y móvil/escritorio con acceso simulado, guía pública verificada sin errores; guardado real pendiente de la sesión de administrador (B1).
- [x] Añadir enlaces externos con `/texto*enlace/` en trámites y descripciones de fichas, subrayados y verdes; 119 pruebas pasan, ES/EN y móvil/escritorio comprobados con datos simulados; enlace abierto en pestaña externa, sin modificar datos guardados.
- [x] Corregir el guardado de trámites para que no espere traducciones; prueba específica y flujo de navegador con datos simulados, lectura posterior y cero llamadas de traducción; guardado real pendiente de la sesión de administrador (B1).
- [x] Presentar los trámites con título y subtítulo en el editor, tarjetas, vista previa y páginas públicas; Empadronamiento separado de «Alta en el padrón municipal» y subtítulo incorporado a los seis idiomas.
- [x] Actualizar traducciones por campos con referencia a correcciones previas y diccionario de frases/terminología compartido entre fichas y trámites; preguntar al guardar, permitir guardar sin traducir y restablecer campos; 182 pruebas pasan, traducción real ucraniana actualiza el plazo conservando campos intactos y editores comprobados en 393/1280 px con datos aislados y lectura posterior; guardado real pendiente de la sesión de administrador (B1).
- [x] Admitir enlaces con `*** texto (enlace) ***` sin depender del dominio y conservar el formato anterior; enlaces y navegación interna comprobados en vista previa.
- [x] Ocultar botones, fuentes oficiales y contenedores de enlaces vacíos en trámites y vista previa; pruebas de filtrado y vista previa verificadas.
- [x] Mostrar automáticamente € para importes numéricos sin duplicarlo ni alterar importes descriptivos; valores 12, 12,50 y 0 comprobados.
- [x] Añadir grupos repetibles de título y requisitos, conservando la lista existente y traducciones; 195 pruebas pasan y editor/vista previa verificados en móvil y escritorio con guardado y lectura aislados; guardado real pendiente de la sesión de administrador (B1).
- [x] Corregir la reaparición de plantillas al eliminar trámites y recuperar Eliminar en guías sin guardar; 38 pruebas pasan y «Tarjeta Sanitaria Europea (TSE)» real abre sin errores ni cambios.
- [x] Ocultar copias antiguas de borradores en todas las vistas públicas; 41 pruebas pasan y NIE, Cl@ve y TIE reales no aparecen en listado/búsqueda ni abren mediante enlace directo, en móvil y escritorio sin errores.
- [x] Constructor modular de trámites: ocho elementos, secciones ordenables y notas finales, preservando contenido y traducciones existentes.
- [x] Comprobar editor modular, guardado y lectura posterior con datos aislados, vista previa y página pública en móvil/escritorio; 247 pruebas pasan y sin errores visibles.
- [x] Añadir elemento Imagen con subida privada, pie opcional, imagen compartida por idiomas y presentación uniforme sin recortar.

### Idiomas y traducciones

- [x] Completar traducciones al inglés de todas las páginas, ventanas y mensajes; verificar el selector y la persistencia del idioma.
- [x] Primera fase de idiomas: selector desplegable público con seis idiomas y persistencia; campos ingleses de categorías retirados sin borrar traducciones existentes; 11 pruebas y selector público comprobados en 320, 548 y 1280 px, sin errores; comprobación del diálogo autenticado pendiente de la sesión de administrador (B1).
- [x] Completar diccionarios públicos en alemán, neerlandés, francés y ucraniano, ampliar inglés y conservar nombres, datos y enlaces; cobertura y 148 pruebas verificadas; navegación principal, búsqueda real y formularios comprobados en seis idiomas, sin llamadas de traducción por visita.
- [x] Mostrar banderas independientes del sistema junto a los seis idiomas y aplicar el amarillo y las letras oficiales a Punto Vuela; 26 pruebas pasan, banderas, tipografía y enlace verificados en 320, 548 y 1280 px, sin errores.
- [x] Unificar los editores de fichas y trámites con seis idiomas, traducciones guardadas independientes y generación desde español sin sobrescribir correcciones; traducción real comprobada con formatos, horarios y enlaces intactos.
- [x] Conectar las traducciones editadas a las páginas públicas y comprobar aislamiento, persistencia y presentación en pruebas y navegador con datos de prueba; guías existentes conservadas.
- [x] Reducir ligeramente el logo de Punto Vuela (240 → 208 px), mantener la cabecera pública móvil en una línea con clima compacto y nombres completos en seis idiomas, simplificar los idiomas de ambos editores a desplegables sin banderas y mostrar estados del listado de trámites como etiquetas con recuentos; 169 pruebas pasan, cabecera comprobada en 320/393/548/1280 px y controles del panel con datos de prueba, sin escrituras reales.

### Administración, recursos y aspectos legales

- [x] Favicon e icono para pantalla de inicio (manifiesto + iconos 192/512).
- [x] Simplificar la cabecera del admin a logo negro centrado y menú sin SOS/idioma; unificar el acceso como «Panel editor»; presentación comprobada en tres tamaños con sesión simulada.
- [x] Mover Categorías y actividades desde Configuración a un botón desplegable en Fichas, conservando la gestión actual; apertura, tipos y ubicación comprobados con sesión simulada.
- [x] Exigir aceptación de la política antes de enviar información o avisos desde ventanas; bloqueo y desbloqueo comprobados sin enviar datos de prueba reales, 227 pruebas pasan.
- [x] Aviso móvil de instalación tras 12 segundos, descarte durante 30 días, guía iPhone y acceso desde menú, sin modo sin conexión; 233 pruebas pasan y guía, descarte, menú, Android (evento simulado), modo instalado y escritorio comprobados sin errores; instalación del sistema pendiente de probar en un móvil real tras publicar.
- [x] Identificar el email de avisos en Configuración reutilizando el contacto de administración; comprobación con datos aislados, guardado real pendiente de la sesión de administrador (B1).

---

## Reglas para mantener este roadmap

1. No borrar tareas completadas: forman el historial del producto y del piloto.
2. Usar los estados definidos al principio y añadir **Estado:** a cada tarea pendiente. Una prueba automatizada o simulada no equivale a una verificación en producción.
3. Al completar una tarea, anotar brevemente qué se comprobó y en qué entorno.
4. Si una tarea queda bloqueada, indicar el motivo concreto y qué hace falta para desbloquearla.
5. No duplicar tareas entre bloques: si una tarea del producto depende de una comprobación del piloto (o al revés), se registra en un solo sitio y el otro remite a él.
6. Mantener el producto común separado de la configuración y el contenido de cada municipio.
7. «Conecta tu Pueblo» identifica el producto común; «Aquí Bonela» identifica el portal local de Casarabonela.
8. Mantener este archivo como hoja de ruta maestra única. El Bloque A recoge el producto; el Bloque B, el piloto.
9. No dar por implantado en producción ningún cambio solo porque exista una migración o implementación en el repositorio.

## Próximo paso recomendado

**Primero, confirmar el estado de la migración de la fase 4 y de Turnstile en el Supabase y el entorno de producción de Casarabonela (B1 «Seguridad y formularios»).** Es una comprobación prioritaria porque afecta al funcionamiento de los formularios públicos. Después, confirmar el despliegue real y completar la instalación limpia en un proyecto Supabase nuevo con `04_verify.sql` (A1, Prioridad 1).
