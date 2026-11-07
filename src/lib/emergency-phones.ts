export type EmergencyPhone = { tel: string; show?: string; label: string; note?: string };
export type EmergencyGroup = { id: string; title: string; phones: EmergencyPhone[] };

export const MAIN_EMERGENCY: EmergencyPhone = {
  tel: "112",
  label: "Emergencias",
  note: "24 horas · Gratuito · Varios idiomas. Coordina sanitarios, bomberos, Guardia Civil y rescate en montaña.",
};

export const EMERGENCY_GROUPS: EmergencyGroup[] = [
  {
    id: "seguridad",
    title: "Seguridad",
    phones: [
      { tel: "062", label: "Guardia Civil · urgencias 24 h" },
      { tel: "952456665", show: "952 456 665", label: "Puesto de Casarabonela", note: "Av. Federico Muñoz, 16. Para trámites y denuncias; en urgencias llama al 062 o al 112." },
    ],
  },
  {
    id: "salud",
    title: "Salud",
    phones: [
      { tel: "061", label: "Emergencias sanitarias" },
      { tel: "955545060", show: "955 54 50 60", label: "Salud Responde", note: "Consultas no urgentes y cita médica." },
    ],
  },
  {
    id: "ayuda",
    title: "Líneas de ayuda",
    phones: [
      { tel: "016", label: "Violencia de género", note: "24 h, gratuito y confidencial. No aparece en la factura; borra la llamada del historial." },
      { tel: "024", label: "Atención a la conducta suicida", note: "24 h, gratuito y confidencial." },
      { tel: "915620420", show: "915 620 420", label: "Información toxicológica", note: "Picaduras, plantas o ingestión accidental." },
    ],
  },
];
