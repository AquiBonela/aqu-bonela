# Aquí Bonela

# Brief: directorio de comercios y profesionales del municipio

## 1. Objetivo

Web de directorio de comercios y profesionales del municipio, para que vecinos y visitantes los encuentren y contacten fácilmente. Lo mantendrá una sola persona, así que debe ser simple de administrar.

## 2. Usuarios y roles

- **Visitante:** sin cuenta, solo consulta.
- **Negocio / profesional:** crea y edita su propia ficha.
- **Administrador:** revisa y aprueba todo antes de publicar.

## 3. Funciones del MVP

- Listado con búsqueda y filtro por categoría. (ver posibilidad de incorporar IA en el buscador)
- Ficha con: nombre, tipo (comercio o profesional), categoría, descripción, teléfono, WhatsApp, dirección, horario y fotos.
- Alta y edición de la ficha por el negocio.
- Aprobación del administrador antes de publicar.
- Ficha destacada, activada a mano por el administrador.
- Panel de administración.
- SEO básico: URL y título propios por ficha.
- Diseño pensado primero para móvil.
- Busqueda por tags asociados a las fichas. Pero esos tags no deben estar tan visibles para el visitante, no quiero una web app muy cargada.

## 4. Fuera de alcance

Pagos online, reseñas, chat, multi-idioma y cualquier módulo extra (agenda, noticias, clasificados). No añadas nada que no esté en la lista del MVP.

## 5. Flujo de usuario

```
flowchart TD
  subgraph Visitante
    V1[Entra en la web] --> V2[Busca o filtra por categoría]
    V2 --> V3[Abre la ficha]
    V3 --> V4[Accion (Llama / WhatsApp / Cómo llegar)]
  end
  subgraph Negocio
    N1[Solicita alta] --> N2[Rellena ficha y fotos]
    N2 --> N3[Envía a revisión]
  end
  subgraph Administrador
    A1{¿Aprueba?}
    A1 -- Sí --> A2[Ficha publicada]
    A1 -- No --> A3[Pide correcciones]
  end
  N3 --> A1
  A3 --> N2
  A2 --> V2
```

## 6. Modelo de datos

```
erDiagram
  USUARIO ||--o{ FICHA : gestiona
  CATEGORIA ||--o{ FICHA : clasifica
  FICHA ||--o{ FOTO : tiene
  FICHA ||--o{ HORARIO : define
  USUARIO {
    uuid id
    string rol "negocio o admin"
  }
  FICHA {
    uuid id
    string nombre
    string slug
    string tipo "comercio o profesional"
    string descripcion
    string telefono
    string whatsapp
    string direccion
    string estado "borrador, pendiente, publicada, rechazada"
    bool destacada
  }
```

**Reglas de datos:**

- Solo las fichas en estado `publicada` son visibles al público.
- `destacada` solo la cambia el administrador (sin pagos online en el MVP).
- `slug` genera una URL propia por ficha, por ejemplo `/comercios/nombre-del-negocio`. (habria que ver si se hace algo diferente para profesionales estilo /profesionales/nombre)

## 7. Arquitectura

```
flowchart LR
  U[Navegador] --> F[Frontend React]
  F --> S[Supabase: Auth, base de datos y fotos]
  F --> L[Enlaces a WhatsApp y mapas]
  GH[GitHub] --> VE[Vercel] --> U
```

## 8. Seguridad y privacidad

- Activar RLS (Row Level Security) en todas las tablas.
- Visitante: solo lee fichas publicadas.
- Negocio: solo lee y edita sus propias fichas.
- Administrador: acceso completo.
- Publicar únicamente datos de contacto profesionales, con el consentimiento del negocio.
- El administrador y claves que esten dentro de la base de datos, que no sean visibles en codigo. Y asi con todo lo necesario para mantener una buena seguridad.

## 9. Stack y restricciones

- Lovable con Supabase.
- Código en GitHub, despliegue en Vercel.
- Interfaz en español. (se hara luego en ingles y holandes)
- Móvil primero y accesible (contraste, tamaños de texto, botones grandes).
- Se intentara hacer todo desde el comienzo para no tener una dependencia de lovable.

## 10. Cómo trabajar

1. **No escribas código todavía.** Primero resume lo que has entendido y propón las fases de construcción.
2. Señala cualquier duda o ambigüedad antes de empezar.
3. Construye por pasos y confirma cada paso conmigo antes de seguir.
4. Orden sugerido: estructura y base de datos, después listado, ficha, alta de negocio, panel de administración y, por último, SEO.
5. Si algo falla, te indicaré el paso del flujo o la tabla concreta para que corrijas solo eso.

## Correcciones y decisiones posteriores para aplicar al alcance actual

Primero empezaria sin la IA, la agregaria en otra fase.

Mapa no pondria, lo haria con redireccion a google maps.

un solo directorio, pero tal vez con diferencia estetica o alguna diferencia para saber si es negocio o profesional.

Me parece bien, fichas para ambos como dices.

Sí, mantén siempre privado el correo de la cuenta y permite elegir por separado qué datos de contacto publicar en cada ficha.

Tenlo en cuenta a la hora de diseñar. (Privacidad legal; no solicitar ni almacenar categorías especiales de datos personales. Tener en cuenta que cada finalidad requiere su base jurídica, presentar consentimientos separados sin casillas premarcadas cuando corresponda, registrar autorizaciones y fechas, facilitar retirada o borrado, incluir información de privacidad por capas y dejar claro que la revisión jurídica debe validarlo.)

operare como persona fisica

personas adultas

No, deja la medición de visitas y clics para una fase posterior y céntrate en cerrar primero el MVP del directorio.

No, exige una solicitud nueva tras un rechazo o una devolución para corregir, conservando el historial de la anterior.

Lo dejamos pendiente. Al ser un pueblo, y hablar directamente con los negocios y profesionales, esto se podria hacer de forma directa. Pero seria interesante tambien que quede visible o accesible de manera directa, sin mezclar este proyecto con lo otro. Esto es Aqui bonela, lo otro va con otro nombre comercial.
El mantenimiento debe poder pagarse con las fichas destacadas y la posibilidad de incorporar al ayuntamiento de alguna manera en este proyecto. Si genera ingreso extra mejor.

Las tres. Pero creo que primero deberia mostrar que la web app tiene un valor que ellos puedan reconocer.

ambos

Para estetica tengo una web app de ejemplo que hice anteriormente contigo, te la muestro: https://aquibonela.lovable.app/ aqui puedes sacar estilo, tipografia, colores, etc.

Fichas básicas en el listado sin imagen y las destacadas con una miniatura lateral pequeña; todas las fichas mantienen su página individual completa.

La primera implementacion la haras con fichas inventadas, por lo menos 30, para ver como queda visualmente.

Piloto asistido.

Formulario sin cuenta.

WhatsApp directo.

Desde participantes: las categorías iniciales saldrán de las fichas que acepten participar; las categorías de demostración serán provisionales.

Sí, incluye algunas fichas destacadas en el piloto, sin cobrar ni prometer resultados, para probar si los titulares les ven valor.

En ambos lugares — muestra las fichas destacadas en la portada y al inicio de su categoría, con la etiqueta visible y condiciones iguales para todas.

La duración del destacado del piloto será de 1 mes.

Durante el piloto, no añadir fotos extra a las fichas destacadas; la diferencia que se prueba es la mayor visibilidad y la etiqueta.

El titular recibirá un enlace a un formulario privado sin cuenta para revisar la ficha completa y aprobar la publicación, registrando esa aprobación y los datos de contacto que autoriza publicar. Para solicitar cambios o retirar la ficha durante el piloto, contactará directamente por WhatsApp; la administración realizará el cambio o la retirada, y la recomendación acordada es ocultar la ficha inmediatamente si el titular solicita retirarla.

En el piloto no habrá cuentas de negocios ni de profesionales; cada cuenta y el autoservicio quedan para una fase posterior. La administración preparará inicialmente las fichas con las personas titulares.

Todo se guarda en supabase.

Supabase propio; código sincronizado con GitHub y despliegue en Vercel.

Supabase listo: confirmo explícitamente que puedes crear el proyecto de Aquí Bonela con el alcance acordado.

No empieces a construir todavía: primero resume lo entendido y propón fases, señala dudas o ambigüedades y espera mi aprobación. Construye por pasos y confirma cada paso conmigo antes de seguir.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/43b41fe9-b907-43de-9daa-72096d2ed5da).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
