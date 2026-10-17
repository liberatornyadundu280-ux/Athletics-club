import { ButtonPrimary, ButtonGhost, Reveal, Eyebrow } from "./ui";

export default function CTA() {
  return (
    <section id="cta" className="relative scroll-mt-24 overflow-hidden">
      {/* background */}
      <div className="absolute inset-0">
        <img src="/images/cta-sprint.jpg" alt="" className="h-full w-full object-cover object-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/60 to-ink" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(215,255,63,0.08),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-5 py-32 text-center md:px-10 md:py-44">
        <Reveal className="flex justify-center">
          <Eyebrow>Free 14-day trial</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="mx-auto mt-6 font-display uppercase leading-[0.92] text-white">
            <span className="block text-[clamp(3rem,9vw,8.5rem)]">Ready to run</span>
            <span className="text-outline block text-[clamp(3rem,9vw,8.5rem)]">faster?</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-mist md:text-base">
            Bring your first club online in under ten minutes. Your athletes, your data,
            your championship run — on the fastest system in athletics.
          </p>
        </Reveal>

        <Reveal delay={0.3} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ButtonPrimary href="/register">Start free trial</ButtonPrimary>
          <ButtonGhost href="/login">Book a demo</ButtonGhost>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-[0.25em] text-fog">
            <span>No credit card</span>
            <span className="h-1 w-1 rounded-full bg-volt" />
            <span>Unlimited athletes on Pro</span>
            <span className="h-1 w-1 rounded-full bg-volt" />
            <span>Cancel anytime</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}