import { useEffect, useState } from "react";
import { readBackgroundItems } from "../../services/contentStorage";

function BackgroundSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [homeBackgrounds, setHomeBackgrounds] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function refreshBackgrounds() {
      const items = await readBackgroundItems();
      if (!ignore) {
        setHomeBackgrounds(items.map((item) => item.image));
      }
    }

    refreshBackgrounds();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (homeBackgrounds.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex(
        (currentIndex) => (currentIndex + 1) % homeBackgrounds.length,
      );
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
          className={
            index === activeIndex
              ? "background-slide background-slide-active"
              : "background-slide"
          }
          key={image}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}
    </div>
  );
}

export default BackgroundSlider;
