// Every word on the CoHost AI home page, as the owner wrote it. Sample
// callers use 555-01xx numbers, which are reserved for fiction, so no real
// person's phone is shown.

/**
 * The number people can call to hear Brio. Leave it null until the real line
 * is set: the "Dial Live Demo" button and the FAQ's call-us line stay hidden.
 */
export const DEMO_LINE: { label: string; tel: string } | null = null;

export const NAV = [
  { label: "Live Dashboard", href: "#dashboard" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "POS Roadmap", href: "#roadmap" },
  { label: "FAQ", href: "#faq" },
];

export const PILOT_CTA = "Start 14-Day Pilot";

export const HERO = {
  badge: "Tested on New York City Dining Floors",
  titleStart: "We deal with calls so your host can deal with ",
  titleHighlight: "actual customers",
  titleEnd: ".",
  lead: [
    "Meet ",
    { strong: "Brio" },
    "—the phone wingman for independent restaurants. Brio answers incoming calls instantly, takes to-go orders, and sends structured summaries straight to your manager dashboard so staff can handle them when they're free.",
  ] as (string | { strong: string })[],
  primary: "Get Your 14-Day Free Pilot",
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

export const RESTAURANT = "Norma Trattoria";

export const STAGE = {
  label:
    "Brio answering a call on an iPhone: it takes a to-go order, sends the manager an SMS summary, and drops a robocall.",
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
      main: "2x Rigatoni Vodka + Salad",
      sub: "1 GF penne • Pickup 7:55 PM",
    },
    {
      title: "SMS alert sent",
      time: "7:31 PM",
      main: "Summary sent to manager",
      sub: "Order #1082 • Ready for review",
    },
    {
      title: "Robocall Dropped",
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
      text: "Two rigatoni vodka for pickup, one gluten-free, and the fennel salad.",
    },
    {
      brio: true,
      step: 2,
      text: "Done! GF penne for one, ready at 7:55 PM. I'm texting you a confirmation.",
    },
  ],
  sent: "Summary sent to manager",
};

/** Facts from the copy, as numbers. */
export const STATS = [
  { value: 600, unit: "ms", label: "Brio's response time on a live call" },
  { value: 15, unit: "min", label: "To get up and running" },
  { value: 3, unit: "rings", label: "Then Brio picks up, if your host can't" },
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
      "Rigatoni alla Vodka · $22",
      "Gluten-free penne · +$2",
      "Allergens · vodka sauce has dairy",
      "Hours · 5–11 PM daily",
    ],
  },
  forward: {
    line: "Your restaurant line",
    brio: "Brio",
    note: "After 3 rings, or when the line is busy",
  },
  alerts: [
    {
      kind: "order",
      title: "To-Go Order #1082",
      sub: "2x Rigatoni Vodka + Salad • $60.00",
    },
    {
      kind: "reservation",
      title: "Reservation • Party of 4",
      sub: "Tonight 8:00 PM • Anniversary",
    },
    {
      kind: "alert",
      title: "Guest Alert • Booth #4",
      sub: "Left sunglasses • Call back",
    },
  ],
};

export const PIPELINE = {
  from: "Brio",
  pos: ["Toast", "Square", "Clover"],
  to: "Kitchen display (KDS)",
};

export const WINGMAN_NOTE = "Friday • 7:30 PM";

export const RECORDING = { length: 48 };

export const SPAM_FACTS = [
  "1.8s call",
  "0 rings at the host stand",
  "Solicitor blocked",
];

export type Kind = "order" | "reservation" | "alert" | "spam";

export interface Ticket {
  kind: Kind;
  caller: string;
  badge: string;
  summary: string;
  status: string;
}

export const DASHBOARD = {
  eyebrow: "Instant Visibility",
  titleStart: "See how Brio organizes your ",
  titleHighlight: "phone rush",
  text: "Your team isn't trapped on the phone for four minutes. Calls are resolved, structured into summaries, and flagged for review when you have a free second.",
  windowTitle: "dashboard.cohost.site",
  fullScreen: "Full screen",
  frameTitle: "CoHost AI example dashboard with sample customers",
  example: "Open the example dashboard",
  exampleNote: "Sample customers and orders. No sign-up needed.",
  online: "Online",
  live: "Live Activity (7:32 PM)",
  feed: [
    {
      kind: "order",
      caller: "(646) 555-0142",
      badge: "To-Go Order",
      summary: "2x Rigatoni Vodka + Salad",
      status: "Ready for review • 1m ago",
    },
    {
      kind: "reservation",
      caller: "(917) 555-0187",
      badge: "Reservation",
      summary: "Party of 4 • Tonight 8:00 PM",
      status: "Confirmed with caller • 4m ago",
    },
    {
      kind: "alert",
      caller: "(212) 555-0163",
      badge: "Guest Alert",
      summary: "Left sunglasses at booth #4",
      status: "Needs quick manager follow-up • 8m ago",
    },
    {
      kind: "spam",
      caller: "Blocked Caller",
      badge: "Robocall Dropped",
      summary: '"Working Capital Loan Offer"',
      status: "Terminated in 2s • Zero floor ringing",
    },
  ] as Ticket[],
};

export const ORDER_TICKET = {
  title: "To-Go Order Summary (#1082)",
  meta: ["Caller: Sarah L.", "(646) 555-0142", "Pickup Estimated: 7:55 PM"],
  badge: "Order Captured",
  itemsTitle: "Structured Items & Modifiers",
  items: [
    {
      name: "1x Rigatoni alla Vodka",
      note: "(Sub Gluten-Free Penne)",
      price: "$24.00",
    },
    { name: "1x Classic Rigatoni alla Vodka", price: "$22.00" },
    { name: "1x Arugula & Shaved Fennel Salad", price: "$14.00" },
  ],
  subtotal: ["Subtotal Estimate", "$60.00"],
  transcriptTitle: "Call Audio & Transcript Summary",
  transcript:
    '"Caller confirmed allergy: 1 GF penne substituted. Caller told estimated pickup is 25 minutes. SMS confirmation dispatched."',
  actionsTitle: "Staff Actions",
  actionsText:
    "Review details and punch directly into POS or kitchen ticket when line clears.",
  actions: [
    {
      label: "Punch to Kitchen",
      done: "Order logged! Staff member marked as sent to kitchen.",
    },
    { label: "Text Customer", done: "SMS update sent to customer phone." },
  ],
};

export const RESERVATION_TICKET = {
  title: "Reservation Inquiry",
  meta: ["Caller: Dave K.", "(917) 555-0187", "Requested: 8:00 PM Tonight"],
  badge: "Table Requested",
  paramsTitle: "Request Parameters",
  params: [
    ["Party Size", "4 Guests"],
    ["Seating Preference", "Indoor / Quiet booth if possible"],
    ["Special Occasion", "Anniversary Dinner"],
  ],
  noteTitle: "Brio Conversation Note",
  note: '"Brio informed caller that 8:00 PM is high volume, logged party size, and explained a 10-15 min greeting window upon arrival."',
  actionsTitle: "Actions",
  action: {
    label: "Confirm in Resy / Book",
    done: "Confirmed on Host Stand book.",
  },
};

export const ALERT_TICKET = {
  title: "Guest Assistance Flag",
  meta: ["Caller: Elena M.", "(212) 555-0163", "Dined at 6:15 PM"],
  badge: "Needs Attention",
  summaryTitle: "Summary of Call",
  summary:
    '"Guest states she left a pair of black prescription sunglasses at booth #4 during early dinner service. Requested host or manager check the booth."',
  actions: [
    {
      label: "Reply via SMS",
      done: "SMS drafted to guest with manager direct contact.",
    },
    { label: "Mark Resolved", done: "Marked resolved." },
  ],
};

export const SPAM_TICKET = {
  title: "Spam Intercepted",
  meta: ["Automated Solicitor Dropped"],
  badge: "Blocked",
  text: "Brio identified an automated sales pitch attempting to solicit linen services and small business loans. Call was terminated in 1.8 seconds. Your host desk phone never made a sound.",
};

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
      text: "Keep your existing restaurant phone number. Set it to forward after 3 rings or when your line is busy. If your host is free, they can still pick up!",
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
      q: "Does Brio sound like an annoying automated phone tree?",
      a: 'No robotic "Press 1 for hours" menus. Brio uses conversational streaming voice technology that responds in 600 milliseconds, understands interruptions, and speaks naturally.',
      demo: (number: string) =>
        `Call our demo line right now at ${number} to test it yourself!`,
    },
    {
      q: "What if a customer has a complex catering or complaint call?",
      a: "Brio knows when to step aside. It captures the customer's name, phone number, and a detailed summary of their request, and immediately flags it on your dashboard with an SMS alert so a manager can call them back.",
    },
  ] as { q: string; a: string; demo?: (number: string) => string }[],
};

export const PILOT = {
  eyebrow: "Zero-Risk 14-Day Pilot",
  title: "Give your host stand a break this week.",
  text: "Test Brio during your weekend dinner rushes. If your front-of-house staff doesn’t immediately feel the relief, turn off call forwarding with a single click. No contracts. No setup fees.",
  restaurant: "Restaurant Name (e.g. Norma Trattoria)",
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
    "Ask anything about CoHost AI: the 14-day pilot, setup, or how Brio handles your calls. You can also place a pretend to-go order and hear exactly what your callers would.",
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
    "© 2026 CoHost AI. All rights reserved. Built for independent dining establishments across New York City.",
};
