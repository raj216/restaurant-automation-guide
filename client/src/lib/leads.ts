import { RpcError, rpc } from "./supabase";

// The forms on the home page: the 7-day pilot sign-up, and the pricing
// section's Build My Plan box. The database checks the same rules
// (supabase/migrations/*_website_leads*.sql), so change both together.

/** The longest value the database accepts for each field. */
export const PILOT_LIMITS = {
  restaurant: 160,
  phone: 40,
} as const;

export interface PilotFields {
  restaurant: string;
  phone: string;
  /** The hidden bot trap. People leave it empty. */
  website: string;
}

export type PilotField = Exclude<keyof PilotFields, "website">;

export type SubmitPilotResult =
  | { ok: true }
  | { ok: false; message: string; field?: PilotField };

const FIELD_PROBLEMS: Record<PilotField, string> = {
  restaurant: "Please add your restaurant's name.",
  phone: "Please check your cell phone number.",
};

const TRY_AGAIN =
  "Something went wrong on our side. Please try again in a minute. Your answers are still here.";

/** Reads the form's fields, trimmed. */
export function readPilotFields(form: HTMLFormElement): PilotFields {
  const data = new FormData(form);
  // Postgres text can't hold NUL, so drop it rather than fail the request.
  const value = (name: keyof PilotFields) =>
    String(data.get(name) ?? "")
      .replace(/\u0000/g, "")
      .trim();
  return {
    restaurant: value("restaurant"),
    phone: value("phone"),
    website: value("website"),
  };
}

/** Checks the fields the way the database will, so most problems show before sending. */
export function findPilotProblem(
  fields: PilotFields
): { field: PilotField; message: string } | null {
  let field: PilotField | null = null;
  const digits = fields.phone.replace(/\D/g, "").length;
  if (!fields.restaurant || fields.restaurant.length > PILOT_LIMITS.restaurant)
    field = "restaurant";
  else if (
    fields.phone.length > PILOT_LIMITS.phone ||
    digits < 7 ||
    digits > 20
  )
    field = "phone";
  return field ? { field, message: FIELD_PROBLEMS[field] } : null;
}

/** The longest values the Build My Plan box sends, and the most locations. */
export const CUSTOM_LIMITS = {
  restaurant: 160,
  phone: 40,
  email: 254,
  locations: 999,
  need: 4000,
} as const;

/** The choices for minutes a month; the database accepts exactly these. */
export const CUSTOM_MINUTES = [
  "Up to 1,500",
  "1,500 to 3,000",
  "3,000 to 5,000",
  "More than 5,000",
  "Not sure yet",
] as const;

export interface CustomPlanFields {
  restaurant: string;
  phone: string;
  email: string;
  locations: string;
  minutes: string;
  need: string;
  /** The hidden bot trap. People leave it empty. */
  website: string;
}

export type CustomPlanField = Exclude<keyof CustomPlanFields, "website">;

export type SubmitCustomPlanResult =
  | { ok: true }
  | { ok: false; message: string; field?: CustomPlanField };

const CUSTOM_PROBLEMS: Record<CustomPlanField, string> = {
  restaurant: "Please add your restaurant's name.",
  phone: "Please check your phone number.",
  email: "Please check your email address.",
  locations: "Please enter how many restaurants you have (1 to 999).",
  minutes: "Please pick how many minutes of calls a month you're after.",
  need: "Please keep this under 4,000 characters.",
};

/** Reads the Build My Plan box's fields, trimmed. */
export function readCustomPlanFields(form: HTMLFormElement): CustomPlanFields {
  const data = new FormData(form);
  const value = (name: keyof CustomPlanFields) =>
    String(data.get(name) ?? "")
      .replace(/\u0000/g, "")
      .trim();
  return {
    restaurant: value("restaurant"),
    phone: value("phone"),
    email: value("email"),
    locations: value("locations"),
    minutes: value("minutes"),
    need: value("need"),
    website: value("website"),
  };
}

/** Checks the Build My Plan box the way the database will. */
export function findCustomPlanProblem(
  fields: CustomPlanFields
): { field: CustomPlanField; message: string } | null {
  const digits = fields.phone.replace(/\D/g, "").length;
  const locations = /^[0-9]{1,3}$/.test(fields.locations)
    ? Number(fields.locations)
    : 0;
  let field: CustomPlanField | null = null;
  if (!fields.restaurant || fields.restaurant.length > CUSTOM_LIMITS.restaurant)
    field = "restaurant";
  else if (
    fields.phone.length > CUSTOM_LIMITS.phone ||
    digits < 7 ||
    digits > 20
  )
    field = "phone";
  else if (
    fields.email.length < 3 ||
    fields.email.length > CUSTOM_LIMITS.email ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(fields.email)
  )
    field = "email";
  else if (locations < 1 || locations > CUSTOM_LIMITS.locations)
    field = "locations";
  else if (!(CUSTOM_MINUTES as readonly string[]).includes(fields.minutes))
    field = "minutes";
  else if (fields.need.length > CUSTOM_LIMITS.need) field = "need";
  return field ? { field, message: CUSTOM_PROBLEMS[field] } : null;
}

/**
 * Saves one custom-plan request (it shows on the Leads page with the
 * pilot sign-ups). clientId works as in submitPilot.
 */
export async function submitCustomPlan(
  fields: CustomPlanFields,
  clientId: string,
  startedAt: number
): Promise<SubmitCustomPlanResult> {
  const problem = findCustomPlanProblem(fields);
  if (problem) return { ok: false, ...problem };
  return sendLead(
    {
      form: "custom",
      ...fields,
      locations: Number(fields.locations),
      need: fields.need || undefined,
    },
    clientId,
    startedAt,
    CUSTOM_PROBLEMS
  );
}

type SubmitReply =
  | { ok: true; id?: string; duplicate?: boolean }
  | { ok: false; error: "invalid" | "rate_limited" | "busy"; field?: string };

/**
 * Saves one pilot sign-up in the database.
 *
 * clientId names this form fill: sending it again (a retry, a double
 * click) returns the saved sign-up instead of making a copy.
 */
export async function submitPilot(
  fields: PilotFields,
  clientId: string,
  startedAt: number
): Promise<SubmitPilotResult> {
  const problem = findPilotProblem(fields);
  if (problem) return { ok: false, ...problem };

  return sendLead(
    { form: "pilot", ...fields },
    clientId,
    startedAt,
    FIELD_PROBLEMS
  );
}

/** Sends one form's answers, and turns the database's reply into what to show. */
async function sendLead<F extends string>(
  lead: Record<string, unknown>,
  clientId: string,
  startedAt: number,
  problems: Record<F, string>
): Promise<{ ok: true } | { ok: false; message: string; field?: F }> {
  let reply: SubmitReply;
  try {
    reply = await rpc<SubmitReply>("submit_website_lead", {
      p_lead: {
        ...lead,
        client_id: clientId,
        source: describeVisit(startedAt),
      },
    });
  } catch (error) {
    const kind = error instanceof RpcError ? error.kind : "network";
    return {
      ok: false,
      message:
        kind === "server"
          ? TRY_AGAIN
          : "We couldn't send your request. Check your internet connection and try again. Your answers are still here.",
    };
  }

  if (reply.ok) return { ok: true };
  if (reply.error === "rate_limited") {
    return {
      ok: false,
      message:
        "We've already received a few requests from this connection. Please wait a while and try again.",
    };
  }
  if (reply.error === "busy") {
    return {
      ok: false,
      message:
        "We're receiving a lot of requests right now. Please try again in a few minutes.",
    };
  }
  const field =
    reply.field && reply.field in problems ? (reply.field as F) : undefined;
  return field
    ? { ok: false, field, message: problems[field] }
    : { ok: false, message: TRY_AGAIN };
}

/** Where the request came from: the page, the referring site, campaign tags and the browser. */
function describeVisit(startedAt: number) {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ]) {
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
