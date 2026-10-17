import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Radio,
  Sparkles,
  Building2,
  WifiOff,
  Lock,
  LineChart,
  CheckCircle2,
  Users,
  TrendingUp,
} from "lucide-react";
import { Reveal, Eyebrow, Counter } from "./ui";
import { cn } from "../utils/cn";

function Card({
  icon,
  title,
  desc,
  children,
  className,
  delay = 0,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="card-glow group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-panel p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-volt/40 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-volt/[0.05] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="mb-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-volt/25 bg-volt/[0.08] text-volt transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-110">
            {icon}
          </span>
        </div>
        <h3 className="font-display text-2xl uppercase tracking-wide text-white">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-mist">{desc}</p>
        {children && <div className="mt-auto pt-6">{children}</div>}
      </div>
    </Reveal>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-[1400px] scroll-mt-24 px-5 py-28 md:px-10 md:py-36">
      <div className="mb-16 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
        <div>
          <Reveal>
            <Eyebrow>What STMS does for you</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-white md:text-7xl">
              Less admin.
              <br />
              More <span className="text-outline">athletics.</span>
            </h2>
          </Reveal>
        </div>
        <Reveal delay={0.2} className="max-w-sm">
          <p className="text-sm leading-relaxed text-mist md:text-base">
            Everything a busy club needs in one place — so your evenings go to coaching,
            not to spreadsheets.
          </p>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        {/* Attendance — hero card */}
        <Card
          icon={<Radio size={20} />}
          title="Attendance that takes itself"
          desc="Athletes check in from their phone as they arrive. You watch your squad fill up live, and the attendance record builds itself — no clipboards, no roll calls, no chasing anyone afterwards."
          className="lg:col-span-7"
        >
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-ink/60 p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-volt" />
              </span>
              <div>
                <div className="font-display text-2xl text-white">
                  <Counter to={94} />
                  <span className="text-volt">%</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">
                  Squad arrived
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {["Amina K.", "Jonas M.", "Sofia R."].map((n, i) => (
                <motion.span
                  key={n}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.25 }}
                  className="flex items-center gap-1.5 font-mono text-[10px] text-mist"
                >
                  <CheckCircle2 size={11} className="text-volt" /> {n} just arrived
                </motion.span>
              ))}
            </div>
          </div>
        </Card>

        {/* Offline */}
        <Card
          icon={<WifiOff size={20} />}
          title="Works even with no signal"
          desc="Basements, indoor tracks, away fixtures. Your session stays on the screen and everything catches up the moment you're back online — you'll never notice the difference."
          delay={0.08}
          className="lg:col-span-5"
        >
          <div className="flex flex-wrap gap-2">
            {["Underground tracks", "Away fixtures", "Airplane mode", "Rural venues"].map((p) => (
              <span
                key={p}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] text-mist"
              >
                {p}
              </span>
            ))}
          </div>
        </Card>

        {/* Plans */}
        <Card
          icon={<Sparkles size={20} />}
          title="Plans that build themselves"
          desc="Describe the session you want and STMS drafts it — warm-ups, main sets, volumes and all. Save it as a template once and reuse it across any squad, in any club, forever."
          delay={0.05}
          className="lg:col-span-4"
        >
          <div className="flex items-end gap-1.5">
            {[38, 62, 45, 78, 55, 92, 70].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 4 }}
                whileInView={{ height: h }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={cn("w-full rounded-sm", i === 5 ? "bg-volt" : "bg-white/15")}
                style={{ maxHeight: 92 }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-fog">
            <TrendingUp size={11} className="text-volt" /> Suggested weekly load
          </div>
        </Card>

        {/* Progress */}
        <Card
          icon={<LineChart size={20} />}
          title="Progress you can actually see"
          desc="Personal bests, attendance streaks and training load turn into clear charts. Spot who's flying, who's flagging, and who needs a quiet word — in seconds."
          delay={0.1}
          className="lg:col-span-4"
        >
          <div className="space-y-2.5">
            {[
              { label: "100m PBs this season", val: "12" },
              { label: "Athletes improving", val: "86%" },
              { label: "Sessions completed", val: "1,284" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between border-b border-white/[0.06] pb-2 last:border-0">
                <span className="text-xs text-mist">{r.label}</span>
                <span className="font-display text-lg text-volt">{r.val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Multi-club */}
        <Card
          icon={<Building2 size={20} />}
          title="Every club, one login"
          desc="Run three clubs or thirty. Switch between them with a tap, keep each club's people and plans completely separate, and compare how every location is performing."
          delay={0.15}
          className="lg:col-span-4"
        >
          <div className="flex flex-wrap gap-2">
            {["North Athletics", "East Sprint Squad", "Central Endurance"].map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] text-mist transition-colors hover:border-volt/40 hover:text-volt"
              >
                {c}
              </span>
            ))}
            <span className="flex items-center gap-1.5 rounded-full bg-volt/10 px-3 py-1.5 font-mono text-[10px] text-volt">
              <Users size={11} /> + your clubs
            </span>
          </div>
        </Card>

        {/* Privacy / access */}
        <Card
          icon={<Lock size={20} />}
          title="Everyone sees the right thing"
          desc="Coaches see their squads. Club admins see their club. Athletes see only their own plan and progress. You decide who gets access to what, and you can change it any time."
          delay={0.2}
          className="lg:col-span-12"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { role: "You (club owner)", sees: "Everything across all your clubs" },
              { role: "Coaches", sees: "Their squads, sessions and notes" },
              { role: "Athletes", sees: "Their own plan and personal progress" },
            ].map((r) => (
              <div key={r.role} className="rounded-xl border border-white/[0.06] bg-ink/60 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-volt">{r.role}</div>
                <div className="mt-1.5 text-xs text-mist">{r.sees}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
