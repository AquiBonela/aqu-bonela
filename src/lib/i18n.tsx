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
