// Componentes del sistema de idiomas. El diccionario, las funciones y el contexto están en i18n-core.ts;
// se importan juntos desde "@/lib/i18n".
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  I18nContext,
  interpolate,
  LANGS,
  LANGUAGE_FLAGS,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  translateKey,
  translateText,
  useI18n,
  withBrand,
  type Lang,
  type TKey,
  type TParams,
} from "./i18n-core";

export function I18nProvider({
  children,
  fixedLanguage,
}: {
  children: ReactNode;
  fixedLanguage?: Lang;
}) {
  const [selectedLanguage, setLangState] = useState<Lang>("es");
  const lang = fixedLanguage ?? selectedLanguage;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && (LANGS as readonly string[]).includes(saved)) setLangState(saved as Lang);
    } catch {
      /* Language selection still works when storage is unavailable. */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, l);
    } catch {
      /* Keep the current selection in memory. */
    }
  }, []);

  const t = useCallback(
    (k: TKey, params?: TParams) => interpolate(translateKey(k, lang), withBrand(params)),
    [lang],
  );
  const tr = useCallback(
    (text: string, params?: TParams) => interpolate(translateText(text, lang), withBrand(params)),
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, locale: LANGUAGE_OPTIONS[lang].locale, setLang, t, tr }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Saved editorial versions take precedence over the legacy source-text catalog. */
export function ContentTranslationProvider({
  translations,
  children,
}: {
  translations: Record<string, string>;
  children: ReactNode;
}) {
  const parent = useI18n();
  return (
    <I18nContext.Provider
      value={{
        ...parent,
        tr: (text, params) =>
          Object.hasOwn(translations, text)
            ? interpolate(translations[text] ?? text, withBrand(params))
            : parent.tr(text, params),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function Text({ text, params }: { text: string; params?: TParams }) {
  const { tr } = useI18n();
  return <>{tr(text, params)}</>;
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGE_OPTIONS[lang];
  return (
    <div className={`w-36 min-w-0 sm:w-40 sm:shrink-0 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            type="button"
            aria-label={`${t("lang.label")}: ${current.name}`}
            className="min-h-11 w-full min-w-0 justify-between gap-1 px-1 text-xs text-inherit hover:bg-transparent sm:px-2 sm:text-sm"
          >
            <span className="flex min-w-0 items-center gap-1 sm:gap-2">
              <img
                src={LANGUAGE_FLAGS[lang]}
                alt=""
                aria-hidden
                width={24}
                height={16}
                className="h-4 w-6 shrink-0 object-cover"
              />
              <span lang={lang} className="truncate">
                {current.name}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[60] w-52">
          <DropdownMenuRadioGroup
            value={lang}
            onValueChange={(value) => {
              const selected = LANGS.find((language) => language === value);
              if (selected) setLang(selected);
            }}
          >
            {LANGS.map((language) => (
              <DropdownMenuRadioItem key={language} value={language} className="min-h-11 gap-2">
                <img
                  src={LANGUAGE_FLAGS[language]}
                  alt=""
                  aria-hidden
                  width={24}
                  height={16}
                  className="h-4 w-6 shrink-0 object-cover"
                />
                <span lang={language}>{LANGUAGE_OPTIONS[language].name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
