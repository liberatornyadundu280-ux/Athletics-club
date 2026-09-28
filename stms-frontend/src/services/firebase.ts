import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

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
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
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