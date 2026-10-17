import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Menu, X, ArrowUpRight } from "lucide-react";
import { scrollToId } from "../lib/scroll";
import { cn } from "../utils/cn";
import { ButtonPrimary } from "./ui";

const APP_URL = import.meta.env.VITE_APP_URL || "#cta";

const LINKS = [
  { label: "What you get", hash: "#features" },
  { label: "How it works", hash: "#how" },
  { label: "Who it's for", hash: "#who" },
  { label: "Smart Coach", hash: "#ai" },
  { label: "Questions", hash: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (hash: string) => {
    setOpen(false);
    scrollToId(hash);
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-[80] transition-all duration-500",
        scrolled ? "border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-10">
        {/* logo */}
        <button onClick={() => go("#top")} className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-volt text-ink transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
            <Zap size={18} strokeWidth={2.6} />
          </span>
          <span className="font-display text-xl tracking-wide text-white">
            ST<span className="text-volt">M</span>S
          </span>
          <span className="hidden rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-fog lg:block">
            v2.0
          </span>
        </button>

        {/* desktop links */}
        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <button
              key={l.hash}
              onClick={() => go(l.hash)}
              className="group relative font-mono text-[11px] uppercase tracking-[0.22em] text-mist transition-colors hover:text-white"
            >
              {l.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-volt transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </div>

        <div className="hidden lg:block">
          <ButtonPrimary href={`${APP_URL}/register`}>Get Started</ButtonPrimary>
        </div>

        {/* mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-line text-white lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-white/[0.06] bg-ink/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 pb-6 pt-2">
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.hash}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => go(l.hash)}
                  className="flex items-center justify-between border-b border-white/[0.05] py-4 text-left font-display text-2xl uppercase tracking-wide text-white"
                >
                  {l.label}
                  <ArrowUpRight size={18} className="text-volt" />
                </motion.button>
              ))}
              <ButtonPrimary href={`${APP_URL}/register`} className="mt-4">Get Started</ButtonPrimary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
