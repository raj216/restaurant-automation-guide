import { AudioLines, ConciergeBell, Smartphone } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { MOTTO, WINGMAN_NOTE } from "./content";
import { Reveal } from "./motion";

const ROLE_ICONS = [ConciergeBell, AudioLines, Smartphone];
const ROLE_COLORS = ["var(--order)", "#fff", "var(--amber)"];

export function Motto() {
  const roles = useRef<HTMLUListElement>(null);

  // The light that runs down the line between the three roles travels its full length.
  useLayoutEffect(() => {
    const list = roles.current;
    if (!list) return;
    const measure = () =>
      list.style.setProperty(
        "--travel",
        `${Math.max(0, list.clientHeight - 88)}px`
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="section motto" aria-labelledby="motto-title">
      <div className="wrap motto-grid">
        <div className="motto-copy">
          <Reveal as="p" className="eyebrow">
            <span>{MOTTO.eyebrow}</span>
          </Reveal>
          <Reveal
            as="h2"
            className="motto-quote"
            id="motto-title"
            delay={0.05}
            blur
          >
            <span className="qm">“</span>
            {MOTTO.quote}
            <span className="qm">”</span>
          </Reveal>
          {MOTTO.paragraphs.map((paragraph, i) => (
            <Reveal as="p" key={paragraph} delay={0.1 + i * 0.06}>
              {paragraph}
            </Reveal>
          ))}
        </div>
        <Reveal className="panel wingman" delay={0.1} y={36} data-spotlight>
          <h3>
            {MOTTO.cardTitle}
            <span>{WINGMAN_NOTE}</span>
          </h3>
          <ul ref={roles} className="roles">
            {MOTTO.roles.map((role, i) => {
              const Icon = ROLE_ICONS[i];
              return (
                <li className="role" key={role.who}>
                  <span
                    className={`role-icon${i === 1 ? " brio" : ""}`}
                    style={{ "--c": ROLE_COLORS[i] } as React.CSSProperties}
                  >
                    <Icon size={19} />
                  </span>
                  <p>
                    <strong>{role.who}</strong> {role.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
