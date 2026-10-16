import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, type GenerativeModel } from 'firebase/ai';
import { firebaseConfig, FIREBASE_AI_READY, RECAPTCHA_SITE_KEY } from './firebaseConfig';

let app: FirebaseApp | null = null;

function setUpAppCheck(firebaseApp: FirebaseApp): void {
  if (!RECAPTCHA_SITE_KEY) return;
  // On localhost App Check prints a debug token in the console. Register it under App Check > Apps > Manage debug tokens.
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

/**
 * A Gemini model reached through Firebase AI Logic. Firebase keeps the Gemini credentials on its side,
 * so no key is in this code or in the browser. Returns null until the web config is filled in.
 */
export function getFirebaseModel(model: string, systemInstruction: string): GenerativeModel | null {
  if (!FIREBASE_AI_READY) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    setUpAppCheck(app);
  }
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model,
    systemInstruction,
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: 'application/json' },
  });
}
