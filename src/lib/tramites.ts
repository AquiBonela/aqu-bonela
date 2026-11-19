// Guía de trámites: datos navegables en 3 niveles (portada → categoría → ficha).
export type TramiteTag = "gratis" | "online" | "presencial";
export type Tramite = {
  slug: string;
  cat: string;
  title: string;
  short: string;
  tags?: TramiteTag[];
  // Ficha completa (opcional; sin ella se muestra «guía en preparación»)
  para?: string[];
  quien?: string[];
  necesitas?: string[];
  pasos?: { t: string; d: string }[];
  coste?: string;
  donde?: string;
  ayuda?: string;
  links: { label: string; url: string }[];
};
export type Categoria = { slug: string; title: string; text: string; icon: "doc" | "salud" | "trabajo" | "familia" | "coche" | "muni" };

export const TAG_LABEL: Record<TramiteTag, string> = {
  gratis: "Trámite gratuito",
  online: "Se puede hacer online",
  presencial: "Requiere acudir en persona",
};

export const CATEGORIAS: Categoria[] = [
  { slug: "documentacion", icon: "doc", title: "Documentación e identificación", text: "NIE, TIE, DNI, certificado digital, Cl@ve y empadronamiento." },
  { slug: "salud", icon: "salud", title: "Salud", text: "Tarjeta sanitaria, médico de cabecera, tarjeta sanitaria europea y ClicSalud+." },
  { slug: "trabajo", icon: "trabajo", title: "Trabajo y Seguridad Social", text: "Número de Seguridad Social, demanda de empleo, vida laboral y prestaciones." },
  { slug: "familia", icon: "familia", title: "Familia y ayudas", text: "Dependencia, discapacidad, ayudas familiares, becas y ayudas al alquiler." },
  { slug: "vehiculos", icon: "coche", title: "Vehículos y transporte", text: "Renovación del carnet, cambio de titularidad, multas y documentación del vehículo." },
  { slug: "municipales", icon: "muni", title: "Gestiones municipales", text: "Licencias de obras, instancias, certificados municipales y sede electrónica." },
];

const SEDE = "https://casarabonela.sedelectronica.es";

export const TRAMITES: Tramite[] = [
  {
    slug: "certificado-digital", cat: "documentacion", title: "Obtener el certificado digital",
    short: "Tu identificación por internet para hacer gestiones oficiales desde casa.",
    tags: ["gratis", "online", "presencial"],
    para: ["Consultar y descargar tu vida laboral.", "Presentar la declaración de la renta.", "Consultar multas de tráfico.", "Solicitar ayudas y subvenciones.", "Presentar solicitudes al Ayuntamiento.", "Firmar documentos electrónicamente."],
    quien: ["Cualquier persona mayor de edad o menor emancipado con DNI o NIE."],
    necesitas: ["DNI o NIE.", "Una dirección de correo electrónico.", "Un ordenador o móvil con conexión a internet."],
    pasos: [
      { t: "Entra en la página de la FNMT", d: "Elige «Certificado electrónico de Ciudadano» y la opción «Solicitar»." },
      { t: "Rellena la solicitud", d: "Recibirás un código de solicitud por correo electrónico. Guárdalo." },
      { t: "Acredita tu identidad", d: "Acude con tu DNI o NIE y el código a una oficina de acreditación. En Casarabonela puedes hacerlo en el Punto Vuela." },
      { t: "Descarga el certificado", d: "Hazlo desde el mismo ordenador y navegador con los que lo solicitaste." },
      { t: "Guarda una copia de seguridad", d: "Exporta el certificado con contraseña para recuperarlo si cambias de equipo." },
    ],
    coste: "Gratuito. La modalidad por videoidentificación tiene un coste adicional.",
    donde: "Fábrica Nacional de Moneda y Timbre (FNMT). Acreditación presencial en el Punto Vuela de Casarabonela.",
    ayuda: "En el Punto Vuela (C/ Cuatro Esquinas, 10 · 952 456 140) te acompañan en todo el proceso.",
    links: [{ label: "Solicitar en la FNMT", url: "https://www.sede.fnmt.gob.es/certificados/persona-fisica" }],
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
  { slug: "nie", cat: "documentacion", title: "Solicitar el NIE", short: "Número de identidad de extranjero para residir, trabajar o comprar en España.", tags: ["presencial"], links: [{ label: "Información oficial", url: "https://sede.administracionespublicas.gob.es/icpplus/index.html" }] },
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
export const isCompleta = (t: Tramite) => Boolean(t.pasos?.length);
export function buscarTramites(q: string, translate: (s: string) => string = (s) => s) {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const n = norm(q.trim());
  if (!n) return [];
  return TRAMITES.filter((t) => norm(`${t.title} ${t.short} ${translate(t.title)} ${translate(t.short)}`).includes(n));
}
