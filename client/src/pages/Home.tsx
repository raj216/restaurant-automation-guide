import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  Send,
  Megaphone,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const sources = [
  { label: "Toast AI ordering", href: "https://support.toasttab.com/en/article/Get-Started-With-InceptAI-Integration" },
  { label: "Square voice ordering", href: "https://squareup.com/help/us/en/article/8568-take-orders-with-ai-powered-voice-ordering" },
  { label: "Toast SMS marketing", href: "https://support.toasttab.com/en/article/Get-Started-With-SMS-Marketing" },
  { label: "Federal Reserve adoption data", href: "https://www.federalreserve.gov/econres/notes/feds-notes/monitoring-ai-adoption-in-the-u-s-economy-20260403.html" },
];

const faqs = [
  {
    q: "Does the AI really put the order into the POS?",
    a: "When the selected vendor has a native integration, yes: the agent can create an order in the POS, order manager, or kitchen display system. The implementation must verify the exact connector, payment behavior, modifiers, and future-order support before launch.",
  },
  {
    q: "What happens when the caller asks for a future pickup order?",
    a: "The agent should confirm the calendar date, local timezone, fulfillment type, and exact time. If the POS supports scheduled orders, it creates one with a separate creation timestamp and fulfillment timestamp. If not, it sends a checkout link or transfers the request rather than guessing.",
  },
  {
    q: "Can the same system send birthdays and win-back offers?",
    a: "Yes, but the restaurant needs permissioned email or SMS data. A phone number collected for an order is not automatically permission to send marketing texts. Campaigns should be connected to a POS coupon or loyalty reward so redemptions and revenue can be measured.",
  },
  {
    q: "Why would a restaurant pay an implementer if the software already exists?",
    a: "Because a live demo is not the same as a reliable production workflow. Someone still needs to configure the menu, test modifiers, define human escalation, validate the POS ticket, document consent, and review failures after launch.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label"><span className="section-dot" />{children}</div>;
}

function BrandLockup() {
  return <><span className="regulars-mark" aria-hidden="true"><span className="regulars-mark-dot" /></span><span className="brand-word">regulars</span></>;
}

function PhoneLedger() {
  return (
    <div className="phone-ledger">
      <div className="ledger-head">
        <div>
          <div className="eyebrow">LIVE CALL / ORDER FLOW</div>
          <div className="ledger-title">Pickup order · #2048</div>
        </div>
        <div className="live-pill"><span /> LIVE</div>
      </div>
      <div className="call-line">
        <div className="avatar-bubble"><PhoneCall size={17} /></div>
        <div className="call-copy"><strong>AI host</strong><span>“What can I get started for you?”</span></div>
        <span className="timestamp">01:00 AM</span>
      </div>
      <div className="order-card">
        <div className="order-card-top"><span className="order-status"><CheckCircle2 size={15} /> Confirmed</span><span className="order-time">Tomorrow · 8:00 PM</span></div>
        <div className="order-item"><span>1 × Spicy vodka rigatoni</span><b>$19.00</b></div>
        <div className="order-item"><span>1 × Garlic knots · extra sauce</span><b>$8.50</b></div>
        <div className="order-item"><span>Pickup · Jamie R.</span><b>••• 4821</b></div>
        <div className="order-total"><span>Total after online payment</span><strong>$29.89</strong></div>
      </div>
      <div className="ledger-footer"><span><Zap size={14} /> Sent to POS / KDS</span><span>Receipt texted</span></div>
    </div>
  );
}

function FlowStep({ index, icon: Icon, title, text, tone }: { index: string; icon: React.ElementType; title: string; text: string; tone: string }) {
  return (
    <div className="flow-step">
      <div className={`flow-icon ${tone}`}><Icon size={20} /></div>
      <div className="flow-index">{index}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function App() {
  const [openFaq, setOpenFaq] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "error">("idle");
  const formEndpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;

  return (
    <div className="site-shell">
      <div className="topline"><span>REGULARS / FIELD NOTE 01</span><span>Independent restaurants · NJ / NYC metro</span><span className="topline-right"><MapPin size={13} /> Jersey City → Manhattan</span></div>

      <header className="nav-wrap">
        <a className="brand" href="#top" aria-label="Regulars home"><BrandLockup /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#workflow">The workflow</a>
          <a href="#marketing">Retention layer</a>
          <a href="#pilot">Pilot plan</a>
        </nav>
        <a className="nav-cta" href="#contact">Request a consultation <ArrowUpRight size={15} /></a>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="kicker-line" /> Answer every call. Create more regulars.</div>
              <h1>Your phone should take the order while your team runs the kitchen.</h1>
              <p className="hero-lede">Regulars helps independent restaurants capture phone orders, hand them reliably to the POS, and bring opted-in guests back with timely follow-up — built for operators in the NYC metro.</p>
              <div className="hero-actions"><a className="button button-primary" href="#workflow">See how it works <ArrowRight size={17} /></a><a className="button button-ghost" href="#verdict">Read the verdict <ArrowDownRight size={17} /></a></div>
              <div className="hero-meta"><div className="meta-avatars"><span>JC</span><span>HB</span><span>NY</span></div><div><strong>For owners who want more orders — and more regulars.</strong><small>Research-backed · no “AI for everyone” pitch</small></div></div>
            </div>
            <div className="hero-visual"><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-caption caption-left"><span className="caption-number">01</span><span>Call → confirmed order</span></div><PhoneLedger /><div className="visual-caption caption-right"><span className="caption-number">02</span><span>Order → kitchen</span></div></div>
          </div>
          <div className="proof-strip"><div className="proof-intro">THE SIGNAL<br /><span>behind the opportunity</span></div><div className="proof-stat"><strong>6<span>%</span></strong><span>of restaurants reported using AI for customer orders</span></div><div className="proof-divider" /><div className="proof-stat"><strong>18<span>%</span></strong><span>of U.S. firms had adopted AI by year-end 2025</span></div><div className="proof-divider" /><div className="proof-note"><ShieldCheck size={18} /><span>The gap is not software availability.<br /><b>It is reliable implementation.</b></span></div></div>
        </section>

        <section id="verdict" className="verdict-section section-pad">
          <div className="section-grid"><div><SectionLabel>The short answer</SectionLabel><h2>There is a gap.<br /><em>It lives in the handoff.</em></h2></div><div className="verdict-copy"><p className="lead-paragraph">Restaurants can already buy the tools. Many still do not have a trusted person to select the right one, connect it to the POS, test the weird orders, and watch the system after launch.</p><p>That is why the strongest business is not a generic AI agency. It is a focused implementation and managed-optimization service for restaurants with real phone volume and a supported POS.</p><a className="text-link" href="#pilot">Turn the insight into a pilot <ArrowRight size={16} /></a></div></div>
          <div className="signal-cards"><div className="signal-card warm"><div className="signal-card-head"><span className="mini-label">THE PRODUCT GAP</span><PhoneCall size={19} /></div><strong>Phone ordering</strong><p>Low reported adoption, clear rush-hour pain, and a direct path to measurable recovered demand.</p><div className="signal-tag">Best first wedge</div></div><div className="signal-card mint"><div className="signal-card-head"><span className="mini-label">THE EXECUTION GAP</span><CheckCircle2 size={19} /></div><strong>POS reliability</strong><p>Menu logic, modifiers, timing, payment, escalation, and ticket accuracy are where trust is won.</p><div className="signal-tag">Where you earn the fee</div></div><div className="signal-card lilac"><div className="signal-card-head"><span className="mini-label">THE RETENTION GAP</span><Megaphone size={19} /></div><strong>Marketing automation</strong><p>Often bundled already. The value is in consent, offer design, segmentation, and attribution.</p><div className="signal-tag">Best second module</div></div></div>
        </section>

        <section id="workflow" className="workflow-section section-pad">
          <div className="workflow-heading"><div><SectionLabel>01 / The workflow</SectionLabel><h2>From “hello?”<br />to the kitchen screen.</h2></div><p>Native integrations can create a real POS order — not just send a transcript to an overwhelmed manager. The quality of the implementation determines whether the handoff is trustworthy.</p></div>
          <div className="flow-grid"><FlowStep index="01" icon={PhoneCall} title="The call lands" text="A business number or forwarding rule routes the call to the voice agent, even during the dinner rush." tone="tone-amber" /><FlowStep index="02" icon={ChefHat} title="The menu guides it" text="The agent uses structured items, modifiers, hours, sold-out rules, and human escalation paths." tone="tone-mint" /><FlowStep index="03" icon={CalendarClock} title="Time gets explicit" text="“Tomorrow at 8” becomes a calendar date, timezone, order type, and fulfillment promise." tone="tone-lilac" /><FlowStep index="04" icon={Activity} title="The ticket arrives" text="With a native connector, the order reaches the POS, order manager, or KDS for fulfillment." tone="tone-blue" /></div>
          <div className="schedule-panel"><div className="schedule-story"><div className="mini-label">THE EDGE CASE THAT MATTERS</div><h3>1:00 a.m. call.<br /><span>Tomorrow’s 8:00 p.m. pickup.</span></h3><p>The agent must separate creation time from fulfillment time, confirm the date, and know whether the POS supports scheduled orders. If it does not, it should send a checkout link or escalate — never guess.</p><div className="schedule-checks"><span><Check size={14} /> Calendar date</span><span><Check size={14} /> Local timezone</span><span><Check size={14} /> Scheduled POS support</span></div></div><div className="schedule-log"><div className="log-row"><span className="log-time">01:00</span><span className="log-dot amber" /><div><b>Call received</b><small>Jamie asks for pickup tomorrow</small></div></div><div className="log-row"><span className="log-time">01:01</span><span className="log-dot mint" /><div><b>Order confirmed</b><small>Modifiers and fulfillment time repeated</small></div></div><div className="log-row"><span className="log-time">01:01</span><span className="log-dot blue" /><div><b>POS / KDS queued</b><small>Payment link completed · receipt texted</small></div></div><div className="log-foot"><BadgeCheck size={16} /> Test this before you promise it.</div></div></div>
        </section>

        <section id="marketing" className="marketing-section section-pad">
          <div className="marketing-layout"><div className="marketing-copy"><SectionLabel>02 / The restaurant follow-up system</SectionLabel><h2>Turn a transaction into the next visit.</h2><p>For independent restaurants whose POS marketing features are not turned on, we activate a complete follow-up system: birthday and occasion triggers, a welcome sequence, win-back messages after a defined number of days absent, and seasonal offers tied to real redemption data.</p><div className="consent-note"><ShieldCheck size={20} /><div><strong>Phone number ≠ marketing permission</strong><span>Opt-in, opt-out, quiet hours, and offer tracking belong in the setup.</span></div></div><a className="text-link" href="#pilot">See the service stack <ArrowRight size={16} /></a></div><div className="campaign-board campaign-board-secondary"><div className="board-top"><span>RESTAURANT FOLLOW-UP</span><span className="board-status"><span /> ready to activate</span></div><div className="campaign-row"><div className="campaign-icon pink"><Mail size={17} /></div><div><strong>Birthday + occasion</strong><small>Triggered · loyalty or email consent</small></div><span className="campaign-count">01</span></div><div className="campaign-row"><div className="campaign-icon amber"><MessageSquareText size={17} /></div><div><strong>Win-back after 45 days</strong><small>Triggered · opted-in guests only</small></div><span className="campaign-count">02</span></div><div className="campaign-row"><div className="campaign-icon mint"><Megaphone size={17} /></div><div><strong>Seasonal offer</strong><small>Draft → test → POS redemption</small></div><span className="campaign-count">03</span></div><div className="board-bottom"><span><Zap size={14} /> Phone recovery stays first</span><span>Consent required</span></div></div></div>
        </section>

        <section id="pilot" className="pilot-section section-pad"><div className="pilot-intro"><SectionLabel>04 / The 90-day test</SectionLabel><h2>Sell the outcome.<br /><em>Prove the handoff.</em></h2><p>Three paid pilots will tell you more than a year of generic AI positioning. Measure the baseline, configure one stack, and make the restaurant’s own data the case study.</p></div><div className="pilot-timeline"><div className="pilot-step"><span className="pilot-num">01</span><div><strong>Diagnose</strong><p>Count missed calls, phone orders, rush-hour interruptions, POS, and customer consent.</p></div></div><div className="pilot-step"><span className="pilot-num">02</span><div><strong>Deploy</strong><p>Install the vendor, configure the menu, test difficult orders, and define human handoff.</p></div></div><div className="pilot-step"><span className="pilot-num">03</span><div><strong>Report</strong><p>Track answered calls, completed orders, errors, transfers, redemptions, and repeat visits.</p></div></div><div className="pilot-price"><span>Suggested starting shape</span><strong>$750–$1,500</strong><small>setup + $350–$600/mo management<br />software billed transparently</small></div></div></section>

        <section id="contact" className="contact-section section-pad"><div className="contact-layout"><div className="contact-copy"><SectionLabel>Start with your restaurant</SectionLabel><h2>Let’s find the<br /><em>missed-call leak.</em></h2><p>Tell us a little about the operation. We’ll come back with a practical recommendation for your phone flow, POS, and first 90-day test — not a generic AI pitch.</p><div className="contact-points"><span><CheckCircle2 size={16} /> 20-minute working session</span><span><CheckCircle2 size={16} /> POS-aware recommendations</span><span><CheckCircle2 size={16} /> No commitment to start</span></div></div><div className="lead-card">{submitted ? <div className="form-success"><div className="success-icon"><CheckCircle2 size={26} /></div><div className="mini-label">REQUEST RECEIVED</div><h3>Good first step.</h3><p>Your consultation request reached the intake system. We’ll use the details you shared to shape a restaurant-specific conversation.</p><button className="button button-primary" onClick={() => { setSubmitted(false); setFormStatus("idle"); }}>Send another request <ArrowRight size={16} /></button></div> : <form action={formEndpoint || undefined} method="POST" onSubmit={async (event) => { event.preventDefault(); if (!formEndpoint) { setFormStatus("error"); return; } setFormStatus("submitting"); const response = await fetch(formEndpoint, { method: "POST", body: new FormData(event.currentTarget), headers: { Accept: "application/json" } }); if (response.ok) { setSubmitted(true); setFormStatus("idle"); } else { setFormStatus("error"); } }}><div className="form-head"><div><span className="mini-label">PERSONALIZED DEMO / CONSULTATION</span><h3>Make the handoff easier.</h3></div><div className="form-badge"><Sparkles size={14} /> Free first look</div></div><div className="form-grid"><label><span>Your name</span><input name="name" type="text" placeholder="Jamie Rivera" required /></label><label><span>Restaurant name</span><input name="restaurant" type="text" placeholder="Rivera Kitchen" required /></label><label><span>Email</span><input name="email" type="email" placeholder="jamie@restaurant.com" required /></label><label><span>Phone</span><input name="phone" type="tel" placeholder="(201) 555-0148" required /></label><label><span>City / neighborhood</span><input name="location" type="text" placeholder="Jersey City, NJ" required /></label><label><span>Current POS</span><select name="pos" defaultValue=""><option value="" disabled>Select your POS</option><option>Toast</option><option>Square</option><option>SpotOn</option><option>Clover</option><option>Other / not sure</option></select></label></div><label className="form-wide"><span>What would you like to improve first?</span><textarea name="need" rows={3} placeholder="Missed calls during dinner, future pickup orders, win-back messages..." required /></label><div className="form-footer"><span className="form-note"><ShieldCheck size={15} /> We’ll only use this to prepare your consultation.</span><button className="button button-primary" type="submit" disabled={formStatus === "submitting"}>{formStatus === "submitting" ? "Sending request…" : <>Request my consultation <Send size={15} /></>}</button></div>{formStatus === "error" && <p className="form-error" role="alert">This form is not connected yet. Add the restaurant’s Formspree endpoint to finish setup, then submissions will be emailed and stored automatically.</p>}</form>}</div></div></section>
        <section className="faq-section section-pad"><div className="faq-heading"><SectionLabel>Field questions</SectionLabel><h2>What owners will ask.</h2><p>Trust is built by naming the edge cases before they happen.</p></div><div className="faq-list">{faqs.map((faq, index) => <div key={faq.q} className={`faq-item ${openFaq === index ? "open" : ""}`}><button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{faq.q}</span><ChevronDown size={18} /></button>{openFaq === index && <div className="faq-answer"><p>{faq.a}</p></div>}</div>)}</div></section>

        <section className="closing-section"><div className="closing-glow" /><div className="closing-content"><div className="closing-mark"><span className="regulars-mark regulars-mark-large" aria-hidden="true"><span className="regulars-mark-dot" /></span></div><SectionLabel>The point</SectionLabel><h2>Don’t sell “AI.”<br /><span>Sell the recovered order.</span></h2><p>Answer every call. Create more regulars.</p><a className="button button-light" href="#top">Back to the top <ArrowUpRight size={16} /></a></div></section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><a className="brand" href="#top" aria-label="Regulars home"><BrandLockup /></a><p>Phone-order recovery and guest follow-up for independent restaurants in the NYC metro.</p></div><div className="footer-links"><div><span>Explore</span><a href="#workflow">The workflow</a><a href="#marketing">Retention layer</a><a href="#pilot">Pilot plan</a></div><div><span>Sources</span>{sources.slice(0, 2).map(source => <a key={source.label} href={source.href} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={12} /></a>)}</div></div><div className="footer-bottom"><span>Research checked September 2026</span><span>Answer every call. Create more regulars.</span></div></footer>
    </div>
  );
}

export default App;
