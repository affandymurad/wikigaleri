// Public web config of the Firebase project. These values identify the project and are not secrets.
// From: firebase apps:sdkconfig WEB 1:766809996462:web:2d985b77a38101d6d0813f
export const firebaseConfig = {
  apiKey: 'AIzaSyDWDouZwnWIFJWHKZhn5RmgsZWOXJKn9-4',
  authDomain: 'wikigaleri.firebaseapp.com',
  projectId: 'wikigaleri',
  appId: '1:766809996462:web:2d985b77a38101d6d0813f',
};

// reCAPTCHA (Google Cloud Fraud Defense) site key registered under Firebase App Check. Also public.
export const RECAPTCHA_SITE_KEY = '6LeE7vEtAAAAAOSYzYHX_H9WPOCax4ShpfFGFpdb';

/** True once the config above is filled in, which switches the app to Firebase AI Logic by default */
export const FIREBASE_AI_READY = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
