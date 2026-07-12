import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const settingsDocRef = "siteSettings";

export async function readSettingsFromFirestore() {
  if (!isFirebaseConfigured || !db) {
    return {};
  }

  const snapshot = await getDoc(doc(db, "settings", settingsDocRef));
  return snapshot.exists() ? snapshot.data() : {};
}

export async function writeSettingsToFirestore(settings) {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  await setDoc(doc(db, "settings", settingsDocRef), settings, { merge: true });
}
