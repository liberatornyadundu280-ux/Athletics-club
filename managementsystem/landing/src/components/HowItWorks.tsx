import { motion } from "framer-motion";
import { Reveal, Eyebrow, ButtonPrimary } from "./ui";

const STEPS = [
  {
    n: "01",
    title: "Create your club",
    desc: "Sign up, name your club and invite your coaches. Most people are done before their coffee cools.",
    bullets: ["Takes about 2 minutes", "Add as many clubs as you run"],
  },
  {
    n: "02",
    title: "Add your athletes",
    desc: "Upload a spreadsheet or add people one by one. Every athlete gets a link to join from their phone.",
    bullets: ["Bulk import from CSV", "Athletes join themselves — no admin work"],
  },
  {
    n: "03",
    title: "Build your first session",
    desc: "Start from a ready-made template or build from scratch, then drop it onto the calendar for the right squad.",
    bullets: ["Reusable session templates", "Assign to squads, groups or individuals"],
  },
  {
    n: "04",
    title: "Run it and watch it improve",
    desc: "Athletes check in from the track. Attendance, load and personal bests appear on your dashboard automatically.",
    bullets: ["Live attendance, zero roll calls", "Suggestions to improve next week"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-24 overflow-hidden border-y border-white/[0.06] bg-coal py-28 md:py-36">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-volt/[0.04] blur-[140px]" />

      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="mb-16 text-center md:mb-20">
          <Reveal className="flex justify-center">
            <Eyebrow>How it works</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mx-auto mt-5 max-w-3xl font-display text-5xl uppercase leading-[0.95] text-white md:text-7xl">
              Up and running <span className="text-volt">today</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-mist md:text-base">
              No training days, no migration headaches. Four steps and your club is live —
              with your whole season in front of you.
            </p>
          </Reveal>
        </div>

        <div className="relative">
          {/* connecting line */}
          <div className="pointer-events-none absolute left-[27px] top-4 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-volt/50 via-volt/20 to-transparent md:block lg:left-1/2" />

          <div className="space-y-4 lg:space-y-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div
                  className={`group relative flex flex-col gap-5 rounded-2xl border border-white/[0.07] bg-panel p-6 transition-all duration-500 hover:border-volt/40 md:flex-row md:items-center md:gap-8 md:p-8 ${
                    i % 2 === 1 ? "lg:ml-[8%]" : "lg:mr-[8%]"
                  }`}
                >
                  {/* number node */}
                  <div className="relative shrink-0">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-volt/30 bg-ink font-display text-xl text-volt transition-all duration-500 group-hover:bg-volt group-hover:text-ink md:h-16 md:w-16 md:text-2xl">
                      {s.n}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-2xl uppercase tracking-wide text-white md:text-3xl">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">{s.desc}</p>
                  </div>

                  <ul className="flex shrink-0 flex-col gap-2 md:w-64">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-xs text-white/80">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.15} className="mt-14 flex flex-col items-center gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-full border border-volt/25 bg-volt/[0.07] px-6 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-volt"
          >
            Average setup time · 9 minutes
          </motion.div>
          <ButtonPrimary href="#cta">Set up your club free</ButtonPrimary>
        </Reveal>
      </div>
    </section>
  );
}
