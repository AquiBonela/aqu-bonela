// Guía de trámites: datos navegables en 3 niveles (portada → categoría → ficha).
export type TramiteTag = "gratis" | "online" | "presencial" | "pago" | "policia";
export type TramiteLink = { label: string; url: string };
export type TramiteGuide = {
  quienIntro: string;
  quienNota: string;
  necesitasNota: string;
  pasos: { t: string; d: string[]; link?: TramiteLink }[];
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
  slug: string;
  cat: string;
  title: string;
  short: string;
  summary?: string;
  tags?: TramiteTag[];
  // Ficha completa (opcional; sin ella se muestra «guía en preparación»)
  para?: string[];
  quien?: string[];
  necesitas?: string[];
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
  pago: "Trámite de pago",
  policia: "Policía Nacional",
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
        {
          title: "Punto Vuela Casarabonela",
          subtitle: "Ayuda y acompañamiento digital",
          description: ["Si necesitas ayuda para utilizar el ordenador, realizar la solicitud o descargar e instalar el certificado, puedes acudir a este centro."],
          details: [
            { label: "Dirección", value: "Calle Cuatro Esquinas, 10, Casarabonela (Málaga)." },
            { label: "Teléfono", value: "952 456 140 / 652 805 763", href: "tel:952456140" },
            { label: "Correo", value: "casarabonela@puntosvuela.es", href: "mailto:casarabonela@puntosvuela.es" },
          ],
          note: "Consulta los horarios y disponibilidad antes de acudir.",
          link: { label: "Consultar información del Punto Vuela", url: "/punto-vuela" },
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
    slug: "empadronamiento", cat: "documentacion", title: "Empadronarse en Casarabonela",
    short: "Inscribirte en el padrón municipal al vivir en el pueblo.",
    tags: ["gratis", "presencial"],
    para: ["Acceder a la tarjeta sanitaria y al médico del pueblo.", "Escolarizar a tus hijos.", "Solicitar ayudas municipales y autonómicas.", "Votar en las elecciones municipales."],
    quien: ["Toda persona que viva habitualmente en Casarabonela, sea cual sea su nacionalidad."],
    necesitas: ["DNI, NIE o pasaporte en vigor.", "Escritura, contrato de alquiler o autorización del propietario.", "Libro de familia para empadronar a menores."],
    pasos: [
      { t: "Reúne la documentación", d: "Lleva originales; el Ayuntamiento hará las copias necesarias." },
      { t: "Acude al Ayuntamiento", d: "Se atiende en horario de mañana, sin cita previa." },
      { t: "Firma la hoja de inscripción", d: "Deben firmarla todas las personas mayores de edad que se empadronan." },
      { t: "Pide tu volante", d: "Puedes solicitar en el momento un volante o certificado de empadronamiento." },
    ],
    coste: "Gratuito.",
    donde: "Ayuntamiento de Casarabonela · 952 456 561.",
    ayuda: "Llama al Ayuntamiento antes de ir si tu caso es especial (sin contrato, menores sin ambos progenitores...).",
    links: [{ label: "Sede Electrónica del Ayuntamiento", url: SEDE }],
  },
  {
    slug: "nie", cat: "documentacion", title: "NIE – Número de Identidad de Extranjero",
    summary: "Identificación de extranjeros para trámites administrativos, laborales y económicos en España.",
    short: "El NIE es un número personal que identifica a las personas extranjeras que tienen relación con España por motivos económicos, profesionales o sociales.\n\nSe utiliza para realizar numerosos trámites administrativos, laborales, fiscales y económicos.\n\nImportante: tener un NIE no significa tener permiso de residencia ni autorización para trabajar. Es un número de identificación, no un permiso de residencia.",
    tags: ["pago", "presencial", "policia"],
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
    primaryAction: { label: "Descargar formulario EX-15", url: "https://www.inclusion.gob.es/web/migraciones/modelos-generales" },
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
  { slug: "clave", cat: "documentacion", title: "Registrarse en Cl@ve", short: "Sistema para identificarte en internet con un PIN, sin certificado.", tags: ["gratis", "online"], links: [{ label: "Cl@ve", url: "https://clave.gob.es" }] },
  { slug: "tarjeta-sanitaria", cat: "salud", title: "Solicitar la tarjeta sanitaria", short: "Acceso a la sanidad pública andaluza y asignación de médico.", tags: ["gratis", "presencial"], links: [{ label: "ClicSalud+", url: "https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud" }] },
  { slug: "tarjeta-europea", cat: "salud", title: "Tarjeta sanitaria europea", short: "Asistencia sanitaria en viajes por la Unión Europea.", tags: ["gratis", "online"], links: [{ label: "Seguridad Social", url: "https://sede.seg-social.gob.es" }] },
  { slug: "vida-laboral", cat: "trabajo", title: "Consultar la vida laboral", short: "Informe con todos los periodos que has cotizado.", tags: ["gratis", "online"], links: [{ label: "Seguridad Social", url: "https://sede.seg-social.gob.es" }] },
  { slug: "demanda-empleo", cat: "trabajo", title: "Inscribirse como demandante de empleo", short: "Alta en el Servicio Andaluz de Empleo.", tags: ["gratis", "online"], links: [{ label: "SAE", url: "https://www.juntadeandalucia.es/servicioandaluzdeempleo" }] },
  { slug: "dependencia", cat: "familia", title: "Solicitar la dependencia", short: "Ayudas para personas que necesitan apoyo en su día a día.", tags: ["gratis", "presencial"], links: [{ label: "Junta de Andalucía", url: "https://www.juntadeandalucia.es" }] },
  { slug: "ayuda-alquiler", cat: "familia", title: "Ayudas al alquiler", short: "Convocatorias para jóvenes y familias con alquiler.", tags: ["gratis", "online"], links: [{ label: "Junta de Andalucía", url: "https://www.juntadeandalucia.es" }] },
  { slug: "carnet-conducir", cat: "vehiculos", title: "Renovar el carnet de conducir", short: "Renovación tras el reconocimiento médico.", tags: ["online"], links: [{ label: "DGT", url: "https://sede.dgt.gob.es" }] },
  { slug: "multas", cat: "vehiculos", title: "Consultar y pagar multas", short: "Consulta tus sanciones de tráfico y págalas con descuento.", tags: ["online"], links: [{ label: "DGT", url: "https://sede.dgt.gob.es" }] },
  { slug: "licencia-obras", cat: "municipales", title: "Licencia de obras", short: "Permiso municipal para reformas y construcciones.", tags: ["online", "presencial"], links: [{ label: "Sede Electrónica", url: SEDE }] },
  { slug: "instancia-general", cat: "municipales", title: "Instancia general", short: "Cualquier solicitud o escrito dirigido al Ayuntamiento.", tags: ["gratis", "online"], links: [{ label: "Sede Electrónica", url: SEDE }] },
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
