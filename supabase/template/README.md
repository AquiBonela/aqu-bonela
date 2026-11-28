# Plantilla de instalación limpia (Groundwork)

Crea una instalación nueva de la plataforma en un proyecto Supabase **vacío**, sin depender de la base de datos de Casarabonela.
`supabase/migrations/` es el historial de Casarabonela y no se toca.

| Archivo | Qué hace | ¿Repetible? |
|---|---|---|
| `01_schema.sql` | Esquemas, extensiones, 3 ENUM, 27 tablas `public` y 1 privada, restricciones, índices, 36 funciones, 41 triggers, permisos de tabla/columna/función, RLS, 50 políticas `public`, 10 políticas de Storage (buckets por API), limpieza programada del rate limiting | No: solo en un proyecto vacío |
| `02_seed_universal.sql` | 28 categorías, 155 actividades (con sinónimos), 6 categorías de trámites | Sí |
| `03_init_instance.sql` | Configuración de la instalación (`site_settings`), identidad pública (`site_identity`) y, opcionalmente, primer administrador | Sí |
| `04_verify.sql` | Comprueba estructura, seguridad y datos con pruebas reales por rol; no deja datos | Sí |

El esquema se ha generado desde el **catálogo de PostgreSQL de producción** (no desde las migraciones históricas).

## 1. Requisitos previos
- Proyecto Supabase nuevo (región UE recomendada). Se ejecuta todo como `postgres` desde **SQL Editor**.
- Repositorio común con la instancia del municipio en `instances/<id>/`.
- Proyecto Vercel nuevo y dominio propio.
- Widget de Cloudflare Turnstile para ese dominio.

## 2. Extensiones
`pgcrypto` y `uuid-ossp` se crean automáticamente. `pg_cron` es opcional:
- Antes de ejecutar 01, actívalo en **Database → Extensions → pg_cron** (recomendado).
- Si no está, 01 termina igualmente con un aviso y la limpieza queda sin programar. Para programarla después:
  ```sql
  SELECT cron.schedule('cleanup-form-rate-limits', '17 * * * *', 'SELECT private.cleanup_expired_rate_limits(5000);');
  ```
  Sin limpieza el rate limiting sigue funcionando; solo acumula filas caducadas.

## 3. Orden de ejecución
1. Crear mediante Storage API los buckets privados `listing-photos` (5 MB, sin restricción MIME), `procedure-images` (8 MB, solo `image/webp`) y `site-assets` (5 MB, `image/webp` e `image/png`: logotipos, iconos, cabeceras de página y accesos directos de la portada); después ejecutar `01_schema.sql` (una vez).
2. `02_seed_universal.sql`.
3. Crear el primer administrador en Authentication (apartado 4).
4. Editar el bloque `DECLARE` de `03_init_instance.sql` y ejecutarlo.
5. `04_verify.sql` → debe mostrar `VERIFICACIÓN SUPERADA`.

SQL Editor no admite variables de psql (`\set`, `:var`): por eso 03 usa un bloque `DO $$ DECLARE ... $$`.

## 4. Primer administrador
1. **Authentication → Users → Add user** (o *Invite*) con el correo del administrador. Nunca se escriben contraseñas ni UUID en los scripts.
2. Pon ese correo en `v_first_admin_email` de 03 y ejecútalo. Alternativa:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users WHERE lower(email) = lower('correo@ejemplo.es')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```
3. Desactiva el registro público en **Authentication → Providers → Email** si no se necesita.

## 5. Titularidad legal
Los campos `legal_*` identifican a quien **opera** el servicio en ese municipio. Puede ser una persona, empresa o entidad; no se presupone que sea el Ayuntamiento ni Groundwork. Deben completarse antes de publicar.

## 6. Variables de entorno (Vercel)
| Variable | Tipo | Valor |
|---|---|---|
| `VITE_MUNICIPALITY_ID` | Pública | Nombre de su carpeta en `instances/` |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Pública | URL del proyecto nuevo |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Pública | Clave publicable del proyecto nuevo |
| `VITE_SUPABASE_PROJECT_ID` | Pública | Ref del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreta** | Del proyecto nuevo; nunca reutilizar |
| `RATE_LIMIT_SECRET` | **Secreta, nueva** | `openssl rand -hex 32` |
| `TURNSTILE_SITE_KEY` | Pública | Del widget del dominio |
| `TURNSTILE_SECRET_KEY` | **Secreta** | Del widget del dominio |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Servidor | Dominios separados por comas, p. ej. `aquiejemplo.es,www.aquiejemplo.es` |
| `TRUSTED_CLIENT_IP_HEADER` | Opcional | Solo si hay otro proxy delante de Vercel |
| `LOVABLE_API_KEY` | Secreta, opcional | Traducción asistida en el panel |

## 7. Turnstile
1. Cloudflare → Turnstile → *Add widget*, modo *Managed*.
2. Hostnames: el dominio de producción, `www` si aplica y, si se prueban, los de vista previa.
3. Copia las claves a Vercel y pon los mismos hostnames en `TURNSTILE_ALLOWED_HOSTNAMES`.
Sin esto los formularios de sugerencias y reportes no envían.

## 8. Vercel
1. *New Project* → repositorio común.
2. *Settings → Git → Production Branch*: la rama de versión elegida para este municipio (no `main` salvo el piloto).
3. Variables del apartado 6 y dominio propio.

## 9. Verificación
`04_verify.sql` comprueba:
- 27 tablas `public` + `private.form_rate_limits`, 307 columnas, 133 restricciones, RLS activo en todas.
- Regla de publicación (una ficha no se publica sin la aprobación de su titular salvo los servicios públicos), registro de eventos, cabeceras de página, colores y rutas de recursos, ubicación aproximada y permisos de la web.
- Valores exactos de los 3 ENUM.
- 50 políticas `public`, 10 de Storage y una denegación explícita en `private.form_rate_limits`; 36 funciones y 41 triggers; toda función `SECURITY DEFINER` con `search_path` vacío.
- Buckets privados con sus límites y tipos MIME.
- Permisos: anon no lee `admin_whatsapp`/`contact_email`, nadie salvo el servidor inserta sugerencias/reportes, solo `service_role` ejecuta `check_rate_limit`.
- Pruebas reales simulando `anon`, `authenticated` sin rol, administrador y `service_role`: borradores ocultos, contactos privados, autoasignación de admin bloqueada, `has_role` no consulta a terceros, el trigger de contacto no publica datos no autorizados y el rate limit deniega el tercer intento.
- Semilla universal y fila de configuración.
- Identidad (`site_identity`): lectura pública por `site_config()` sin el autor del cambio, valores no válidos rechazados y autor registrado.
- Circuito de publicación municipal: nadie escribe directamente identidad, cabeceras ni textos públicos (solo se publican borradores presentados al Ayuntamiento y con la conformidad registrada); los ajustes internos se guardan al momento; cada operación queda en `admin_audit_log` sin valores; los visitantes no escriben en ninguna tabla ni leen las privadas.
Después, prueba en la web: inicio de sesión del administrador, alta de una ficha con foto, envío de una sugerencia.

## 10. Diferencias conocidas respecto a producción
- `site_settings.hero_subtitle` y `whatsapp_template`: valores por defecto neutros (en producción mencionan Casarabonela/Aquí Bonela).
- Categoría de trámites `municipales`: descripción sin nombre de municipio.
- Privilegio `MAINTAIN` (solo PostgreSQL 17) no se concede, para que el script funcione también en PostgreSQL 15. No afecta a la aplicación.
- No se concede `TRUNCATE` a `anon` ni `authenticated`: ese permiso elude RLS; el vaciado queda reservado al servidor/operador.
- El trabajo de `pg_cron` se llama `cleanup-form-rate-limits` (en producción no tiene nombre).
- No se incluyen fichas, trámites, contactos, sugerencias, reportes, usuarios ni archivos.

## 11. Riesgos pendientes
- Los permisos ordinarios heredados siguen dependiendo de RLS; el permiso de vaciado `TRUNCATE` se ha retirado y se verifica expresamente.
- La plantilla es una foto de producción a la fecha de generación: cada nueva migración en `supabase/migrations/` debe reflejarse también aquí.
- Instalación real verificada el 27/11/2026 en la demo `wldwhbvjefvtkuxqbvpl`: `04_verify.sql` superado, 28 categorías, 155 actividades, 6 categorías de trámites, dos buckets privados y limpieza horaria activa. Sin fichas, contactos, trámites ni usuarios reales; acceso administrativo y formularios completos pendientes.
- El asesor mantiene dos avisos previos sobre ejecución de funciones con privilegios elevados; no se cambiaron funciones previas ajenas a la instalación.
