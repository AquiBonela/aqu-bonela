/** Servicios públicos de Aquí Bonela: contactos y recursos locales. */
import plaza from "../assets/plaza-buenavista-casarabonela.webp";
import type { PublicServicesContent } from "../../schema";

export const publicServices: PublicServicesContent = {
  heroImage: plaza,
  heroAlt: "Plaza de la Buena Vista, Casarabonela",
  securityContacts: [
    {
      title: "Guardia Civil — Puesto de Casarabonela",
      tel: "952456665",
      description: "Avda. Federico Muñoz, 16.",
    },
    {
      title: "Policía Local",
      tel: "669291300",
      description: "Edificio de Usos Múltiples, Avda. Fernando Díaz. Atención según turnos.",
    },
  ],
  healthCenter: {
    name: "Centro de Salud de Alozaina",
    text: "Si el consultorio está cerrado, acude a Urgencias de Alozaina. Para pediatría, llama antes y confirma la disponibilidad y el horario.",
    address: "Urbanización La Pasadilla, s/n — Alozaina.",
    urgent: { tel: "951031437", show: "951 03 14 37" },
    info: { tel: "951504564", show: "951 50 45 64" },
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Centro+de+Salud+de+Alozaina+Urbanizacion+La+Pasadilla",
    officialUrl:
      "https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/el-sas/servicios-y-centros/informacion-por-centros/23967",
  },
  healthNote:
    "El consultorio del pueblo atiende consultas habituales en su horario, no es un servicio de urgencias. Encontrarás sus datos en «Vida diaria en el pueblo».",
  lineaVerde: true,
  puntoVuela: { slug: "punto-vuela-casarabonela", fallbackAddress: "Calle Cuatro Esquinas, 10" },
};
