import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const galleryCollection = "gallery";
const backgroundsCollection = "backgrounds";

function sanitizeDocId(id) {
  return id?.toString().replace(/\//g, "-") ?? "";
}

function normalizeItem(item, fallbackId) {
  return {
    ...item,
    id: sanitizeDocId(item.id ?? fallbackId),
  };
}

export async function readGalleryItemsFromFirestore() {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  const q = query(
    collection(db, galleryCollection),
    orderBy("createdAt", "asc"),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) =>
    normalizeItem(document.data(), document.id),
  );
}

export async function setGalleryItemsInFirestore(items) {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  const normalizedItems = items.map((item, index) => ({
    ...item,
    id: sanitizeDocId(item.id ?? `${galleryCollection}-${index}`),
    createdAt: item.createdAt ?? new Date().toISOString(),
  }));

  const existingSnapshot = await getDocs(collection(db, galleryCollection));

  await Promise.all(
    existingSnapshot.docs.map((document) => deleteDoc(document.ref)),
  );
  await Promise.all(
    normalizedItems.map((item) =>
      setDoc(doc(db, galleryCollection, item.id), item),
    ),
  );

  return normalizedItems;
}

export async function updateGalleryItemInFirestore(id, updates) {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  const documentRef = doc(db, galleryCollection, id);
  await updateDoc(documentRef, updates);
}

export async function deleteGalleryItemFromFirestore(id) {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  const documentRef = doc(db, galleryCollection, id);
  await deleteDoc(documentRef);
}

export async function readBackgroundItemsFromFirestore() {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  const q = query(
    collection(db, backgroundsCollection),
    orderBy("createdAt", "asc"),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((document) =>
    normalizeItem(document.data(), document.id),
  );
}

export async function setBackgroundItemsInFirestore(items) {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  const normalizedItems = items.map((item, index) => ({
    ...item,
    id: sanitizeDocId(item.id ?? `${backgroundsCollection}-${index}`),
    createdAt: item.createdAt ?? new Date().toISOString(),
  }));

  const existingSnapshot = await getDocs(collection(db, backgroundsCollection));

  await Promise.all(
    existingSnapshot.docs.map((document) => deleteDoc(document.ref)),
  );
  await Promise.all(
    normalizedItems.map((item) =>
      setDoc(doc(db, backgroundsCollection, item.id), item),
    ),
  );

  return normalizedItems;
}

export async function deleteBackgroundItemFromFirestore(id) {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  const documentRef = doc(db, backgroundsCollection, id);
  await deleteDoc(documentRef);
}
