import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Sistema de idiomas. Español es el idioma original y por defecto.
 * Para añadir un idioma (p. ej. alemán "de" o neerlandés "nl"):
 * 1) añadirlo a LANGS, 2) crear su diccionario (puede ser parcial: lo que falte se muestra en español).
 */
export const LANGS = ["es", "en"] as const;
export type Lang = (typeof LANGS)[number];

const es = {
  "menu.label": "Menú principal",
  "menu.open": "Abrir menú",
  "menu.close": "Cerrar menú",
  "menu.directorio": "Directorio",
  "menu.servicios": "Servicios públicos",
  "menu.descubre": "Descubre Bonela",
  "menu.actualidad": "Actualidad",
  "menu.clasificados": "Clasificados",
  "menu.sobre": "Sobre Aquí Bonela",
  "menu.enviar": "Enviar información",
  "menu.enviarDesc": "Ayúdanos a mantener Casarabonela\nconectado y actualizado.",
  "lang.label": "Idioma",
  "footer.tagline": "Directorio local colaborativo",
  "footer.about": "Una plataforma digital independiente para descubrir, conocer y compartir todo lo que ocurre en Casarabonela.",
  "footer.legalNav": "Información legal",
  "footer.aviso": "Aviso legal",
  "footer.privacidad": "Política de privacidad",
  "footer.cookies": "Cookies",
  "home.heroAlt": "Panorámica del pueblo blanco de Casarabonela y la Sierra de las Nieves",
  "home.lema": "Todo lo que necesitas para descubrir, conocer y vivir Casarabonela.",
  "home.searchLabel": "¿Qué necesitas hoy?",
  "home.searchPh": "¿Qué necesitas? Farmacia, fontanero…",
  "home.searchBtn": "Buscar",
  "home.start": "¿Por dónde empezamos?",
  "home.dirTitle": "Directorio local",
  "home.dirText": "Comercios, oficios, profesionales y asociaciones del municipio.",
  "home.descTitle": "Descubre Bonela",
  "home.descText": "Patrimonio, rincones con encanto, naturaleza y consejos de vecino.",
  "home.servTitle": "Servicios públicos",
  "home.servText": "Ayuntamiento, salud, dependencias y teléfonos útiles.",
  "home.soon": "Próximamente",
  "home.enter": "Entrar",
  "home.urgTitle": "¿Una urgencia?",
  "home.urg112": "Emergencias · 112",
  "home.urgLocal": "Servicios de urgencia del pueblo",
  "home.shareTitle": "¿Tienes un negocio, una asociación o algo que compartir?",
  "home.shareText": "Ayúdanos a que Casarabonela esté completa y al día. Revisamos cada aportación.",
  "home.shareBtn": "Enviar información",
  "home.kicker": "El lugar donde empieza Casarabonela",
  "home.exploreTitle": "Explora Casarabonela",
  "home.rinconesKicker": "Hay mucho por descubrir",
  "home.rinconesTitle": "Rincones con historia",
  "home.rinconesAll": "Ver todo Descubre Bonela",
  "home.r1t": "El barrio del Arrabal",
  "home.r1d": "Calles estrechas, empinadas y encaladas de traza morisca.",
  "home.r2t": "Jardín de Cactus Mora i Bravard",
  "home.r2d": "Más de 2.500 especies, uno de los mayores de Europa.",
  "home.r3t": "Fuentes y caños",
  "home.r3d": "El agua de la sierra corre por el pueblo todo el año.",
  "home.r4t": "Castillo Qasr Bunayra",
  "home.r4d": "Vigía árabe del valle desde el siglo IX.",
  "home2.searchKicker": "Encuentra lo que necesitas en Casarabonela",
  "home2.introKicker": "El pueblo",
  "home2.introTitle": "Un pueblo blanco a las puertas de la Sierra de las Nieves",
  "home2.intro1": "Casarabonela se asoma a unos 500 metros de altura en la ladera sur de la Sierra Prieta, mirando al valle del Guadalhorce, a unos 40 km de Málaga. Aquí viven cerca de 2.500 vecinos, entre calles empinadas y encaladas, macetas y fuentes.",
  "home2.intro2": "Su nombre viene del árabe Qasr Bunayra, «el castillo de Bunayra». El barrio del Arrabal conserva la traza morisca de calles estrechas y quebradas, y los restos del castillo vigilan el valle desde lo alto del pueblo.",
  "home2.intro3": "El agua es su seña de identidad: fuentes y caños que bajan de la sierra todo el año. También guarda uno de los mayores jardines de cactus de Europa y una tradición de pan, dulces, aceite y cocina de sierra.",
  "home2.howTo": "Cómo llegar",
  "home2.f1": "metros de altitud",
  "home2.f2": "habitantes",
  "home2.f3": "km de Málaga",
  "home2.sectionsTitle": "Todo en Aquí Bonela",
  "home2.actText": "Noticias, eventos y avisos del pueblo.",
  "home2.clasText": "Compra, venta y anuncios entre vecinos.",
  "home2.sobreText": "Quiénes somos y por qué existe esta plataforma.",
  "home2.enviarText": "Cuéntanos de un negocio, un error o algo nuevo.",
};

export type TKey = keyof typeof es;

const en: Partial<Record<TKey, string>> = {
  "menu.label": "Main menu",
  "menu.open": "Open menu",
  "menu.close": "Close menu",
  "menu.directorio": "Directory",
  "menu.servicios": "Public services",
  "menu.descubre": "Discover Bonela",
  "menu.actualidad": "News",
  "menu.clasificados": "Classifieds",
  "menu.sobre": "About Aquí Bonela",
  "menu.enviar": "Send information",
  "menu.enviarDesc": "Help us keep Casarabonela\nconnected and up to date.",
  "lang.label": "Language",
  "footer.tagline": "Collaborative local directory",
  "footer.about": "An independent digital platform to discover, get to know and share everything happening in Casarabonela.",
  "footer.legalNav": "Legal information",
  "footer.aviso": "Legal notice",
  "footer.privacidad": "Privacy policy",
  "footer.cookies": "Cookies",
  "home.heroAlt": "View of the white village of Casarabonela and the Sierra de las Nieves",
  "home.lema": "Everything you need to discover, get to know and enjoy Casarabonela.",
  "home.searchLabel": "What do you need today?",
  "home.searchPh": "What do you need? Pharmacy, plumber…",
  "home.searchBtn": "Search",
  "home.start": "Where shall we start?",
  "home.dirTitle": "Local directory",
  "home.dirText": "Shops, trades, professionals and associations in the village.",
  "home.descTitle": "Discover Bonela",
  "home.descText": "Heritage, charming corners, nature and tips from locals.",
  "home.servTitle": "Public services",
  "home.servText": "Town hall, health, public offices and useful phone numbers.",
  "home.soon": "Coming soon",
  "home.enter": "Enter",
  "home.urgTitle": "An emergency?",
  "home.urg112": "Emergencies · 112",
  "home.urgLocal": "Local emergency services",
  "home.shareTitle": "Do you have a business, an association or something to share?",
  "home.shareText": "Help us keep Casarabonela complete and up to date. We review every contribution.",
  "home.shareBtn": "Send information",
  "home.kicker": "Where Casarabonela begins",
  "home.exploreTitle": "Explore Casarabonela",
  "home.rinconesKicker": "There is a lot to discover",
  "home.rinconesTitle": "Corners with a story",
  "home.rinconesAll": "See all of Discover Bonela",
  "home.r1t": "The Arrabal quarter",
  "home.r1d": "Steep, narrow, whitewashed streets with a Moorish layout.",
  "home.r2t": "Mora i Bravard Cactus Garden",
  "home.r2d": "Over 2,500 species, one of the largest in Europe.",
  "home.r3t": "Springs and fountains",
  "home.r3d": "Mountain water running through the village all year.",
  "home.r4t": "Qasr Bunayra castle",
  "home.r4d": "A 9th-century Arab watchtower over the valley.",
  "home2.searchKicker": "Find what you need in Casarabonela",
  "home2.introKicker": "The village",
  "home2.introTitle": "A white village on the doorstep of the Sierra de las Nieves",
  "home2.intro1": "Casarabonela sits at about 500 metres on the southern slope of the Sierra Prieta, overlooking the Guadalhorce valley, some 40 km from Málaga. Around 2,500 people live here, among steep whitewashed lanes, flower pots and fountains.",
  "home2.intro2": "Its name comes from the Arabic Qasr Bunayra, 'the castle of Bunayra'. The Moorish Arrabal quarter still keeps the layout of those narrow, winding streets, and the remains of the castle watch over the valley from the top of the village.",
  "home2.intro3": "Water is its signature: springs and fountains run from the sierra all year round. It is also home to one of Europe's largest cactus gardens, and to a tradition of bread, sweets, oil and mountain cooking.",
  "home2.howTo": "How to get here",
  "home2.f1": "metres high",
  "home2.f2": "inhabitants",
  "home2.f3": "km from Málaga",
  "home2.sectionsTitle": "Everything in Aquí Bonela",
  "home2.actText": "News, events and announcements from the village.",
  "home2.clasText": "Buy, sell and local notices between neighbours.",
  "home2.sobreText": "Who we are and why this platform exists.",
  "home2.enviarText": "Tell us about a business, a mistake or something new.",
};

const DICTS: Record<Lang, Partial<Record<TKey, string>>> = { es, en };
const STORAGE_KEY = "aquibonela-lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const I18nContext = createContext<Ctx>({ lang: "es", setLang: () => {}, t: (k) => es[k] });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGS as readonly string[]).includes(saved)) setLangState(saved as Lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback((k: TKey) => DICTS[lang][k] ?? es[k], [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang.label")} className={`flex items-center text-xs font-bold ${className}`}>
      {LANGS.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden className="px-0.5 opacity-40">|</span>}
          <button
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={`min-h-11 px-1 uppercase ${lang === l ? "text-primary underline underline-offset-4" : "opacity-60 hover:opacity-100"}`}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}
