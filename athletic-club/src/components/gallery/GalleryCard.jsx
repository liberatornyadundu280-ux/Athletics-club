function GalleryCard({ image, onView }) {
  return (
    <article className="gallery-card" onClick={() => onView(image)}>
      <img alt={image.caption} src={image.image} loading="lazy" />
      <div className="gallery-card-content">
        <span>{image.category}</span>
        <p>{image.caption}</p>
      </div>
      <button className="gallery-view-button" type="button">
        View
      </button>
    </article>
  );
}

export default GalleryCard;
