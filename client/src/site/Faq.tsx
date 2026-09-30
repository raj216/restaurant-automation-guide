import { useState } from "react";
import { DEMO_LINE, FAQ } from "./content";
import { Reveal } from "./motion";

export function Faq() {
  // The first answer starts open; any number can be open at once.
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const toggle = (index: number) =>
    setOpen(current => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="eyebrow">
            <span>{FAQ.eyebrow}</span>
          </Reveal>
          <Reveal as="h2" className="h2" id="faq-title" delay={0.05} blur>
            {FAQ.title}
          </Reveal>
        </header>
        <div className="faq">
          {FAQ.items.map((item, i) => {
            const isOpen = open.has(i);
            return (
              <Reveal
                className={`faq-item${isOpen ? " is-open" : ""}`}
                key={item.q}
                delay={i * 0.06}
                y={16}
              >
                <h3>
                  <button
                    type="button"
                    className="faq-q"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => toggle(i)}
                  >
                    {item.q}
                    <span className="plus" aria-hidden="true" />
                  </button>
                </h3>
                <div
                  className="faq-a"
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                >
                  <div>
                    <p>
                      {item.a}
                      {DEMO_LINE && item.demo && (
                        <>
                          {" "}
                          <a className="faq-demo" href={`tel:${DEMO_LINE.tel}`}>
                            {item.demo(DEMO_LINE.label)}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
