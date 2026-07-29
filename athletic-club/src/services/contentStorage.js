import { galleryImages } from "../data/gallery";
import { leaders } from "../data/leaders";
import { socialLinks as defaultSocialLinks } from "../data/socialLinks";
import {
  deleteBackgroundItemFromFirestore,
  deleteGalleryItemFromFirestore,
  readBackgroundItemsFromFirestore,
  readGalleryItemsFromFirestore,
  setBackgroundItemsInFirestore,
  setGalleryItemsInFirestore,
} from "./galleryService";
import {
  readSettingsFromFirestore,
  writeSettingsToFirestore,
} from "./settingsService";

const galleryStorageKey = "athletics-gallery-items";
const backgroundStorageKey = "athletics-background-items";
const leaderStorageKey = "athletics-leader-items";
const socialLinksStorageKey = "athletics-social-links";

export const defaultHomeBackgrounds = [
  {
    id: "home-1",
    image: "/images/home/img.jpeg",
    caption: "Opening hero background",
    category: "Home Background",
  },
  {
    id: "home-2",
    image: "/images/home/img2.jpeg",
    caption: "Training hero background",
    category: "Home Background",
  },
  {
    id: "home-3",
    image: "/images/home/img3.jpeg",
    caption: "Team hero background",
    category: "Home Background",
  },
  {
    id: "home-4",
    image: "/images/home/img4.jpeg",
    caption: "Achievement hero background",
    category: "Home Background",
  },
  {
    id: "home-5",
    image: "/images/home/img5.jpeg",
    caption: "Competition hero background",
    category: "Home Background",
  },
];

function readItems(key, fallbackItems) {
  try {
    const storedItems = localStorage.getItem(key);
    return storedItems ? JSON.parse(storedItems) : fallbackItems;
  } catch {
    return fallbackItems;
  }
}

function writeItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function normalizeLeaders(items) {
  return items.map((leader) => ({
    ...leader,
    id: leader.id ?? leader.name.toLowerCase().replaceAll(" ", "-"),
  }));
}

function normalizeSocialLinks(items) {
  return items.map((link, index) => ({
    ...link,
    id: link.id ?? `${link.label || "social"}-${index}`,
  }));
}

export async function readGalleryItems() {
  const firestoreItems = await readGalleryItemsFromFirestore();
  if (firestoreItems.length > 0) {
    return firestoreItems;
  }

  return readItems(galleryStorageKey, galleryImages);
}

export async function writeGalleryItems(items) {
  if (items.length === 0) {
    try {
      await setGalleryItemsInFirestore([]);
    } catch (err) {
      console.error("Failed to write empty gallery array to Firestore:", err);
    }

    writeItems(galleryStorageKey, items);
    return;
  }

  try {
    await setGalleryItemsInFirestore(items);
  } catch (err) {
    console.error("Failed to write gallery items to Firestore:", err);
  }

  writeItems(galleryStorageKey, items);
}

export async function readBackgroundItems() {
  const firestoreItems = await readBackgroundItemsFromFirestore();
  if (firestoreItems.length > 0) {
    return firestoreItems;
  }

  return readItems(backgroundStorageKey, defaultHomeBackgrounds);
}

export async function writeBackgroundItems(items) {
  if (items.length === 0) {
    try {
      await setBackgroundItemsInFirestore([]);
    } catch (err) {
      console.error(
        "Failed to write empty background array to Firestore:",
        err,
      );
    }

    writeItems(backgroundStorageKey, items);
    return;
  }

  try {
    await setBackgroundItemsInFirestore(items);
  } catch (err) {
    console.error("Failed to write background items to Firestore:", err);
  }

  writeItems(backgroundStorageKey, items);
}

export function readLeaderItems() {
  return readItems(leaderStorageKey, normalizeLeaders(leaders));
}

export function writeLeaderItems(items) {
  writeItems(leaderStorageKey, items);
}

export async function readSocialLinks() {
  const settings = await readSettingsFromFirestore();
  const normalizedSettings = normalizeSocialLinks(
    settings.socialLinks ??
      readItems(socialLinksStorageKey, defaultSocialLinks),
  );

  return normalizedSettings;
}

export async function writeSocialLinks(items) {
  const normalizedItems = normalizeSocialLinks(items);
  const settingsPayload = {
    socialLinks: normalizedItems,
  };

  await writeSettingsToFirestore(settingsPayload);
  writeItems(socialLinksStorageKey, normalizedItems);
}

export async function deleteGalleryItem(id) {
  await deleteGalleryItemFromFirestore(id);
}

export async function deleteBackgroundItem(id) {
  await deleteBackgroundItemFromFirestore(id);
}
