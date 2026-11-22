// Guía de trámites: datos navegables en 3 niveles (portada → categoría → ficha).
export type TramiteTag = "gratis" | "online" | "presencial";
export type TramiteLink = { label: string; url: string };
export type TramiteGuide = {
  paraIntro?: string;
  paraNota?: string;
  necesitasIntro?: string;
  quienIntro: string;
  quienNota: string;
  necesitasNota: string;
  pasos: { t: string; d: string[]; link?: TramiteLink; grupo?: string }[];
  lugares: {
    title: string;
    subtitle: string;
    description: string[];
    details?: { label: string; value: string; href?: string }[];
    note?: string;
    link?: TramiteLink;
  }[];
  fuentes: TramiteLink[];
  costeTitulo: string;
  costeImporte: string;
  costeTexto: string;
  ayuda?: string[];
  aclaracion?: { titulo: string; introduccion: string; puntos: string[]; nota: string };
  seguridad?: string;
  revision: string;
};
export type Tramite = {
  sections?: import('./procedure-sections').ProcedureSection[];
  notes?: string;
  slug: string;
  cat: string;
  title: string;
  short: string;
  summary?: string;
  cardDescription?: string;
  tags?: TramiteTag[];
  // Ficha completa (opcional; sin ella se muestra «guía en preparación»)
  para?: string[];
  quien?: string[];
  necesitas?: string[];
  requisitosGrupos?: { title: string; requisitos: string[] }[];
  pasos?: { t: string; d: string }[];
  guia?: TramiteGuide;
  primaryAction?: TramiteLink;
  coste?: string;
  donde?: string;
  ayuda?: string;
  links: TramiteLink[];
};
export type Categoria = { slug: string; title: string; text: string; icon: "doc" | "salud" | "trabajo" | "familia" | "coche" | "muni" };

export const TAG_LABEL: Record<TramiteTag, string> = {
  gratis: "Gratuito",
  online: "Online",
  presencial: "Requiere acudir en persona",
};

export const CATEGORIAS: Categoria[] = [
  { slug: "documentacion", icon: "doc", title: "Documentación personal", text: "NIE, TIE, DNI, certificado digital, Cl@ve y empadronamiento." },
  { slug: "salud", icon: "salud", title: "Salud", text: "Tarjeta sanitaria, médico de cabecera, tarjeta sanitaria europea y ClicSalud+." },
  { slug: "trabajo", icon: "trabajo", title: "Trabajo y Seguridad Social", text: "Número de Seguridad Social, demanda de empleo, vida laboral y prestaciones." },
  { slug: "familia", icon: "familia", title: "Familia y ayudas", text: "Dependencia, discapacidad, ayudas familiares, becas y ayudas al alquiler." },
  { slug: "vehiculos", icon: "coche", title: "Vehículos y transporte", text: "Renovación del carnet, cambio de titularidad, multas y documentación del vehículo." },
  { slug: "municipales", icon: "muni", title: "Gestiones municipales", text: "Licencias de obras, instancias, certificados municipales y sede electrónica." },
];

const SEDE = "https://casarabonela.sedelectronica.es";

export const TRAMITES: Tramite[] = [
  {
    slug: "certificado-digital", cat: "documentacion", title: "Certificado Digital",
    summary: "Identificación electrónica para hacer trámites online con las administraciones públicas.",
    short: "El Certificado Digital es una identificación electrónica que te permite realizar trámites por Internet con las administraciones públicas, sin necesidad de desplazarte cada vez que necesites hacer una gestión.\n\n\nEn Casarabonela puedes completar el proceso utilizando el Ayuntamiento como oficina de acreditación de identidad.",
    tags: ["gratis", "online", "presencial"],
    para: ["Consultar y descargar tu vida laboral.", "Presentar la declaración de la renta.", "Consultar multas de tráfico.", "Realizar trámites con Hacienda y la Seguridad Social.", "Consultar y presentar solicitudes ante organismos públicos.", "Firmar documentos electrónicamente."],
    quien: ["Ciudadanos españoles mayores de edad.", "Ciudadanos extranjeros mayores de edad que dispongan de NIE.", "Menores emancipados que cumplan los requisitos."],
    necesitas: ["DNI o NIE en vigor.", "Pasaporte en vigor, para ciudadanos extranjeros.", "Una dirección de correo electrónico.", "Acceso a un ordenador para realizar la solicitud.", "El código de solicitud que recibirás por correo electrónico."],
    primaryAction: { label: "Comenzar solicitud", url: "https://www.sede.fnmt.gob.es/certificados/persona-fisica/obtener-certificado-software/solicitar-certificado" },
    guia: {
      quienIntro: "Pueden solicitar el Certificado Digital de persona física:",
      quienNota: "Es necesario disponer de un documento de identificación válido y acreditar personalmente la identidad.",
      necesitasNota: "¿No sabes cómo hacerlo? Puedes acudir al Punto Vuela de Casarabonela para recibir ayuda y acompañamiento durante el proceso.",
      pasos: [
        {
          t: "Solicita tu certificado por Internet.",
          d: ["Accede a la FNMT y completa el formulario con tus datos personales.", "Recibirás un correo electrónico con un código de solicitud."],
          link: { label: "Solicitar Certificado Digital", url: "https://www.sede.fnmt.gob.es/certificados/persona-fisica/obtener-certificado-software/solicitar-certificado" },
        },
        {
          t: "Acude al Punto Vuela si necesitas ayuda.",
          d: ["Si no sabes cómo realizar la solicitud, tienes dificultades con el ordenador o necesitas orientación, puedes acudir al Punto Vuela de Casarabonela.", "Allí pueden ayudarte a realizar gestiones digitales y orientarte durante el proceso.", "Recuerda llevar tu documento de identidad y el código de solicitud si ya lo has obtenido."],
        },
        {
          t: "Acredita tu identidad en el Ayuntamiento.",
          d: ["Una vez tengas el código de solicitud, acude al Ayuntamiento de Casarabonela para acreditar tu identidad.", "Lleva tu documento identificativo y el código recibido por correo electrónico.", "La acreditación debe realizarla personalmente el titular."],
        },
        {
          t: "Descarga tu Certificado Digital.",
          d: ["Una vez acreditada tu identidad, vuelve a la FNMT y descarga el certificado desde el mismo ordenador, usuario y navegador utilizados para solicitarlo."],
          link: { label: "Descargar Certificado Digital", url: "https://www.sede.fnmt.gob.es/certificados/persona-fisica/obtener-certificado-software/descargar-certificado" },
        },
        {
          t: "Guarda una copia de seguridad.",
          d: ["Exporta el certificado y guárdalo en un lugar seguro, protegido mediante contraseña."],
        },
      ],
      lugares: [
        {
          title: "Ayuntamiento de Casarabonela",
          subtitle: "Oficina de acreditación de identidad",
          description: ["Es el lugar donde debes acudir para verificar tu identidad y completar esta parte del procedimiento.", "Puedes acudir al Ayuntamiento para acreditar tu identidad una vez realizada la solicitud online."],
          note: "Antes de desplazarte, consulta si es necesario solicitar cita previa y los horarios específicos de acreditación.",
          link: { label: "Web del Ayuntamiento", url: "https://www.casarabonela.es/" },
        },
      ],
      fuentes: [
        { label: "Fábrica Nacional de Moneda y Timbre (FNMT).", url: "https://www.sede.fnmt.gob.es/certificados/persona-fisica" },
        { label: "Ayuntamiento de Casarabonela.", url: "https://www.casarabonela.es/" },
      ],
      costeTitulo: "Certificado Digital FNMT",
      costeImporte: "0 €",
      costeTexto: "La obtención mediante acreditación presencial es gratuita.",
      seguridad: "No compartas tu certificado digital ni su contraseña. Permite realizar gestiones importantes en tu nombre, por lo que debes guardarlo en un lugar seguro.",
      revision: "Información revisada: noviembre de 2026 · Fuente: FNMT y Administración General del Estado.",
    },
    links: [],
  },
  {
    slug: "empadronamiento", cat: "documentacion", title: "Empadronamiento",
    summary: "Alta en el padrón municipal",
    short: "¿Vives en Casarabonela? Inscríbete en el padrón municipal.\n\nEmpadronarse consiste en inscribirse en el registro de habitantes del municipio donde resides habitualmente. Permite acreditar oficialmente tu domicilio y es necesario para realizar numerosas gestiones administrativas.\n\nImportante: debes empadronarte en el municipio donde resides habitualmente, independientemente de si eres propietario, inquilino o vives en una vivienda de otra persona. No necesitas tener nacionalidad española ni permiso de residencia para empadronarte.",
    tags: ["gratis", "presencial"],
    para: ["Realizar trámites relacionados con la residencia y extranjería.", "Escolarizar a tus hijos.", "Solicitar determinadas ayudas y servicios sociales.", "Realizar gestiones con la Seguridad Social.", "Acceder a determinados servicios municipales.", "Acreditar tu domicilio ante diferentes administraciones."],
    necesitas: [
      "Documento de identidad: DNI, NIE o pasaporte en vigor, según corresponda.",
      "Justificante de domicilio: contrato de alquiler, escritura de propiedad u otro documento que permita acreditar que resides en la vivienda.",
      "Autorización del titular: si vives en una vivienda cuyo propietario o titular del contrato es otra persona, es necesario presentar su autorización (en el mismo contrato o en un papel aparte) y documentación identificativa (fotocopia del DNI del titular de la vivienda).",
      "Documentación familiar: si vas a empadronar a menores de edad, lleva también sus documentos de identidad o libro de familia, según corresponda.",
    ],
    guia: {
      paraIntro: "Estar empadronado permite acreditar oficialmente que resides en Casarabonela. Lo necesitarás, por ejemplo, para:",
      paraNota: "Entre otras gestiones.",
      quienIntro: "Toda persona que resida habitualmente en Casarabonela debe estar inscrita en el padrón municipal.",
      quienNota: "Si te mudas a otra vivienda dentro del municipio, debes comunicar el cambio para actualizar tus datos.",
      necesitasIntro: "Antes de acudir al Ayuntamiento, prepara:",
      necesitasNota: "Si tienes dudas sobre qué documentación presentar, consulta previamente con el Ayuntamiento para evitar desplazamientos innecesarios.",
      pasos: [
        { t: "Prepara la documentación.", d: ["Reúne tu documento de identidad y el justificante de la vivienda donde resides. Si vas a empadronar a otros miembros de tu familia, prepara también su documentación."] },
        { t: "Acude al Ayuntamiento de Casarabonela.", d: ["Dirígete a las oficinas municipales e indica que quieres realizar un alta en el padrón municipal o un cambio de domicilio."] },
        { t: "Cumplimenta la solicitud.", d: ["En el Ayuntamiento te facilitarán la hoja de inscripción padronal. Completa tus datos personales, los de las personas que van a empadronarse y firma la solicitud."] },
        { t: "Presenta la documentación.", d: ["Entrega la solicitud junto con los documentos de identidad y la acreditación del domicilio.", "El personal municipal revisará la documentación y tramitará tu solicitud."] },
        { t: "Comprobación del domicilio.", d: ["Una vez presentada la solicitud, la Policía Local realizará una comprobación en el domicilio para verificar que resides realmente en la vivienda y corroborar la información aportada."] },
        { t: "Finalización del trámite.", d: ["Una vez realizadas las comprobaciones correspondientes y completada la tramitación municipal, quedarás inscrito en el padrón de Casarabonela."] },
      ],
      lugares: [{
        title: "Ayuntamiento de Casarabonela",
        subtitle: "Oficina de atención municipal",
        description: ["Puedes acudir al Ayuntamiento para realizar el alta, comunicar un cambio de domicilio o resolver dudas sobre la documentación necesaria."],
        details: [
          { label: "Dirección", value: "Plaza de Buenavista, 1 · 29566 Casarabonela (Málaga)" },
          { label: "Teléfono", value: "952 456 561", href: "tel:952456561" },
        ],
      }],
      fuentes: [{ label: "Web del Ayuntamiento", url: "https://www.casarabonela.es/" }],
      costeTitulo: "Alta, modificación o cambio de domicilio en el padrón municipal",
      costeImporte: "0 €",
      costeTexto: "El empadronamiento es gratuito.",
      revision: "Información orientativa. La documentación puede variar según la situación personal y familiar. Consulta con el Ayuntamiento si tienes dudas antes de acudir.",
    },
    links: [],
  },
  {
    slug: "nie", cat: "documentacion", title: "NIE – Número de Identidad de Extranjero",
    summary: "Identificación de extranjeros para trámites administrativos, laborales y económicos en España.",
    short: "El NIE es un número personal que identifica a las personas extranjeras que tienen relación con España por motivos económicos, profesionales o sociales.\n\nSe utiliza para realizar numerosos trámites administrativos, laborales, fiscales y económicos.\n\nImportante: tener un NIE no significa tener permiso de residencia ni autorización para trabajar. Es un número de identificación, no un permiso de residencia.",
    tags: ["presencial"],
    para: [
      "Trabajar y realizar gestiones relacionadas con el empleo.",
      "Abrir una cuenta bancaria.",
      "Comprar o vender una vivienda.",
      "Comprar un vehículo.",
      "Realizar trámites con Hacienda y la Seguridad Social.",
      "Firmar contratos y otros trámites administrativos.",
    ],
    quien: ["Económicos.", "Profesionales.", "Sociales."],
    necesitas: [
      "Formulario EX-15: solicitud cumplimentada y firmada, por duplicado.",
      "Pasaporte en vigor: original y copia completa.",
      "Justificante del motivo: documentación que explique por qué necesitas obtener el NIE.",
      "Tasa 790, código 012: justificante del pago correspondiente.",
    ],
    primaryAction: { label: "Solicitar cita previa", url: "https://icp.administracionelectronica.gob.es/icpplus/index.html" },
    guia: {
      quienIntro: "Pueden solicitarlo las personas extranjeras que necesiten identificarse en España por motivos:",
      quienNota: "Es necesario justificar el motivo de la solicitud. También puede solicitarse desde el país de origen a través del Consulado de España correspondiente. Si eres ciudadano de la Unión Europea y vas a residir en España durante más de tres meses, normalmente debes inscribirte en el Registro Central de Extranjeros; en ese procedimiento te asignarán un NIE.",
      necesitasNota: "Si la solicitud la presenta un representante, deberá acreditar que está autorizado para hacerlo.",
      pasos: [
        {
          t: "Prepara la solicitud.",
          d: ["Descarga y completa el formulario EX-15 con tus datos personales. Indica el motivo por el que necesitas obtener el NIE."],
          link: { label: "Descargar formulario EX-15", url: "https://www.inclusion.gob.es/web/migraciones/modelos-generales" },
        },
        {
          t: "Paga la tasa correspondiente.",
          d: ["Accede al modelo 790, código 012, selecciona el concepto de asignación de NIE a instancia del interesado y genera el documento para realizar el pago."],
          link: { label: "Acceder al modelo 790-012", url: "https://sede.policia.gob.es/Tasa790_012/ImpresoRellenar" },
        },
        {
          t: "Solicita cita previa.",
          d: ["Accede al sistema de cita previa de Extranjería, selecciona la provincia de Málaga y busca el trámite correspondiente a la asignación de NIE."],
          link: { label: "Solicitar cita previa", url: "https://icp.administracionelectronica.gob.es/icpplus/index.html" },
        },
        {
          t: "Acude a la cita.",
          d: ["Presenta el formulario EX-15, el pasaporte, la documentación que justifica el motivo de la solicitud y el justificante del pago."],
        },
        {
          t: "Recibe tu NIE.",
          d: ["Una vez tramitada y aprobada la solicitud, se te asignará tu número de identidad de extranjero."],
        },
      ],
      lugares: [
        {
          title: "Policía Nacional – Oficina de Extranjería",
          subtitle: "Oficinas habilitadas en la provincia de Málaga",
          description: [
            "La solicitud se presenta en las oficinas habilitadas de la Policía Nacional.",
            "Si resides en Casarabonela, tendrás que consultar las oficinas disponibles en la provincia de Málaga.",
          ],
          note: "Importante: este trámite no se realiza en el Ayuntamiento de Casarabonela.",
          link: { label: "Información oficial de la Policía Nacional", url: "https://sede.policia.gob.es/portalCiudadano/_es/tramites_extranjeria_tramite_asignacion_nie.php" },
        },
      ],
      fuentes: [
        { label: "Información oficial de la Policía Nacional", url: "https://sede.policia.gob.es/portalCiudadano/_es/tramites_extranjeria_tramite_asignacion_nie.php" },
        { label: "Cita previa de Extranjería", url: "https://icp.administracionelectronica.gob.es/icpplus/index.html" },
      ],
      costeTitulo: "Tasa de asignación del NIE",
      costeImporte: "Tasa oficial vigente",
      costeTexto: "El importe depende de la tasa oficial vigente. Consulta el concepto correspondiente en el modelo 790, código 012, antes de realizar el pago.",
      ayuda: [
        "Policía Nacional: información sobre la asignación del NIE.",
        "Oficinas de Extranjería: orientación sobre los procedimientos de extranjería.",
        "Punto Vuela Casarabonela: puedes acudir para recibir ayuda con gestiones digitales y utilizar los servicios de administración electrónica.",
      ],
      aclaracion: {
        titulo: "NIE, TIE y certificado de registro UE: ¿son lo mismo?",
        introduccion: "No. Aunque están relacionados, son documentos diferentes:",
        puntos: [
          "NIE: número que identifica a una persona extranjera en España.",
          "TIE: tarjeta física que acredita una autorización de residencia o estancia.",
          "Certificado de registro UE: documento que acredita la inscripción de un ciudadano de la Unión Europea residente en España.",
        ],
        nota: "Tener un NIE no significa automáticamente tener autorización de residencia o trabajo.",
      },
      revision: "Información orientativa. Consulta siempre los requisitos y tasas oficiales antes de iniciar el trámite.",
    },
    links: [],
  },
  {
    slug: "clave", cat: "documentacion", title: "Cl@ve – Registro en el sistema de identificación electrónica",
    summary: "Regístrate en Cl@ve para identificarte de forma segura y realizar trámites online con las administraciones públicas, sin certificado digital.",
    short: "¿Quieres realizar trámites por Internet con las Administraciones Públicas? Regístrate en Cl@ve, el sistema que te permite identificarte de forma segura sin necesidad de utilizar un certificado digital.\n\nImportante: existen dos niveles de registro. El básico permite acceder a numerosos servicios, mientras que el avanzado ofrece acceso a más trámites y permite utilizar Cl@ve Firma.",
    tags: ["gratis", "online", "presencial"],
    para: [
      "Consultar información y realizar trámites con la Seguridad Social.",
      "Acceder a servicios de la Agencia Tributaria.",
      "Consultar prestaciones y gestiones del SEPE.",
      "Presentar solicitudes y documentación por Internet.",
      "Consultar expedientes y notificaciones electrónicas.",
    ],
    necesitas: [
      "DNI o NIE: documento de identidad en vigor.",
      "Teléfono móvil: un número personal donde recibir códigos y notificaciones.",
      "Correo electrónico: una dirección activa.",
    ],
    primaryAction: { label: "Comenzar registro en Cl@ve", url: "https://clave.gob.es/registro/como-puedo-registrarme" },
    guia: {
      paraIntro: "Cl@ve permite identificarte electrónicamente para realizar gestiones con las Administraciones Públicas, como por ejemplo:",
      paraNota: "Entre otras gestiones.",
      quienIntro: "Cualquier persona que necesite identificarse electrónicamente ante las Administraciones Públicas y cumpla los requisitos de identificación.",
      quienNota: "Pueden registrarse ciudadanos españoles y extranjeros que dispongan de DNI o NIE y la documentación necesaria para acreditar su identidad.",
      necesitasIntro: "Para realizar el registro necesitarás:",
      necesitasNota: "Si realizas el registro online mediante videoidentificación, también necesitarás la aplicación Cl@ve y un teléfono móvil con cámara y conexión a Internet.",
      pasos: [
        { grupo: "Opción A. Por Internet", t: "Descarga la aplicación oficial Cl@ve.", d: ["Descarga la aplicación oficial Cl@ve en tu teléfono móvil."], link: { label: "Cómo registrarse en Cl@ve", url: "https://clave.gob.es/registro/como-puedo-registrarme" } },
        { t: "Accede a la opción de registro.", d: ["Accede a la opción de registro y sigue las instrucciones."] },
        { t: "Facilita tus datos.", d: ["Facilita los datos de tu documento de identidad, teléfono móvil y correo electrónico."] },
        { t: "Completa la videoidentificación.", d: ["Completa el proceso de videoidentificación siguiendo las indicaciones de la aplicación."] },
        { t: "Recibe la confirmación del registro.", d: ["Una vez verificada tu identidad, recibirás la confirmación del registro.", "Esta modalidad permite obtener inicialmente el nivel básico. Tras la revisión de la videoidentificación por parte de un empleado público, puedes obtener el nivel avanzado sin acudir presencialmente.", "También puedes registrarte por Internet mediante carta de invitación o utilizando un certificado digital o DNI electrónico."] },
        { grupo: "Opción B. Presencialmente", t: "Localiza una oficina habilitada.", d: ["Localiza una oficina habilitada para realizar el registro en Cl@ve."], link: { label: "Buscar oficinas de registro Cl@ve", url: "https://administracion.gob.es/pagFront/atencionCiudadana/oficinasEGEO/encuentraOficina.htm" } },
        { t: "Comprueba si necesitas cita previa.", d: ["Comprueba si necesitas solicitar cita previa."] },
        { t: "Acude personalmente a la oficina.", d: ["Acude personalmente con tu documento de identidad, teléfono móvil y correo electrónico."] },
        { t: "Acredita tu identidad.", d: ["El personal de la oficina verificará tu identidad y tramitará el alta."] },
        { t: "Recibe el SMS de confirmación.", d: ["Una vez completado el registro, recibirás un SMS de confirmación.", "El registro presencial proporciona directamente el nivel avanzado."] },
      ],
      lugares: [
        { title: "Por Internet", subtitle: "Página oficial y aplicación Cl@ve", description: ["Desde la página oficial de Cl@ve o mediante su aplicación móvil."], link: { label: "Cómo registrarse en Cl@ve", url: "https://clave.gob.es/registro/como-puedo-registrarme" } },
        { title: "Presencialmente", subtitle: "Oficinas habilitadas de registro", description: ["En las oficinas habilitadas de la Agencia Tributaria, Seguridad Social, SEPE y otras administraciones públicas.", "Puedes localizar la oficina más cercana en el buscador oficial."], link: { label: "Buscar oficinas de registro Cl@ve", url: "https://administracion.gob.es/pagFront/atencionCiudadana/oficinasEGEO/encuentraOficina.htm" } },
      ],
      fuentes: [{ label: "Cómo registrarse en Cl@ve", url: "https://clave.gob.es/registro/como-puedo-registrarme" }],
      costeTitulo: "Registro en Cl@ve",
      costeImporte: "0 €",
      costeTexto: "El registro en Cl@ve es gratuito, tanto por Internet como presencialmente.",
      ayuda: ["Si necesitas ayuda para realizar el trámite por Internet, puedes acudir al Punto Vuela de Casarabonela, donde pueden orientarte y acompañarte en las gestiones digitales."],
      revision: "Información orientativa. Los requisitos pueden variar según tu documento de identidad y la modalidad de registro elegida.",
    },
    links: [],
  },
  {
    slug: "tie", cat: "documentacion", title: "TIE – Tarjeta de Identidad de Extranjero",
    summary: "Tarjeta física que acredita tu identidad y tu autorización de residencia o estancia en España. Consulta los documentos, la cita previa y la toma de huellas.",
    short: "¿Tienes autorización para residir en España? La Tarjeta de Identidad de Extranjero (TIE) es el documento físico que acredita tu situación administrativa en el país y contiene tus datos personales, fotografía, número NIE y tipo de autorización.\n\nImportante: la TIE y el NIE no son lo mismo. El NIE es un número de identificación personal, mientras que la TIE es la tarjeta que acredita tu situación legal en España.",
    tags: ["online", "presencial"],
    primaryAction: { label: "Solicitar cita previa", url: "https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus" },
    para: [
      "Acreditar tu identidad como persona extranjera en España.",
      "Demostrar tu autorización de residencia o estancia.",
      "Identificarte ante organismos y administraciones públicas.",
      "Acreditar tu situación administrativa para realizar gestiones laborales, bancarias y administrativas.",
    ],
    necesitas: [
      "Formulario EX-17: cumplimentado y firmado.",
      "Pasaporte: original y en vigor.",
      "Resolución favorable: documento que acredita la concesión de tu autorización de residencia o estancia, cuando corresponda.",
      "Fotografía reciente: en color, tamaño carné y con fondo blanco.",
      "Tasa 790, código 012: justificante de pago.",
      "TIE anterior: si se trata de una renovación o sustitución.",
    ],
    guia: {
      paraIntro: "La TIE permite:",
      quienIntro: "Las personas extranjeras que no tienen nacionalidad española y cuentan con una autorización de residencia o estancia en España que requiere la expedición de una Tarjeta de Identidad de Extranjero (TIE).",
      quienNota: "Por ejemplo, personas con autorización de residencia y trabajo, estudiantes que deben disponer de tarjeta y familiares extranjeros de ciudadanos españoles o de otros países de la Unión Europea.",
      necesitasIntro: "Para solicitar la expedición de la TIE necesitarás, con carácter general:",
      necesitasNota: "La documentación puede variar según el motivo de expedición y tu situación administrativa.",
      pasos: [
        { t: "Prepara la documentación.", d: ["Descarga y cumplimenta el formulario EX-17 y reúne los documentos necesarios."], link: { label: "Descargar formulario EX-17", url: "https://www.inclusion.gob.es/web/migraciones/modelos-generales" } },
        { t: "Paga la tasa.", d: ["Accede al modelo 790, código 012, selecciona el concepto correspondiente a tu trámite y realiza el pago."], link: { label: "Tasa 790, código 012", url: "https://sede.policia.gob.es/Tasa790_012/" } },
        { t: "Solicita cita previa.", d: ["Entra en la sede electrónica de Administraciones Públicas y selecciona tu provincia y el trámite de Policía correspondiente a la expedición de la TIE."], link: { label: "Solicitar cita previa", url: "https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus" } },
        { t: "Acude a la cita.", d: ["Preséntate personalmente en la oficina de Policía Nacional con toda la documentación. Allí realizarán la toma de huellas dactilares."] },
        { t: "Recoge tu tarjeta.", d: ["Una vez fabricada, podrás recoger la TIE en la oficina indicada, siguiendo las instrucciones que te faciliten."] },
      ],
      lugares: [{ title: "Policía Nacional", subtitle: "Dependencias habilitadas para la expedición de la TIE", description: ["La solicitud se realiza en las dependencias de la Policía Nacional habilitadas para la expedición de tarjetas de identidad de extranjero.", "La cita previa se solicita por Internet."], link: { label: "Cita previa de Extranjería y Policía", url: "https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus" } }],
      fuentes: [
        { label: "Descargar formulario EX-17", url: "https://www.inclusion.gob.es/web/migraciones/modelos-generales" },
        { label: "Tasa 790, código 012", url: "https://sede.policia.gob.es/Tasa790_012/" },
      ],
      costeTitulo: "Tasa de expedición de la TIE",
      costeImporte: "Tasa oficial vigente",
      costeTexto: "La expedición de la TIE requiere el pago de una tasa administrativa. El importe depende del tipo de autorización y del trámite que realices. Consulta la cantidad vigente en el modelo oficial 790, código 012.",
      ayuda: ["Si necesitas ayuda para descargar formularios, pagar la tasa o solicitar cita previa por Internet, puedes acudir al Punto Vuela de Casarabonela para recibir orientación y acompañamiento digital."],
      revision: "Información orientativa. El plazo para solicitar la TIE y la documentación exigida dependen del tipo de autorización y del motivo de expedición. En muchos casos, debe solicitarse personalmente en el plazo de un mes desde la entrada en España o desde la concesión de la autorización, según corresponda. Consulta las instrucciones específicas de tu procedimiento antes de acudir.",
    },
    links: [],
  },
  { slug: "tarjeta-sanitaria", cat: "salud", title: "Solicitar la tarjeta sanitaria", short: "Acceso a la sanidad pública andaluza y asignación de médico.", tags: ["gratis", "presencial"], links: [{ label: "ClicSalud+", url: "https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud" }] },
  { slug: "tarjeta-europea", cat: "salud", title: "Tarjeta sanitaria europea", short: "Asistencia sanitaria en viajes por la Unión Europea.", tags: ["gratis", "online"], links: [{ label: "Seguridad Social", url: "https://sede.seg-social.gob.es" }] },
];

export const DESTACADOS = ["empadronamiento", "nie", "tarjeta-sanitaria", "certificado-digital"];

export const getCategoria = (slug: string) => CATEGORIAS.find((c) => c.slug === slug);
export const getTramite = (cat: string, slug: string) => TRAMITES.find((t) => t.cat === cat && t.slug === slug);
export const tramitesDe = (cat: string) => TRAMITES.filter((t) => t.cat === cat);
export const isCompleta = (t: Tramite) => Boolean(t.pasos?.length || t.guia?.pasos.length);
export function buscarTramites(q: string, translate: (s: string) => string = (s) => s) {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const n = norm(q.trim());
  if (!n) return [];
  return TRAMITES.filter((t) => norm(`${t.title} ${t.short} ${translate(t.title)} ${translate(t.short)}`).includes(n));
}
