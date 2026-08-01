import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

function requireAuth() {
  if (!auth) {
    throw new Error("Firebase authentication is not configured.");
  }

  return auth;
}

export function subscribeToAuthChanges(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(
    requireAuth(),
    email,
    password,
  );

  return result.user;
}

export async function createAccountWithEmail({ email, password, displayName }) {
  const result = await createUserWithEmailAndPassword(
    requireAuth(),
    email,
    password,
  );

  if (displayName) {
    await updateProfile(result.user, { displayName });
  }

  return result.user;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(requireAuth(), googleProvider);

  return result.user;
}

export function createPhoneRecaptcha(containerId, options = {}) {
  const firebaseAuth = requireAuth();

  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }

  window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: "invisible",
    ...options,
  });

  return window.recaptchaVerifier;
}

export async function sendPhoneVerificationCode(phoneNumber, recaptchaVerifier) {
  return signInWithPhoneNumber(requireAuth(), phoneNumber, recaptchaVerifier);
}

export async function confirmPhoneVerificationCode(
  confirmationResult,
  verificationCode,
) {
  const result = await confirmationResult.confirm(verificationCode);

  return result.user;
}

export function resetPassword(email) {
  return sendPasswordResetEmail(requireAuth(), email);
}

export function logout() {
  return signOut(requireAuth());
}
