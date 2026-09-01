import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const announcementsCollection = "announcements";

function requireDatabase() {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }
}

export async function readAnnouncements() {
  if (!isFirebaseConfigured || !db) return [];

  const snapshot = await getDocs(
    query(collection(db, announcementsCollection), orderBy("publishedAt", "desc")),
  );

  return snapshot.docs.map((announcement) => ({
    id: announcement.id,
    ...announcement.data(),
  }));
}

export async function publishAnnouncement(announcement) {
  requireDatabase();
  const result = await addDoc(collection(db, announcementsCollection), {
    body: announcement.body.trim(),
    eventDate: announcement.eventDate || "",
    image: announcement.image || "",
    imagePublicId: announcement.imagePublicId || "",
    publishedAt: new Date().toISOString(),
    title: announcement.title.trim(),
  });

  return { id: result.id, ...announcement };
}

export async function removeAnnouncement(id) {
  requireDatabase();
  await deleteDoc(doc(db, announcementsCollection, id));
}
