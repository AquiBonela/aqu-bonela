/** Campos editables de cada sección de una guía de trámite. */
export type Field = {
  key: string;
  label: string;
  multiline?: boolean;
  url?: boolean;
  euro?: boolean;
  items?: Field[];
  object?: Field[];
};
const action: Field[] = [
  { key: "label", label: "Texto del enlace" },
  { key: "url", label: "Enlace", url: true },
];
export const SECTION_FIELDS: Record<string, Field[]> = {
  short: [{ key: "short", label: "Descripción completa", multiline: true }],
  primaryAction: [{ key: "primaryAction", label: "Botón principal", object: action }],
  para: [
    { key: "guia.paraIntro", label: "Introducción", multiline: true },
    { key: "para", label: "Usos", items: [{ key: "", label: "Texto", multiline: true }] },
    { key: "guia.paraNota", label: "Nota final", multiline: true },
  ],
  quien: [
    { key: "guia.quienIntro", label: "Introducción", multiline: true },
    {
      key: "quien",
      label: "Personas destinatarias",
      items: [{ key: "", label: "Texto", multiline: true }],
    },
    { key: "guia.quienNota", label: "Nota final", multiline: true },
  ],
  necesitas: [
    { key: "guia.necesitasIntro", label: "Introducción", multiline: true },
    {
      key: "necesitas",
      label: "Requisitos y documentos",
      items: [{ key: "", label: "Texto", multiline: true }],
    },
    {
      key: "requisitosGrupos",
      label: "Grupo de requisitos",
      items: [
        { key: "title", label: "Título" },
        {
          key: "requisitos",
          label: "Requisitos",
          items: [{ key: "", label: "Requisito", multiline: true }],
        },
      ],
    },
    { key: "guia.necesitasNota", label: "Nota final", multiline: true },
  ],
  pasos: [
    {
      key: "guia.pasos",
      label: "Pasos",
      items: [
        { key: "grupo", label: "Modalidad / grupo" },
        { key: "t", label: "Título del paso" },
        { key: "d", label: "Explicación", items: [{ key: "", label: "Párrafo", multiline: true }] },
        { key: "link", label: "Enlace del paso", object: action },
      ],
    },
  ],
  lugares: [
    {
      key: "guia.lugares",
      label: "Lugares de atención",
      items: [
        { key: "title", label: "Nombre del lugar" },
        { key: "subtitle", label: "Subtítulo" },
        {
          key: "description",
          label: "Descripción",
          items: [{ key: "", label: "Párrafo", multiline: true }],
        },
        {
          key: "details",
          label: "Datos de contacto",
          items: [
            { key: "label", label: "Etiqueta del dato" },
            { key: "value", label: "Valor" },
            { key: "href", label: "Enlace", url: true },
          ],
        },
        { key: "note", label: "Nota final", multiline: true },
        { key: "link", label: "Enlace del lugar", object: action },
      ],
    },
  ],
  coste: [
    { key: "guia.costeTitulo", label: "Título" },
    { key: "guia.costeImporte", label: "Importe", euro: true },
    { key: "guia.costeTexto", label: "Explicación", multiline: true },
  ],
  ayuda: [
    {
      key: "guia.ayuda",
      label: "Ayuda y acompañamiento",
      items: [{ key: "", label: "Párrafo", multiline: true }],
    },
  ],
  aclaracion: [
    {
      key: "guia.aclaracion",
      label: "Aclaración importante",
      object: [
        { key: "titulo", label: "Título" },
        { key: "introduccion", label: "Introducción", multiline: true },
        { key: "puntos", label: "Puntos", items: [{ key: "", label: "Texto", multiline: true }] },
        { key: "nota", label: "Nota final", multiline: true },
      ],
    },
  ],
  seguridad: [{ key: "guia.seguridad", label: "Consejo de seguridad", multiline: true }],
  fuentes: [{ key: "guia.fuentes", label: "Fuentes oficiales", items: action }],
  links: [{ key: "links", label: "Otros enlaces", items: action }],
  revision: [{ key: "guia.revision", label: "Fecha y fuente de revisión" }],
};
