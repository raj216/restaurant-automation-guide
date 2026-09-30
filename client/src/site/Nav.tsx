import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NAV, PILOT_CTA } from "./content";
import { Brand } from "./Logo";
import { EASE } from "./motion";

const SECTION_IDS = NAV.map(link => link.href.slice(1));

/**
 * The section being read: the last one crossing a line 40% down the window,
 * so a section nested in another (the roadmap) wins over its parent.
 */
function useCurrentSection(ids: string[]) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let found: string | null = null;
      for (const id of ids) {
        const box = document.getElementById(id)?.getBoundingClientRect();
        if (box && box.top <= line && box.bottom > line) found = id;
      }
      setCurrent(found);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [ids]);
  return current;
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const current = useCurrentSection(SECTION_IDS);
  const toggle = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  // While the menu is open: the page stays still, Escape closes it, and it
  // closes by itself if the window grows past the phone layout.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    sheet.current?.querySelector("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 901px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      root.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <Brand onClick={close} />
          <nav className="nav-menu" aria-label="Main">
            <ul className="nav-links">
              {NAV.map(link => {
                const here = current === link.href.slice(1);
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={here ? "is-current" : undefined}
                      aria-current={here ? "true" : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          <a className="btn btn-primary nav-cta" href="#pilot">
            {PILOT_CTA}
          </a>
          <button
            ref={toggle}
            type="button"
            className="menu-button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(value => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      {/* Outside the header: its blur would otherwise pin this fixed sheet
          inside the header's own box. */}
      <AnimatePresence>
        {open && (
          <m.div
            ref={sheet}
            id="site-menu"
            className="sheet"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <nav aria-label="Menu">
              {NAV.map((link, i) => (
                <m.a
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: EASE,
                    delay: 0.04 + i * 0.05,
                  }}
                >
                  {link.label}
                  <ArrowRight size={20} />
                </m.a>
              ))}
            </nav>
            <a
              className="btn btn-primary btn-lg btn-block"
              href="#pilot"
              onClick={close}
            >
              {PILOT_CTA}
            </a>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
