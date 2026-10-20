import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  UserCredential,
} from 'firebase/auth';

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ==================== INITIALIZE ====================
let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Keep the Firebase session in localStorage so a returning visitor is recognised
    // without a round-trip through the account chooser. This is the default in browsers,
    // but stating it explicitly keeps it from silently changing with an SDK upgrade.
    void setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('Could not persist the Firebase session:', error);
    });

    googleProvider = new GoogleAuthProvider();
    // No forced `select_account`: with an existing Google session, "Continue with Google"
    // now completes in one step instead of always opening the account picker. Google still
    // lets the visitor switch accounts if they want to.
  }
  return { app, auth, googleProvider };
}

// Get initialized instances (call initializeFirebase first)
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    initializeFirebase();
  }
  return googleProvider;
}

// ==================== AUTH HELPERS ====================
export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();
  return signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export function onAuthStateChanged(callback: (user: any) => void) {
  const auth = getFirebaseAuth();
  return auth.onAuthStateChanged(callback);
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  return auth.signOut();
}

// ==================== CUSTOM CLAIMS HELPERS ====================
export interface CustomClaims {
  role: string;
  clubIds: string[];
  activeClubId: string | null;
  permissions: string[];
}

export function parseCustomClaims(user: any): CustomClaims | null {
  if (!user?.stsTokenManager?.accessToken) return null;

  try {
    const token = user.stsTokenManager.accessToken;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      role: payload.role || 'athlete',
      clubIds: payload.clubIds || [],
      activeClubId: payload.activeClubId || null,
      permissions: payload.permissions || [],
    };
  } catch {
    return null;
  }
}

// Re-export for convenience
export { app as firebaseApp, auth as firebaseAuth, googleProvider as firebaseGoogleProvider };
