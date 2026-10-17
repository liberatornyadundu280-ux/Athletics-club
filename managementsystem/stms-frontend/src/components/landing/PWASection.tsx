import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Download,
  CloudOff,
  CheckCircle2,
  Circle,
  Signal,
  WifiOff,
  Wifi,
  BatteryFull,
  RefreshCw,
  Play,
  Database,
  Cpu,
  Bell,
  UploadCloud,
} from "lucide-react";
import { Reveal, Eyebrow } from "./ui";
import { cn } from "../../utils/cn";

const STEPS = [
  { icon: Globe, title: "Open in any browser", desc: "Safari, Chrome, Edge — the PWA installs straight from the page." },
  { icon: Download, title: "Add to Home Screen", desc: "One tap from the share sheet. Full-screen, app-icon, the works." },
  { icon: CloudOff, title: "Train offline forever", desc: "Workouts cache to IndexedDB and sync when you resurface." },
];

const TECH = [
  { icon: Database, label: "IndexedDB cache" },
  { icon: Cpu, label: "Service worker precache" },
  { icon: UploadCloud, label: "Background sync queue" },
  { icon: Bell, label: "Push notifications" },
];

type Status = "online" | "offline" | "syncing";

export default function PWASection() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [seconds, setSeconds] = useState(768); // 12:48

  // countdown clock
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s <= 0 ? 768 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // queue grows while offline
  useEffect(() => {
    if (online) return;
    setSyncing(false);
    const t = setInterval(() => setQueue((q) => q + 1), 1100);
    return () => clearInterval(t);
  }, [online]);

  // sync on reconnect
  useEffect(() => {
    if (online && queue > 0) {
      setSyncing(true);
      const t = setTimeout(() => {
        setQueue(0);
        setSyncing(false);
      }, 1700);
      return () => clearTimeout(t);
    }
  }, [online, queue]);

  const status: Status = syncing ? "syncing" : online ? "online" : "offline";
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const statusMeta = {
    online: { label: "All synced", icon: CheckCircle2, cls: "text-volt border-volt/30 bg-volt/[0.07]" },
    offline: { label: `Offline · ${queue} saved`, icon: WifiOff, cls: "text-amber-300 border-amber-300/30 bg-amber-300/[0.07]" },
    syncing: { label: "Catching up…", icon: RefreshCw, cls: "text-volt border-volt/30 bg-volt/[0.07]" },
  }[status];

  return (
    <section id="offline" className="relative scroll-mt-24 overflow-hidden border-y border-white/[0.06] bg-coal py-28 md:py-36">
      <div className="pointer-events-none absolute left-0 top-0 h-[400px] w-[600px] rounded-full bg-volt/[0.04] blur-[130px]" />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-14 px-5 md:px-10 lg:grid-cols-2 lg:gap-20">
        {/* copy */}
        <div>
          <Reveal>
            <Eyebrow>Offline-first PWA</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-white md:text-7xl">
              Works where
              <br />
              you <span className="text-outline">train</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-mist md:text-base">
              Basements. Away fixtures. Airplane mode. STMS keeps the workout player running
              and queues every completion — try the live simulation.
            </p>
          </Reveal>

          {/* steps */}
          <div className="mt-10 space-y-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={0.15 + i * 0.1}>
                <div className="group flex items-start gap-4 rounded-xl border border-white/[0.07] bg-panel p-4 transition-colors duration-300 hover:border-volt/40">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-volt/25 bg-volt/[0.07] font-mono text-xs font-bold text-volt">
                    0{i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <s.icon size={14} className="text-volt" />
                      {s.title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-mist">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.4}>
            <div className="mt-8 flex flex-wrap gap-2">
              {TECH.map((t) => (
                <span
                  key={t.label}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-mist transition-colors hover:border-volt/40 hover:text-volt"
                >
                  <t.icon size={12} />
                  {t.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* interactive phone */}
        <Reveal delay={0.15} y={48}>
          <div className="relative mx-auto max-w-[360px]">
            {/* toggle */}
            <div className="mb-5 flex items-center justify-between rounded-xl border border-white/10 bg-panel px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">Simulate network</span>
              <button
                onClick={() => setOnline((o) => !o)}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
                  online ? "bg-volt text-ink" : "bg-amber-300/15 text-amber-300 ring-1 ring-amber-300/40"
                )}
              >
                {online ? <Wifi size={12} /> : <WifiOff size={12} />}
                {online ? "Online" : "Offline"}
                <span className={cn("relative h-4 w-7 rounded-full transition-colors", online ? "bg-ink/25" : "bg-amber-300/25")}>
                  <span
                    className={cn(
                      "absolute top-0.5 h-3 w-3 rounded-full bg-current transition-all duration-300",
                      online ? "left-3.5" : "left-0.5"
                    )}
                  />
                </span>
              </button>
            </div>

            {/* phone */}
            <div className="relative overflow-hidden rounded-[2.4rem] border border-white/15 bg-ink shadow-[0_50px_140px_-30px_rgba(0,0,0,0.95)]">
              {/* notch */}
              <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />

              {/* status bar */}
              <div className="flex items-center justify-between px-6 pb-2 pt-4">
                <span className="font-mono text-[9px] text-white/80">17:42</span>
                <div className="flex items-center gap-1.5 text-white/70">
                  {online ? <Signal size={10} /> : <WifiOff size={10} />}
                  {online ? <Wifi size={10} /> : <WifiOff size={10} />}
                  <BatteryFull size={12} />
                </div>
              </div>

              {/* app header */}
              <div className="flex items-center justify-between px-6 pb-3 pt-3">
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.25em] text-fog">Today · Track</div>
                  <div className="font-display text-base uppercase tracking-wide text-white">Session 24</div>
                </div>
                <div className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em]", statusMeta.cls)}>
                  <statusMeta.icon size={10} className={status === "syncing" ? "animate-spin" : ""} style={status === "syncing" ? { animationDuration: "1s" } : undefined} />
                  {statusMeta.label}
                </div>
              </div>

              {/* timer */}
              <div className="px-6 pb-4">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
                  <div className="font-display text-5xl tabular-nums text-white">
                    {mm}
                    <span className="text-volt">:</span>
                    {ss}
                  </div>
                  <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.3em] text-fog">Block starts · remaining</div>
                </div>
              </div>

              {/* exercises */}
              <div className="space-y-1.5 px-4">
                {[
                  { name: "A-Skips", sets: "3 × 20m", done: true },
                  { name: "High Knees", sets: "3 × 20m", done: true },
                  { name: "Block Starts", sets: "6 × 10m", done: false, active: true },
                  { name: "300m Time Trial", sets: "2 reps", done: false },
                ].map((ex) => (
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

              {/* sync log */}
              <div className="px-5 pb-5 pt-4">
                <div className="h-16 overflow-hidden rounded-lg border border-white/[0.06] bg-black/40 p-2.5 font-mono text-[9px] leading-relaxed">
                  <AnimatePresence initial={false} mode="popLayout">
                    {status === "offline" && (
                      <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-amber-300">
                        → POST /attendance failed · cached to IndexedDB
                        <br />→ queue: {queue} mutation{queue === 1 ? "" : "s"}
                      </motion.div>
                    )}
                    {status === "syncing" && (
                      <motion.div key="sync" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-volt">
                        ⟳ flushing {queue} queued mutation{queue === 1 ? "" : "s"}…
                      </motion.div>
                    )}
                    {status === "online" && (
                      <motion.div key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-fog">
                        ✓ 200 /attendance · 200 /completions
                        <br />✓ all changes synced
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="font-mono text-[9px] text-fog">Rep 4 / 6</div>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-volt text-ink glow-volt">
                    <Play size={15} fill="currentColor" />
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-fog">
              Toggle the switch — watch it queue & reconcile
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}