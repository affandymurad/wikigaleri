import { useState, useEffect, useCallback } from 'react';
import { Language, translations, Translations } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'wikigaleri_language';

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (stored === 'en' || stored === 'id') return stored;
    }
    // Default to English as explicitly requested by user
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
  }, []);

  const t: Translations = translations[language];

  return {
    language,
    setLanguage,
    t,
  };
}
