// Every word on the CoHost AI home page, as the owner wrote it. Sample
// callers use 555-01xx numbers, which are reserved for fiction, so no real
// person's phone is shown.

/**
 * The number people can call to hear Brio. Leave it null until the real line
 * is set: the "Dial Live Demo" button and the FAQ's call-us line stay hidden.
 */
export const DEMO_LINE: { label: string; tel: string } | null = null;

export const NAV = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Example Dashboard", href: "/demo" },
  { label: "POS Roadmap", href: "#roadmap" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const PILOT_CTA = "Start 7-Day Pilot";

export const HERO = {
  badge: "Built and Tested in New York City",
  titleStart: "We deal with calls so your host can deal with ",
  titleHighlight: "actual customers",
  titleEnd: ".",
  lead: [
    "Meet ",
    { strong: "Brio" },
    "—the AI phone host for independent restaurants. Brio answers incoming calls instantly, takes to-go orders, and sends structured summaries straight to your manager dashboard so staff can handle them when they're free.",
  ] as (string | { strong: string })[],
  primary: "Get Your 7-Day Free Pilot",
  demo: "Dial Live Demo",
  example: "See an example dashboard",
  points: [
    "Zero complex hardware",
    "Keep your current phone number",
    "No POS setup required today",
  ],
};

// ── Labels inside the animated pictures ─────────────────────────────────
// Short captions for the phone, the cards around it and the step visuals.
// They restate facts from the copy above and below; the sample restaurant
// is the one the pilot form uses as its example.

export const RESTAURANT = "Demo Coffee House";

export const STAGE = {
  label:
    "Brio answering a call on an iPhone: it takes a to-go order, sends the manager a summary, and blocks a scam call.",
  hint: "Drag to spin",
  clock: "7:30",
  caller: "(646) 555-0142",
  events: [
    {
      title: "Incoming call",
      time: "7:30 PM",
      main: "(646) 555-0142",
      sub: "Brio answered instantly",
    },
    {
      title: "To-Go Order",
      time: "7:30 PM",
      main: "2x Vanilla Latte",
      sub: "1 with oat milk • Pickup 7:55 PM",
    },
    {
      title: "Reservation Request",
      time: "7:31 PM",
      main: "Summary sent to manager",
      sub: "Order #1082 • Ready for review",
    },
    {
      title: "Scam Call Blocked",
      time: "7:31 PM",
      main: '"Working Capital Loan Offer"',
      sub: "Terminated in 2s",
    },
  ],
  /** The call on the phone's screen; line i appears at step `step`. */
  transcript: [
    {
      brio: true,
      step: 0,
      text: `Thanks for calling ${RESTAURANT}! This is Brio. How can I help?`,
    },
    {
      brio: false,
      step: 1,
      text: "Two grande vanilla lattes for pickup, one with oat milk.",
    },
    {
      brio: true,
      step: 2,
      text: "Done! One with oat milk. I've sent your order to the restaurant for review.",
    },
  ],
  sent: "Summary sent to manager",
};

/** Facts from the copy, as numbers. */
export const STATS = [
  { value: 15, unit: "min", label: "To get up and running" },
  { value: 1, unit: "ring", label: "Then Brio picks up, if your host can't" },
  { value: 0, unit: "", label: "POS setup required today", display: "Zero" },
];

/** What Brio handles, from the copy. */
export const CAPABILITIES = [
  "To-go orders",
  "Reservation requests",
  "Menu questions",
  "Allergen guidelines",
  "Daily hours",
  "Corkage rules",
  "Lost & found",
  "Catering requests",
  "Complaint callbacks",
  "Robocalls & solicitors",
];

export const STEP_VISUALS = {
  menu: {
    file: "menu.pdf → Brio",
    lines: [
      "Vanilla Latte · $4.95",
      "Oat milk · +$0.70",
      "Allergens · banana bread has walnuts",
      "Hours · 5 AM–2 AM daily",
    ],
  },
  forward: {
    line: "Your restaurant line",
    brio: "Brio",
    note: "After 1 ring, or when the line is busy",
  },
  alerts: [
    {
      kind: "order",
      title: "To-Go Order #1082",
      sub: "2x Vanilla Latte • $11.80",
    },
    {
      kind: "reservation",
      title: "Catering • About 30 people",
      sub: "Next Thursday • Quote request",
    },
    {
      kind: "alert",
      title: "Guest Alert • Corner table",
      sub: "Left an umbrella • Call back",
    },
  ],
};

export const PIPELINE = {
  from: "Brio",
  pos: ["Toast", "Square", "Clover"],
  to: "Kitchen display (KDS)",
};

export const WINGMAN_NOTE = "Friday • 7:30 PM";

export const MOTTO = {
  eyebrow: "Our Core Motto",
  quote: "We deal with calls so your host can deal with actual customers.",
  paragraphs: [
    "We've worked host stands in New York City. We know what it feels like when the room is packed at 7:30 PM, six guests are waiting at the front door, and the phone rings with someone asking if your pasta sauce has dairy in it.",
    "Hosts shouldn't be trapped behind a phone screen typing out orders while paying diners wait in the doorway. We take the phone burden completely off their shoulders so they can deliver genuine hospitality in person.",
  ],
  cardTitle: "The Host's Wingman",
  roles: [
    {
      who: "Your Host:",
      text: "Greets arriving parties, monitors table turns, chats with regulars, and keeps the dining room running smoothly.",
    },
    {
      who: "Brio:",
      text: "Handles the phone, answers menu and allergen questions, takes takeout orders, and filters out solicitors.",
    },
    {
      who: "The Manager:",
      text: "Gets a clean summary on their phone and dashboard, dealing with orders and notes only when the rush lets up.",
    },
  ],
};

export const HOW = {
  example: "See the example dashboard",
  eyebrow: "Zero Setup Pain",
  title: "Up and running in 15 minutes today",
  text: "No waiting on POS technicians, no expensive installation fees, and zero risk to your existing setup.",
  steps: [
    {
      title: "1. We Train Brio on Your Menu",
      text: "We ingest your food menu, daily hours, corkage rules, and allergen guidelines. Brio answers callers with complete accuracy in under a second.",
    },
    {
      title: "2. Set Conditional Forwarding",
      text: "Keep your existing restaurant phone number. Set it to forward after 1 ring or when your line is busy. If your host is free, they can still pick up!",
    },
    {
      title: "3. Receive Organized Alerts",
      text: "Orders and reservation requests arrive cleanly on your staff dashboard and via instant SMS. Review the summary and punch it in whenever you have a breath.",
    },
  ],
};

export const ROADMAP = {
  title: "Direct POS Integration (Toast, Square, Clover)",
  badge: "Coming Soon • Phase 2",
  text: "We are actively developing direct API ticket injection. Soon, to-go orders will automatically print directly to your kitchen display system (KDS) without touching the dashboard. Early pilot partners will receive free priority access to the integration update.",
  button: "Join Beta Priority List",
};

/**
 * The plans. Each shows its weekly price big, with the monthly bill under it
 * (`monthly`, what's actually charged); every plan has the same Brio, only
 * the minutes differ. `popular` gets the spectrum border and the badge.
 */
export const PRICING = {
  eyebrow: "Pricing",
  titleStart: "One Brio. Every feature. ",
  titleHighlight: "Just pick your minutes",
  titleEnd: ".",
  lede: "Every plan gets the full Brio: the same human-sounding voice, the same manager dashboard and the same 24/7 support. The only difference is how many minutes of calls Brio answers each month.",
  perWeek: "/week",
  billed: (monthly: number) => `Billed monthly at $${monthly}`,
  minutes: (minutes: string) => `${minutes} minutes of calls a month`,
  popular: "Most popular",
  included: "Everything included",
  plans: [
    {
      name: "Counter",
      fit: "For cafés and counter-service spots",
      weekly: 37,
      monthly: 149,
      minutes: "400",
      share: 400 / 1500,
      popular: false,
    },
    {
      name: "Dining Room",
      fit: "For full-service restaurants with a busy line",
      weekly: 62,
      monthly: 249,
      minutes: "800",
      share: 800 / 1500,
      popular: true,
    },
    {
      name: "Full House",
      fit: "For packed rooms and big takeout weekends",
      weekly: 112,
      monthly: 449,
      minutes: "1,500",
      share: 1,
      popular: false,
    },
  ],
  features: [
    "Picks up instantly, day or night",
    "Emotional, human-sounding voice",
    "To-go orders and reservation requests",
    "Menu, hours and allergen questions",
    "Scam and robocall blocking",
    "Live manager dashboard",
  ],
  custom: {
    name: "Custom",
    title: "More minutes, or more than one location?",
    text: "We'll build a plan around your restaurant: the minutes you need, every location on one dashboard, and anything extra you'd like Brio to handle.",
    button: "Build My Plan",
  },
  promisesTitle: "Every plan includes",
  promises: [
    {
      label: "Emotional, human-like AI",
      note: "Callers hear a warm voice, not a robot",
    },
    { label: "24/7 support", note: "Help whenever you need it" },
    { label: "No setup fee", note: "We set up your menu for you" },
    { label: "No contracts", note: "Turn it off with a single click" },
  ],
  note: "Prices are per week, billed monthly. Minutes are per month.",
};

export const FAQ = {
  eyebrow: "Questions & Answers",
  title: "Built for restaurant operators",
  items: [
    {
      q: "Will our hosts think this is trying to replace them?",
      a: "Not at all. We built this specifically to protect hosts from burnout. When the floor is busy, hosts hate having to juggle the ringing phone while greeting people at the door. Brio handles the phone distractions so hosts can focus on dining room hospitality.",
    },
    {
      q: "How do we know what orders came in if it isn't hooked to our POS yet?",
      a: "Every time a caller places an order, Brio structures the items, modifiers, pickup time, and contact info onto your CoHost Manager Dashboard and sends an instant SMS alert to the manager's phone. Your staff can punch it into your register whenever they have a free second.",
    },
    {
      q: "Is Brio only for New York City restaurants?",
      a: "No. Brio answers the phone, so it works for a restaurant in any city. We built and tested it on New York City dining floors first, which is where we learned how a busy host stand really runs. Start a free pilot from anywhere and we'll set up your menu.",
    },
    {
      q: "What if a customer has a complex catering or complaint call?",
      a: "Brio knows when to step aside. It captures the customer's name, phone number, and a detailed summary of their request, and immediately flags it on your dashboard with an SMS alert so a manager can call them back.",
    },
  ] as { q: string; a: string; demo?: (number: string) => string }[],
};

export const PILOT = {
  eyebrow: "Zero-Risk 7-Day Pilot",
  title: "Give your host stand a break this week.",
  text: "Test Brio during your weekend dinner rushes. If your front-of-house staff doesn’t immediately feel the relief, turn off call forwarding with a single click. No contracts. No setup fees.",
  restaurant: "Restaurant Name (e.g. Demo Coffee House)",
  phone: "Your Cell Phone Number",
  submit: "Start Free Pilot",
  done: "Demo request received! We will configure your menu profile and contact you within 2 hours.",
};

/**
 * The "Talk to Brio" button in the corner: a live call with Brio in the
 * browser, and once per visitor, a pop-up that rings like an incoming call.
 * Set `enabled` to false to take it off the page.
 */
export const BRIO_CALL = {
  enabled: true,
  launcher: "Talk to Brio",
  missed: "Call Brio back",
  onCall: "On call",
  ring: {
    name: "Brio",
    line: "CoHost AI · Incoming call",
    text: "Hi! Got a question about CoHost AI? Ask me out loud, right here in your browser.",
    note: "Uses your microphone",
    answer: "Answer",
    decline: "Not now",
  },
  title: "Talk to Brio",
  subtitle: "CoHost AI's phone wingman",
  intro:
    "Ask anything about CoHost AI: the 7-day pilot, setup, or how Brio handles your calls. You can also place a pretend to-go order and hear exactly what your callers would.",
  start: "Start Call",
  consent: "Uses your microphone. Calls may be recorded and transcribed.",
  status: {
    mic: "Waiting for your microphone…",
    connecting: "Calling Brio…",
    speaking: "Brio is speaking",
    listening: "Listening…",
    ended: "Call ended",
    wrapUp: "30 seconds left",
  },
  mute: "Mute",
  end: "End Call",
  minimize: "Minimize the call",
  close: "Close",
  sound: "Can't hear Brio? Turn on sound.",
  thanks: "Thanks for talking with Brio.",
  next: "Want Brio answering your restaurant's phone?",
  again: "Call Again",
  retry: "Try Again",
  numberInstead: "Leave Your Number Instead",
  problems: {
    mic_denied:
      "Brio needs your microphone. Allow it for this site in your browser's settings, then try again.",
    no_mic:
      "We couldn't use a microphone on this device. Check that one is connected and not busy in another app, then try again.",
    unsupported:
      "This browser can't place the call. Open the page in Chrome or Safari (not inside a social app) and try again.",
    busy: "Brio's web line is busy today. Leave your number and we'll call you.",
    try_later:
      "You've called Brio a few times already. Try again in an hour, or leave your number.",
    closed:
      "Brio's web line isn't open yet. Leave your number and we'll call you.",
    failed: "The call didn't connect. Check your connection and try again.",
  },
};

export const FOOTER = {
  company: "CoHost AI, Inc.",
  motto: '"We deal with calls so your host can deal with actual customers."',
  legal:
    "© 2026 CoHost AI. All rights reserved. Built in New York City for independent restaurants everywhere.",
};
