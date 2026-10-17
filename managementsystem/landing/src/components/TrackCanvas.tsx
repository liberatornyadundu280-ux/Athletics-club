import { useEffect, useRef } from "react";

/**
 * Perspective "running track" canvas: converging lanes, flowing
 * horizontal lines and drifting light particles in volt green.
 */
export default function TrackCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let t = Math.random() * 100;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; vx: number; vy: number; s: number; a: number };
    const particles: P[] = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0006,
      vy: -0.0002 - Math.random() * 0.0005,
      s: 1 + Math.random() * 2.2,
      a: 0.15 + Math.random() * 0.4,
    }));

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      const horizon = h * 0.34;
      const vpX = w * 0.5;

      // horizon glow
      const glow = ctx.createRadialGradient(vpX, horizon, 0, vpX, horizon, Math.max(w, h) * 0.75);
      glow.addColorStop(0, "rgba(215,255,63,0.13)");
      glow.addColorStop(0.35, "rgba(215,255,63,0.04)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // converging vertical lane lines
      for (let i = -16; i <= 16; i++) {
        const xTop = vpX + i * (w / 46);
        const xBottom = vpX + i * (w / 9.2);
        const alpha = 0.035 + Math.min(0.05, Math.abs(i) * 0.0035);
        ctx.strokeStyle = `rgba(215,255,63,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xTop, horizon);
        ctx.lineTo(xBottom, h);
        ctx.stroke();
      }

      // flowing horizontal lane lines (perspective spacing)
      const lanes = 18;
      for (let i = 0; i < lanes; i++) {
        const p = ((i / lanes + (t * 0.045) % (1 / lanes)) % 1 + 1) % 1;
        const y = horizon + Math.pow(p, 2.7) * (h - horizon);
        const alpha = 0.02 + p * 0.15;
        ctx.strokeStyle = `rgba(215,255,63,${alpha})`;
        ctx.lineWidth = 1 + p * 0.8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        // comet dash on every 4th lane
        if (i % 4 === 0) {
          const dashX = ((t * (0.06 + p * 0.5) + i * 0.19) % 1.3 - 0.15) * w;
          const len = w * (0.03 + p * 0.08);
          const grad = ctx.createLinearGradient(dashX - len, 0, dashX, 0);
          grad.addColorStop(0, "rgba(215,255,63,0)");
          grad.addColorStop(1, `rgba(215,255,63,${0.12 + p * 0.5})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4 + p * 1.4;
          ctx.beginPath();
          ctx.moveTo(dashX - len, y);
          ctx.lineTo(dashX, y);
          ctx.stroke();
        }
      }

      // horizon line
      ctx.strokeStyle = "rgba(215,255,63,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      // particles
      for (const pt of particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.y < -0.05) pt.y = 1.05;
        if (pt.x < -0.05) pt.x = 1.05;
        if (pt.x > 1.05) pt.x = -0.05;
        const tw = 0.6 + 0.4 * Math.sin(t * 2 + pt.x * 20);
        ctx.fillStyle = `rgba(215,255,63,${pt.a * tw})`;
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, pt.s, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} style={{ width: "100%", height: "100%", display: "block" }} />;
}
