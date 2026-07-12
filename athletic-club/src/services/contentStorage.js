import { galleryImages } from "../data/gallery";
import { leaders } from "../data/leaders";
import { socialLinks as defaultSocialLinks } from "../data/socialLinks";

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

export function readGalleryItems() {
  return readItems(galleryStorageKey, galleryImages);
}

export function writeGalleryItems(items) {
  writeItems(galleryStorageKey, items);
}

export function readBackgroundItems() {
  return readItems(backgroundStorageKey, defaultHomeBackgrounds);
}

export function writeBackgroundItems(items) {
  writeItems(backgroundStorageKey, items);
}

export function readLeaderItems() {
  return readItems(leaderStorageKey, normalizeLeaders(leaders));
}

export function writeLeaderItems(items) {
  writeItems(leaderStorageKey, items);
}

export function readSocialLinks() {
  return normalizeSocialLinks(
    readItems(socialLinksStorageKey, defaultSocialLinks),
  );
}

export function writeSocialLinks(items) {
  writeItems(socialLinksStorageKey, normalizeSocialLinks(items));
}
