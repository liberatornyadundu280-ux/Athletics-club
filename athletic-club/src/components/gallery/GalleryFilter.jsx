import { galleryCategories } from '../../data/gallery';

function GalleryFilter({ activeCategory, onChange }) {
  return (
    <div className="gallery-filters" aria-label="Gallery filters">
      {galleryCategories.map((category) => (
        <button
          className={activeCategory === category ? 'filter-chip filter-chip-active' : 'filter-chip'}
          key={category}
          onClick={() => onChange(category)}
          type="button"
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export default GalleryFilter;
