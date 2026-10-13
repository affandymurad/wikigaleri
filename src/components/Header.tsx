import { Info as InfoIcon } from 'lucide-react';
import React from 'react';
import { Sun, Moon, Key, ShieldCheck, Sparkles, HelpCircle, Globe } from 'lucide-react';
import { Language, Translations } from '../i18n/translations';

interface HeaderProps {
  isDark: boolean;
  onToggleDark: () => void;
  hasGeminiKey: boolean;
  onOpenGeminiModal: () => void;
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
  hasGeminiKey,
  onOpenGeminiModal,
  onOpenLicenseGuide,
  onOpenTerms,
  onOpenDisclaimer,
  onResetToHome,
  language,
  onSetLanguage,
  t,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        
        {/* Zone 1: Wordmark brand title */}
        <button
          onClick={onResetToHome}
          className="text-left font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
        >
          Wiki<span className="text-blue-600 dark:text-blue-400">Galeri</span>
        </button>

        {/* Zone 2: 4-5 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={onResetToHome}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.gallery}
          </button>
          <button
            onClick={onOpenLicenseGuide}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t.nav.licenseGuide}
          </button>
          <button
            type="button"
            onClick={onOpenTerms}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            {t.nav.wikimediaTerms}
          </button>
        </nav>

        {/* Zone 3: Language Selector, Gemini Key status, & Dark Mode toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Tombol Penafian / Disclaimer */}
        <button
          type="button"
          onClick={onOpenDisclaimer}
          title={language === 'en' ? 'What is WikiGaleri' : 'Apa itu WikiGaleri'}
          aria-label={language === 'en' ? 'What is WikiGaleri' : 'Apa itu WikiGaleri'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          <InfoIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">{language === 'en' ? 'What is WikiGaleri' : 'Apa itu WikiGaleri'}</span>
        </button>

        {/* Language Switcher (EN / ID) */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onSetLanguage('en')}
              className={`px-2 py-1 rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Bahasa Indonesia"
            >
              ID
            </button>
          </div>

          {/* Gemini Key status button */}
          <button
            onClick={onOpenGeminiModal}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap shrink-0 ${
              hasGeminiKey
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
            }`}
            title="Gemini API Key Settings"
          >
            {hasGeminiKey ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">{t.nav.geminiActive}</span>
                <span className="sm:hidden">AI Aktif</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">{t.nav.inputGemini}</span>
                <span className="sm:hidden">API Key</span>
              </>
            )}
          </button>

          {/* Dark Mode slide toggle (Light / Dark) */}
          <div role="group" aria-label="Theme" className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { if (isDark) onToggleDark(); }}
              aria-label={t.nav.toggleLight}
              aria-pressed={!isDark}
              title={t.nav.toggleLight}
              className={`px-2 py-1 rounded-md transition-all flex items-center ${!isDark ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { if (!isDark) onToggleDark(); }}
              aria-label={t.nav.toggleDark}
              aria-pressed={isDark}
              title={t.nav.toggleDark}
              className={`px-2 py-1 rounded-md transition-all flex items-center ${isDark ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
