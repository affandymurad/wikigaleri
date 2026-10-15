import { Info as InfoIcon } from 'lucide-react';
import React from 'react';
import { Sun, Moon, ShieldCheck, Sparkles, HelpCircle, Globe } from 'lucide-react';
import { Language, Translations } from '../i18n/translations';

interface HeaderProps {
  isDark: boolean;
  onToggleDark: () => void;
  onOpenLicenseGuide: () => void;
  onOpenTerms: () => void;
  onOpenDisclaimer: () => void;
  onResetToHome: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  t: Translations;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleDark,
  onOpenLicenseGuide,
  onOpenTerms,
  onOpenDisclaimer,
  onResetToHome,
  language,
  onSetLanguage,
  t,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-stone-50 dark:bg-stone-950 border-b border-stone-300 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-8">
        
        {/* Zone 1: Wordmark brand title */}
        <button
          onClick={onResetToHome}
          className="text-left font-display text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
        >
          Wiki<span className="text-accent-600 dark:text-accent-400">Galeri</span>
        </button>

        {/* Zone 2: 4-5 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-300">
          <button
            onClick={onOpenLicenseGuide}
            className="hover:text-stone-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-moss-600 dark:text-moss-400" />
            {t.nav.licenseGuide}
          </button>
          <button
            type="button"
            onClick={onOpenTerms}
            className="hover:text-stone-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-stone-400" />
            {t.nav.wikimediaTerms}
          </button>
        </nav>

        {/* Zone 3: Language Selector, Gemini Key status, & Dark Mode toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Tombol Penafian / Disclaimer */}
        <button
          type="button"
          onClick={onOpenDisclaimer}
          title={language === 'en' ? 'What is WikiGaleri' : 'Apa itu WikiGaleri'}
          aria-label={language === 'en' ? 'What is WikiGaleri' : 'Apa itu WikiGaleri'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-100 text-xs font-medium text-stone-600 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
        >
          <InfoIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">{language === 'en' ? 'What is WikiGaleri' : 'Apa itu WikiGaleri'}</span>
        </button>

        {/* Language Switcher (EN / ID) */}
          <div className="flex items-center p-0.5 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-semibold border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => onSetLanguage('en')}
              className={`px-2 py-1 rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
              }`}
              title="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onSetLanguage('id')}
              className={`px-2 py-1 rounded-md transition-all ${
                language === 'id'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
              }`}
              title="Bahasa Indonesia"
            >
              ID
            </button>
          </div>

          {/* Gemini status badge: Gemini runs on the WikiGaleri API, so there is no key to enter */}
          <span
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950/60 dark:text-accent-300 dark:border-accent-800"
            title={t.nav.geminiActive}
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
            <span className="hidden sm:inline">{t.nav.geminiActive}</span>
            <span className="sr-only sm:hidden">{t.nav.geminiActive}</span>
          </span>

          {/* Dark Mode slide toggle (Light / Dark) */}
          <div role="group" aria-label="Theme" className="flex items-center p-0.5 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-semibold border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => { if (isDark) onToggleDark(); }}
              aria-label={t.nav.toggleLight}
              aria-pressed={!isDark}
              title={t.nav.toggleLight}
              className={`px-2 py-1 rounded-md transition-all flex items-center ${!isDark ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'}`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { if (!isDark) onToggleDark(); }}
              aria-label={t.nav.toggleDark}
              aria-pressed={isDark}
              title={t.nav.toggleDark}
              className={`px-2 py-1 rounded-md transition-all flex items-center ${isDark ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'}`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
