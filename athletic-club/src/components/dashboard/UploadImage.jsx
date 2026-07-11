import { useEffect, useState } from 'react';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';

const uploadCategories = ['Track', 'Field', 'Workouts', 'Achievements', 'Home Background'];

function UploadImage({ onUpload }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState(uploadCategories[0]);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return undefined;
  }, [file]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file || !caption.trim()) {
      setMessage('Please select an image and add a caption before uploading.');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading image to Cloudinary...');

    try {
      const uploadedImage = await uploadImageToCloudinary({ file, caption, category });

      onUpload({
        id: uploadedImage.publicId,
        image: uploadedImage.image,
        caption,
        category,
        publicId: uploadedImage.publicId,
        uploadDate: uploadedImage.createdAt,
        bytes: uploadedImage.bytes,
      });

      setMessage('Image uploaded to Cloudinary and added to the website content.');
      setFile(null);
      setCaption('');
      setCategory(uploadCategories[0]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="dashboard-section upload-panel">
      <form className="upload-form" onSubmit={handleSubmit}>
        <label>
          Image File
          <input accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
        </label>

        <label>
          Caption
          <textarea onChange={(event) => setCaption(event.target.value)} value={caption} />
        </label>

        <label>
          Category
          <select onChange={(event) => setCategory(event.target.value)} value={category}>
            {uploadCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <button className="button button-primary" disabled={isUploading} type="submit">
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>

        {message ? <p className="dashboard-message">{message}</p> : null}
      </form>

      <aside className="upload-preview">
        <h2>Image Preview</h2>
        {previewUrl ? <img alt="Selected upload preview" src={previewUrl} /> : <div className="preview-placeholder">No image selected</div>}
        <dl>
          <div>
            <dt>File Name</dt>
            <dd>{file?.name ?? 'None'}</dd>
          </div>
          <div>
            <dt>File Size</dt>
            <dd>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'None'}</dd>
          </div>
          <div>
            <dt>Selected Category</dt>
            <dd>{category}</dd>
          </div>
          <div>
            <dt>Caption Preview</dt>
            <dd>{caption || 'No caption yet'}</dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}

export default UploadImage;
