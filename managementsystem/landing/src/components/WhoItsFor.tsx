import { motion } from "framer-motion";
import { User, Users, Crown, CalendarCheck, ClipboardList, Trophy, BarChart3, CreditCard, MessageSquare, Play, Check } from "lucide-react";
import { Reveal, Eyebrow } from "./ui";
import { cn } from "../utils/cn";

const PERSONAS = [
  {
    icon: Crown,
    label: "For club owners",
    headline: "Run the whole club from your pocket",
    desc: "See how every squad is doing without asking anyone. Spot the groups with falling attendance, keep an eye on coach workload, and handle memberships in a couple of taps.",
    points: [
      { icon: BarChart3, text: "See attendance and performance for every squad at a glance" },
      { icon: Users, text: "Invite coaches, set what they can access, remove them instantly" },
      { icon: CreditCard, text: "Manage memberships, squads and billing details in one place" },
    ],
    featured: true,
  },
  {
    icon: ClipboardList,
    label: "For coaches",
    headline: "Spend your time coaching, not planning",
    desc: "Build a session in a minute from a template, share it with the right squad, and let attendance and results fill themselves in while you're on the track.",
    points: [
      { icon: CalendarCheck, text: "Plan a whole week for a squad in one sitting" },
      { icon: Check, text: "Watch attendance fill in live — no roll calls, ever" },
      { icon: MessageSquare, text: "Leave notes on an athlete and see their full history" },
    ],
  },
  {
    icon: User,
    label: "For athletes",
    headline: "Know exactly what you're training today",
    desc: "Open the app at the track and your session is there — exercises, sets, targets and how you're progressing. It works even with no signal.",
    points: [
      { icon: Play, text: "Follow your session step by step, offline if you need to" },
      { icon: Trophy, text: "Watch your personal bests update automatically" },
      { icon: BarChart3, text: "See your own attendance and improvement over time" },
    ],
  },
];

export default function WhoItsFor() {
  return (
    <section id="who" className="relative mx-auto max-w-[1400px] scroll-mt-24 px-5 py-28 md:px-10 md:py-36">
      <div className="mb-16 text-center md:mb-20">
        <Reveal className="flex justify-center">
          <Eyebrow>Made for your whole club</Eyebrow>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mx-auto mt-5 max-w-4xl font-display text-5xl uppercase leading-[0.95] text-white md:text-7xl">
            One app, <span className="text-volt">three jobs</span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-mist md:text-base">
            Everyone in your club gets their own view of the same information — no more
            group chats, shared spreadsheets or missed updates.
          </p>
        </Reveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PERSONAS.map((p, i) => (
          <Reveal key={p.label} delay={i * 0.1}>
            <div
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-500 hover:-translate-y-1.5 md:p-8",
                p.featured
                  ? "border-volt/40 bg-gradient-to-b from-volt/[0.09] to-panel"
                  : "border-white/[0.07] bg-panel hover:border-volt/40"
              )}
            >
              {p.featured && (
                <span className="absolute right-6 top-6 rounded-full bg-volt px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink">
                  Most used
                </span>
              )}

              <span
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-xl border",
                  p.featured ? "border-volt/50 bg-volt text-ink" : "border-volt/25 bg-volt/[0.08] text-volt"
                )}
              >
                <p.icon size={20} />
              </span>

              <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-fog">{p.label}</div>
              <h3 className="mt-2 font-display text-2xl uppercase leading-tight tracking-wide text-white md:text-3xl">
                {p.headline}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">{p.desc}</p>

              <ul className="mt-7 space-y-3.5 border-t border-white/[0.07] pt-6">
                {p.points.map((pt) => (
                  <li key={pt.text} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-volt/10 text-volt">
                      <pt.icon size={13} />
                    </span>
                    <span className="pt-1 text-xs leading-relaxed text-white/80">{pt.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      {/* parents / supporters strip */}
      <Reveal delay={0.15} className="mt-4">
        <div className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-white/[0.07] bg-panel px-7 py-6 md:flex-row md:px-8">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-volt/10 text-volt">
              <MessageSquare size={18} />
            </span>
            <div>
              <div className="font-display text-lg uppercase tracking-wide text-white">
                Keep parents and supporters in the loop
              </div>
              <div className="text-xs text-mist">
                Share schedules and results with the people who care about them — without giving away the keys.
              </div>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="shrink-0 rounded-full border border-volt/30 bg-volt/[0.07] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-volt"
          >
            Included on every plan
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}
