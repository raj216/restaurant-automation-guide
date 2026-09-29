import { ArrowRight, Check, MapPin, PhoneCall } from "lucide-react";
import { CAPABILITIES, DEMO_LINE, HERO } from "./content";
import { HeroStage } from "./HeroStage";
import { Reveal, Words, useFontsReady } from "./motion";

export function Hero() {
  const fonts = useFontsReady();
  const highlight = HERO.titleHighlight.split(" ");
  const lastWord = highlight.pop() ?? "";
  const startWords = HERO.titleStart.trim().split(" ").length;

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="grid-bg" aria-hidden="true" />
      <div className="wrap hero-copy">
        <Reveal onLoad ready={fonts} y={12} className="badge">
          <span className="pin">
            <MapPin size={13} strokeWidth={2.4} />
          </span>
          {HERO.badge}
        </Reveal>
        <h1 id="hero-title">
          <Words text={HERO.titleStart} ready={fonts} delay={0.08} />{" "}
          <Words
            text={highlight.join(" ")}
            className="hl"
            ready={fonts}
            delay={0.08 + startWords * 0.055}
          />{" "}
          {/* The full stop stays on the same line as the last word. */}
          <span className="nowrap">
            <Words
              text={lastWord}
              className="hl"
              ready={fonts}
              delay={0.08 + (startWords + highlight.length) * 0.055}
            />
            {HERO.titleEnd}
          </span>
        </h1>
        <Reveal
          as="p"
          onLoad
          ready={fonts}
          delay={0.55}
          blur
          className="hero-lede"
        >
          {HERO.lead.map((part, i) =>
            typeof part === "string" ? (
              part
            ) : (
              <strong key={i}>{part.strong}</strong>
            )
          )}
        </Reveal>
        <Reveal onLoad ready={fonts} delay={0.68} className="hero-actions">
          <a className="btn btn-primary btn-lg" href="#pilot">
            {HERO.primary}
            <ArrowRight size={18} className="nudge" />
          </a>
          {DEMO_LINE && (
            <a className="btn btn-ghost btn-lg" href={`tel:${DEMO_LINE.tel}`}>
              <PhoneCall size={17} />
              {HERO.demo}: {DEMO_LINE.label}
            </a>
          )}
        </Reveal>
        <Reveal
          as="ul"
          onLoad
          ready={fonts}
          delay={0.8}
          className="hero-points"
        >
          {HERO.points.map(point => (
            <li key={point}>
              <Check size={15} strokeWidth={2.6} />
              {point}
            </li>
          ))}
        </Reveal>
      </div>
      <HeroStage />
      <div className="ticker">
        <ul className="ticker-row" aria-label="What Brio handles">
          {CAPABILITIES.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul className="ticker-row" aria-hidden="true">
          {CAPABILITIES.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
