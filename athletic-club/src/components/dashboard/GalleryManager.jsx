import { useMemo, useState } from 'react';
import { galleryCategories } from '../../data/gallery';

function GalleryManager({ galleryItems, onDelete, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');

  const filteredItems = useMemo(() => {
    return galleryItems.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesSearch = item.caption.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, galleryItems, searchTerm]);

  return (
    <section className="dashboard-section">
      <div className="dashboard-tools">
        <input
          aria-label="Search images"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search captions"
          type="search"
          value={searchTerm}
        />
        <select aria-label="Filter category" onChange={(event) => setCategory(event.target.value)} value={category}>
          {galleryCategories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="dashboard-card-grid">
        {filteredItems.map((item) => (
          <article className="dashboard-image-card" key={item.id}>
            <img alt={item.caption} src={item.image} />
            <label>
              Caption
              <textarea
                onChange={(event) => onUpdate(item.id, { caption: event.target.value })}
                value={item.caption}
              />
            </label>
            <label>
              Category
              <select onChange={(event) => onUpdate(item.id, { category: event.target.value })} value={item.category}>
                {galleryCategories.filter((entry) => entry !== 'All').map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </label>
            <button
              className="button button-danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this image?')) {
                  onDelete(item.id);
                }
              }}
              type="button"
            >
              Delete
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GalleryManager;
