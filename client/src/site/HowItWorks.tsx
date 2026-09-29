import {
  ArrowRight,
  BrainCircuit,
  CalendarCheck,
  ChefHat,
  CircleCheck,
  ClipboardList,
  FileText,
  PhoneForwarded,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";
import { HOW, PIPELINE, ROADMAP, STEP_VISUALS } from "./content";
import { Reveal } from "./motion";

/** Step 1: Brio reads the menu, line by line. */
function MenuVisual() {
  const { file, lines } = STEP_VISUALS.menu;
  return (
    <div className="step-visual" aria-hidden="true">
      <div className="menu-doc">
        <b>
          <FileText size={12} /> {file}
        </b>
        {lines.map(line => (
          <span className="menu-line" key={line}>
            <span>{line}</span>
            <CircleCheck size={14} />
          </span>
        ))}
      </div>
      <span className="scan" />
    </div>
  );
}

/** Step 2: the restaurant's line rings three times, then forwards to Brio. */
function ForwardVisual() {
  const { line, brio, note } = STEP_VISUALS.forward;
  return (
    <div className="step-visual" aria-hidden="true">
      <div className="forward">
        <div className="forward-row">
          <span className="chip">
            <PhoneForwarded size={13} /> {line}
          </span>
          <span className="rings">
            <i />
            <i />
            <i />
          </span>
          <span className="chip chip-brio">
            <span className="mini-orb" /> {brio}
          </span>
        </div>
        <span className="forward-note">{note}</span>
      </div>
    </div>
  );
}

const ALERT_ICONS = {
  order: ShoppingBag,
  reservation: CalendarCheck,
  alert: TriangleAlert,
} as const;

/** Step 3: orders, bookings and flags arrive as alerts. */
function AlertsVisual() {
  return (
    <div className="step-visual" aria-hidden="true">
      <div className="alerts">
        {STEP_VISUALS.alerts.map(alert => {
          const Icon = ALERT_ICONS[alert.kind as keyof typeof ALERT_ICONS];
          return (
            <div className={`alert k-${alert.kind}`} key={alert.title}>
              <i>
                <Icon size={15} />
              </i>
              <span className="alert-text">
                <b>{alert.title}</b>
                <small>{alert.sub}</small>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VISUALS = [MenuVisual, ForwardVisual, AlertsVisual];
const STEP_ICONS = [BrainCircuit, PhoneForwarded, ClipboardList];

export function HowItWorks() {
  const [start, end] = HOW.title.split("15 minutes");
  return (
    <section className="section" id="how-it-works" aria-labelledby="how-title">
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="eyebrow">
            <span>{HOW.eyebrow}</span>
          </Reveal>
          <Reveal as="h2" className="h2" id="how-title" delay={0.05} blur>
            {start}
            <span className="hl">15 minutes</span>
            {end}
          </Reveal>
          <Reveal as="p" className="lede" delay={0.1}>
            {HOW.text}
          </Reveal>
        </header>

        <ol className="steps">
          {HOW.steps.map((step, i) => {
            const Visual = VISUALS[i];
            const Icon = STEP_ICONS[i];
            return (
              <Reveal
                as="li"
                key={step.title}
                className="panel step"
                delay={i * 0.1}
                y={32}
                data-spotlight
              >
                <Visual />
                <div className="step-body">
                  <span className="ic">
                    <Icon size={18} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>

        {/* The link target stays still while the card inside slides into place. */}
        <div id="roadmap" className="roadmap-anchor">
          <Reveal className="panel roadmap" y={32} data-spotlight>
            <div className="roadmap-copy">
              <span className="soon">{ROADMAP.badge}</span>
              <h3>{ROADMAP.title}</h3>
              <p>{ROADMAP.text}</p>
              <a className="btn btn-ghost" href="#pilot">
                {ROADMAP.button}
                <ArrowRight size={16} className="nudge" />
              </a>
            </div>
            <div className="pipeline" aria-hidden="true">
              <span className="pipe-node">
                <span className="mini-orb" /> {PIPELINE.from}
              </span>
              <span className="pipe-link" />
              <span className="pipe-node pos">
                {PIPELINE.pos.map(name => (
                  <span key={name}>{name}</span>
                ))}
              </span>
              <span className="pipe-link late" />
              <span className="pipe-node">
                <ChefHat size={17} /> {PIPELINE.to}
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
