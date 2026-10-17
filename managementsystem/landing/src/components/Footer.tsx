import { Zap, ArrowUpRight } from "lucide-react";
import { scrollToId } from "../lib/scroll";

const GithubIcon = (props: { size?: number }) => (
  <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

const XIcon = (props: { size?: number }) => (
  <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
  </svg>
);

const LinkedinIcon = (props: { size?: number }) => (
  <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
  </svg>
);

const YoutubeIcon = (props: { size?: number }) => (
  <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
  </svg>
);

const COLS: { title: string; links: { label: string; hash?: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Capabilities", hash: "#features" },
      { label: "Platform", hash: "#platform" },
      { label: "AI Coach", hash: "#ai" },
      { label: "Offline-first", hash: "#offline" },
      { label: "Roadmap" },
    ],
  },
  {
    title: "Using STMS",
    links: [
      { label: "Getting started", hash: "#how" },
      { label: "For club owners", hash: "#who" },
      { label: "For coaches", hash: "#who" },
      { label: "For athletes", hash: "#who" },
      { label: "Questions", hash: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "About" }, { label: "Contact" }, { label: "Support" }, { label: "Privacy" }, { label: "Terms" }],
  },
];

const SOCIALS = [
  { icon: GithubIcon, label: "GitHub" },
  { icon: XIcon, label: "X" },
  { icon: LinkedinIcon, label: "LinkedIn" },
  { icon: YoutubeIcon, label: "YouTube" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-ink">
      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-16 md:px-10 md:pt-24">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* brand */}
          <div className="lg:col-span-5">
            <button onClick={() => scrollToId("#top")} className="group flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-volt text-ink transition-transform duration-300 group-hover:rotate-[-8deg]">
                <Zap size={18} strokeWidth={2.6} />
              </span>
              <span className="font-display text-xl tracking-wide text-white">
                ST<span className="text-volt">M</span>S
              </span>
            </button>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-mist">
              Smart Trainer Management System — the offline-first, AI-powered operating
              system for multi-club athletics.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-volt/25 bg-volt/[0.06] px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-volt">
              <span className="h-1.5 w-1.5 rounded-full bg-volt animate-pulse-dot" />
              All systems operational
            </div>
            <div className="mt-8 flex gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#top"
                  onClick={(e) => e.preventDefault()}
                  aria-label={s.label}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-fog transition-all duration-300 hover:border-volt hover:text-volt"
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* link columns */}
          {COLS.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog">// {col.title}</div>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.hash ?? "#top"}
                      onClick={(e) => {
                        e.preventDefault();
                        if (l.hash) scrollToId(l.hash);
                      }}
                      className="group inline-flex items-center gap-1.5 text-sm text-mist transition-colors hover:text-volt"
                    >
                      {l.label}
                      {!l.hash && <ArrowUpRight size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* CTA card */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-volt/25 bg-gradient-to-b from-volt/[0.08] to-transparent p-6">
              <div className="font-display text-xl uppercase leading-tight text-white">
                Ship your club's season in one week
              </div>
              <p className="mt-2 text-xs leading-relaxed text-mist">
                Migration assist, coach onboarding and club templates included on every plan.
              </p>
              <button
                onClick={() => scrollToId("#cta")}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-volt py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink transition-transform duration-300 hover:scale-[1.03]"
              >
                Get started <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* watermark */}
        <div className="pointer-events-none mt-16 select-none overflow-hidden">
          <div className="text-outline-white whitespace-nowrap text-center font-display text-[clamp(6rem,22vw,20rem)] uppercase leading-[0.8] opacity-[0.08]">
            STMS
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-4 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 md:flex-row">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
            © 2025 STMS Team · Proprietary
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
            Works on phone, tablet and desktop
          </span>
        </div>
      </div>
    </footer>
  );
}
