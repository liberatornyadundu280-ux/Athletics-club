import { Reveal, Eyebrow } from "./ui";

const QUOTES = [
  {
    quote:
      "I used to spend Sunday nights building spreadsheets for three squads. Now I open STMS, the sessions are there, and attendance has already filled itself in.",
    name: "Maya Kovács",
    role: "Head Coach · North Athletics",
    stat: "6 hrs saved weekly",
  },
  {
    quote:
      "Running four clubs used to mean four systems and a lot of copy-paste. Everything lives in one place now, and I can finally compare how each club is performing.",
    name: "Daniel Osei",
    role: "Owner · Velocity Athletics Group",
    stat: "4 clubs, one login",
  },
  {
    quote:
      "I open the app at the track, my session is right there, and it works even when the signal doesn't. I actually know what I'm training and why.",
    name: "Amina Rahman",
    role: "Sprinter · U20 National Squad",
    stat: "Works offline",
  },
];

export default function Testimonials() {
  return (
    <section className="relative mx-auto max-w-[1400px] px-5 py-28 md:px-10 md:py-36">
      <div className="mb-16 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
        <div>
          <Reveal>
            <Eyebrow>Loved by clubs</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-5 font-display text-5xl uppercase leading-[0.95] text-white md:text-7xl">
              Coaches who
              <br />
              <span className="text-outline">stopped chasing</span>
            </h2>
          </Reveal>
        </div>
        <Reveal delay={0.2} className="max-w-sm">
          <p className="text-sm leading-relaxed text-mist md:text-base">
            From single-squad clubs to groups running five locations — here's what changes
            in the first month.
          </p>
        </Reveal>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {QUOTES.map((q, i) => (
          <Reveal key={q.name} delay={i * 0.1}>
            <figure className="group flex h-full flex-col rounded-2xl border border-white/[0.07] bg-panel p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-volt/40 md:p-8">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-display text-5xl leading-none text-volt/30 transition-colors duration-500 group-hover:text-volt/60">
                  &ldquo;
                </span>
                <span className="rounded-full border border-volt/25 bg-volt/[0.07] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-volt">
                  {q.stat}
                </span>
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-white/85">
                {q.quote}
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-white/[0.07] pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-volt/15 font-mono text-[11px] font-bold text-volt">
                  {q.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <div>
                  <div className="text-sm font-semibold text-white">{q.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">{q.role}</div>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
