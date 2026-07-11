import { useEffect, useState } from 'react';
import { readBackgroundItems } from '../../services/contentStorage';

function BackgroundSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [homeBackgrounds, setHomeBackgrounds] = useState(() => readBackgroundItems().map((item) => item.image));

  useEffect(() => {
    const refreshBackgrounds = () => {
      setHomeBackgrounds(readBackgroundItems().map((item) => item.image));
    };

    window.addEventListener('storage', refreshBackgrounds);
    window.addEventListener('focus', refreshBackgrounds);

    return () => {
      window.removeEventListener('storage', refreshBackgrounds);
      window.removeEventListener('focus', refreshBackgrounds);
    };
  }, []);

  useEffect(() => {
    if (homeBackgrounds.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % homeBackgrounds.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [homeBackgrounds.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [homeBackgrounds.length]);

  return (
    <div className="background-slider" aria-hidden="true">
      {homeBackgrounds.map((image, index) => (
        <div
          className={index === activeIndex ? 'background-slide background-slide-active' : 'background-slide'}
          key={image}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}
    </div>
  );
}

export default BackgroundSlider;
