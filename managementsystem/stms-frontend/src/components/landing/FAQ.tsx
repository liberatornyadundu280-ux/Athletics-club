import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Reveal, Eyebrow } from "./ui";
import { cn } from "../../utils/cn";

const FAQS = [
  {
    q: "Do my athletes need to install anything?",
    a: "No. They open a link on their phone, save STMS to their home screen, and they're in. There's no app store download, no accounts to set up on their behalf, and it works on both iPhone and Android.",
  },
  {
    q: "Does it work when there's no internet at the track?",
    a: "Yes. Sessions, attendance and completed workouts are saved on the device and automatically sent up the moment a connection returns. Coaches regularly run full sessions in basements and away venues with zero signal.",
  },
  {
    q: "I run more than one club. Can I manage them together?",
    a: "That's exactly what STMS is built for. Switch between clubs with one tap, keep rosters and sessions completely separate, and compare attendance and performance across every location from a single view.",
  },
  {
    q: "How long does it take to get my club set up?",
    a: "Most clubs are live in under ten minutes: create the club, import your athletes from a spreadsheet, and schedule your first session. If you'd like a hand, our team will migrate your existing data for you.",
  },
  {
    q: "Who can see athlete information?",
    a: "You control it. Coaches see their own squads, club admins see their club, and athletes see only their own plans and progress. Nothing is shared between clubs, and you can change access at any time.",
  },
  {
    q: "Can I bring over my existing training plans?",
    a: "Yes. Paste them in, upload a spreadsheet, or rebuild them as reusable templates in a couple of clicks. Once a session is saved as a template you can reuse it across any squad or club forever.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative mx-auto max-w-[1400px] scroll-mt-24 px-5 pb-28 pt-4 md:px-10 md:pb-36">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-4">
          <Reveal>
            <Eyebrow>Questions</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-white md:text-6xl">
              Good to
              <br />
              <span className="text-volt">know</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-mist">
              Still unsure about something? Our team answers every message within a few
              hours — no bots, no ticket queues.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-8">
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={f.q} delay={i * 0.05}>
                  <div>
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span
                        className={cn(
                          "text-base font-medium transition-colors duration-300 md:text-lg",
                          isOpen ? "text-volt" : "text-white group-hover:text-volt"
                        )}
                      >
                        {f.q}
                      </span>
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-all duration-400",
                          isOpen
                            ? "rotate-45 border-volt bg-volt text-ink"
                            : "border-white/15 text-mist group-hover:border-volt group-hover:text-volt"
                        )}
                      >
                        <Plus size={16} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-2xl pb-7 pr-12 text-sm leading-relaxed text-mist">
                            {f.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}