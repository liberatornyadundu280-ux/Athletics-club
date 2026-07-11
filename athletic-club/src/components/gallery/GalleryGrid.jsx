import GalleryCard from './GalleryCard';

function GalleryGrid({ images }) {
  return (
    <div className="gallery-grid">
      {images.map((image) => (
        <GalleryCard image={image} key={image.id} />
      ))}
    </div>
  );
}

export default GalleryGrid;
