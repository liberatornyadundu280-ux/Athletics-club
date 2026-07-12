import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.projectId && firebaseConfig.apiKey,
);

export const firebaseApp = hasFirebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const isFirebaseConfigured = hasFirebaseConfig;

// Temporary development note:
// The current dashboard still uses a hardcoded admin password. Firestore write access is
// intentionally left open for local development only and should be replaced with Firebase
// Authentication and strict Firestore security rules before production release.
