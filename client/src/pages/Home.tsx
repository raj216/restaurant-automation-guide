import { useRef } from "react";
import { m, useScroll, useTransform, type MotionStyle } from "framer-motion";
import {
  ActionRow,
  Button,
  ControlPanel,
  Eyebrow,
  FeatureGrid,
  Field,
  FormActions,
  FormCard,
  FormGrid,
  Heading,
  KadmivoProvider,
  NoticeBar,
  NumberedList,
  OrderCard,
  PriceCard,
  PromiseList,
  RuleCallout,
  ScrollProgress,
  SelectField,
  SiteFooter,
  SiteHeader,
  Text,
  TextAreaField,
  TextLink,
  Timeline,
  TrustStrip,
  WorkflowSteps,
  useFontsReady,
  useMotionKit,
  type Feature,
  type FooterColumn,
  type NavLink,
  type NumberedListItem,
  type OrderItem,
  type OrderStep,
  type TimelineItem,
  type WorkflowStep,
} from "@/kit";

const navLinks: NavLink[] = [
  { label: "The problem", href: "#problem" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Your control", href: "#control" },
  { label: "Trial", href: "#trial" },
];

const orderItems: OrderItem[] = [
  { name: "1 × Rigatoni", note: "extra sauce · no cheese", price: "$19.00" },
  { name: "1 × Garlic knots", note: "sauce on the side", price: "$8.50" },
];

const orderSteps: OrderStep[] = [
  { label: "Customer confirmed", state: "done" },
  { label: "Menu checked", state: "done" },
  { label: "Your team checks the order", state: "current" },
  { label: "Reaches POS", state: "pending" },
];

const problems: NumberedListItem[] = [
  { title: "More calls answered", text: "Give routine callers a path during the hours you choose." },
  { title: "Fewer order surprises", text: "Check menu items, prices, special requests, and pickup details before your team approves the order." },
  { title: "One clear order record", text: "See what the customer requested, what your team checked, and what reached the POS." },
];

const workflow: WorkflowStep[] = [
  { icon: "phone", title: "The call is answered", text: "The assistant identifies itself and handles routine ordering questions during the hours you choose." },
  { icon: "clipboard-check", title: "The menu is checked", text: "Items, prices, special requests, hours, and available options are checked against the menu you approve." },
  { icon: "check-circle", title: "The order is repeated", text: "The customer hears the complete order and confirms it before an order draft is created." },
  { icon: "hand", title: "Your team checks it", text: "A team member accepts, changes, rejects, or transfers the order before it reaches the POS." },
];

const guardrails: Feature[] = [
  { icon: "lock", title: "Your team checks every order", text: "A team member reviews the order before it reaches the POS or is sent to the kitchen." },
  { icon: "shield-check", title: "No card numbers over the phone", text: "Customers can pay at pickup or use your restaurant's secure checkout page." },
  { icon: "user", title: "No guessing", text: "If the assistant is unsure, it sends the question to your team or stops safely." },
];

const trialPlan: TimelineItem[] = [
  { label: "ONE RESTAURANT", title: "One starting schedule", text: "Begin with one location and specific hours when a team member is available to check orders." },
  { label: "MEASURE RESULTS", title: "What we track", text: "Orders completed, team review time, corrections, transfers, and accepted or cancelled outcomes." },
  { label: "THE GOAL", title: "Prove or stop", text: "Keep the workflow, adjust it, or stop based on what it does for your restaurant." },
  { label: "THE STANDARD", title: "Completed orders", text: "We measure completed restaurant orders—not just calls handled by software." },
];

const footerColumns: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "The problem", href: "#problem" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Supervised trial", href: "#trial" },
      { label: "Phone-order review", href: "#contact" },
    ],
  },
  {
    title: "Built around",
    links: [
      { label: "Team control", href: "#control" },
      { label: "Order recovery", href: "#problem" },
      { label: "Local availability", href: "#contact" },
    ],
  },
];

export default function Home() {
  return (
    <KadmivoProvider motion="on">
      <HomePage />
    </KadmivoProvider>
  );
}

function HomePage() {
  const { reduce } = useMotionKit();
  // The hero plays once the brand fonts are in, so nothing re-flows mid-move.
  const fontsReady = useFontsReady(["Fraunces", "Manrope"]);

  // Hero depth: the order card drifts up as the hero scrolls away while the
  // ring behind it lags, so the two separate slightly.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const visualY = useTransform(heroProgress, [0, 1], [0, -70]);
  const ringY = useTransform(heroProgress, [0, 1], ["0px", "90px"]);

  return (
    <>
      <ScrollProgress />
      <div className="site-shell" id="top">
        <NoticeBar
          brand="KADMIVO / JERSEY CITY + NYC"
          message="Restaurant-owned systems · Staff-backed handoff · Supervised trials"
          location="Local availability"
        />

        <SiteHeader links={navLinks} cta={{ label: "Book a phone-order review", href: "#contact" }} />

        <main id="main">
          {/* 1. Hero */}
          <section className="hero section-grid" aria-labelledby="hero-title" ref={heroRef}>
            <div className="hero-copy">
              <Eyebrow playOnLoad ready={fontsReady} delay={0.1}>Phone-order support for independent restaurants</Eyebrow>
              <Heading level={1} id="hero-title" playOnLoad ready={fontsReady} delay={0.2}>Recover the phone orders your restaurant misses during the rush.</Heading>
              <Text variant="lede" playOnLoad ready={fontsReady} delay={0.65}>Kadmivo answers routine restaurant calls, checks each order against the menu you approve, and gives your team an order draft to check.</Text>
              <Text variant="emphasis" playOnLoad ready={fontsReady} delay={0.75}>Your team checks the order before it reaches the POS or kitchen.</Text>
              <ActionRow playOnLoad ready={fontsReady} delay={0.85}>
                <Button href="#how-it-works">See how it works</Button>
                <TextLink href="#contact">Book a phone-order review</TextLink>
              </ActionRow>
              <TrustStrip
                label="Kadmivo safeguards"
                playOnLoad
                ready={fontsReady}
                delay={1}
                items={[
                  { icon: "clipboard-check", label: "Menu checked first" },
                  { icon: "user", label: "Team member checks every order" },
                  { icon: "lock", label: "No card numbers over the phone" },
                ]}
              />
            </div>

            <m.div
              className="hero-visual"
              aria-label="Sample order draft awaiting team review"
              style={reduce ? undefined : ({ y: visualY, "--ring-y": ringY } as MotionStyle)}
            >
              <OrderCard
                playOnLoad
                ready={fontsReady}
                kicker="ASSISTED ORDER · SAMPLE"
                notice="NOT A LIVE ORDER"
                label="CUSTOMER CONFIRMED"
                title="Order draft K-021"
                badge="Pending review"
                customer="Pickup for Maya"
                pickup="Today · 8:20 PM"
                time="7:42 PM"
                items={orderItems}
                steps={orderSteps}
                footer="The kitchen follows the POS ticket—not an AI transcript."
              />
            </m.div>
          </section>

          {/* 2. Problem */}
          <section className="problem-section section-grid" id="problem">
            <div className="section-intro">
              <Eyebrow>During the rush</Eyebrow>
              <Heading delay={0.1}>When the dining room gets busy, the phone becomes another table to manage.</Heading>
            </div>
            <div className="problem-content">
              <Text variant="lead" delay={0.1}>Calls go unanswered. Staff put callers on hold. Special requests get misunderstood. Future pickup orders get lost in the rush.</Text>
              <Text delay={0.2}>Those missed calls become missed orders and frustrated customers. Kadmivo gives routine phone orders a controlled path without taking the final decision away from your team.</Text>
              <NumberedList delay={0.1} items={problems} />
            </div>
          </section>

          {/* 3. How it works */}
          <section className="workflow-section" id="how-it-works">
            <div className="section-grid">
              <div className="workflow-intro">
                <Eyebrow>How one call becomes an approved order</Eyebrow>
                <Heading delay={0.1}>One call. One order your team can check.</Heading>
                <Text variant="lead" delay={0.2}>Kadmivo handles the routine parts of the call. Your team makes the final decision.</Text>
              </div>
              <WorkflowSteps steps={workflow} />
            </div>
            <RuleCallout label="THE SIMPLE RULE">No order is accepted until your team has checked it.</RuleCallout>
          </section>

          {/* 4. Control and safeguards */}
          <section className="control-section dark-section" id="control">
            <div className="section-grid">
              <div>
                <Eyebrow>Built for real restaurant operations</Eyebrow>
                <Heading delay={0.1}>Your restaurant stays in control.</Heading>
                <Text delay={0.2}>Kadmivo is designed to help during the rush—not to replace your judgment.</Text>
              </div>
              <ControlPanel
                delay={0.15}
                label="HOW THE SAFE HANDOFF WORKS"
                status="Team review stays visible"
                description="Every order has a clear path before it reaches the POS or kitchen."
                rows={[
                  { label: "Customer", value: "Confirms order" },
                  { label: "Menu", value: "Checked first" },
                  { label: "Your team", value: "Checks the order" },
                  { label: "Kitchen", value: "Follows the POS" },
                ]}
              />
            </div>
            <FeatureGrid items={guardrails} />
          </section>

          {/* 5. Trial */}
          <section className="pilot-section" id="trial">
            <div className="section-grid">
              <div>
                <Eyebrow>Start small. See if it works.</Eyebrow>
                <Heading delay={0.1}>Start with one location and a few hours of phone coverage.</Heading>
                <Text variant="lead" delay={0.2}>Before we begin, we review your busiest phone hours, menu, POS, staffing, and the calls your team currently misses.</Text>
                <Text delay={0.3}>Then we run a 90-day supervised trial with clear rules and measurable results.</Text>
              </div>
              <PriceCard
                delay={0.25}
                label="STARTING TRIAL RANGE"
                price="$750–$1,500"
                detail="Setup + $350–$600/month ongoing management"
                note="Software and phone usage are explained before the trial begins."
              />
            </div>
            <Timeline items={trialPlan} />
          </section>

          {/* 6. Contact */}
          <section className="contact-section dark-section" id="contact">
            <div className="section-grid">
              <div>
                <Eyebrow>See if your restaurant is a fit</Eyebrow>
                <Heading delay={0.1}>{"Let's look at the calls your team is missing."}</Heading>
                <Text delay={0.2}>In a 20-minute phone-order review, we will look at your busiest phone hours, current POS, menu, staffing, and whether this supervised trial could work for your team and budget.</Text>
                <Text delay={0.3}>You do not need to commit to anything. We will first determine whether the workflow fits your restaurant.</Text>
                <PromiseList
                  delay={0.4}
                  items={[
                    { icon: "clock", label: "20 minutes" },
                    { icon: "map-pin", label: "One restaurant" },
                    { icon: "arrow-right", label: "One practical next step" },
                  ]}
                />
              </div>
              <FormCard
                delay={0.15}
                kicker="PHONE-ORDER PREFLIGHT"
                title="Tell us where the phone breaks down."
                note="We use these details only to prepare for this review. No promotional list."
                success={{
                  title: "Request received.",
                  text: "We will review your restaurant details and follow up with the next practical step.",
                  backLabel: "Back to the top",
                  backHref: "#top",
                }}
              >
                <FormGrid>
                  <Field label="Your name" name="name" placeholder="Jamie Rivera" required />
                  <Field label="Restaurant name" name="restaurant" placeholder="Rivera Kitchen" required />
                  <Field label="Email" name="email" type="email" placeholder="jamie@restaurant.com" required />
                  <Field label="Phone" name="phone" type="tel" placeholder="(201) 555-0148" hint="(optional)" />
                  <Field label="City / neighborhood" name="location" placeholder="Jersey City, NJ" required />
                  <SelectField label="Current POS" name="pos" placeholder="Select your POS" options={["Toast", "Square", "SpotOn", "Clover", "Other / not sure"]} required />
                </FormGrid>
                <TextAreaField label="What happens when the phone gets busy?" name="need" rows={4} placeholder="Calls ring out during dinner, staff puts people on hold..." required />
                <FormActions>
                  <SelectField label="Best way to respond" name="contact_preference" options={["Email me", "Call me", "Either is fine"]} />
                  <Button type="submit">Request my phone-order review</Button>
                </FormActions>
              </FormCard>
            </div>
          </section>
        </main>

        <SiteFooter
          tagline="Human-controlled phone-order recovery for independent restaurants."
          columns={footerColumns}
          legal={["Working brand · preliminary name screening only", "Jersey City + New York City", "© 2026 Kadmivo"]}
        />
      </div>
    </>
  );
}
