import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { readGalleryItems } from "../services/contentStorage";

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function BackgroundScatter({ count = 24, intervalMs = 6000 }) {
  const location = useLocation();
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    let mounted = true;
    let tick = null;

    async function setup() {
      const gallery = await readGalleryItems();
      if (!mounted || !gallery || gallery.length === 0) return;

      // create tile positions and assign different images per tile
      const generated = Array.from({ length: count }).map((_, i) => {
        const size = `${Math.round(randomBetween(80, 220))}px`;
        const left = `${randomBetween(2, 88)}%`;
        const top = `${randomBetween(2, 88)}%`;
        const rotate = `${randomBetween(-25, 25)}deg`;
        const opacity = randomBetween(0.18, 0.38).toFixed(2);
        const img =
          gallery[Math.floor(Math.random() * gallery.length)]?.image ||
          gallery[0]?.image;

        return {
          key: `tile-${i}-${Date.now()}`,
          image: img,
          style: {
            width: size,
            height: size,
            left,
            top,
            transform: `rotate(${rotate})`,
            opacity,
          },
        };
      });

      setTiles(generated);

      // change images periodically per tile
      tick = setInterval(() => {
        setTiles((prev) =>
          prev.map((tile) => ({
            ...tile,
            image: gallery[Math.floor(Math.random() * gallery.length)]?.image,
          })),
        );
      }, intervalMs);
    }

    setup();

    return () => {
      mounted = false;
      if (tick) clearInterval(tick);
    };
  }, [count, intervalMs]);

  // Only render on the Home landing page
  if (location.pathname !== "/") return null;

  if (tiles.length === 0) return null;

  return (
    <div className="site-scatter-container home-scatter" aria-hidden>
      {tiles.map((t) => (
        <div
          key={t.key}
          className="scatter-item"
          style={{
            ...t.style,
            backgroundImage: `url(${t.image})`,
          }}
        />
      ))}
    </div>
  );
}
