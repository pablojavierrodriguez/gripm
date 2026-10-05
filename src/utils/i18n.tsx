import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import esDict from '../locales/es.json';
import enDict from '../locales/en.json';
import { getStoredItem, setStoredItem, STORAGE_KEYS } from './storage';

export type Language = 'es' | 'en';
export type TranslationKey = keyof typeof esDict;

const dictionaries: Record<Language, Record<string, string>> = {
  es: esDict,
  en: enDict
};

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'es';
  try {
    const saved = getStoredItem(STORAGE_KEYS.LANGUAGE);
    if (saved === 'es' || saved === 'en') return saved;
    if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('en')) {
      return 'en';
    }
  } catch {}
  return 'es';
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isEs: boolean;
  isEn: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode; initialLang?: Language }> = ({ children, initialLang }) => {
  const [language, setLanguageState] = useState<Language>(() => initialLang || getInitialLanguage());

  useEffect(() => {
    try {
      setStoredItem(STORAGE_KEYS.LANGUAGE, language);
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = dictionaries[language] || dictionaries.es;
    let text = dict[key] ?? dictionaries.es[key] ?? key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isEs: language === 'es',
        isEn: language === 'en'
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Defensive fallback if consumed outside I18nProvider
    const fallbackLang = getInitialLanguage();
    return {
      language: fallbackLang,
      setLanguage: () => {},
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        const dict = dictionaries[fallbackLang] || dictionaries.es;
        let text = dict[key] ?? dictionaries.es[key] ?? key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
          });
        }
        return text;
      },
      isEs: fallbackLang === 'es',
      isEn: fallbackLang === 'en'
    };
  }
  return ctx;
}
