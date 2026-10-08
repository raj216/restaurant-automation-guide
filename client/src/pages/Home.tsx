import { BrioCall } from "@/site/BrioCall";
import { BRIO_CALL } from "@/site/content";
import { Faq } from "@/site/Faq";
import { Footer } from "@/site/Footer";
import { Hero } from "@/site/Hero";
import { HowItWorks } from "@/site/HowItWorks";
import { usePauseOffscreen, useSpotlight } from "@/site/motion";
import { Motto } from "@/site/Motto";
import { useDemoTransition } from "@/site/demoTransition";
import { Nav } from "@/site/Nav";
import { Pilot } from "@/site/Pilot";
import { Stats } from "@/site/Stats";
import { ToastProvider } from "@/site/Toasts";
import "@/site/site.css";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useScroll,
  useSpring,
} from "framer-motion";

/** A thin spectrum line along the top of the window: how far down the page you are. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 30,
    restDelta: 0.001,
  });
  return <m.div className="progress" style={{ scaleX }} aria-hidden="true" />;
}

/** The CoHost AI home page. Every word is in site/content.ts. */
export default function Home() {
  useSpotlight();
  usePauseOffscreen();
  useDemoTransition();
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <div className="site">
            <a className="skip" href="#main">
              Skip to content
            </a>
            <ScrollProgress />
            <Nav />
            <main id="main">
              <Hero />
              <Stats />
              <Motto />
              <HowItWorks />
              <Faq />
              <Pilot />
            </main>
            <Footer />
            {BRIO_CALL.enabled && <BrioCall />}
          </div>
        </ToastProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
