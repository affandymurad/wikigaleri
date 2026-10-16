// Public web config of the Firebase project. These values identify the project and are not secrets.
// Filled in after the web app is registered (firebase apps:sdkconfig).
export const firebaseConfig = {
  apiKey: '',
  authDomain: 'wikigaleri.firebaseapp.com',
  projectId: 'wikigaleri',
  appId: '',
};

// reCAPTCHA v3 site key registered under Firebase App Check. Also public.
export const RECAPTCHA_SITE_KEY = '';

/** True once the config above is filled in, which switches the app to Firebase AI Logic by default */
export const FIREBASE_AI_READY = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
