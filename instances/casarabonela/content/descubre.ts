/** Portada y guía Descubre de Aquí Bonela: imágenes y lugares de Casarabonela. */
import calles from "../assets/descubre/calles.jpg";
import castillo from "../assets/descubre/castillo.jpg";
import cactus from "../assets/descubre/cactus.jpg";
import molino from "../assets/descubre/molino.jpg";
import fuentes from "../assets/descubre/fuentes.jpg";
import sierra from "../assets/descubre/sierra.jpg";
import fiestas from "../assets/descubre/fiestas.jpg";
import gastronomia from "../assets/descubre/gastronomia.jpg";
import iglesia from "../assets/descubre/iglesia.jpg";
import type { DiscoverContent, InstanceContent } from "../../schema";

export const home: NonNullable<InstanceContent["home"]> = {
  stats: [
    { value: "500", label: "home2.f1" },
    { value: "2.500", label: "home2.f2" },
    { value: "40", label: "home2.f3" },
  ],
  directionsQuery: "Casarabonela, Málaga",
  sectionImages: { directorio: calles, descubre: castillo, servicios: fuentes, actualidad: molino, clasificados: cactus },
};

export const discover: DiscoverContent = {
  images: { hero: calles, history: castillo, nature: sierra, festivals: fiestas, food: gastronomia },
  historicCentre: "Casco histórico",
  places: [
    { img: iglesia, q: "Iglesia de Santiago Apóstol", name: "descubre.r1Name", text: "descubre.r1Text" },
    { img: castillo, q: "Castillo de Casarabonela", name: "descubre.r2Name", text: "descubre.r2Text" },
    { img: cactus, q: "Jardín de Cactus", name: "descubre.r3Name", text: "descubre.r3Text" },
    { img: fuentes, q: "Fuentes y caños", name: "descubre.r4Name", text: "descubre.r4Text" },
    { img: molino, q: "Molino de Albaiva", name: "descubre.r5Name", text: "descubre.r5Text" },
    { img: calles, q: "Jardín Andalusí", name: "descubre.r6Name", text: "descubre.r6Text" },
  ],
  mapsSuffix: "Casarabonela",
};
