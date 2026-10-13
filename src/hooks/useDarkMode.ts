import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'wikigaleri_theme';

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isDark) {
      root.classList.add('dark');
      body?.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      } catch {}
    } else {
      root.classList.remove('dark');
      body?.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
      } catch {}
    }
  }, [isDark]);

  const toggleDarkMode = () => setIsDark((prev) => !prev);
  const setDarkMode = (val: boolean) => setIsDark(val);

  return { isDark, toggleDarkMode, setDarkMode };
}
