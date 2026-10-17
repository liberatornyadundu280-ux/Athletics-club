import { useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { initLenis, destroyLenis } from "../../lib/scroll";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Marquee from "./Marquee";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import Showcase from "./Showcase";
import WhoItsFor from "./WhoItsFor";
import AISection from "./AISection";
import PWASection from "./PWASection";
import Testimonials from "./Testimonials";
import FAQ from "./FAQ";
import CTA from "./CTA";
import Footer from "./Footer";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useEffect(() => {
    initLenis();
    // Ensure body has landing page background
    document.body.style.backgroundColor = '#06070a';
    document.body.style.color = '#eef1f6';
    return () => {
      destroyLenis();
      // Restore app background when leaving landing page
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-ink text-white antialiased">
      {/* scroll progress */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[90] h-[2px] origin-left bg-volt"
      />

      {/* film grain */}
      <div className="grain pointer-events-none fixed inset-0 z-[85] opacity-[0.05]" />

      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <Showcase />
        <WhoItsFor />
        <AISection />
        <PWASection />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}