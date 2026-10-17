import { useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { initLenis, destroyLenis } from "./lib/scroll";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Showcase from "./components/Showcase";
import WhoItsFor from "./components/WhoItsFor";
import AISection from "./components/AISection";
import PWASection from "./components/PWASection";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function App() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useEffect(() => {
    initLenis();
    return () => destroyLenis();
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
