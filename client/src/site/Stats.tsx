import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { STATS } from "./content";
import { EASE, Reveal } from "./motion";

/** Counts up to `to` the first time it scrolls into view. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !seen || reduce) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: value => {
        el.textContent = String(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [seen, reduce, to]);

  // React renders the start value only; the animation writes the rest.
  return <span ref={ref}>{reduce ? to : 0}</span>;
}

/** The copy's own numbers, as a band of figures. */
export function Stats() {
  return (
    <section className="stats-band" aria-label="CoHost AI at a glance">
      <ul className="wrap stats">
        {STATS.map((stat, i) => (
          <Reveal
            as="li"
            key={stat.label}
            className="stat panel"
            delay={i * 0.08}
            data-spotlight
          >
            <p className="stat-value" aria-hidden="true">
              {stat.display ? (
                <span>{stat.display}</span>
              ) : (
                <CountUp to={stat.value} />
              )}
              {stat.unit && <span>{stat.unit}</span>}
            </p>
            <p className="stat-label">
              <span className="sr-only">
                {stat.display ?? stat.value} {stat.unit}:{" "}
              </span>
              {stat.label}
            </p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
