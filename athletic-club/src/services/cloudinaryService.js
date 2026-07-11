const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const folder = import.meta.env.VITE_CLOUDINARY_FOLDER;

export async function uploadImageToCloudinary({ file, caption, category }) {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  if (folder) {
    formData.append('folder', folder);
  }

  formData.append('context', `caption=${caption}|category=${category}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message ?? 'Cloudinary upload failed.');
  }

  return {
    bytes: result.bytes,
    createdAt: result.created_at,
    image: result.secure_url,
    publicId: result.public_id,
  };
}
