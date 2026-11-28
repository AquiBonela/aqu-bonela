# Estándar de seguridad de Conecta tu Pueblo

Requisito permanente para cualquier cambio en este repositorio, lo haga una persona, Claude, Lovable u otra herramienta. `AGENTS.md` lo hace obligatorio. Si una funcionalidad no puede cumplir algún punto, se para y se consulta antes de implementarla.

## 1. Aislamiento entre municipios

**Modelo:** un proyecto Supabase por municipio (decisión del 28-11-2026). El aislamiento lo da el propio proyecto: base de datos, Auth, Storage y claves propios.

- **Por qué no hay columna de municipio:** las tablas no tienen `municipality_id` ni RLS por municipio. Ninguna consulta puede mezclar municipios, porque cada instalación solo conoce su Supabase.
- **Variables de entorno:** cada despliegue lee solo `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y, en el servidor, `SUPABASE_SERVICE_ROLE_KEY`.
- **Código:** nunca se escribe la URL ni la clave de un proyecto. El CI lo comprueba en `src/`.
- **Datos municipales:** solo en el Supabase de su municipio (reglas de `AGENTS.md`).
- **Comprobaciones del CI:** «Demo sin datos del municipio piloto» y los escenarios de identidad demuestran que una instalación no muestra datos de otra.
- **Usuarios:** un usuario o administrador existe solo en el Auth de su proyecto. El acceso de Groundwork a varios municipios son cuentas separadas, una por proyecto.
- **Archivos:** Storage es privado y propio de cada proyecto. Las rutas no llevan municipio porque el bucket ya es del municipio.

## 2. Autorización

- **Dónde se decide:** en la base de datos y en el servidor, nunca solo en la interfaz.
  - Ocultar un botón es comodidad, no seguridad.
  - Cada operación administrativa la vuelve a comprobar la base.
- **Rol de administración:** `public.has_role(auth.uid(), 'admin')` es un envoltorio `SECURITY INVOKER` del `private.has_role` no expuesto, y solo consulta el rol de quien llama.
  - Hoy existe un único rol, `admin` (Groundwork).
  - Un usuario autenticado sin rol no puede hacer nada administrativo.
- **Funciones `SECURITY DEFINER`:**
  - fijan `SET search_path = ''`;
  - comprueban `public.has_role(auth.uid(), 'admin')` antes de nada;
  - retiran `EXECUTE` a `PUBLIC` y `anon`;
  - las de trigger no se pueden llamar directamente.
  - Lo comprueban `src/lib/product-migrations-sql.test.ts` (cada migración) y `supabase/tests/security_invariants.sql` (la base entera).
- **Operaciones del titular de una ficha:** las hacen funciones solo de `service_role`, después de verificar en el servidor el hash del enlace (`/revision/<token>`). La clave de servicio no sale nunca del servidor.
- **MFA para administradores** (revisado en la etapa 2B):
  - **Compatibilidad:** Supabase Auth admite TOTP. La comprobación se añadiría en `private.has_role` exigiendo `aal2` en el JWT.
  - **Cuándo:** pendiente de su propio PR, porque necesita pantalla de alta del segundo factor y un procedimiento de recuperación. Hasta entonces: una sola cuenta de administración, contraseña robusta y cierre de sesión que borra los datos del panel de la memoria.

## 3. Base de datos, RLS y permisos

- **RLS en todas las tablas** de `public` y `private`.
- **Visitantes (`anon`):**
  - no escriben en ninguna tabla ni vista;
  - no leen las tablas privadas: contactos, roles, tokens, consentimientos, solicitudes, avisos, sugerencias, borradores, registros y `listings` directa.
  - Lo público se lee por vistas (`public_listings`) o funciones (`site_config()`), con permisos de columna.
- **Escritura directa del navegador:** nadie puede vaciar tablas (`TRUNCATE`), crear triggers ni referencias desde el navegador.
- **Permisos de columna** para lo que es parcialmente público. `updated_by` nunca es legible desde la web.
- **Lo publicado del contenido municipal** (identidad, ajustes públicos, cabeceras, menú, secciones y accesos) solo cambia por `publish_content_draft`. El navegador no tiene permiso de escritura sobre ello.
- **Validación en la base:**
  - restricciones `CHECK` para formatos, longitudes y ausencia de HTML o caracteres de control;
  - funciones que validan la forma exacta del contenido (sin claves desconocidas);
  - errores con `SQLSTATE` propios (`PT409` conflicto, `PT422` contenido o estado no válido) y `HINT` estable, que la interfaz traduce.
- **Concurrencia:**
  - toda escritura que pueda pisar otra compara la versión cargada (`updated_at` o huella md5 de lo publicado);
  - las publicaciones bloquean lo publicado antes de comprobar su versión.
  - Las pruebas con dos sesiones reales están en `scripts/ci-concurrency.sh`.
- **Migraciones:**
  - con versión mayor que la última;
  - bloque idéntico en `supabase/template/01_schema.sql`;
  - vuelta atrás en `supabase/rollback/`;
  - pruebas SQL que terminan en `ROLLBACK`, con los roles reales `anon` y `authenticated`;
  - `04_verify.sql` actualizado.
  - Se aplican solo con autorización expresa y nunca desde Lovable.

## 4. Storage

- **Buckets privados** con límite de tamaño y tipos admitidos: `listing-photos`, `procedure-images` y `site-assets`.
- **Lo que leen los visitantes:** solo los archivos que algo publicado referencia en ese momento (políticas de Storage). Un archivo subido para un borrador no es público hasta que se publica.
- **Panel:** el administrador ve las imágenes de un borrador con URL firmada de una hora.
- **Rutas:** cada subida tiene una ruta nueva con UUID, por ejemplo `accesos/<uuid>.webp`, y nunca se sobrescribe. Así la caché de `/marca/` puede ser inmutable.
- **Formato:** las imágenes se convierten en el navegador a WebP o PNG con tamaño máximo antes de subirlas.
- **Pendiente:**
  - limitar `listing-photos` a `image/webp` en la configuración del bucket (cambio de Storage que necesita autorización);
  - limpiar los archivos huérfanos de borradores descartados, que son privados y no se sirven.

## 5. Datos personales (RGPD)

- **Minimizar:**
  - los contactos privados de una ficha viven en `listing_contacts`, solo para administración;
  - solo se publica lo que el titular autoriza (`show_*`), con su consentimiento registrado en `consents`.
- **Registros sin valores:**
  - `admin_audit_log` guarda quién, cuándo, qué tabla, qué registro y qué columnas cambiaron, nunca los valores;
  - el estado que anota es solo uno no personal (`status`, `draft_key` o `purpose`).
- **Conformidad municipal:** se registra por cargo o área («Alcaldía», «Concejalía de Cultura»), sin datos personales innecesarios, como recuerda el formulario.
- **Secretos:** solo en variables de entorno del servidor. No se registran tokens, IP ni hashes en los logs (`src/lib/AGENTS.md`).
- **Conservación:** el registro de publicaciones guarda lo publicado y lo anterior (contenido institucional público) para trazabilidad y restauración. La política de conservación del registro de operaciones queda pendiente de definir (por ejemplo, 24 meses).
- **Analítica** (`src/lib/analytics.ts`, preparada sin activar):
  - sin cookies propias;
  - respeta «No rastrear»;
  - nunca envía números, correos ni direcciones completas.

## 6. Auditoría

**Qué registra `admin_audit_log`:**
- la identidad, los ajustes, las cabeceras, el menú, las secciones y los accesos;
- los borradores, cada paso del circuito y cada publicación;
- las fichas, sus contactos y fotos, los enlaces de revisión y los consentimientos;
- las categorías, las actividades y los trámites;
- los cambios de rol;
- los avisos y sugerencias gestionados.

**Cómo funciona:**
- una fila por operación, con autor (`auth.uid()`), rol de la petición, fecha y operación;
- solo lo leen los administradores y nadie lo edita ni lo borra desde el navegador;
- se añade una tabla nueva con un trigger `AFTER INSERT OR UPDATE OR DELETE … EXECUTE FUNCTION private.audit_change('<columnas clave>'[, '<columna de estado no personal>'])`.

## 7. Dos circuitos de publicación (no se mezclan)

- **Directorio:** Groundwork prepara la ficha, el titular la revisa por enlace y la acepta, y la aceptación la publica. Una regla de la base (`listings_publish_rule`) impide publicar sin aceptación, salvo los servicios públicos.
- **Contenido municipal:** borrador → presentado al Ayuntamiento → conformidad registrada por Groundwork (quién, fecha, medio y referencia) → revisión final y publicación por Groundwork.
  - Cambiar el contenido anula la conformidad.
  - Presentar prueba el contenido y lo deshace, para no pedir conformidad sobre algo que no se podría publicar.
  - Ver `docs/panel-administracion.md`.

## 8. Lista de comprobación de cada funcionalidad nueva

**Base de datos y permisos:**
- [ ] Autorización en la base o en el servidor; ningún permiso que dependa solo de la interfaz.
- [ ] RLS y `GRANT` mínimos; nada nuevo legible o escribible por `anon` salvo lo público necesario.
- [ ] Funciones `SECURITY DEFINER` con `search_path` vacío, comprobación del rol y `EXECUTE` revocado a `anon`.
- [ ] Validación en el navegador y en la base, con errores comprensibles.
- [ ] Versión comprobada en cada guardado que pueda pisar otro; prueba de concurrencia si hay dos actores.

**Archivos, datos y registro:**
- [ ] Archivos en buckets privados, con rutas nuevas por subida y lectura pública solo de lo publicado.
- [ ] Datos personales minimizados; consentimiento si se publican; nunca en el registro de operaciones.
- [ ] Trigger de auditoría en las tablas administrativas nuevas.

**Municipios y entrega:**
- [ ] Sin datos de ningún municipio en el código; configuración en su Supabase.
- [ ] Pruebas: `supabase/tests/` con roles reales (permisos, RLS, visitantes, usuario sin rol, administrador), `security_invariants.sql`, Vitest, tipos, lint, build y la comprobación de la demo.
