import { motion } from "framer-motion";
import TrackCanvas from "./TrackCanvas";
import { ButtonPrimary, ButtonGhost, Counter } from "./ui";
import { scrollToId } from "../../lib/scroll";

const line1 = ["THE OPERATING"];
const line2 = ["SYSTEM FOR"];
const line3 = ["ATHLETICS", "CLUBS"];

function HeadlineLine({ parts, delay, outlineIndex }: { parts: string[]; delay: number; outlineIndex?: number }) {
  return (
    <div className="overflow-hidden">
      <motion.div
        initial={{ y: "112%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-baseline gap-x-[0.35em]"
      >
        {parts.map((p, i) => (
          <span
            key={p}
            className={
              i === outlineIndex
                ? "text-outline"
                : i === parts.length - 1 && parts.length > 1 && outlineIndex === undefined
                ? "text-volt"
                : "text-white"
            }
          >
            {p}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

const STATS: { value: number; decimals?: number; suffix: string; label: string }[] = [
  { value: 128, suffix: "", label: "Clubs onboarded" },
  { value: 18, suffix: "K", label: "Athletes tracked" },
  { value: 42, suffix: "K", label: "Sessions logged" },
  { value: 99.98, decimals: 2, suffix: "%", label: "Platform uptime" },
];

export default function Hero() {
  return (
    <section id="top" className="relative flex min-h-screen flex-col overflow-hidden">
      {/* background layers */}
      <div className="absolute inset-0">
        <img
          src="/images/hero-track.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.16]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink" />
        <TrackCanvas className="absolute inset-0" />
        <div className="hero-fade-bottom absolute inset-0" />
      </div>

      {/* side vertical label */}
      <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 rotate-90 xl:block">
        <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-fog">
          Multi-club · Offline-first · AI-powered
        </span>
      </div>

      {/* content */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-5 pb-16 pt-40 md:px-10 md:pt-44">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mb-8 flex flex-wrap items-center gap-3"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/[0.06] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-volt">
            <span className="h-1.5 w-1.5 rounded-full bg-volt animate-pulse-dot" />
            Smart Trainer Management System
          </span>
          <span className="hidden rounded-full border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-fog sm:inline-block">
            Monorepo · PWA · Real-time
          </span>
        </motion.div>

        <h1 className="font-display uppercase leading-[0.94] tracking-[0.01em]">
          <span className="block text-[clamp(3.2rem,10.5vw,9.5rem)]">
            <HeadlineLine parts={line1} delay={0.25} />
          </span>
          <span className="block text-[clamp(3.2rem,10.5vw,9.5rem)]">
            <HeadlineLine parts={line2} delay={0.38} />
          </span>
          <span className="block text-[clamp(3.2rem,10.5vw,9.5rem)]">
            <HeadlineLine parts={line3} delay={0.51} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75 }}
          className="mt-8 max-w-xl text-base leading-relaxed text-mist md:text-lg"
        >
          Take attendance automatically, build sessions in minutes, and see exactly how
          every athlete and every club is doing — from one app that works even when the
          signal doesn't.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <ButtonPrimary href="/register">Start free trial</ButtonPrimary>
          <ButtonGhost href="/login">Explore the platform</ButtonGhost>
        </motion.div>
      </div>

      {/* stats strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.1 }}
        className="relative z-10 border-t border-white/[0.07] bg-ink/40 backdrop-blur-sm"
      >
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-white/[0.07] px-5 md:grid-cols-4 md:px-10">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 py-6 pl-5 first:pl-0 md:py-8 md:pl-10 md:first:pl-0">
              <div className="font-display text-3xl text-white md:text-5xl">
                <Counter to={s.value} decimals={s.decimals ?? 0} />
                <span className="text-volt">{s.suffix}</span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-fog md:text-[10px]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* scroll cue */}
      <motion.button
        onClick={() => scrollToId("#features")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-32 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
        aria-label="Scroll down"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-fog">Scroll</span>
        <div className="h-12 w-px overflow-hidden bg-white/10">
          <motion.div
            animate={{ y: [-48, 48] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-6 w-px bg-volt"
          />
        </div>
      </motion.button>
    </section>
  );
}