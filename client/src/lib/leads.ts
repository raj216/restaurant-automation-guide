import { RpcError, rpc } from "./supabase";

// The 14-day pilot sign-up form on the home page. The database checks the
// same rules (supabase/migrations/*_website_leads*.sql), so change both together.

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

  let reply: SubmitReply;
  try {
    reply = await rpc<SubmitReply>("submit_website_lead", {
      p_lead: {
        form: "pilot",
        ...fields,
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
    reply.field && reply.field in FIELD_PROBLEMS
      ? (reply.field as PilotField)
      : undefined;
  return field
    ? { ok: false, field, message: FIELD_PROBLEMS[field] }
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
