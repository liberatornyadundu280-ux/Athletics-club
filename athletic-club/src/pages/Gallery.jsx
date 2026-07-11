import { useEffect, useMemo, useState } from 'react';
import Button from '../components/common/Button';
import SocialLinks from '../components/common/SocialLinks';
import GalleryFilter from '../components/gallery/GalleryFilter';
import GalleryGrid from '../components/gallery/GalleryGrid';
import { readGalleryItems } from '../services/contentStorage';

function Gallery() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [galleryItems, setGalleryItems] = useState(readGalleryItems);

  useEffect(() => {
    const refreshGalleryItems = () => setGalleryItems(readGalleryItems());

    window.addEventListener('storage', refreshGalleryItems);
    window.addEventListener('focus', refreshGalleryItems);

    return () => {
      window.removeEventListener('storage', refreshGalleryItems);
      window.removeEventListener('focus', refreshGalleryItems);
    };
  }, []);

  const visibleImages = useMemo(() => {
    if (activeCategory === 'All') {
      return galleryItems;
    }

    return galleryItems.filter((image) => image.category === activeCategory);
  }, [activeCategory, galleryItems]);

  return (
    <section className="gallery-page">
      <div className="gallery-hero">
        <div>
          <p className="eyebrow">Activities</p>
          <h1>Training moments, team energy, and competition stories.</h1>
        </div>
        <p>
          Follow the club from daily training sessions to event preparation and achievements. Use
          the filters to explore track, field, workouts, and milestone moments.
        </p>
      </div>

      <GalleryFilter activeCategory={activeCategory} onChange={setActiveCategory} />
      <GalleryGrid activeCategory={activeCategory} images={visibleImages} />

      <aside className="gallery-social-panel">
        <div>
          <p className="eyebrow">See more</p>
          <h2>Follow the full athletics story on social media.</h2>
          <p>More training clips, competition updates, and team highlights live on our platforms.</p>
        </div>
        <SocialLinks />
        <Button to="/contact" variant="secondary">
          Contact the Club
        </Button>
      </aside>
    </section>
  );
}

export default Gallery;
