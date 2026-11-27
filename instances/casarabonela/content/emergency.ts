/** Lista SOS de Aquí Bonela: nacionales, regionales (Andalucía) y el puesto local. */
import type { EmergencyGroup } from "@/lib/emergency-phones";

export const emergencyGroups: EmergencyGroup[] = [
  {
    id: "seguridad",
    title: "Seguridad",
    phones: [
      { tel: "062", label: "Guardia Civil · urgencias 24 h" },
      {
        tel: "952456665",
        show: "952 456 665",
        label: "Puesto de Casarabonela",
        note: "Av. Federico Muñoz, 16. Para trámites y denuncias; en urgencias llama al 062 o al 112.",
      },
    ],
  },
  {
    id: "salud",
    title: "Salud",
    phones: [
      { tel: "061", label: "Emergencias sanitarias" },
      {
        tel: "955545060",
        show: "955 54 50 60",
        label: "Salud Responde",
        note: "Consultas no urgentes y cita médica.",
      },
    ],
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
        tel: "900845040",
        show: "900 84 50 40",
        label: "Ayuda a las adicciones",
        note: "Junta de Andalucía. Gratuito y confidencial. Orientación a personas afectadas y familias.",
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
