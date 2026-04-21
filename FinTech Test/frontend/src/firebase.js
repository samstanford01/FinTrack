/**
 * Firebase initialisation.
 * Set VITE_FIREBASE_* variables in frontend/.env to enable Google login.
 * If the env vars are absent the app works in no-auth mode (default local user).
 */
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

export const FIREBASE_ENABLED = Boolean(apiKey);

let _app = null;
let _auth = null;
let _googleProvider = null;

if (FIREBASE_ENABLED) {
  _app = initializeApp({
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  _auth = getAuth(_app);
  _googleProvider = new GoogleAuthProvider();
}

export const firebaseApp = _app;
export const auth = _auth;
export const googleProvider = _googleProvider;
