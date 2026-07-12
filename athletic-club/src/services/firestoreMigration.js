import {
  readBackgroundItems,
  readGalleryItems,
  readSocialLinks,
  writeBackgroundItems,
  writeGalleryItems,
  writeSocialLinks,
} from "./contentStorage";

export async function migrateLocalStorageContentToFirestore() {
  const [galleryItems, backgroundItems, socialLinks] = await Promise.all([
    readGalleryItems(),
    readBackgroundItems(),
    readSocialLinks(),
  ]);

  await Promise.all([
    writeGalleryItems(galleryItems),
    writeBackgroundItems(backgroundItems),
    writeSocialLinks(socialLinks),
  ]);

  return { galleryItems, backgroundItems, socialLinks };
}
