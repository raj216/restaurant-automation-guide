import { FormEvent, useRef, useState } from "react";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
} from "framer-motion";
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
import {
  DrawIcon,
  EASE,
  Eyebrow,
  WordReveal,
  useFontsReady,
  useMotionKit,
} from "@/components/motion";

const MotionPhone = m.create(Phone);

function BrandMark({ inverse = false, drawOnView = false }: { inverse?: boolean; drawOnView?: boolean }) {
  const { reduce } = useMotionKit();
  // The strokes draw in order: the two ink brackets, the register line, then
  // the transfer bar that joins them.
  const play = drawOnView
    ? { whileInView: { pathLength: 1, opacity: 1 }, viewport: { once: true } }
    : { animate: { pathLength: 1, opacity: 1 } };
  const stroke = (className: string, d: string, delay: number) =>
    reduce ? (
      <path className={className} d={d} />
    ) : (
      <m.path
        className={className}
        d={d}
        initial={{ pathLength: 0, opacity: 0 }}
        {...play}
        transition={{
          pathLength: { duration: 0.8, ease: EASE, delay },
          opacity: { duration: 0.01, delay },
        }}
      />
    );
  return (
    <span className={`brand-lockup ${inverse ? "brand-lockup-inverse" : ""}`}>
      <svg className="brand-mark" viewBox="0 0 48 48" aria-label="Kadmivo mark" role="img">
        {stroke("mark-ink", "M20 7H8v15h12", 0.15)}
        {stroke("mark-ink", "M28 26h12v15H28", 0.3)}
        {stroke("mark-register", "M24 10v28", 0.55)}
        {stroke("mark-transfer", "M19 24h10", 0.8)}
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
  const [cardSettled, setCardSettled] = useState(false);
  const k = useMotionKit();
  // The hero plays once the brand fonts are in, so nothing re-flows mid-move.
  const fontsReady = useFontsReady(["Fraunces", "Manrope"]);

  // Thin reading-progress rule along the top of the window.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: 0.001 });

  // Hero depth: the order card drifts up as the hero scrolls away while the
  // ring behind it lags, so the two separate slightly.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const visualY = useTransform(heroProgress, [0, 1], [0, -70]);
  const ringY = useTransform(heroProgress, [0, 1], ["0px", "90px"]);

  // The workflow rule fills as the four steps pass through the viewport.
  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: stepsProgress } = useScroll({ target: stepsRef, offset: ["start 80%", "end 60%"] });
  const stepsFill = useSpring(stepsProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  // Sample order card: once it lands, its parts fill in like a live order.
  const cardPart = (delay: number) =>
    k.reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: fontsReady ? { opacity: 1, y: 0 } : undefined, transition: { duration: 0.6, ease: EASE, delay } };
  const tick = (delay: number) =>
    k.reduce ? {} : { initial: { scale: 0 }, animate: fontsReady ? { scale: 1 } : undefined, transition: { type: "spring" as const, stiffness: 520, damping: 17, delay } };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <m.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
        <div className="site-shell" id="top">
          <m.div className="notice-bar" {...k.fade(0)}>
            <span>KADMIVO / JERSEY CITY + NYC</span>
            <span>Restaurant-owned systems · Staff-backed handoff · Supervised trials</span>
            <span className="notice-location"><MapPin size={12} /> Local availability</span>
          </m.div>

          <m.header className="site-header" {...k.enter(0.05, -12)}>
            <a href="#top" aria-label="Kadmivo home"><BrandMark /></a>
            <nav className="desktop-nav" aria-label="Primary navigation">
              <a href="#problem">The problem</a>
              <a href="#how-it-works">How it works</a>
              <a href="#control">Your control</a>
              <a href="#trial">Trial</a>
            </nav>
            <a className="nav-cta" href="#contact">Book a phone-order review <ArrowRight size={16} /></a>
          </m.header>

          <main id="main">
            {/* 1. Hero */}
            <section className="hero section-grid" aria-labelledby="hero-title" ref={heroRef}>
              <div className="hero-copy">
                <Eyebrow onLoad ready={fontsReady} delay={0.1}>Phone-order support for independent restaurants</Eyebrow>
                <WordReveal as="h1" id="hero-title" onLoad ready={fontsReady} delay={0.2} text="Recover the phone orders your restaurant misses during the rush." />
                <m.p className="hero-lede" {...k.enter(0.65, 22, fontsReady)}>Kadmivo answers routine restaurant calls, checks each order against the menu you approve, and gives your team an order draft to check.</m.p>
                <m.p className="hero-emphasis" {...k.enter(0.75, 22, fontsReady)}>Your team checks the order before it reaches the POS or kitchen.</m.p>
                <m.div className="hero-actions" {...k.enter(0.85, 22, fontsReady)}>
                  <a className="button button-primary" href="#how-it-works">See how it works <ArrowRight size={18} /></a>
                  <a className="text-link" href="#contact">Book a phone-order review <ArrowUpRight size={16} /></a>
                </m.div>
                <m.div className="trust-strip" aria-label="Kadmivo safeguards" {...k.wipeIn(1, fontsReady)}>
                  <span><ClipboardCheck size={15} /> Menu checked first</span>
                  <span><UserRound size={15} /> Team member checks every order</span>
                  <span><LockKeyhole size={15} /> No card numbers over the phone</span>
                </m.div>
              </div>

              <m.div
                className="hero-visual"
                aria-label="Sample order draft awaiting team review"
                style={k.reduce ? undefined : ({ y: visualY, "--ring-y": ringY } as MotionStyle)}
              >
                <m.div
                  className="order-card"
                  initial={k.reduce ? false : { opacity: 0, y: 70, rotate: -9 }}
                  animate={fontsReady ? { opacity: 1, y: 0, rotate: -2.2 } : undefined}
                  whileHover={cardSettled ? { rotate: -1, y: -6 } : undefined}
                  transition={cardSettled ? { duration: 0.5, ease: EASE } : { duration: 1.2, ease: EASE, delay: 0.35 }}
                  onAnimationComplete={() => setCardSettled(true)}
                >
                  <m.div className="order-card-top" {...cardPart(0.8)}><span>ASSISTED ORDER · SAMPLE</span><span>NOT A LIVE ORDER</span></m.div>
                  <div className="order-card-body">
                    <m.div className="order-card-label" {...cardPart(0.95)}>CUSTOMER CONFIRMED</m.div>
                    <m.div className="order-title-row" {...cardPart(1.05)}><h2>Order draft K-021</h2><span className="pending-badge"><Clock3 size={13} /> Pending review</span></m.div>
                    <m.div className="order-meta" {...cardPart(1.15)}>
                      {k.reduce ? (
                        <Phone size={16} />
                      ) : (
                        <MotionPhone size={16} animate={fontsReady ? { rotate: [0, -16, 14, -11, 8, -4, 0] } : undefined} transition={{ duration: 0.9, ease: "easeInOut", delay: 1.4 }} />
                      )}{" "}
                      <div><strong>Pickup for Maya</strong><span>Today · 8:20 PM</span></div><time>7:42 PM</time>
                    </m.div>
                    <div className="order-items">
                      <m.div {...cardPart(1.35)}><span>1 × Rigatoni</span><small>extra sauce · no cheese</small><b>$19.00</b></m.div>
                      <m.div {...cardPart(1.5)}><span>1 × Garlic knots</span><small>sauce on the side</small><b>$8.50</b></m.div>
                    </div>
                    <m.div className="status-list" {...cardPart(1.7)}>
                      <m.span className="done" {...cardPart(1.85)}><m.span {...tick(1.95)}><Check size={13} /></m.span> Customer confirmed</m.span>
                      <m.span className="done" {...cardPart(2.1)}><m.span {...tick(2.2)}><Check size={13} /></m.span> Menu checked</m.span>
                      <m.span className="current" {...cardPart(2.35)}><UserRound size={13} /> Your team checks the order</m.span>
                      <m.span {...cardPart(2.6)}><span className="status-dot" /> Reaches POS</m.span>
                    </m.div>
                  </div>
                  <m.div className="order-card-footer" {...cardPart(2.8)}><ShieldCheck size={16} /> The kitchen follows the POS ticket—not an AI transcript.</m.div>
                </m.div>
              </m.div>
            </section>

            {/* 2. Problem */}
            <section className="problem-section section-grid" id="problem">
              <div className="section-intro">
                <Eyebrow>During the rush</Eyebrow>
                <WordReveal delay={0.1} text="When the dining room gets busy, the phone becomes another table to manage." />
              </div>
              <div className="problem-content">
                <m.p className="large-copy" {...k.reveal(0.1)}>Calls go unanswered. Staff put callers on hold. Special requests get misunderstood. Future pickup orders get lost in the rush.</m.p>
                <m.p {...k.reveal(0.2)}>Those missed calls become missed orders and frustrated customers. Kadmivo gives routine phone orders a controlled path without taking the final decision away from your team.</m.p>
                <m.div className="problem-list" {...k.wipe(0.1)}>
                  <m.div {...k.reveal(0.3, 14)}><span>01</span><strong>More calls answered</strong><p>Give routine callers a path during the hours you choose.</p></m.div>
                  <m.div {...k.reveal(0.42, 14)}><span>02</span><strong>Fewer order surprises</strong><p>Check menu items, prices, special requests, and pickup details before your team approves the order.</p></m.div>
                  <m.div {...k.reveal(0.54, 14)}><span>03</span><strong>One clear order record</strong><p>See what the customer requested, what your team checked, and what reached the POS.</p></m.div>
                </m.div>
              </div>
            </section>

            {/* 3. How it works */}
            <section className="workflow-section" id="how-it-works">
              <div className="section-grid">
                <div className="workflow-intro">
                  <Eyebrow>How one call becomes an approved order</Eyebrow>
                  <WordReveal delay={0.1} text="One call. One order your team can check." />
                  <m.p className="large-copy" {...k.reveal(0.2)}>Kadmivo handles the routine parts of the call. Your team makes the final decision.</m.p>
                </div>
                <div className="workflow-steps" ref={stepsRef}>
                  <div className="workflow-track" aria-hidden="true"><m.div className="workflow-track-fill" style={{ scaleY: stepsFill }} /></div>
                  <m.div className="workflow-step" {...k.reveal(0, 18)}><span>01</span><div><h3>The call is answered</h3><p>The assistant identifies itself and handles routine ordering questions during the hours you choose.</p></div><DrawIcon icon={Phone} delay={0.3} /></m.div>
                  <m.div className="workflow-step" {...k.reveal(0, 18)}><span>02</span><div><h3>The menu is checked</h3><p>Items, prices, special requests, hours, and available options are checked against the menu you approve.</p></div><DrawIcon icon={ClipboardCheck} delay={0.3} /></m.div>
                  <m.div className="workflow-step" {...k.reveal(0, 18)}><span>03</span><div><h3>The order is repeated</h3><p>The customer hears the complete order and confirms it before an order draft is created.</p></div><DrawIcon icon={CheckCircle2} delay={0.3} /></m.div>
                  <m.div className="workflow-step" {...k.reveal(0, 18)}><span>04</span><div><h3>Your team checks it</h3><p>A team member accepts, changes, rejects, or transfers the order before it reaches the POS.</p></div><DrawIcon icon={Hand} delay={0.3} /></m.div>
                </div>
              </div>
              <m.div className="acceptance-rule" {...k.wipe(0)}><span>THE SIMPLE RULE</span><m.strong {...k.reveal(0.45, 12)}>No order is accepted until your team has checked it.</m.strong></m.div>
            </section>

            {/* 4. Control and safeguards */}
            <section className="control-section dark-section" id="control">
              <div className="section-grid">
                <div>
                  <Eyebrow>Built for real restaurant operations</Eyebrow>
                  <WordReveal delay={0.1} text="Your restaurant stays in control." />
                  <m.p {...k.reveal(0.2)}>Kadmivo is designed to help during the rush—not to replace your judgment.</m.p>
                </div>
                <m.div className="control-panel" {...k.reveal(0.15, 36)}>
                  <div className="control-panel-label">HOW THE SAFE HANDOFF WORKS</div>
                  <div className="control-status"><span className="status-led" /><strong>Team review stays visible</strong></div>
                  <p>Every order has a clear path before it reaches the POS or kitchen.</p>
                  <div className="control-rows">
                    <m.div {...k.wipe(0.45)}><span>Customer</span><strong>Confirms order</strong></m.div>
                    <m.div {...k.wipe(0.6)}><span>Menu</span><strong>Checked first</strong></m.div>
                    <m.div {...k.wipe(0.75)}><span>Your team</span><strong>Checks the order</strong></m.div>
                    <m.div {...k.wipe(0.9)}><span>Kitchen</span><strong>Follows the POS</strong></m.div>
                  </div>
                </m.div>
              </div>
              <m.div className="guardrail-grid" {...k.wipe(0)}>
                <m.div {...k.reveal(0.15, 18)}><DrawIcon icon={LockKeyhole} delay={0.35} /><h3>Your team checks every order</h3><p>A team member reviews the order before it reaches the POS or is sent to the kitchen.</p></m.div>
                <m.div {...k.reveal(0.3, 18)}><DrawIcon icon={ShieldCheck} delay={0.5} /><h3>No card numbers over the phone</h3><p>Customers can pay at pickup or use your restaurant&apos;s secure checkout page.</p></m.div>
                <m.div {...k.reveal(0.45, 18)}><DrawIcon icon={UserRound} delay={0.65} /><h3>No guessing</h3><p>If the assistant is unsure, it sends the question to your team or stops safely.</p></m.div>
              </m.div>
            </section>

            {/* 5. Trial */}
            <section className="pilot-section" id="trial">
              <div className="section-grid">
                <div>
                  <Eyebrow>Start small. See if it works.</Eyebrow>
                  <WordReveal delay={0.1} text="Start with one location and a few hours of phone coverage." />
                  <m.p className="large-copy" {...k.reveal(0.2)}>Before we begin, we review your busiest phone hours, menu, POS, staffing, and the calls your team currently misses.</m.p>
                  <m.p {...k.reveal(0.3)}>Then we run a 90-day supervised trial with clear rules and measurable results.</m.p>
                </div>
                <m.div className="pilot-price" {...k.reveal(0.25, 36)}><span>STARTING TRIAL RANGE</span><strong>$750–$1,500</strong><p>Setup + $350–$600/month ongoing management</p><small>Software and phone usage are explained before the trial begins.</small></m.div>
              </div>
              <m.div className="pilot-timeline" {...k.wipe(0)}>
                <m.div {...k.reveal(0.15, 16)}><span>ONE RESTAURANT</span><h3>One starting schedule</h3><p>Begin with one location and specific hours when a team member is available to check orders.</p></m.div>
                <m.div {...k.reveal(0.27, 16)}><span>MEASURE RESULTS</span><h3>What we track</h3><p>Orders completed, team review time, corrections, transfers, and accepted or cancelled outcomes.</p></m.div>
                <m.div {...k.reveal(0.39, 16)}><span>THE GOAL</span><h3>Prove or stop</h3><p>Keep the workflow, adjust it, or stop based on what it does for your restaurant.</p></m.div>
                <m.div {...k.reveal(0.51, 16)}><span>THE STANDARD</span><h3>Completed orders</h3><p>We measure completed restaurant orders—not just calls handled by software.</p></m.div>
              </m.div>
            </section>

            {/* 6. Contact */}
            <section className="contact-section dark-section" id="contact">
              <div className="section-grid">
                <div>
                  <Eyebrow>See if your restaurant is a fit</Eyebrow>
                  <WordReveal delay={0.1} text="Let's look at the calls your team is missing." />
                  <m.p {...k.reveal(0.2)}>In a 20-minute phone-order review, we will look at your busiest phone hours, current POS, menu, staffing, and whether this supervised trial could work for your team and budget.</m.p>
                  <m.p {...k.reveal(0.3)}>You do not need to commit to anything. We will first determine whether the workflow fits your restaurant.</m.p>
                  <div className="contact-promises">
                    <m.span {...k.reveal(0.4, 10)}><Clock3 size={17} /> 20 minutes</m.span>
                    <m.span {...k.reveal(0.5, 10)}><MapPin size={17} /> One restaurant</m.span>
                    <m.span {...k.reveal(0.6, 10)}><ArrowRight size={17} /> One practical next step</m.span>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <m.div
                      key="success"
                      className="form-success"
                      initial={k.reduce ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: EASE }}
                    >
                      <DrawIcon icon={CheckCircle2} size={31} delay={0.2} />
                      <h3>Request received.</h3>
                      <p>We will review your restaurant details and follow up with the next practical step.</p>
                      <a href="#top" className="text-link light">Back to the top <ArrowUpRight size={16} /></a>
                    </m.div>
                  ) : (
                    <m.form
                      key="form"
                      className="contact-form"
                      onSubmit={handleSubmit}
                      {...k.reveal(0.15, 36)}
                      exit={k.reduce ? undefined : { opacity: 0, y: -12, transition: { duration: 0.3 } }}
                    >
                      <div className="form-kicker">PHONE-ORDER PREFLIGHT</div>
                      <h3>Tell us where the phone breaks down.</h3>
                      <p className="form-note">We use these details only to prepare for this review. No promotional list.</p>
                      <div className="form-grid">
                        <label>Your name *<input name="name" placeholder="Jamie Rivera" required /></label>
                        <label>Restaurant name *<input name="restaurant" placeholder="Rivera Kitchen" required /></label>
                        <label>Email *<input name="email" type="email" placeholder="jamie@restaurant.com" required /></label>
                        <label>Phone <span>(optional)</span><input name="phone" type="tel" placeholder="(201) 555-0148" /></label>
                        <label>City / neighborhood *<input name="location" placeholder="Jersey City, NJ" required /></label>
                        <label>Current POS *<select name="pos" required defaultValue=""><option value="" disabled>Select your POS</option><option>Toast</option><option>Square</option><option>SpotOn</option><option>Clover</option><option>Other / not sure</option></select></label>
                      </div>
                      <label>What happens when the phone gets busy? *<textarea name="need" rows={4} placeholder="Calls ring out during dinner, staff puts people on hold..." required /></label>
                      <div className="form-bottom"><label>Best way to respond<select name="contact_preference" defaultValue="Email me"><option>Email me</option><option>Call me</option><option>Either is fine</option></select></label><button className="button button-primary" type="submit">Request my phone-order review <ArrowRight size={18} /></button></div>
                    </m.form>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </main>

          <footer className="site-footer">
            <m.div className="footer-top" {...k.reveal(0, 18, true)}><div><a href="#top" aria-label="Kadmivo home"><BrandMark inverse drawOnView /></a><p>Human-controlled phone-order recovery for independent restaurants.</p></div><div className="footer-links"><div><span>Explore</span><a href="#problem">The problem</a><a href="#how-it-works">How it works</a><a href="#trial">Supervised trial</a><a href="#contact">Phone-order review</a></div><div><span>Built around</span><a href="#control">Team control</a><a href="#problem">Order recovery</a><a href="#contact">Local availability</a></div></div></m.div>
            <m.div className="footer-bottom" {...k.reveal(0.15, 0, true)}><span>Working brand · preliminary name screening only</span><span>Jersey City + New York City</span><span>© 2026 Kadmivo</span></m.div>
          </footer>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
