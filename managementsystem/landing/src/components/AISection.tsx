import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Sparkles,
  TrendingDown,
  Clock,
  BrainCircuit,
  ChevronRight,
  Activity,
  CalendarClock,
  HeartPulse,
} from "lucide-react";
import { Reveal, Eyebrow, ButtonGhost } from "./ui";

const PHRASES = [
  "Analyzing 14-day load trend for 248 athletes…",
  "Cross-checking attendance patterns across 3 clubs…",
  "3 athletes flagged for recovery intervention…",
  "Recomputing Thursday intensity — freshness index +12%…",
  "Generating plan v3 · confidence 96%…",
];

function Typewriter() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [text, setText] = useState("");

  useEffect(() => {
    if (!inView) return;
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer = 0;

    const tick = () => {
      const current = PHRASES[phrase];
      if (!deleting) {
        char++;
        setText(current.slice(0, char));
        if (char === current.length) {
          deleting = true;
          timer = window.setTimeout(tick, 2000);
          return;
        }
        timer = window.setTimeout(tick, 30);
      } else {
        char--;
        setText(current.slice(0, char));
        if (char === 0) {
          deleting = false;
          phrase = (phrase + 1) % PHRASES.length;
          timer = window.setTimeout(tick, 400);
          return;
        }
        timer = window.setTimeout(tick, 12);
      }
    };
    timer = window.setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [inView]);

  return (
    <span ref={ref} className="font-mono text-xs text-volt md:text-sm">
      {text}
      <span className="animate-blink text-volt">▍</span>
    </span>
  );
}

const RECOMMENDATIONS = [
  {
    icon: CalendarClock,
    title: "Move Thursday's session to the evening",
    desc: "Your squad turns up more in the evening slot and runs consistently better times there.",
    conf: 96,
    chip: "Scheduling",
  },
  {
    icon: HeartPulse,
    title: "Give Jonas an easier week",
    desc: "He has trained hard for nine days straight. A lighter week now stops a setback later.",
    conf: 91,
    chip: "Wellbeing",
  },
  {
    icon: Clock,
    title: "Friday evenings are quietly slipping",
    desc: "Turnout has dropped six weeks in a row — the morning slot may suit this group better.",
    conf: 88,
    chip: "Attendance",
  },
];

const BULLETS = [
  { icon: Activity, text: "Spots when someone is doing too much — before it becomes an injury" },
  { icon: TrendingDown, text: "Suggests small changes that make the week run better" },
  { icon: BrainCircuit, text: "Learns how each of your athletes responds over time" },
];

export default function AISection() {
  return (
    <section id="ai" className="relative mx-auto max-w-[1400px] scroll-mt-24 px-5 py-28 md:px-10 md:py-36">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* copy */}
        <div>
          <Reveal>
            <Eyebrow>Smart Coach</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-white md:text-7xl">
              An assistant
              <br />
              coach who <span className="text-volt">never sleeps</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-mist md:text-base">
              Smart Coach watches attendance, training and progress across your clubs and
              quietly suggests what to change next week. You get a short list — you decide
              what to use.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <ul className="mt-8 space-y-4">
              {BULLETS.map((b) => (
                <li key={b.text} className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-volt/25 bg-volt/[0.07] text-volt">
                    <b.icon size={15} />
                  </span>
                  <span className="pt-1.5 text-sm text-white/85">{b.text}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.4} className="mt-10">
            <ButtonGhost href="#architecture">See how it's built</ButtonGhost>
          </Reveal>
        </div>

        {/* panel */}
        <Reveal delay={0.15} y={48}>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-panel">
            {/* scanline */}
            <div className="pointer-events-none absolute left-0 h-16 w-full animate-scanline bg-gradient-to-b from-transparent via-volt/[0.06] to-transparent" />

            {/* header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-volt text-ink">
                  <Sparkles size={16} />
                </span>
                <div>
                  <div className="font-mono text-xs font-bold text-white">stms-copilot</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-fog">Neural engine v3.2</div>
                </div>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-volt/25 bg-volt/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-volt">
                <span className="h-1.5 w-1.5 rounded-full bg-volt animate-pulse-dot" /> Thinking
              </span>
            </div>

            {/* terminal strip */}
            <div className="border-b border-white/[0.06] bg-ink/70 px-5 py-4">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-fog">
                Reviewing your clubs
              </div>
              <Typewriter />
            </div>

            {/* recommendation cards */}
            <div className="space-y-3 p-5">
              {RECOMMENDATIONS.map((r, i) => (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, x: 32 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors duration-300 hover:border-volt/40"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-volt/25 bg-volt/[0.07] text-volt">
                      <r.icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{r.title}</span>
                        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-fog">
                          {r.chip}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-mist">{r.desc}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${r.conf}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + i * 0.2, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-volt"
                          />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-volt">{r.conf}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              <button className="group flex w-full items-center justify-center gap-2 rounded-xl border border-volt/30 bg-volt/[0.06] py-3 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-volt transition-all hover:bg-volt hover:text-ink">
                Apply plan v3
                <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
