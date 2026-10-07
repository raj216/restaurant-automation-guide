import { useInView } from "framer-motion";
import { ArrowRight, ExternalLink, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DASHBOARD } from "./content";
import { Reveal } from "./motion";

/** True once the window is wide enough to show the dashboard beside the page. */
function useWide(query = "(min-width: 900px)") {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return wide;
}

/**
 * The real example dashboard, running inside a browser-style window, so the page
 * shows exactly what a manager gets after clicking through. It loads only when the
 * section is about to scroll into view, so it never slows the first visit. On
 * phones the button above is the whole story.
 */
export function Dashboard() {
  const section = useRef<HTMLElement>(null);
  // Watch the section, which is always on the page, so the dashboard starts loading
  // a little before it scrolls into view.
  const near = useInView(section, { once: true, margin: "400px 0px 400px 0px" });
  const wide = useWide();

  return (
    <section
      ref={section}
      className="section"
      id="dashboard"
      aria-labelledby="dashboard-title"
    >
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="eyebrow">
            <span>{DASHBOARD.eyebrow}</span>
          </Reveal>
          <Reveal as="h2" className="h2" id="dashboard-title" delay={0.05} blur>
            {DASHBOARD.titleStart}
            <span className="hl">{DASHBOARD.titleHighlight}</span>
          </Reveal>
          <Reveal as="p" className="lede" delay={0.1}>
            {DASHBOARD.text}
          </Reveal>
          <Reveal className="dash-cta" delay={0.15}>
            <a className="btn btn-primary btn-lg" href="/demo">
              {DASHBOARD.example}
              <ArrowRight size={18} className="nudge" />
            </a>
            <span className="dash-cta-note">{DASHBOARD.exampleNote}</span>
          </Reveal>
        </header>

        {wide && (
          <Reveal className="dash-wrap" y={48}>
            <div className="dash dash-live">
              <div className="dash-top">
                <span className="dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="dash-title">
                  <Lock size={12} />
                  <span>{DASHBOARD.windowTitle}</span>
                </span>
                <a className="dash-full" href="/demo">
                  {DASHBOARD.fullScreen}
                  <ExternalLink size={13} />
                </a>
              </div>
              {near ? (
                <iframe
                  className="dash-frame"
                  src="/demo?theme=dark&embed=1"
                  title={DASHBOARD.frameTitle}
                  loading="lazy"
                />
              ) : (
                <div className="dash-frame" aria-hidden="true" />
              )}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
