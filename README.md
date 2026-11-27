# Conecta tu Pueblo

**Plataforma digital municipal desarrollada y operada por Groundwork.**

Conecta tu Pueblo es un producto tecnológico orientado a mejorar el acceso a la información, los servicios y la actividad de los municipios. Su objetivo es facilitar la conexión entre vecinos, visitantes, comercios, profesionales, asociaciones y administraciones locales.

Cada municipio podrá disponer de un portal con identidad visual, dominio y configuración propios, utilizando una base tecnológica común.

## 1. Producto

Conecta tu Pueblo se concibe como una plataforma replicable y adaptable a diferentes municipios.

Groundwork desarrolla, implanta y mantiene la solución, incluyendo la organización de contenidos, la gestión de información y el soporte técnico.

El Ayuntamiento participa como colaborador institucional, facilitando información oficial y validando los contenidos que correspondan a sus competencias.

## 2. Objetivos

- Centralizar información municipal útil.
- Facilitar el descubrimiento de comercios y profesionales locales.
- Mejorar el acceso a servicios públicos y recursos municipales.
- Dar visibilidad a asociaciones, actividades y acontecimientos.
- Facilitar la comunicación entre la comunidad local y su entorno.
- Mantener información organizada, accesible y actualizada.

## 3. Arquitectura y modelo de implantación

El producto sigue un enfoque de tecnología común y configuración municipal independiente.

Principios de diseño:

- Código y funcionalidades compartidos.
- Identidad visual y dominio propios para cada municipio.
- Configuración y contenidos específicos de cada implantación.
- Separación de datos entre municipios.
- Gestión centralizada del producto por Groundwork.
- Posibilidad de ampliar funcionalidades sin reconstruir cada portal desde cero.

La arquitectura definitiva de operación mult municipal y administración central se desarrollará progresivamente y deberá validarse mediante pruebas técnicas antes de considerarse completada.

## 4. Tecnología

Tecnologías y servicios utilizados:

- **Frontend:** React y tecnologías asociadas al proyecto.
- **Base de datos y servicios backend:** Supabase.
- **Control de versiones:** Git y GitHub.
- **Desarrollo asistido:** Lovable y herramientas de desarrollo local.
- **Despliegue:** Vercel.

La configuración pública necesaria para el funcionamiento de la aplicación se gestiona mediante variables de entorno y mecanismos de configuración del servidor.

Las credenciales privadas y secretos no deben incorporarse al repositorio.

## 5. Seguridad y privacidad

La seguridad forma parte de los requisitos fundamentales del producto.

Criterios de desarrollo:

- Row Level Security (RLS) en las tablas que contienen información protegida.
- Separación de permisos según el tipo de usuario.
- Validación de datos recibidos mediante formularios.
- Protección de operaciones administrativas.
- Gestión segura de variables de entorno.
- Protección contra envíos automatizados y abuso de formularios.
- Publicación responsable de información personal y datos de contacto.

La seguridad debe verificarse mediante pruebas y auditorías periódicas. La existencia de una implementación no implica que todos sus controles hayan sido auditados.

## 6. Calidad y automatización

El repositorio incorpora un flujo de integración continua mediante GitHub Actions.

Archivo:

`.github/workflows/ci.yml`

El flujo contempla:

1. Instalación de dependencias con Bun y lockfile congelado.
2. Ejecución de pruebas.
3. Construcción de producción (build).
4. Ejecución de lint.

El lint permanece temporalmente como comprobación informativa y no bloqueante, hasta abordar los problemas de formato existentes.

En la primera Pull Request de integración del CI, las pruebas y el build finalizaron correctamente. El lint devolvió errores de formato, sin bloquear la integración.

El flujo se ejecuta en las Pull Requests y en los cambios enviados a la rama principal `main`.

## 7. Estado del desarrollo

El producto se encuentra en desarrollo progresivo.

Se consideran áreas de trabajo:

- Consolidación de la arquitectura común.
- Separación de configuración y contenidos municipales.
- Replicación controlada de portales.
- Seguridad y validación de datos.
- Automatización de pruebas y despliegues.
- Herramientas para carga y actualización de información.
- Evolución hacia una administración centralizada del producto.

Las funcionalidades se considerarán terminadas únicamente después de su implementación y verificación.

## 8. Principios de desarrollo

- Evitar reconstrucciones innecesarias.
- Mantener una base tecnológica común.
- No introducir cambios visuales o funcionales fuera del alcance aprobado.
- Proteger los datos y la independencia de cada municipio.
- Priorizar soluciones sencillas de mantener.
- Documentar los cambios relevantes.
- Trabajar mediante ramas y Pull Requests cuando corresponda.
- Verificar los cambios antes de incorporarlos a producción.

## 9. Propiedad y mantenimiento

El producto es desarrollado y mantenido por Groundwork.

Repositorio principal:

`daflagel/conecta_tu_pueblo`

La evolución del código, la infraestructura y las funcionalidades se gestiona de forma progresiva, procurando mantener la independencia tecnológica y el control del producto.

---

**Conecta tu Pueblo — Un producto de Groundwork.**
