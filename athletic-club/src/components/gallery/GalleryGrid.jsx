import { useEffect, useRef, useState } from 'react';
import GalleryCard from './GalleryCard';

function GalleryGrid({ activeCategory, images }) {
  const scrollContainerRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory]);

  return (
    <div className="gallery-display">
      <div
        aria-label="Scrollable activities gallery"
        className="gallery-scroll"
        ref={scrollContainerRef}
        tabIndex="0"
      >
        <div className="gallery-grid">
          {images.map((image) => (
            <GalleryCard image={image} key={image.id} onView={setSelectedImage} />
          ))}
        </div>
      </div>
      <div className="gallery-scroll-hint" aria-hidden="true">
        <span>Scroll to explore more</span>
      </div>

      {selectedImage ? (
        <div className="image-lightbox" role="presentation" onMouseDown={() => setSelectedImage(null)}>
          <section
            aria-label={selectedImage.caption}
            aria-modal="true"
            className="image-lightbox-content"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Close image preview"
              className="image-lightbox-close"
              onClick={() => setSelectedImage(null)}
              type="button"
            >
              ×
            </button>
            <img alt={selectedImage.caption} src={selectedImage.image} />
            <p>{selectedImage.caption}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default GalleryGrid;
