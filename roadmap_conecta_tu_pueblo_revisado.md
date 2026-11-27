# Conecta tu Pueblo — Hoja de ruta maestra

**Documento único de seguimiento del producto, desarrollo técnico, implantación municipal y portal piloto.** Se mantienen dos ámbitos dentro del mismo documento: el producto común de Groundwork y la implantación local de Casarabonela.

- **Producto:** Conecta tu Pueblo.
- **Empresa operadora y responsable del producto:** Groundwork.
- **Municipio piloto:** Casarabonela.
- **Nombre del portal local:** Aquí Bonela.
- **Estado general:** producto en desarrollo. Hay funcionalidades implementadas y pruebas automatizadas, pero aún faltan validaciones en producción y un procedimiento de alta municipal probado de principio a fin.

## Cómo interpretar los estados

- **Implementado en código:** existe en el repositorio; no implica que esté desplegado ni operativo.
- **Probado con automatización:** cuenta con pruebas automatizadas o comprobaciones en entorno controlado.
- **Verificado en producción:** comprobado en el servicio y entorno reales.
- **Bloqueado:** no se puede completar hasta disponer de acceso, credenciales, configuración o una decisión pendiente.

No se deben confundir las pruebas simuladas con una validación de producción. Las marcas `[x]` del historial indican que el cambio se implementó o se comprobó en el alcance descrito en su nota; no certifican por sí solas su funcionamiento en producción.

---

# BLOQUE A — Producto común: Conecta tu Pueblo

## A1. Estado y prioridades del producto

### Prioridad 1 — Asegurar la instalación y definir el despliegue

- [ ] Confirmar dónde está desplegado realmente el portal piloto (Vercel o Cloudflare) y documentar el proceso de despliegue, variables y dominios. **Bloqueado:** la documentación y la configuración del repositorio no son coherentes; el README menciona Vercel, mientras que la configuración del proyecto contiene elementos de Lovable/Cloudflare.
- [ ] Crear un proyecto Supabase real nuevo y ejecutar la plantilla de `supabase/template/`.
- [ ] Ejecutar `04_verify.sql` en ese proyecto y resolver cualquier error.
- [ ] Confirmar qué migraciones están aplicadas en el Supabase de producción de Casarabonela, especialmente la migración de la fase 4 del anti-spam.
- [ ] Verificar en el entorno de producción la presencia y configuración de `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SECRET` y las variables `TURNSTILE_*`.

### Prioridad 2 — Corregir documentación y configuración técnica

- [ ] Actualizar el `AGENTS.md` de la raíz para que refleje el flujo actual de formularios e inserciones exclusivamente desde servidor. Evitar que contradiga `src/lib/AGENTS.md` y el código.
- [ ] Completar `.env.example` con las variables necesarias, sin incluir secretos reales.
- [ ] Mover las URLs `lovable.app` que siguen escritas directamente en el código a configuración apropiada.
- [ ] Revisar `supabase/config.toml`, que actualmente apunta al proyecto Supabase de Casarabonela, y definir cómo evitar que una instalación nueva herede accidentalmente esa referencia.

### Prioridad 3 — Hacer fiable el control de calidad

- [ ] Corregir los problemas de formato que hacen fallar el lint.
- [ ] Cuando el lint esté limpio, retirar `continue-on-error` para que vuelva a bloquear el CI si falla.
- [ ] Incorporar al CI la ejecución de las pruebas SQL de permisos de `supabase/tests/`.
- [ ] Incorporar al CI una comprobación reproducible de la plantilla y las migraciones, incluyendo `04_verify.sql` sobre PostgreSQL.
- [ ] Definir una comprobación que detecte si la plantilla de instalación queda desactualizada respecto de las migraciones.

### Prioridad 4 — Preparar la replicación municipal

- [ ] Extraer de los componentes y rutas el contenido específico de Casarabonela para que cada municipio pueda tener sus propios datos sin modificar el código común.
- [ ] Preparar recursos públicos por municipio: favicon, iconos, imágenes y manifiesto PWA. El manifiesto actual identifica Aquí Bonela/Casarabonela y contiene un color que no coincide con la configuración del tema.
- [ ] Llevar a configuración los textos legales y revisar su adecuación al modelo de Groundwork con asesoramiento legal antes de comercializar el servicio.
- [ ] Definir una política de versiones y despliegues por municipio que mantenga un código común; no crear ramas permanentes por municipio sin resolver antes cómo se actualizarían.
- [ ] Documentar y probar el alta de un municipio nuevo de principio a fin.
- [ ] Implantar un segundo municipio real como prueba de replicabilidad.
- [ ] Comprobar que los datos, archivos, dominios y configuraciones de cada municipio permanecen aislados.

### Prioridad 5 — Operación y evolución del producto

- [ ] Implementar el envío de avisos por correo desde los formularios, conservando también la copia en el panel. **Es desarrollo pendiente:** actualmente no hay código de envío de correo.
- [ ] Elegir proveedor de correo, implementar el envío, configurar el dominio y probar entregabilidad.
- [ ] Incorporar un sitemap y comprobar su generación para cada municipio.
- [ ] Definir copias de seguridad, recuperación y monitorización para cada instalación.
- [ ] Diseñar un plan para eliminar la dependencia del servicio de traducción de Lovable (`ai.gateway.lovable.dev`).
- [ ] Evaluar las políticas de permisos de tablas y reforzar la seguridad más allá de depender únicamente de RLS cuando corresponda.
- [ ] Valorar una administración central de Groundwork cuando la replicación de un segundo municipio esté probada. No es un requisito para cerrar el piloto inicial.

---

# BLOQUE B — Implantación piloto: Aquí Bonela (Casarabonela)

## B1. Validaciones pendientes del portal piloto

### Panel de administración — una única sesión de validación

- [ ] Realizar una sesión completa con una cuenta real de administrador en el Supabase de producción y comprobar:
  - [ ] Guardado y lectura de fichas, incluidos los campos de contacto y sus traducciones.
  - [ ] Subida de fotos y guardado de Resaltado.
  - [ ] Creación, edición y eliminación de avisos.
  - [ ] Guardado de distinciones y eliminación de fichas.
  - [ ] Guardado de trámites y sus traducciones.
  - [ ] Guardado y lectura del editor modular de trámites.
  - [ ] Subida y lectura de imágenes privadas de trámites.
  - [ ] Eliminación de «Tarjeta sanitaria europea» desde el panel, si sigue siendo necesario.
  - [ ] Traducciones del panel y flujo de revisión mediante un enlace/token válido.
- **Estado:** bloqueado por falta de una sesión real de administrador disponible para estas comprobaciones. Las pruebas con datos aislados o sesiones simuladas no sustituyen esta sesión.

### Seguridad y formularios

- [ ] Confirmar en Supabase de producción si está aplicada la migración `20261124153932…sql`, que retira los INSERT públicos de la fase 4.
- [ ] Confirmar que Turnstile está configurado para los dominios reales y que las variables necesarias están presentes antes de dar por operativos los formularios.
- [ ] Probar desde la web publicada el envío real de sugerencias e informes de fichas, y comprobar que quedan registrados en el panel.
- **Estado:** la fase 4 está **implementada en código** y también está incluida en la plantilla SQL. Su aplicación en producción y la configuración de Turnstile siguen pendientes de confirmar. No volver a tratarla como una tarea de desarrollo de código ya pendiente.

### Correo e instalación móvil

- [ ] Cuando se implemente el envío de correo (Bloque A, Prioridad 5), probar los avisos reales de los formularios sin quitar la copia del panel.
- [ ] Probar la instalación de Aquí Bonela en un móvil real después de publicar.

### Configuración y contenido municipal

- [ ] Cambiar `siteUrl` a `https://aquibonela.es` cuando el dominio esté conectado y operativo.
- [ ] Completar horarios y webs oficiales de servicios públicos cuando se disponga de información municipal fiable.
- [ ] Revisar la información institucional y los teléfonos con las fuentes responsables antes de publicar cambios.

## B2. Plantilla e instalación limpia

- [x] Crear la plantilla de instalación limpia en `supabase/template` (esquema, semilla, configuración y verificación) y probarla en PostgreSQL local.
- [ ] Ejecutar la plantilla en un proyecto Supabase real nuevo y pasar `04_verify.sql`.

---

## Registro histórico de trabajo implementado en Aquí Bonela

Las tareas siguientes se conservan como historial de cambios del portal piloto. Sus marcas `[x]` reflejan el estado anotado cuando se realizaron; no implican validación de producción salvo que la descripción lo indique expresamente.

### Directorio, fichas y avisos

-   [x] Etiquetas sin iconos; urgencias y hashtags como la referencia.
-   [x] Guardia fin de semana y atención en festivos en el formulario y
    fichas.
-   [x] Eliminación con confirmación en administración.
-   [x] Sustituir Colaborador por Resaltado sin etiqueta pública;
    habilitar cinco fotos para todas las fichas; pruebas de
    portada/galería y navegación pública verificadas.
-   [x] Reparar enlaces de avisos usando el identificador de la ficha.
-   [x] Desplegables de categoría/oficio y filtro por tipo.
-   [x] Reordenar ficha: etiquetas, nombre, dirección, descripción,
    hashtags, horario, galería y pie.
-   [x] Galería en dos columnas con última imagen impar a todo el ancho.
-   [x] Alinear distinciones amarillas a la derecha en fichas y
    tarjetas; verificar presentación.
-   [x] Añadir filtros de tipo, categoría y actividad al listado admin,
    combinables con búsqueda y estado.
-   [x] Abrir alta de negocio en una ventana desde portada y directorio,
    reutilizando el formulario de sugerencias; verificar apertura,
    campos y cierre en móvil y escritorio.
-   [x] Abrir Enviar información en ventana y añadir separación antes de
    la tarjeta Directorio en portada.
-   [x] Añadir cabecera a fichas y flecha circular compartida en todas
    las páginas; verificar en móvil y escritorio.
-   [x] Añadir segundo teléfono y redes sociales con visibilidad
    individual en alta, revisión y ficha pública; 68 pruebas y
    sincronización de visibilidad verificadas.
-   [x] Incluir la portada de cada ficha en los avisos de compartir
    cuando tenga imagen; foto real accesible y etiquetas presentes en
    HTML inicial; requiere publicar para WhatsApp.

### Navegación, interfaz y experiencia móvil

-   [x] Logo pequeño y arriba dentro del menú verde (cabecera de la
    portada: solo el grande).
-   [x] Barra fija de Descubrir: visible solo al quedar anclada arriba.
-   [x] Incorporar respuesta táctil, transiciones de resultados,
    sugerencias animadas y confirmaciones flotantes; comprobar
    búsquedas, compartir y movimiento reducido en navegador.
-   [x] Quitar el logo de la cabecera (móvil y escritorio).
-   [x] Mostrar idioma móvil y estado del clima en cabecera, y texto
    Aquí Bonela sobre Directorio en menú.
-   [x] Poner Actualidad y Clasificados en gris y sin animación en la
    portada mientras no estén activos.
-   [x] Reordenar los horarios del autobús en Servicios Públicos: dos
    bloques (Hacia Málaga / Desde Málaga) con días y horas alineados;
    verificar en móvil y escritorio.
-   [x] Simplificar contactos locales, añadir Alozaina y explicar
    reciclaje; verificar móvil e inglés.
-   [x] Quitar recuadros de las preguntas, subir etiquetas y enlazar
    Punto Vuela a su ficha; verificar móvil, escritorio e inglés.
-   [x] Renombrar categoría y Certificado Digital, y mantener los
    enlaces legales en una línea; verificado en móvil, escritorio e
    inglés.
-   [x] Mostrar un resumen de dos o tres líneas en las tarjetas de
    trámites, conservando la descripción completa en cada ficha;
    verificado en móvil, escritorio e inglés.
-   [x] Poner cada línea de Punto Vuela en una sola línea, acortando
    «Ayuda con gestiones online» y agrandando la letra; verificado en
    móvil (320--480), escritorio, ambos idiomas y los dos temas.
-   [x] Mantener fija la cabecera en todas las páginas y dejar libres
    los filtros del directorio al desplazarse; 169 pruebas pasan y
    guardado, subtítulo, portada, ficha y directorio comprobados en
    móvil sin errores.
-   [x] Evitar que los paneles de portada tapen las sugerencias del
    buscador; comprobado en 390, 602 y 1280 px.

### Páginas informativas y servicios públicos

-   [x] Página «Sobre Aquí Bonela» con enlace activo en el menú.
-   [x] Ampliar la ficha del Certificado Digital con desplegables,
    acceso FNMT y traducciones; verificar móvil, escritorio e inglés.
-   [x] Crear la guía completa del NIE con la estructura de Certificado
    Digital, enlaces oficiales y traducciones; verificado móvil,
    escritorio e inglés.
-   [x] Quitar Punto Vuela del bloque «Dónde» de Certificado Digital y
    usar cita previa como acción principal del NIE; verificado móvil,
    escritorio e inglés.
-   [x] Actualizar Empadronamiento con la información aportada,
    desplegables y traducción al inglés; ficha y listado comprobados en
    móvil y escritorio.
-   [x] Limitar etiquetas de trámites a Gratuito, Online y Requiere
    acudir en persona, y crear la guía de Cl@ve; pruebas y navegación
    verificadas en español e inglés, móvil y escritorio.
-   [x] Crear TIE con el contenido aportado, traducciones y cita previa;
    verificados listado, siete desplegables, cinco pasos y acceso a
    Punto Vuela en móvil/escritorio y ambos idiomas.
-   [x] Unificar Punto Vuela en su ficha, conservar redirección antigua
    y admitir enlaces internos sin barra, sin enlaces automáticos; 48
    pruebas y navegación pública verificadas.
-   [x] Presentar el bloque 03 «Trámites y gestiones» de Servicios
    públicos con pregunta de apertura, guía explicativa, caja de
    descargo («Aquí Bonela no realiza trámites...») y botón a la guía;
    261 pruebas pasan y presentación verificada en 390 y 1280 px con las
    tres frases traducidas a los cinco idiomas.

### Trámites y editores

-   [x] Fase 1: página propia de Trámites con buscador y categorías;
    sección 03 compacta; búsqueda, fichas, regreso y sugerencias
    verificados en móvil/escritorio y ES/EN; 80 pruebas pasan.
-   [x] Fase 2: gestión de categorías y editor completo en
    `/admin/tramites`, visibilidad por apartado, ES/EN,
    borrador/publicado y guardado protegido; 103 pruebas y regresión de
    permisos anon/usuario/admin pasan; guías públicas intactas.
-   [x] Activar negrita y cursiva en textos, tarjetas y vista previa de
    trámites; 42 pruebas pasan; formato y enlaces comprobados en ES/EN y
    móvil/escritorio con acceso simulado, guía pública verificada sin
    errores; guardado real pendiente del acceso externo indicado arriba.
-   [x] Añadir enlaces externos con `/texto*enlace/` en trámites y
    descripciones de fichas, subrayados y verdes; 119 pruebas pasan,
    ES/EN y móvil/escritorio comprobados con datos simulados; enlace
    abierto en pestaña externa, sin modificar datos guardados.
-   [x] Corregir el guardado de trámites para que no espere
    traducciones; prueba específica y flujo de navegador con datos
    simulados, lectura posterior y cero llamadas de traducción; guardado
    real pendiente del acceso externo ya indicado.
-   [x] Presentar los trámites con título y subtítulo en el editor,
    tarjetas, vista previa y páginas públicas; Empadronamiento separado
    de «Alta en el padrón municipal» y subtítulo incorporado a los seis
    idiomas.
-   [x] Actualizar traducciones por campos con referencia a correcciones
    previas y diccionario de frases/terminología compartido entre fichas
    y trámites; preguntar al guardar, permitir guardar sin traducir y
    restablecer campos; 182 pruebas pasan, traducción real ucraniana
    actualiza el plazo conservando campos intactos y editores
    comprobados en 393/1280 px con datos aislados y lectura posterior;
    guardado real pendiente de la sesión externa indicada arriba.
-   [x] Ocultar botones, fuentes oficiales y contenedores de enlaces
    vacíos en trámites y vista previa; pruebas de filtrado y vista
    previa verificadas.
-   [x] Mostrar automáticamente € para importes numéricos sin duplicarlo
    ni alterar importes descriptivos; valores 12, 12,50 y 0 comprobados.
-   [x] Añadir grupos repetibles de título y requisitos, conservando la
    lista existente y traducciones; 195 pruebas pasan y editor/vista
    previa verificados en móvil y escritorio con guardado y lectura
    aislados; guardado real sigue pendiente de la sesión externa
    indicada arriba.
-   [x] Corregir la reaparición de plantillas al eliminar trámites y
    recuperar Eliminar en guías sin guardar; 38 pruebas pasan y «Tarjeta
    Sanitaria Europea (TSE)» real abre sin errores ni cambios.
-   [x] Ocultar copias antiguas de borradores en todas las vistas
    públicas; 41 pruebas pasan y NIE, Cl@ve y TIE reales no aparecen en
    listado/búsqueda ni abren mediante enlace directo, en móvil y
    escritorio sin errores.
-   [x] Constructor modular de trámites: ocho elementos, secciones
    ordenables y notas finales, preservando contenido y traducciones
    existentes.
-   [x] Comprobar editor modular, guardado y lectura posterior con datos
    aislados, vista previa y página pública en móvil/escritorio; 247
    pruebas pasan y sin errores visibles.
-   [x] Añadir elemento Imagen con subida privada, pie opcional, imagen
    compartida por idiomas y presentación uniforme sin recortar.

### Idiomas y traducciones

-   [x] Completar traducciones al inglés de todas las páginas, ventanas
    y mensajes; verificar el selector y la persistencia del idioma.
-   [x] Primera fase de idiomas: selector desplegable público con seis
    idiomas y persistencia; campos ingleses de categorías retirados sin
    borrar traducciones existentes; 11 pruebas y selector público
    comprobados en 320, 548 y 1280 px, sin errores; comprobación del
    diálogo autenticado pendiente del acceso externo ya indicado.
-   [x] Completar diccionarios públicos en alemán, neerlandés, francés y
    ucraniano, ampliar inglés y conservar nombres, datos y enlaces;
    cobertura y 148 pruebas verificadas; navegación principal, búsqueda
    real y formularios comprobados en seis idiomas, sin llamadas de
    traducción por visita.
-   [x] Mostrar banderas independientes del sistema junto a los seis
    idiomas y aplicar el amarillo y las letras oficiales a Punto Vuela;
    26 pruebas pasan, banderas, tipografía y enlace verificados en 320,
    548 y 1280 px, sin errores.
-   [x] Unificar los editores de fichas y trámites con seis idiomas,
    traducciones guardadas independientes y generación desde español sin
    sobrescribir correcciones; traducción real comprobada con formatos,
    horarios y enlaces intactos.
-   [x] Conectar las traducciones editadas a las páginas públicas y
    comprobar aislamiento, persistencia y presentación en pruebas y
    navegador con datos de prueba; guías existentes conservadas.
-   [x] Reducir ligeramente el logo de Punto Vuela (240 → 208 px),
    mantener la cabecera pública móvil en una línea con clima compacto y
    nombres completos en seis idiomas, simplificar los idiomas de ambos
    editores a desplegables sin banderas y mostrar estados del listado
    de trámites como etiquetas con recuentos; 169 pruebas pasan,
    cabecera comprobada en 320/393/548/1280 px y controles del panel con
    datos de prueba, sin escrituras reales.

### Administración, recursos y aspectos legales

-   [x] Favicon e icono para pantalla de inicio (manifiesto + iconos
    192/512).
-   [x] Simplificar la cabecera del admin a logo negro centrado y menú
    sin SOS/idioma; unificar el acceso como «Panel editor»; presentación
    comprobada en tres tamaños con sesión simulada.
-   [x] Mover Categorías y actividades desde Configuración a un botón
    desplegable en Fichas, conservando la gestión actual; apertura,
    tipos y ubicación comprobados con sesión simulada.
-   [x] Exigir aceptación de la política antes de enviar información o
    avisos desde ventanas; bloqueo y desbloqueo comprobados sin enviar
    datos de prueba reales, 227 pruebas pasan.
-   [x] Aviso móvil de instalación tras 12 segundos, descarte durante 30
    días, guía iPhone y acceso desde menú, sin modo sin conexión; 233
    pruebas pasan y guía, descarte, menú, Android (evento simulado),
    modo instalado y escritorio comprobados sin errores; instalación del
    sistema pendiente de probar en un móvil real tras publicar.
-   [x] Identificar el email de avisos en Configuración reutilizando el
    contacto de administración; comprobación con datos aislados,
    guardado real pendiente de sesión de administrador en Supabase
    externo.

------------------------------------------------------------------------

## Reglas para mantener este roadmap

1. No borrar tareas completadas: forman el historial del producto y del piloto.
2. Usar los estados definidos al principio. Una prueba automatizada no equivale a una verificación en producción.
3. Al completar una tarea, anotar brevemente qué se comprobó y en qué entorno.
4. Si una tarea queda bloqueada, indicar el motivo concreto y qué hace falta para desbloquearla.
5. Mantener el producto común separado de la configuración y el contenido de cada municipio.
6. «Conecta tu Pueblo» identifica el producto común; «Aquí Bonela» identifica el portal local de Casarabonela.
7. Mantener este archivo como hoja de ruta maestra única. El Bloque A recoge el producto; el Bloque B, el piloto.
8. No dar por implantado en producción ningún cambio solo porque exista una migración o implementación en el repositorio.

## Próximo paso recomendado

**Primero, confirmar el estado de la migración de fase 4 y de Turnstile en el Supabase de producción de Casarabonela.** Es una comprobación prioritaria porque afecta al funcionamiento de los formularios públicos. Después, completar la instalación limpia en un proyecto Supabase nuevo y ejecutar `04_verify.sql`.
