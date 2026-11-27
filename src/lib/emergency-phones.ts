import { getInstanceContent, type InstanceContent } from "@/config/municipality";

export type EmergencyPhone = { tel: string; show?: string; label: string; note?: string };
export type EmergencyGroup = { id: string; title: string; phones: EmergencyPhone[] };

export const MAIN_EMERGENCY: EmergencyPhone = {
  tel: "112",
  label: "Emergencias",
  note: "24 horas · Gratuito · Varios idiomas. Coordina sanitarios, bomberos, Guardia Civil y rescate en montaña.",
};

/** Teléfonos de ámbito nacional, válidos en cualquier instalación. */
const NATIONAL_GROUPS: EmergencyGroup[] = [
  {
    id: "seguridad",
    title: "Seguridad",
    phones: [{ tel: "062", label: "Guardia Civil · urgencias 24 h" }],
  },
  {
    id: "salud",
    title: "Salud",
    phones: [{ tel: "061", label: "Emergencias sanitarias" }],
  },
  {
    id: "ayuda",
    title: "Líneas de ayuda",
    phones: [
      {
        tel: "016",
        label: "Violencia de género",
        note: "24 h, gratuito y confidencial. No aparece en la factura; borra la llamada del historial.",
      },
      {
        tel: "024",
        label: "Atención a la conducta suicida",
        note: "24 h, gratuito y confidencial.",
      },
      {
        tel: "915620420",
        show: "915 620 420",
        label: "Información toxicológica",
        note: "Picaduras, plantas o ingestión accidental.",
      },
    ],
  },
];

/** La instancia puede dar la lista completa (con teléfonos locales y regionales). */
export function emergencyGroupsFor(content: InstanceContent): EmergencyGroup[] {
  return content.emergencyGroups ?? NATIONAL_GROUPS;
}

export const EMERGENCY_GROUPS: EmergencyGroup[] = emergencyGroupsFor(getInstanceContent());
