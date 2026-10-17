const ITEMS = [
  "Automatic attendance",
  "Sessions in minutes",
  "Works with no signal",
  "Every club, one login",
  "Track personal bests",
  "Replaces your spreadsheets",
  "Set up in 9 minutes",
  "See who's improving",
];

function Row({ items, className, outline }: { items: string[]; className: string; outline?: boolean }) {
  const content = [...items, ...items, ...items];
  return (
    <div className={`flex overflow-hidden whitespace-nowrap py-4 ${className}`}>
      <div className="animate-marquee flex shrink-0 items-center">
        {content.map((item, i) => (
          <span key={i} className="flex items-center">
            <span
              className={`font-display text-2xl uppercase tracking-wide md:text-4xl ${
                outline ? "text-outline-white" : ""
              }`}
            >
              {item}
            </span>
            <span className={`mx-6 text-xl md:mx-10 md:text-2xl ${outline ? "text-volt" : "text-ink/70"}`}>✦</span>
          </span>
        ))}
      </div>
      {/* duplicate for seamless loop */}
      <div className="animate-marquee flex shrink-0 items-center" aria-hidden>
        {content.map((item, i) => (
          <span key={i} className="flex items-center">
            <span
              className={`font-display text-2xl uppercase tracking-wide md:text-4xl ${
                outline ? "text-outline-white" : ""
              }`}
            >
              {item}
            </span>
            <span className={`mx-6 text-xl md:mx-10 md:text-2xl ${outline ? "text-volt" : "text-ink/70"}`}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Marquee() {
  return (
    <section className="relative -my-4 overflow-hidden py-8">
      <div className="-rotate-[1.2deg] scale-[1.02]">
        <Row items={ITEMS} className="bg-volt text-ink" />
      </div>
      <div className="rotate-[1deg] scale-[1.02] -mt-1 border-y border-white/[0.07] bg-ink">
        <Row items={[...ITEMS].reverse()} outline className="text-transparent" />
      </div>
    </section>
  );
}
