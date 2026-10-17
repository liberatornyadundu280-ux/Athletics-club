import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion, useInView, animate } from "framer-motion";
import { cn } from "../utils/cn";

/* ---------- Scroll reveal wrapper ---------- */
export function Reveal({
  children,
  delay = 0,
  y = 32,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Mono eyebrow tag ---------- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 font-mono text-[11px] tracking-[0.35em] uppercase text-volt", className)}>
      <span className="h-1.5 w-1.5 bg-volt animate-pulse-dot" />
      {children}
    </div>
  );
}

/* ---------- Animated counter ---------- */
export function Counter({
  to,
  decimals = 0,
  duration = 2,
  className,
}: {
  to: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = v.toFixed(decimals);
      },
    });
    return () => controls.stop();
  }, [inView, to, decimals, duration]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

/* ---------- Magnetic hover wrapper ---------- */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: (e.clientX - (rect.left + rect.width / 2)) * strength,
      y: (e.clientY - (rect.top + rect.height / 2)) * strength,
    });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 180, damping: 14, mass: 0.4 }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Primary / ghost buttons ---------- */
function isExternalUrl(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function ButtonPrimary({
  children,
  href = "#cta",
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  const external = isExternalUrl(href);
  return (
    <Magnetic>
      <a
        href={href}
        onClick={(e) => {
          if (!external) {
            e.preventDefault();
            import("../lib/scroll").then((m) => m.scrollToId(href));
          }
        }}
        className={cn(
          "group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-volt px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink transition-transform duration-300 hover:scale-[1.03] active:scale-95",
          className
        )}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        <span className="absolute inset-0 -translate-x-full bg-white transition-transform duration-500 ease-out group-hover:translate-x-0" />
        <span className="relative z-10 flex items-center gap-3">
          {children}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
            <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </a>
    </Magnetic>
  );
}

export function ButtonGhost({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  const external = isExternalUrl(href);
  return (
    <Magnetic strength={0.25}>
      <a
        href={href}
        onClick={(e) => {
          if (!external) {
            e.preventDefault();
            import("../lib/scroll").then((m) => m.scrollToId(href));
          }
        }}
        className={cn(
          "inline-flex items-center gap-3 rounded-full border border-line bg-white/[0.03] px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/80 backdrop-blur transition-all duration-300 hover:border-volt/60 hover:text-volt",
          className
        )}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    </Magnetic>
  );
}
