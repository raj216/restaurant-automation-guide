import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  Handshake,
  Headset,
  HeartHandshake,
} from "lucide-react";
import { BrioBall } from "./BrioBall";
import { PILOT_CTA, PRICING } from "./content";
import { Reveal } from "./motion";

const PROMISE_ICONS = [HeartHandshake, Headset, BadgeDollarSign, Handshake];

/**
 * The plans: the same Brio in each, priced by the minutes of calls a month.
 * Every button leads to the pilot form.
 */
export function Pricing() {
  return (
    <section className="section" id="pricing" aria-labelledby="pricing-title">
      <div className="wrap">
        <header className="section-head">
          <Reveal as="p" className="eyebrow">
            <span>{PRICING.eyebrow}</span>
          </Reveal>
          <Reveal as="h2" className="h2" id="pricing-title" delay={0.05} blur>
            {PRICING.titleStart}
            <span className="hl">{PRICING.titleHighlight}</span>
            {PRICING.titleEnd}
          </Reveal>
          <Reveal as="p" className="lede" delay={0.1}>
            {PRICING.lede}
          </Reveal>
        </header>

        <div className="plans">
          {PRICING.plans.map((plan, i) => (
            <Reveal
              key={plan.name}
              className={`plan panel${plan.popular ? " is-popular" : ""}`}
              delay={i * 0.08}
              y={30}
              data-spotlight
            >
              {plan.popular && (
                <span className="plan-badge">
                  <span className="mini-orb">
                    <BrioBall />
                  </span>
                  {PRICING.popular}
                </span>
              )}
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-fit">{plan.fit}</p>
              <p className="plan-price">
                <span className="plan-amount">${plan.weekly}</span>
                <span className="plan-per">{PRICING.perWeek}</span>
              </p>
              <p className="plan-billed">{PRICING.billed(plan.monthly)}</p>
              <div className="plan-minutes">
                <span>{PRICING.minutes(plan.minutes)}</span>
                <span className="plan-meter" aria-hidden="true">
                  <i style={{ width: `${plan.share * 100}%` }} />
                </span>
              </div>
              <a
                className={`btn btn-lg btn-block ${plan.popular ? "btn-primary" : "btn-ghost"}`}
                href="#pilot"
              >
                {PILOT_CTA}
                <ArrowRight size={17} className="nudge" />
              </a>
              <p className="plan-included">{PRICING.included}</p>
              <ul className="plan-features">
                {PRICING.features.map(feature => (
                  <li key={feature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal className="plan-custom panel" y={24} data-spotlight>
          <div>
            <p className="plan-custom-name">{PRICING.custom.name}</p>
            <h3>{PRICING.custom.title}</h3>
            <p>{PRICING.custom.text}</p>
          </div>
          <a className="btn btn-ghost btn-lg" href="#pilot">
            {PRICING.custom.button}
            <ArrowRight size={17} className="nudge" />
          </a>
        </Reveal>

        <Reveal className="promises" y={20}>
          <h3>{PRICING.promisesTitle}</h3>
          <ul>
            {PRICING.promises.map((promise, i) => {
              const Icon = PROMISE_ICONS[i];
              return (
                <li key={promise.label}>
                  <span className="promise-icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <b>{promise.label}</b>
                  <span>{promise.note}</span>
                </li>
              );
            })}
          </ul>
          <p className="promises-note">{PRICING.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
