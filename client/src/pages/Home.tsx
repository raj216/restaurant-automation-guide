import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  Clock3,
  FileCheck2,
  Headphones,
  LockKeyhole,
  Mail,
  MapPin,
  MessageSquareText,
  PhoneCall,
  RotateCcw,
  Send,
  ShieldCheck,
  Store,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

const sources = [
  {
    label: "Toast / Incept ordering guide",
    href: "https://support.toasttab.com/en/article/Get-Started-With-InceptAI-Integration",
  },
  {
    label: "Square voice-ordering guide",
    href: "https://squareup.com/help/us/en/article/8568-take-orders-with-ai-powered-voice-ordering",
  },
  {
    label: "Twilio client registration guide",
    href: "https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/onboarding-isv",
  },
];

const scenarios = [
  {
    id: "modifier",
    tab: "Complex modifier",
    prompt: "“Half no cheese, extra sauce on the side—and is the pasta gluten-free?”",
    response:
      "The assistant checks the approved menu, asks only the required modifier questions, and sends allergy uncertainty to a person instead of guessing.",
    outcome: "Menu checked · staff review required",
    status: "review",
  },
  {
    id: "future",
    tab: "Future pickup",
    prompt: "“I’m calling now for pickup tomorrow at 8:00 p.m.”",
    response:
      "The assistant confirms the calendar date, local time, and pickup type. If scheduled ordering is unsupported, it transfers the request rather than making a false promise.",
    outcome: "Date verified · no false confirmation",
    status: "verified",
  },
  {
    id: "unavailable",
    tab: "Team unavailable",
    prompt: "The review queue has no active restaurant staff member.",
    response:
      "Automated ordering pauses. Calls follow the restaurant’s fallback route, and the assistant clearly says that no order has been accepted.",
    outcome: "Fail closed · route to staff",
    status: "stopped",
  },
];

const faqs = [
  {
    q: "Does the assistant put orders directly into the POS?",
    a: "Not by assumption. The first pilot uses a staff-reviewed order draft and manual POS entry. Direct injection is considered only after the exact POS, menu, payment, scheduled-order, and kitchen-routing path has been tested and approved.",
  },
  {
    q: "What happens when someone requests a future pickup?",
    a: "The workflow confirms the calendar date, restaurant timezone, pickup type, and exact time. If the restaurant’s system cannot safely accept that future order, the assistant transfers or declines instead of guessing.",
  },
  {
    q: "Can Kadmivo also send birthdays and win-back offers?",
    a: "Yes, as a separate permission-based service. A number collected for an order is not marketing permission. We first audit the restaurant’s existing POS marketing tools, consent evidence, sender setup, and redemption tracking.",
  },
  {
    q: "Why not just buy the software ourselves?",
    a: "You can—and the restaurant should own the production accounts. Kadmivo’s work is the operational layer: menu setup, difficult-order testing, staff handoff, fallback, consent controls, monitoring, reporting, and a clean exit path.",
  },
  {
    q: "Will callers know they are speaking with an automated assistant?",
    a: "Yes. The opening identifies the restaurant and the automated assistant, and offers a path to the team. We do not design the experience to trick guests into believing they reached a person.",
  },
  {
    q: "Who owns our phone number, payments, and guest list?",
    a: "The restaurant should. Kadmivo uses named, removable access wherever the platform allows it. Your number, POS, processor, guest data, sender identity, and exports should remain under your control.",
  },
];

function KadmivoMark({ large = false }: { large?: boolean }) {
  return (
    <svg
      className={large ? "kadmivo-mark kadmivo-mark-large" : "kadmivo-mark"}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Kadmivo transfer mark"
    >
      <path className="mark-ink" d="M20 7H8v15h12" />
      <path className="mark-ink" d="M28 26h12v15H28" />
      <path className="mark-register" d="M24 10v28" />
      <path className="mark-transfer" d="M19 24h10" />
    </svg>
  );
}

function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={inverse ? "brand-lockup inverse" : "brand-lockup"}>
      <KadmivoMark />
      <span className="brand-word">Kadmivo</span>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-label">
      <span aria-hidden="true" />
      {children}
    </div>
  );
}

function HandoffLedger() {
  return (
    <div className="handoff-ledger" aria-label="Illustrative staff-reviewed order handoff">
      <div className="ledger-ribbon">
        <span>Illustrative flow</span>
        <span>Not a live order</span>
      </div>
      <div className="ledger-body">
        <div className="ledger-title-row">
          <div>
            <span className="ledger-overline">CALLER CONFIRMED</span>
            <h2>Order draft K-021</h2>
          </div>
          <span className="pending-chip"><Clock3 size={15} /> Pending staff review</span>
        </div>

        <div className="ledger-guest">
          <div className="guest-icon"><PhoneCall size={20} /></div>
          <div><strong>Pickup for Maya</strong><span>Today · 8:20 PM</span></div>
          <span>7:42 PM</span>
        </div>

        <div className="ledger-items">
          <div><span>1 × Rigatoni</span><small>extra sauce · no cheese</small></div>
          <strong>$19.00</strong>
          <div><span>1 × Garlic knots</span><small>sauce on the side</small></div>
          <strong>$8.50</strong>
        </div>

        <div className="state-track" aria-label="Order acceptance states">
          <div className="state done"><Check size={13} /><span>Caller confirmed</span></div>
          <div className="state done"><Check size={13} /><span>Menu checked</span></div>
          <div className="state current"><UserRoundCheck size={13} /><span>Restaurant review</span></div>
          <div className="state waiting"><span className="state-dot" /><span>POS accepted</span></div>
        </div>

        <div className="ledger-rule">
          <ShieldCheck size={17} />
          <span><strong>The kitchen follows the POS ticket</strong>—not an AI transcript.</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [openFaq, setOpenFaq] = useState(0);
  const [activeScenario, setActiveScenario] = useState(0);
  const [paused, setPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "error">("idle");
  const formEndpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;
  const scenario = scenarios[activeScenario];

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>

      <div className="trust-bar">
        <span>KADMIVO / JERSEY CITY + NYC</span>
        <span className="trust-bar-center">Restaurant-owned systems. Staff-backed handoff.</span>
        <span><MapPin size={14} /> Local pilot availability</span>
      </div>

      <header className="site-header">
        <a href="#top" className="brand" aria-label="Kadmivo home"><BrandLockup /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#services">What we do</a>
          <a href="#handoff">The handoff</a>
          <a href="#guardrails">Safeguards</a>
          <a href="#pilot">90-day pilot</a>
        </nav>
        <a className="header-cta" href="#contact">Review my phone flow <ArrowRight size={16} /></a>
      </header>

      <main id="main">
        <section id="top" className="hero">
          <div className="hero-copy">
            <SectionLabel>Phone-order recovery · permission-based guest return</SectionLabel>
            <h1>A phone-order workflow <em>your team stays in control of.</em></h1>
            <p className="hero-lede">
              Kadmivo helps independent restaurants handle routine calls, build a menu-checked order draft, and repeat it to the guest. Your team reviews the order before it enters the POS and reaches the kitchen.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#contact">Book a 20-minute phone-flow review <ArrowRight size={18} /></a>
              <a className="button text-button" href="#handoff">See the staff-review process</a>
            </div>
            <div className="hero-commitments" aria-label="Pilot commitments">
              <span><FileCheck2 size={17} /> Approved menu first</span>
              <span><UserRoundCheck size={17} /> Staff review before POS</span>
              <span><LockKeyhole size={17} /> No spoken card numbers</span>
            </div>
          </div>

          <div className="hero-artifact">
            <div className="artifact-note note-one">human approval<br />stays visible</div>
            <HandoffLedger />
            <div className="artifact-note note-two">one call<br />one order record</div>
          </div>

          <div className="scope-strip">
            <div><span>START NARROW</span><strong>One location</strong></div>
            <div><span>VERIFY FIRST</span><strong>One approved menu</strong></div>
            <div><span>MEASURE HONESTLY</span><strong>One 90-day pilot</strong></div>
            <p>First pilots use a defined menu and staffed acceptance hours. We confirm fit before setup.</p>
          </div>
        </section>

        <section className="handoff-statement section-pad">
          <div className="statement-index">01</div>
          <div>
            <SectionLabel>The real product</SectionLabel>
            <h2>There is a gap.<br /><em>It lives in the handoff.</em></h2>
          </div>
          <div className="statement-copy">
            <p className="large-copy">Restaurants do not need another company promising “AI.” They need someone accountable for what happens between a ringing phone and a ticket the kitchen can trust.</p>
            <p>Kadmivo configures the workflow, tests the difficult orders, gives staff a clear acceptance step, watches the exceptions, and documents what happens when something fails.</p>
            <a href="#guardrails" className="inline-link">See what stays human <ArrowRight size={16} /></a>
          </div>
        </section>

        <section id="services" className="services section-pad-wide">
          <div className="section-intro">
            <SectionLabel>Two services · one accountable handoff</SectionLabel>
            <h2>Recover today’s order.<br />Earn the next visit.</h2>
            <p>Phone-order recovery is the first service. Permission-based follow-up becomes useful after the restaurant can identify guests and prove consent.</p>
          </div>

          <div className="service-layout">
            <article className="service-primary">
              <div className="service-number">01</div>
              <div className="service-badge">PRIMARY SERVICE</div>
              <PhoneCall size={34} />
              <h3>Phone-order recovery</h3>
              <p>Routine calls become structured order drafts. The guest hears the exact order back. A restaurant employee reviews it before POS entry and kitchen release.</p>
              <div className="service-list">
                <span><Check size={16} /> Approved menu and modifier rules</span>
                <span><Check size={16} /> English/Spanish test scenarios</span>
                <span><Check size={16} /> Human transfer and outage route</span>
                <span><Check size={16} /> Order-to-POS reconciliation</span>
              </div>
              <div className="service-boundary"><XCircle size={17} /><span><strong>Not included by default:</strong> autonomous kitchen release, spoken card capture, or untested direct POS injection.</span></div>
            </article>

            <article className="service-secondary">
              <div className="service-number">02</div>
              <div className="service-badge secondary">SECONDARY SERVICE</div>
              <MessageSquareText size={30} />
              <h3>Permissioned guest return</h3>
              <p>We first check whether the restaurant’s existing POS marketing tools can handle the job. Then we configure welcome, birthday, post-visit, win-back, and seasonal flows with real opt-in and redemption tracking.</p>
              <div className="consent-card">
                <ShieldCheck size={20} />
                <div><strong>A phone number is not marketing permission.</strong><span>Order updates and promotions remain separate.</span></div>
              </div>
              <a href="#contact" className="inline-link">Review the existing setup <ArrowRight size={16} /></a>
            </article>
          </div>
        </section>

        <section id="handoff" className="process section-pad-wide">
          <div className="process-heading">
            <div><SectionLabel>The assisted-order workflow</SectionLabel><h2>From “hello” to a ticket—<em>without skipping the person.</em></h2></div>
            <p>Caller confirmation and restaurant acceptance are different states. Kadmivo keeps that distinction visible.</p>
          </div>

          <div className="process-rail">
            {[
              ["01", PhoneCall, "The call lands", "The assistant identifies itself, offers a person, and stays within the restaurant’s approved order window."],
              ["02", FileCheck2, "The menu checks it", "Items, required modifiers, prices, hours, and unsupported requests follow deterministic rules—not guesswork."],
              ["03", BadgeCheck, "The guest confirms", "The complete draft is read back. Changes return to the draft before one submission is created."],
              ["04", UserRoundCheck, "The restaurant accepts", "A named staff member verifies the order and enters it once. The POS/KDS ticket releases preparation."],
            ].map(([number, Icon, title, copy]) => (
              <article className="process-step" key={String(number)}>
                <div className="step-top"><span>{number as string}</span><Icon size={22} /></div>
                <h3>{title as string}</h3>
                <p>{copy as string}</p>
              </article>
            ))}
          </div>

          <div className="acceptance-rule"><span>THE ACCEPTANCE RULE</span><strong>No order is treated as accepted until the restaurant’s chosen acceptance step is complete.</strong></div>
        </section>

        <section className="edge-cases section-pad-wide">
          <div className="edge-copy">
            <SectionLabel>Trust is built at the edge</SectionLabel>
            <h2>What happens when the easy answer is wrong?</h2>
            <p>Choose a situation. The safe result is sometimes an order draft. Sometimes it is a transfer. Sometimes it is simply “not accepted.”</p>
            <div className="scenario-tabs" role="tablist" aria-label="Order edge cases">
              {scenarios.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeScenario === index}
                  className={activeScenario === index ? "active" : ""}
                  onClick={() => setActiveScenario(index)}
                >
                  <span>0{index + 1}</span>{item.tab}
                </button>
              ))}
            </div>
          </div>

          <div className="scenario-card" role="tabpanel">
            <div className="scenario-label">REAL OPERATING QUESTION</div>
            <blockquote>{scenario.prompt}</blockquote>
            <div className="scenario-response"><Headphones size={20} /><p>{scenario.response}</p></div>
            <div className={`scenario-outcome ${scenario.status}`}>
              {scenario.status === "stopped" ? <CirclePause size={18} /> : <CheckCircle2 size={18} />}
              <span>{scenario.outcome}</span>
            </div>
            <small>Example behavior. Final rules are approved and tested with each restaurant.</small>
          </div>
        </section>

        <section id="guardrails" className="guardrails section-pad-wide">
          <div className="guardrail-heading">
            <SectionLabel>The human promise</SectionLabel>
            <h2>A person can take over.<br />The restaurant can pause the workflow.</h2>
          </div>

          <div className="control-room">
            <div className="control-copy">
              <span className="control-eyebrow">DEMO CONTROL · NOT CONNECTED TO A LIVE RESTAURANT</span>
              <h3>{paused ? "Automated ordering is paused." : "Automated ordering is available."}</h3>
              <p>{paused ? "New order requests would follow the restaurant’s approved staff or unavailable route. Nothing is silently accepted." : "Calls may enter the approved assisted-order flow. Staff review remains required before POS entry."}</p>
              <button className={paused ? "pause-control paused" : "pause-control"} type="button" onClick={() => setPaused(!paused)}>
                {paused ? <><RotateCcw size={18} /> Resume demo workflow</> : <><CirclePause size={18} /> Pause demo workflow</>}
              </button>
            </div>
            <div className="control-status">
              <div><span>Phone route</span><strong>{paused ? "Staff / unavailable message" : "Assisted order flow"}</strong></div>
              <div><span>Order creation</span><strong>{paused ? "Blocked" : "Pending review only"}</strong></div>
              <div><span>Kitchen release</span><strong>POS / KDS only</strong></div>
              <div><span>Human takeover</span><strong>Always available when staffed</strong></div>
            </div>
          </div>

          <div className="guardrail-grid">
            <article><LockKeyhole size={22} /><h3>No spoken card details</h3><p>Use pay at pickup or a restaurant-owned secure checkout page. Kadmivo does not build a payment vault.</p></article>
            <article><ShieldCheck size={22} /><h3>No guessing at the menu</h3><p>Unknown items, allergens, unavailable choices, and unsupported requests go to staff or stop safely.</p></article>
            <article><UserRoundCheck size={22} /><h3>No invisible handoff</h3><p>Every submitted order has a state, a staff owner, a timestamp, and a final POS outcome.</p></article>
          </div>
        </section>

        <section className="ownership section-pad-wide">
          <div className="ownership-copy">
            <SectionLabel>Ownership and exit</SectionLabel>
            <h2>Your restaurant should still be yours if Kadmivo leaves.</h2>
            <p>Trust is not “we will never leave.” Trust is a clean handoff if the relationship ends.</p>
          </div>
          <div className="ownership-ledger">
            {[
              ["Phone number", "Restaurant controlled", "Routing can be restored"],
              ["POS + payments", "Restaurant owned", "No Kadmivo custody of funds"],
              ["Guest + consent data", "Restaurant owned", "Exportable with suppression history"],
              ["Workflow", "Managed together", "Configuration and operating record provided"],
            ].map(([asset, owner, exit]) => (
              <div className="ownership-row" key={asset}>
                <strong>{asset}</strong><span>{owner}</span><span>{exit}</span><CheckCircle2 size={17} />
              </div>
            ))}
          </div>
        </section>

        <section id="pilot" className="pilot section-pad-wide">
          <div className="pilot-top">
            <div><SectionLabel>The 90-day operating test</SectionLabel><h2>Start with one service window.<br /><em>Earn the right to expand.</em></h2></div>
            <div className="pilot-price"><span>Suggested pilot structure</span><strong>$750–$1,500</strong><p>setup + $350–$600/month management<br />Software and usage billed transparently.</p></div>
          </div>

          <div className="pilot-phases">
            <article><span>DAYS 0–14</span><h3>Diagnose + shadow</h3><p>Baseline missed calls, approve one menu, test hard orders, name the reviewers, and run without customer traffic.</p></article>
            <article><span>DAYS 15–30</span><h3>Supervised launch</h3><p>Route a limited, staffed window. Review every exception and every difference between the draft and POS ticket.</p></article>
            <article><span>DAYS 31–60</span><h3>Controlled expansion</h3><p>Add one dimension at a time—more menu or more hours, never every capability at once.</p></article>
            <article><span>DAYS 61–90</span><h3>Prove or stop</h3><p>Measure completed orders, errors, staff time, contribution, opt-outs, and failures. Then stop, repair, or standardize.</p></article>
          </div>

          <div className="proof-definition">
            <span>WHAT COUNTS AS PROOF</span>
            <p><strong>Verified orders—not AI activity.</strong> One caller-confirmed submission should reconcile to one accepted, rejected, cancelled, or investigated restaurant outcome.</p>
          </div>
        </section>

        <section className="faq section-pad-wide">
          <div className="faq-heading"><SectionLabel>Questions before software</SectionLabel><h2>What a careful owner should ask.</h2><p>If the answer hides the handoff, it is not a complete answer.</p></div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div className={openFaq === index ? "faq-item open" : "faq-item"} key={faq.q}>
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                  <span>{faq.q}</span><ChevronDown size={20} />
                </button>
                {openFaq === index && <div className="faq-answer"><p>{faq.a}</p></div>}
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="contact section-pad-wide">
          <div className="contact-copy">
            <SectionLabel>Begin with the operation</SectionLabel>
            <h2>Start with a 20-minute phone-flow review.</h2>
            <p>We will look at the calls you lose, the POS you already use, who can review orders, and whether an assisted pilot is sensible. “Not a fit yet” is a valid answer.</p>
            <div className="review-agenda">
              <span><Clock3 size={17} /> Twenty minutes</span>
              <span><Store size={17} /> One restaurant</span>
              <span><FileCheck2 size={17} /> One practical next step</span>
            </div>
            <div className="no-pressure-note"><ShieldCheck size={19} /><span><strong>No mailing list.</strong> We use these details only to respond to this request.</span></div>
          </div>

          <div className="lead-card">
            {submitted ? (
              <div className="form-success">
                <CheckCircle2 size={34} />
                <span>REQUEST RECEIVED</span>
                <h3>We have the starting point.</h3>
                <p>We’ll use the restaurant and POS details you shared to prepare a focused first conversation.</p>
                <button className="button primary" type="button" onClick={() => { setSubmitted(false); setFormStatus("idle"); }}>Send another request <ArrowRight size={17} /></button>
              </div>
            ) : (
              <form
                action={formEndpoint || undefined}
                method="POST"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!formEndpoint) {
                    setFormStatus("error");
                    return;
                  }
                  setFormStatus("submitting");
                  try {
                    const response = await fetch(formEndpoint, {
                      method: "POST",
                      body: new FormData(event.currentTarget),
                      headers: { Accept: "application/json" },
                    });
                    if (response.ok) {
                      setSubmitted(true);
                      setFormStatus("idle");
                    } else {
                      setFormStatus("error");
                    }
                  } catch {
                    setFormStatus("error");
                  }
                }}
              >
                <div className="form-heading"><span>PHONE + POS PREFLIGHT</span><h3>Tell us where the handoff breaks.</h3><p>Fields marked required help us prepare. Phone is optional.</p></div>
                <div className="form-grid">
                  <label><span>Your name *</span><input name="name" type="text" autoComplete="name" placeholder="Jamie Rivera" required /></label>
                  <label><span>Restaurant name *</span><input name="restaurant" type="text" autoComplete="organization" placeholder="Rivera Kitchen" required /></label>
                  <label><span>Email *</span><input name="email" type="email" autoComplete="email" placeholder="jamie@restaurant.com" required /></label>
                  <label><span>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(201) 555-0148" /></label>
                  <label><span>City / neighborhood *</span><input name="location" type="text" autoComplete="address-level2" placeholder="Jersey City, NJ" required /></label>
                  <label><span>Current POS *</span><select name="pos" defaultValue="" required><option value="" disabled>Select your POS</option><option>Toast</option><option>Square</option><option>SpotOn</option><option>Clover</option><option>Other / not sure</option></select></label>
                </div>
                <label className="form-wide"><span>What happens when the phone gets busy? *</span><textarea name="need" rows={4} placeholder="Calls ring out during dinner, staff puts people on hold, future pickup orders get missed..." required /></label>
                <label className="contact-choice"><span>Best way to respond</span><select name="contact_preference" defaultValue="email"><option value="email">Email me</option><option value="phone">Call me</option><option value="either">Either is fine</option></select></label>
                <div className="form-footer">
                  <p>By sending this request, you agree that Kadmivo may contact you about this review. No promotional list.</p>
                  <button className="button primary" type="submit" disabled={formStatus === "submitting"}>{formStatus === "submitting" ? "Sending…" : <>Request the phone-flow review <Send size={17} /></>}</button>
                </div>
                {formStatus === "error" && (
                  <div className="form-error" role="alert"><XCircle size={18} /><span>The request form is not connected yet. Add the secure Formspree endpoint before launch; no information was sent.</span></div>
                )}
              </form>
            )}
          </div>
        </section>

        <section className="closing">
          <div className="closing-mark"><KadmivoMark large /></div>
          <SectionLabel>The operating principle</SectionLabel>
          <h2>Don’t sell “AI.”<br /><em>Sell the recovered order.</em></h2>
          <p>Recover the call. Return the guest.</p>
          <a className="button closing-button" href="#contact">Map my handoff <ArrowRight size={18} /></a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div><a className="brand" href="#top" aria-label="Kadmivo home"><BrandLockup inverse /></a><p>Human-controlled phone-order recovery and permission-based guest follow-up for independent restaurants.</p></div>
          <div className="footer-links">
            <div><span>Explore</span><a href="#services">Services</a><a href="#handoff">The handoff</a><a href="#pilot">Pilot</a><a href="#contact">Phone-flow review</a></div>
            <div><span>Operational sources</span>{sources.map((source) => <a href={source.href} target="_blank" rel="noreferrer" key={source.label}>{source.label} <ArrowRight size={13} /></a>)}</div>
          </div>
        </div>
        <div className="footer-bottom"><span>Working brand · preliminary name screening only</span><span>Jersey City + New York City</span><span>© 2026 Kadmivo</span></div>
      </footer>
    </div>
  );
}

export default App;
