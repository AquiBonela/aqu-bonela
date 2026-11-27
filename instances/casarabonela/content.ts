/** Contenido estable de Aquí Bonela (Casarabonela). */
import type { InstanceContent } from "../schema";
import { discover, home } from "./content/descubre";
import { emergencyGroups } from "./content/emergency";
import { publicServices } from "./content/servicios-publicos";
import { categories, featured, templates } from "./content/tramites";
import { dailyLife } from "./content/vida-diaria";

const content: InstanceContent = {
  emergencyGroups,
  home,
  publicServices,
  dailyLife,
  discover,
  procedures: { categories, templates, featured },
  legal: { operatorNote: "{app} es una iniciativa privada gestionada por su titular como persona física." },
};

export default content;
