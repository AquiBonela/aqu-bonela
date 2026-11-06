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
  "home2.introTitle": "Casarabonela, un pueblo por descubrir",
  "home2.intro1": "Enclavado entre las montañas de Málaga, en las estribaciones de la Sierra de las Nieves, Casarabonela es uno de esos pueblos blancos andaluces que conservan su esencia.",
  "home2.intro2": "Sus calles estrechas y empinadas, sus fachadas encaladas, sus antiguas fuentes y su herencia andalusí invitan a perderse sin prisas por un casco histórico lleno de rincones con encanto.",
  "home2.intro3": "Aquí conviven siglos de historia, paisajes de sierra, caminos naturales y una cultura popular que sigue muy viva. Desde el Castillo de Qasr Bunayra y el Jardín Islámico hasta sus tradicionales caños y hornacinas, cada rincón guarda una pequeña historia.",
  "home2.howTo": "Cómo llegar",
  "home.suggestNone": "Sin coincidencias. Pulsa Buscar para ver el directorio.",
  "home.suggestAll": "Ver todos los resultados",
  "home.ctaTitle": "¿Tienes un negocio o prestas un servicio en Casarabonela?",
  "home.ctaText": "Forma parte de la guía local. Envíanos tus datos y publicaremos tu ficha revisada contigo.",
  "home.ctaBtn": "Enviar mis datos",
  "home2.intro4": "Su gastronomía tradicional, sus productos de la tierra y celebraciones tan singulares como la Fiesta de los Rondeles, cada 12 de diciembre, hacen de Casarabonela un destino que merece la pena descubrir.",
  "home2.intro5": "Ven a conocerlo. Pasea, disfruta y déjate sorprender por la esencia de un auténtico pueblo andaluz.",
  "home2.f1": "metros de altitud",
  "home2.f2": "habitantes",
  "home2.f3": "km de Málaga",
  "home2.sectionsTitle": "Todo en Aquí Bonela",
  "home2.actText": "Noticias, eventos y avisos del pueblo.",
  "home2.clasText": "Compra, venta y anuncios entre vecinos.",
  "home2.sobreText": "Quiénes somos y por qué existe esta plataforma.",
  "home2.enviarText": "Cuéntanos de un negocio, un error o algo nuevo.",
  "sobre.title": "Sobre Aquí Bonela",
  "sobre.whatTitle": "¿Qué es?",
  "sobre.what1": "Aquí Bonela es una plataforma digital dedicada a Casarabonela, creada para reunir en un mismo lugar la información útil del municipio.",
  "sobre.what2": "Un espacio que reunirá comercios, profesionales, servicios públicos, asociaciones, lugares de interés, actividades, noticias y mucho más.",
  "sobre.what3": "Nace de una idea sencilla: hacer que la información de nuestro pueblo sea más accesible, esté mejor organizada y resulte fácil de encontrar desde cualquier dispositivo.",
  "sobre.audienceTitle": "¿Para quién es?",
  "sobre.aud1": "Para los vecinos y vecinas que necesitan encontrar un servicio, consultar un teléfono, conocer una actividad o estar al día de lo que ocurre en el municipio.",
  "sobre.aud2": "Para quienes visitan Casarabonela y quieren descubrir sus lugares, rutas, comercios y propuestas.",
  "sobre.aud3": "Y también para los negocios, profesionales, asociaciones y colectivos que quieren dar a conocer lo que hacen y formar parte de un espacio común.",
  "sobre.howTitle": "¿Cómo funciona?",
  "sobre.how1": "Aquí Bonela reúne diferentes contenidos del municipio para que puedas encontrar lo que necesitas de forma sencilla.",
  "sobre.how2": "El objetivo es que no tengas que buscar en diferentes páginas, redes sociales o grupos para encontrar información sobre Casarabonela: Aquí Bonela trabaja para reunirla y organizarla en un espacio común.",
  "sobre.how3": "Estamos empezando por el directorio de comercios, profesionales y servicios públicos. Poco a poco, en los próximos meses, se irán sumando lugares de interés, actividades y eventos, noticias y clasificados.",
  "sobre.how4": "La información se organiza para facilitar las búsquedas y permitir que cualquier persona acceda sin registros ni complicaciones.",
  "sobre.how5": "Los contenidos se revisan antes de su publicación para procurar que la información sea útil, clara y fiable.",
  "sobre.joinTitle": "¿Cómo aparecer en Aquí Bonela?",
  "sobre.join1": "Cualquier persona puede participar. Si conoces un lugar de interés, organizas una actividad, quieres compartir un evento, una noticia o tienes un anuncio que pueda resultar útil para el pueblo, puedes enviárnoslo.",
  "sobre.join2": "Si además tienes un comercio, eres profesional o formas parte de una asociación o colectivo, puedes solicitar tu ficha en la plataforma.",
  "sobre.join3": "Las propuestas se revisan antes de publicarse y la inclusión básica en el directorio es siempre gratuita.",
  "sobre.growTitle": "¿Nos ayudas a crecer?",
  "sobre.grow1": "Aquí Bonela es un proyecto que se construye y mejora con el conocimiento y la participación de quienes viven, trabajan o tienen relación con Casarabonela.",
  "sobre.grow2": "Si conoces un negocio que falta, sabes de un lugar que merece la pena descubrir, quieres dar a conocer una actividad o has detectado algún dato incorrecto, puedes contárnoslo.",
  "sobre.grow3": "Toda aportación ayuda a que Aquí Bonela sea cada día más útil para el municipio.",
  "sobre.indepTitle": "Una iniciativa independiente",
  "sobre.indep1": "Aquí Bonela es una iniciativa privada e independiente, creada para reunir y facilitar el acceso a información de interés sobre Casarabonela.",
  "sobre.indep2": "No es una web oficial del Ayuntamiento ni representa a ninguna administración pública.",
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
  "home2.introTitle": "Casarabonela, a village waiting to be discovered",
  "home2.intro1": "Nestled in the mountains of Málaga, in the foothills of the Sierra de las Nieves, Casarabonela is one of those white Andalusian villages that keep their essence.",
  "home2.intro2": "Its narrow, steep streets, whitewashed façades, old fountains and Andalusí heritage invite you to wander unhurriedly through a historic centre full of charming corners.",
  "home2.intro3": "Centuries of history, mountain landscapes, nature trails and a living popular culture come together here. From the Qasr Bunayra Castle and the Islamic Garden to its traditional springs and niches, every corner holds a little story.",
  "home2.howTo": "How to get here",
  "home.suggestNone": "No matches. Press Search to open the directory.",
  "home.suggestAll": "See all results",
  "home.ctaTitle": "Do you run a business or offer a service in Casarabonela?",
  "home.ctaText": "Join the local guide. Send us your details and we will publish your listing, reviewed with you.",
  "home.ctaBtn": "Send my details",
  "home2.intro4": "Its traditional cuisine, local produce and unique celebrations such as the Fiesta de los Rondeles, every 12 December, make Casarabonela a destination well worth discovering.",
  "home2.intro5": "Come and see it. Stroll, enjoy and let yourself be surprised by the essence of a genuine Andalusian village.",
  "home2.f1": "metres high",
  "home2.f2": "inhabitants",
  "home2.f3": "km from Málaga",
  "home2.sectionsTitle": "Everything in Aquí Bonela",
  "home2.actText": "News, events and announcements from the village.",
  "home2.clasText": "Buy, sell and local notices between neighbours.",
  "home2.sobreText": "Who we are and why this platform exists.",
  "home2.enviarText": "Tell us about a business, a mistake or something new.",
  "sobre.title": "About Aquí Bonela",
  "sobre.whatTitle": "What is it?",
  "sobre.what1": "Aquí Bonela is a digital platform dedicated to Casarabonela, created to bring the municipality's useful information together in one place.",
  "sobre.what2": "A space that will gather shops, professionals, public services, associations, places of interest, activities, news and much more.",
  "sobre.what3": "It comes from a simple idea: making our village's information more accessible, better organised and easy to find from any device.",
  "sobre.audienceTitle": "Who is it for?",
  "sobre.aud1": "For residents who need to find a service, check a phone number, learn about an activity or keep up with what is happening in the municipality.",
  "sobre.aud2": "For visitors to Casarabonela who want to discover its places, routes, shops and proposals.",
  "sobre.aud3": "And also for businesses, professionals, associations and groups who want to make their work known and be part of a shared space.",
  "sobre.howTitle": "How does it work?",
  "sobre.how1": "Aquí Bonela brings together different content from the municipality so you can find what you need easily.",
  "sobre.how2": "The aim is that you don't have to search across different pages, social networks or groups to find information about Casarabonela: Aquí Bonela works to gather and organise it in one shared space.",
  "sobre.how3": "We are starting with the directory of shops, professionals and public services. Little by little, over the coming months, places of interest, activities and events, news and classifieds will be added.",
  "sobre.how4": "Information is organised to make searching easier and to let anyone access it without registrations or complications.",
  "sobre.how5": "Content is reviewed before publication to keep the information useful, clear and reliable.",
  "sobre.joinTitle": "How to appear on Aquí Bonela?",
  "sobre.join1": "Anyone can take part. If you know a place of interest, organise an activity, want to share an event or a news item, or have an announcement that could be useful for the village, you can send it to us.",
  "sobre.join2": "If you also run a shop, are a professional or belong to an association or group, you can request your listing on the platform.",
  "sobre.join3": "Proposals are reviewed before being published, and basic inclusion in the directory is always free.",
  "sobre.growTitle": "Can you help us grow?",
  "sobre.grow1": "Aquí Bonela is a project built and improved with the knowledge and participation of the people who live, work or have ties with Casarabonela.",
  "sobre.grow2": "If you know a business that is missing, know of a place worth discovering, want to publicise an activity or have spotted incorrect data, you can tell us.",
  "sobre.grow3": "Every contribution helps make Aquí Bonela more useful for the municipality every day.",
  "sobre.indepTitle": "An independent initiative",
  "sobre.indep1": "Aquí Bonela is a private, independent initiative created to gather and ease access to information of interest about Casarabonela.",
  "sobre.indep2": "It is not an official Town Hall website and does not represent any public administration.",
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
