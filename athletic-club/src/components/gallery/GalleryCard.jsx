function GalleryCard({ image }) {
  return (
    <article className="gallery-card">
      <img alt={image.caption} src={image.image} loading="lazy" />
      <div className="gallery-card-content">
        <span>{image.category}</span>
        <p>{image.caption}</p>
      </div>
    </article>
  );
}

export default GalleryCard;
