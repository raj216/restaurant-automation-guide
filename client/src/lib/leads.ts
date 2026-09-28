import { RpcError, rpc } from "./supabase";

// The contact form's choices. The database accepts exactly these
// (supabase/migrations/*_website_leads*.sql), so change both together.
export const POS_OPTIONS = ["Toast", "Square", "SpotOn", "Clover", "Other / not sure"];
export const CONTACT_OPTIONS = ["Email me", "Call me", "Either is fine"];

/** The longest value the database accepts for each text field. */
export const LEAD_LIMITS = {
  name: 120,
  restaurant: 160,
  email: 254,
  phone: 40,
  location: 160,
  need: 4000,
} as const;

export interface LeadFields {
  name: string;
  restaurant: string;
  email: string;
  phone: string;
  location: string;
  pos: string;
  need: string;
  contact_preference: string;
  /** The hidden bot trap. People leave it empty. */
  website: string;
}

export type LeadField = Exclude<keyof LeadFields, "website">;

export type SubmitLeadResult = { ok: true } | { ok: false; message: string; field?: LeadField };

const FIELD_PROBLEMS: Record<LeadField, string> = {
  name: "Please add your name.",
  restaurant: "Please add your restaurant's name.",
  email: "Please check your email address.",
  phone: "Please check your phone number, or leave it blank.",
  location: "Please add your city or neighborhood.",
  pos: "Please choose your current POS.",
  need: "Please tell us what happens when the phone gets busy.",
  contact_preference: "Please choose the best way to respond.",
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/** Reads the form's fields, trimmed. */
export function readLeadFields(form: HTMLFormElement): LeadFields {
  const data = new FormData(form);
  // Postgres text can't hold NUL, so drop it rather than fail the request.
  const value = (name: keyof LeadFields) => String(data.get(name) ?? "").replace(/\u0000/g, "").trim();
  return {
    name: value("name"),
    restaurant: value("restaurant"),
    email: value("email"),
    phone: value("phone"),
    location: value("location"),
    pos: value("pos"),
    need: value("need"),
    contact_preference: value("contact_preference"),
    website: value("website"),
  };
}

/** Checks the fields the way the database will, so most problems show before sending. */
export function findLeadProblem(f: LeadFields): LeadField | null {
  if (!f.name || f.name.length > LEAD_LIMITS.name) return "name";
  if (!f.restaurant || f.restaurant.length > LEAD_LIMITS.restaurant) return "restaurant";
  if (f.email.length > LEAD_LIMITS.email || !EMAIL.test(f.email)) return "email";
  if (f.phone) {
    const digits = f.phone.replace(/\D/g, "").length;
    if (f.phone.length > LEAD_LIMITS.phone || digits < 7 || digits > 20) return "phone";
  }
  if (!f.location || f.location.length > LEAD_LIMITS.location) return "location";
  if (!POS_OPTIONS.includes(f.pos)) return "pos";
  if (!f.need || f.need.length > LEAD_LIMITS.need) return "need";
  if (f.contact_preference && !CONTACT_OPTIONS.includes(f.contact_preference)) return "contact_preference";
  return null;
}

type SubmitReply =
  | { ok: true; id?: string; duplicate?: boolean }
  | { ok: false; error: "invalid" | "rate_limited" | "busy"; field?: string };

/**
 * Saves one filled-in form in the Kadmivo database.
 *
 * clientId names this form fill: sending it again (a retry, a double
 * click) returns the saved request instead of making a copy.
 */
export async function submitLead(fields: LeadFields, clientId: string, startedAt: number): Promise<SubmitLeadResult> {
  const problem = findLeadProblem(fields);
  if (problem) return { ok: false, field: problem, message: FIELD_PROBLEMS[problem] };

  let reply: SubmitReply;
  try {
    reply = await rpc<SubmitReply>("submit_website_lead", {
      p_lead: { ...fields, client_id: clientId, source: describeVisit(startedAt) },
    });
  } catch (error) {
    const kind = error instanceof RpcError ? error.kind : "network";
    return {
      ok: false,
      message:
        kind === "server"
          ? "Something went wrong on our side. Please try again in a minute. Your answers are still here."
          : "We couldn't send your request. Check your internet connection and try again. Your answers are still here.",
    };
  }

  if (reply.ok) return { ok: true };
  if (reply.error === "rate_limited") {
    return { ok: false, message: "We've already received a few requests from this connection. Please wait a while and try again." };
  }
  if (reply.error === "busy") {
    return { ok: false, message: "We're receiving a lot of requests right now. Please try again in a few minutes." };
  }
  const field = reply.field && reply.field in FIELD_PROBLEMS ? (reply.field as LeadField) : undefined;
  return field
    ? { ok: false, field, message: FIELD_PROBLEMS[field] }
    : { ok: false, message: "Something went wrong on our side. Please try again in a minute. Your answers are still here." };
}

/** Where the request came from: the page, the referring site, campaign tags and the browser. */
function describeVisit(startedAt: number) {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = undefined;
  }
  return {
    page: window.location.href,
    referrer: document.referrer || undefined,
    utm: Object.keys(utm).length ? utm : undefined,
    user_agent: navigator.userAgent,
    language: navigator.language,
    timezone,
    screen: `${window.screen.width}x${window.screen.height}`,
    seconds_to_send: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
  };
}
