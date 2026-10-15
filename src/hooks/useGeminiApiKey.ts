import { useState, useEffect, useCallback } from 'react';
import { testGeminiApiKey } from '../services/geminiClient';

const API_KEY_STORAGE = 'wikigaleri_gemini_api_key';
// No bundled key: each user enters their own Gemini API key.
const PRECONFIGURED_API_KEY = '';

export function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(API_KEY_STORAGE);
        if (stored !== null) return stored; // user might have explicitly cleared it
        return PRECONFIGURED_API_KEY;
      } catch {
        return PRECONFIGURED_API_KEY;
      }
    }
    return PRECONFIGURED_API_KEY;
  });

  const [isValidated, setIsValidated] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    setIsValidated(Boolean(apiKey && apiKey.trim().length > 10));
  }, [apiKey]);

  const saveKey = useCallback(async (newKey: string): Promise<boolean> => {
    const trimmed = newKey.trim();
    if (!trimmed) {
      setLastError('Kunci API tidak boleh kosong.');
      return false;
    }

    setIsChecking(true);
    setLastError(null);

    const test = await testGeminiApiKey(trimmed);
    setIsChecking(false);

    if (test.valid) {
      setApiKey(trimmed);
      setIsValidated(true);
      setLastError(null);
      try {
        localStorage.setItem(API_KEY_STORAGE, trimmed);
      } catch {}
      return true;
    } else {
      const errorMsg = test.message || 'Kunci API tidak valid atau tidak memiliki akses.';
      setLastError(errorMsg);
      setIsValidated(false);
      return false;
    }
  }, []);

  const removeKey = useCallback(() => {
    setApiKey('');
    setIsValidated(false);
    setLastError(null);
    try {
      localStorage.setItem(API_KEY_STORAGE, '');
    } catch {}
  }, []);

  return {
    apiKey,
    hasKey: Boolean(apiKey && apiKey.trim().length > 5),
    isValidated,
    isChecking,
    lastError,
    saveKey,
    removeKey,
  };
}
