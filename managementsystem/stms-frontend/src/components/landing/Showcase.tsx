import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  Settings,
  Search,
  Bell,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Circle,
  Play,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";
import { Reveal, Eyebrow, Counter } from "./ui";
import { cn } from "../../utils/cn";

/* ---------------- live attendance feed ---------------- */

type Entry = { id: number; name: string; session: string; time: string };

const INITIAL: Entry[] = [
  { id: 1, name: "Amina K.", session: "Sprint Block A", time: "17:02" },
  { id: 2, name: "Jonas M.", session: "Endurance Lab", time: "17:04" },
  { id: 3, name: "Sofia R.", session: "Sprint Block A", time: "17:05" },
  { id: 4, name: "Marcus T.", session: "Strength Room", time: "17:07" },
];

const POOL = ["Lena P.", "David O.", "Yuki N.", "Omar H.", "Grace W.", "Tomas B.", "Ivy C.", "Ravi S."];
const SESSIONS = ["Sprint Block B", "Recovery Swim", "Hurdles Drill", "Plyometrics", "Endurance Lab"];

function LiveFeed() {
  const [entries, setEntries] = useState<Entry[]>(INITIAL);

  useEffect(() => {
    let id = 100;
    const timer = setInterval(() => {
      setEntries((prev) => {
        const next: Entry = {
          id: id++,
          name: POOL[Math.floor(Math.random() * POOL.length)],
          session: SESSIONS[Math.floor(Math.random() * SESSIONS.length)],
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        };
        return [next, ...prev].slice(0, 5);
      });
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-fog">Live check-ins</span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-volt">
          <span className="h-1.5 w-1.5 rounded-full bg-volt animate-pulse-dot" /> Streaming
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {entries.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-volt/15 font-mono text-[9px] font-bold text-volt">
                {e.name.split(" ").map((w) => w[0]).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-white">{e.name}</div>
                <div className="truncate font-mono text-[9px] text-fog">{e.session}</div>
              </div>
              <span className="font-mono text-[9px] text-fog">{e.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- chart ---------------- */

const CHART_LINE = "M0,192 C56,176 88,128 140,134 S228,172 286,146 S376,62 448,88 S560,158 640,74";

function LoadChart() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-fog">Team load · last 30 days</span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] text-volt">
          <BarChart3 size={11} /> +18.4%
        </span>
      </div>
      <svg viewBox="0 0 640 240" className="w-full" preserveAspectRatio="none" style={{ height: 150 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d7ff3f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#d7ff3f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[48, 96, 144, 192].map((y) => (
          <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        <motion.path
          d={`${CHART_LINE} L640,240 L0,240 Z`}
          fill="url(#areaFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: 0.6 }}
        />
        <motion.path
          d={CHART_LINE}
          fill="none"
          stroke="#d7ff3f"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.circle
          cx="640"
          cy="74"
          r="5"
          fill="#d7ff3f"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 2, duration: 0.4 }}
        />
      </svg>
    </div>
  );
}

/* ---------------- stat cards ---------------- */

const DASH_STATS = [
  { label: "Active athletes", value: 248, suffix: "" },
  { label: "Attendance today", value: 94, suffix: "%" },
  { label: "Sessions this week", value: 18, suffix: "" },
];

/* ---------------- phone mockup ---------------- */

const EXERCISES = [
  { name: "A-Skips", sets: "3 × 20m", done: true },
  { name: "High Knees", sets: "3 × 20m", done: true },
  { name: "Block Starts", sets: "6 × 10m", done: false, active: true },
  { name: "300m Time Trial", sets: "2 reps", done: false },
];

function Phone() {
  return (
    <div className="w-[240px] overflow-hidden rounded-[2.2rem] border border-white/15 bg-ink shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
      {/* status bar */}
      <div className="flex items-center justify-between px-5 pt-3.5">
        <span className="font-mono text-[9px] text-white/80">17:42</span>
        <div className="flex items-center gap-1.5 text-white/70">
          <Signal size={10} />
          <Wifi size={10} />
          <BatteryFull size={12} />
        </div>
      </div>
      {/* header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.25em] text-fog">Today</div>
          <div className="font-display text-sm uppercase tracking-wide text-white">Track Session</div>
        </div>
        <span className="rounded-full bg-volt px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-ink animate-ticker-glow">
          Live
        </span>
      </div>
      {/* progress */}
      <div className="px-5">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            animate={{ width: ["35%", "62%"] }}
            transition={{ duration: 5, repeat: Infinity, repeatType: "mirror" }}
            className="h-full rounded-full bg-volt"
          />
        </div>
      </div>
      {/* exercises */}
      <div className="space-y-1.5 px-4 py-4">
        {EXERCISES.map((ex) => (
          <div
            key={ex.name}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5",
              ex.active ? "border-volt/40 bg-volt/[0.07]" : "border-white/[0.06] bg-white/[0.02]"
            )}
          >
            {ex.done ? (
              <CheckCircle2 size={14} className="shrink-0 text-volt" />
            ) : (
              <Circle size={14} className={cn("shrink-0", ex.active ? "text-volt" : "text-fog")} />
            )}
            <div className="flex-1">
              <div className={cn("text-[11px] font-medium", ex.done ? "text-fog line-through" : "text-white")}>
                {ex.name}
              </div>
              <div className="font-mono text-[8px] text-fog">{ex.sets}</div>
            </div>
            {ex.active && <span className="h-1.5 w-1.5 rounded-full bg-volt animate-pulse-dot" />}
          </div>
        ))}
      </div>
      {/* FAB */}
      <div className="flex items-center justify-between px-5 pb-5">
        <div className="font-mono text-[9px] text-fog">Rep 4 / 6 · Block 3</div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-volt text-ink glow-volt">
          <Play size={16} fill="currentColor" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- main ---------------- */

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Athletes" },
  { icon: CalendarCheck, label: "Sessions" },
  { icon: ClipboardList, label: "Attendance" },
  { icon: BarChart3, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

export default function Showcase() {
  return (
    <section id="platform" className="relative scroll-mt-24 overflow-hidden border-y border-white/[0.06] bg-coal py-28 md:py-36">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-volt/[0.04] blur-[140px]" />

      <div className="relative mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="mb-16 text-center md:mb-20">
          <Reveal className="flex justify-center">
            <Eyebrow>The platform</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mx-auto mt-5 max-w-4xl font-display text-5xl uppercase leading-[0.95] text-white md:text-7xl">
              A command center <span className="text-outline">for coaches</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-mist md:text-base">
              This is your Monday morning: who's turning up, who's improving, and what to
              change this week — all on one screen, readable at a glance.
            </p>
          </Reveal>
        </div>

        {/* dashboard */}
        <Reveal delay={0.15} y={60}>
          <div className="relative mx-auto max-w-5xl">
            {/* floating chips */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 -top-6 z-20 hidden items-center gap-2 rounded-full border border-volt/30 bg-ink/90 px-4 py-2.5 font-mono text-[10px] text-volt backdrop-blur md:flex lg:-right-12"
            >
              <Sparkles size={12} /> AI · Swap Thu PM → recovery
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-4 bottom-16 z-20 hidden items-center gap-2 rounded-full border border-white/10 bg-ink/90 px-4 py-2.5 font-mono text-[10px] text-mist backdrop-blur md:flex lg:-left-12"
            >
              <RefreshCw size={12} className="animate-spin-slow" style={{ animationDuration: "6s" }} /> Attendance updated live
            </motion.div>

            {/* window */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel shadow-[0_60px_160px_-40px_rgba(0,0,0,0.9)]">
              {/* chrome */}
              <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </div>
                <div className="mx-auto flex items-center gap-2 rounded-md bg-ink/70 px-4 py-1.5 font-mono text-[10px] text-fog">
                  <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                  app.stms.io/dashboard
                </div>
                <div className="w-10" />
              </div>

              <div className="grid grid-cols-12">
                {/* sidebar */}
                <div className="col-span-2 hidden border-r border-white/[0.06] p-3 md:block">
                  <div className="mb-4 flex items-center gap-2 px-2 pt-1">
                    <span className="grid h-6 w-6 place-items-center rounded bg-volt font-mono text-[10px] font-bold text-ink">S</span>
                    <span className="font-mono text-[10px] font-bold tracking-widest text-white">STMS</span>
                  </div>
                  <div className="space-y-1">
                    {NAV.map((n) => (
                      <div
                        key={n.label}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-[10px]",
                          n.active ? "bg-volt/10 text-volt" : "text-fog hover:text-white"
                        )}
                      >
                        <n.icon size={13} />
                        {n.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* main */}
                <div className="col-span-12 p-5 md:col-span-10 md:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="font-display text-lg uppercase tracking-wide text-white md:text-xl">
                        Good afternoon, Coach Maya
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-fog">
                        North Athletics · Tue 17:42 · Sprint block
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Search size={15} className="text-fog" />
                      <div className="relative">
                        <Bell size={15} className="text-fog" />
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-volt" />
                      </div>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-volt/20 font-mono text-[10px] font-bold text-volt">
                        MK
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-3">
                    {DASH_STATS.map((s) => (
                      <div key={s.label} className="rounded-xl border border-white/[0.06] bg-ink/60 p-4">
                        <div className="font-display text-2xl text-white md:text-3xl">
                          <Counter to={s.value} />
                          <span className="text-volt">{s.suffix}</span>
                        </div>
                        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-fog md:text-[9px]">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                      <LoadChart />
                    </div>
                    <div className="h-[190px] rounded-xl border border-white/[0.06] bg-ink/60 p-4 lg:col-span-2">
                      <LiveFeed />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* phone */}
            <motion.div
              initial={{ opacity: 0, y: 60, rotate: 6 }}
              whileInView={{ opacity: 1, y: 0, rotate: 3 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-10 -right-6 hidden lg:block xl:-right-16"
            >
              <div className="animate-floaty">
                <Phone />
              </div>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}