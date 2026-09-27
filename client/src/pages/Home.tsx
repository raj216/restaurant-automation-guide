import { FormEvent, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Hand,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-lockup ${inverse ? "brand-lockup-inverse" : ""}`}>
      <svg className="brand-mark" viewBox="0 0 48 48" aria-label="Kadmivo mark" role="img">
        <path className="mark-ink" d="M20 7H8v15h12" />
        <path className="mark-ink" d="M28 26h12v15H28" />
        <path className="mark-register" d="M24 10v28" />
        <path className="mark-transfer" d="M19 24h10" />
      </svg>
      <span className="brand-word">Kadmivo</span>
    </span>
  );
}

function ArrowLink({ children, href = "#contact", className = "" }: { children: React.ReactNode; href?: string; className?: string }) {
  return (
    <a className={`arrow-link ${className}`} href={href}>
      <span>{children}</span>
      <ArrowRight size={17} strokeWidth={1.8} />
    </a>
  );
}

export default function Home() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="site-shell" id="top">
      <div className="notice-bar">
        <span>KADMIVO / JERSEY CITY + NYC</span>
        <span>Restaurant-owned systems · Staff-backed handoff · Supervised trials</span>
        <span className="notice-location"><MapPin size={12} /> Local availability</span>
      </div>

      <header className="site-header">
        <a href="#top" aria-label="Kadmivo home"><BrandMark /></a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#problem">The problem</a>
          <a href="#how-it-works">How it works</a>
          <a href="#control">Your control</a>
          <a href="#trial">Trial</a>
        </nav>
        <a className="nav-cta" href="#contact">Book a phone-order review <ArrowRight size={16} /></a>
      </header>

      <main id="main">
        {/* 1. Hero */}
        <section className="hero section-grid" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> Phone-order support for independent restaurants</p>
            <h1 id="hero-title">Recover the phone orders your restaurant misses during the rush.</h1>
            <p className="hero-lede">Kadmivo answers routine restaurant calls, checks each order against the menu you approve, and gives your team an order draft to check.</p>
            <p className="hero-emphasis">Your team checks the order before it reaches the POS or kitchen.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#how-it-works">See how it works <ArrowRight size={18} /></a>
              <a className="text-link" href="#contact">Book a phone-order review <ArrowUpRight size={16} /></a>
            </div>
            <div className="trust-strip" aria-label="Kadmivo safeguards">
              <span><ClipboardCheck size={15} /> Menu checked first</span>
              <span><UserRound size={15} /> Team member checks every order</span>
              <span><LockKeyhole size={15} /> No card numbers over the phone</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Sample order draft awaiting team review">
            <div className="order-card">
              <div className="order-card-top"><span>ASSISTED ORDER · SAMPLE</span><span>NOT A LIVE ORDER</span></div>
              <div className="order-card-body">
                <div className="order-card-label">CUSTOMER CONFIRMED</div>
                <div className="order-title-row"><h2>Order draft K-021</h2><span className="pending-badge"><Clock3 size={13} /> Pending review</span></div>
                <div className="order-meta"><Phone size={16} /> <div><strong>Pickup for Maya</strong><span>Today · 8:20 PM</span></div><time>7:42 PM</time></div>
                <div className="order-items">
                  <div><span>1 × Rigatoni</span><small>extra sauce · no cheese</small><b>$19.00</b></div>
                  <div><span>1 × Garlic knots</span><small>sauce on the side</small><b>$8.50</b></div>
                </div>
                <div className="status-list">
                  <span className="done"><Check size={13} /> Customer confirmed</span>
                  <span className="done"><Check size={13} /> Menu checked</span>
                  <span className="current"><UserRound size={13} /> Your team checks the order</span>
                  <span><span className="status-dot" /> Reaches POS</span>
                </div>
              </div>
              <div className="order-card-footer"><ShieldCheck size={16} /> The kitchen follows the POS ticket—not an AI transcript.</div>
            </div>
          </div>
        </section>

        {/* 2. Problem */}
        <section className="problem-section section-grid" id="problem">
          <div className="section-intro">
            <p className="eyebrow"><span className="eyebrow-line" /> During the rush</p>
            <h2>When the dining room gets busy, the phone becomes another table to manage.</h2>
          </div>
          <div className="problem-content">
            <p className="large-copy">Calls go unanswered. Staff put callers on hold. Special requests get misunderstood. Future pickup orders get lost in the rush.</p>
            <p>Those missed calls become missed orders and frustrated customers. Kadmivo gives routine phone orders a controlled path without taking the final decision away from your team.</p>
            <div className="problem-list">
              <div><span>01</span><strong>More calls answered</strong><p>Give routine callers a path during the hours you choose.</p></div>
              <div><span>02</span><strong>Fewer order surprises</strong><p>Check menu items, prices, special requests, and pickup details before your team approves the order.</p></div>
              <div><span>03</span><strong>One clear order record</strong><p>See what the customer requested, what your team checked, and what reached the POS.</p></div>
            </div>
          </div>
        </section>

        {/* 3. How it works */}
        <section className="workflow-section" id="how-it-works">
          <div className="section-grid">
            <div className="workflow-intro"><p className="eyebrow"><span className="eyebrow-line" /> How one call becomes an approved order</p><h2>One call. One order your team can check.</h2><p className="large-copy">Kadmivo handles the routine parts of the call. Your team makes the final decision.</p></div>
            <div className="workflow-steps">
              <div className="workflow-step"><span>01</span><div><h3>The call is answered</h3><p>The assistant identifies itself and handles routine ordering questions during the hours you choose.</p></div><Phone /></div>
              <div className="workflow-step"><span>02</span><div><h3>The menu is checked</h3><p>Items, prices, special requests, hours, and available options are checked against the menu you approve.</p></div><ClipboardCheck /></div>
              <div className="workflow-step"><span>03</span><div><h3>The order is repeated</h3><p>The customer hears the complete order and confirms it before an order draft is created.</p></div><CheckCircle2 /></div>
              <div className="workflow-step"><span>04</span><div><h3>Your team checks it</h3><p>A team member accepts, changes, rejects, or transfers the order before it reaches the POS.</p></div><Hand /></div>
            </div>
          </div>
          <div className="acceptance-rule"><span>THE SIMPLE RULE</span><strong>No order is accepted until your team has checked it.</strong></div>
        </section>

        {/* 4. Control and safeguards */}
        <section className="control-section dark-section" id="control">
          <div className="section-grid">
            <div><p className="eyebrow"><span className="eyebrow-line" /> Built for real restaurant operations</p><h2>Your restaurant stays in control.</h2><p>Kadmivo is designed to help during the rush—not to replace your judgment.</p></div>
            <div className="control-panel"><div className="control-panel-label">HOW THE SAFE HANDOFF WORKS</div><div className="control-status"><span className="status-led" /><strong>Team review stays visible</strong></div><p>Every order has a clear path before it reaches the POS or kitchen.</p><div className="control-rows"><div><span>Customer</span><strong>Confirms order</strong></div><div><span>Menu</span><strong>Checked first</strong></div><div><span>Your team</span><strong>Checks the order</strong></div><div><span>Kitchen</span><strong>Follows the POS</strong></div></div></div>
          </div>
          <div className="guardrail-grid">
            <div><LockKeyhole /><h3>Your team checks every order</h3><p>A team member reviews the order before it reaches the POS or is sent to the kitchen.</p></div>
            <div><ShieldCheck /><h3>No card numbers over the phone</h3><p>Customers can pay at pickup or use your restaurant&apos;s secure checkout page.</p></div>
            <div><UserRound /><h3>No guessing</h3><p>If the assistant is unsure, it sends the question to your team or stops safely.</p></div>
          </div>
        </section>

        {/* 5. Trial */}
        <section className="pilot-section" id="trial">
          <div className="section-grid"><div><p className="eyebrow"><span className="eyebrow-line" /> Start small. See if it works.</p><h2>Start with one location and a few hours of phone coverage.</h2><p className="large-copy">Before we begin, we review your busiest phone hours, menu, POS, staffing, and the calls your team currently misses.</p><p>Then we run a 90-day supervised trial with clear rules and measurable results.</p></div><div className="pilot-price"><span>STARTING TRIAL RANGE</span><strong>$750–$1,500</strong><p>Setup + $350–$600/month ongoing management</p><small>Software and phone usage are explained before the trial begins.</small></div></div>
          <div className="pilot-timeline"><div><span>ONE RESTAURANT</span><h3>One starting schedule</h3><p>Begin with one location and specific hours when a team member is available to check orders.</p></div><div><span>MEASURE RESULTS</span><h3>What we track</h3><p>Orders completed, team review time, corrections, transfers, and accepted or cancelled outcomes.</p></div><div><span>THE GOAL</span><h3>Prove or stop</h3><p>Keep the workflow, adjust it, or stop based on what it does for your restaurant.</p></div><div><span>THE STANDARD</span><h3>Completed orders</h3><p>We measure completed restaurant orders—not just calls handled by software.</p></div></div>
        </section>

        {/* 6. Contact */}
        <section className="contact-section dark-section" id="contact">
          <div className="section-grid"><div><p className="eyebrow"><span className="eyebrow-line" /> See if your restaurant is a fit</p><h2>Let&apos;s look at the calls your team is missing.</h2><p>In a 20-minute phone-order review, we will look at your busiest phone hours, current POS, menu, staffing, and whether this supervised trial could work for your team and budget.</p><p>You do not need to commit to anything. We will first determine whether the workflow fits your restaurant.</p><div className="contact-promises"><span><Clock3 size={17} /> 20 minutes</span><span><MapPin size={17} /> One restaurant</span><span><ArrowRight size={17} /> One practical next step</span></div></div>
            {submitted ? <div className="form-success"><CheckCircle2 size={31} /><h3>Request received.</h3><p>We will review your restaurant details and follow up with the next practical step.</p><a href="#top" className="text-link light">Back to the top <ArrowUpRight size={16} /></a></div> : <form className="contact-form" onSubmit={handleSubmit}><div className="form-kicker">PHONE-ORDER PREFLIGHT</div><h3>Tell us where the phone breaks down.</h3><p className="form-note">We use these details only to prepare for this review. No promotional list.</p><div className="form-grid"><label>Your name *<input name="name" placeholder="Jamie Rivera" required /></label><label>Restaurant name *<input name="restaurant" placeholder="Rivera Kitchen" required /></label><label>Email *<input name="email" type="email" placeholder="jamie@restaurant.com" required /></label><label>Phone <span>(optional)</span><input name="phone" type="tel" placeholder="(201) 555-0148" /></label><label>City / neighborhood *<input name="location" placeholder="Jersey City, NJ" required /></label><label>Current POS *<select name="pos" required defaultValue=""><option value="" disabled>Select your POS</option><option>Toast</option><option>Square</option><option>SpotOn</option><option>Clover</option><option>Other / not sure</option></select></label></div><label>What happens when the phone gets busy? *<textarea name="need" rows={4} placeholder="Calls ring out during dinner, staff puts people on hold..." required /></label><div className="form-bottom"><label>Best way to respond<select name="contact_preference" defaultValue="Email me"><option>Email me</option><option>Call me</option><option>Either is fine</option></select></label><button className="button button-primary" type="submit">Request my phone-order review <ArrowRight size={18} /></button></div></form>}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top"><div><a href="#top" aria-label="Kadmivo home"><BrandMark inverse /></a><p>Human-controlled phone-order recovery for independent restaurants.</p></div><div className="footer-links"><div><span>Explore</span><a href="#problem">The problem</a><a href="#how-it-works">How it works</a><a href="#trial">Supervised trial</a><a href="#contact">Phone-order review</a></div><div><span>Built around</span><a href="#control">Team control</a><a href="#problem">Order recovery</a><a href="#contact">Local availability</a></div></div></div>
        <div className="footer-bottom"><span>Working brand · preliminary name screening only</span><span>Jersey City + New York City</span><span>© 2026 Kadmivo</span></div>
      </footer>
    </div>
  );
}
