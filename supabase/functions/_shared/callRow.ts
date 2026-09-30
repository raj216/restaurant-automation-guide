// Turns the call Retell sends after a phone call into a row of public.calls.
// No database or network here, so the tests can run it directly.
//
// Only the fields Retell actually sent are included: the call_ended event
// comes before the analysis, and saving it must not wipe a summary that a
// call_analyzed event already saved (the row is upserted, not replaced).

/** The Retell webhook events that carry a finished call. */
export const RETELL_CALL_EVENTS = ["call_ended", "call_analyzed"];

const CALL_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
// Safety rule 9: 13 to 19 digits in a row (single spaces, dots or dashes
// allowed between them) look like a card number. It's the pattern the
// ordering system's orders_no_card_numbers check refuses. They're replaced
// before saving, and the calls table refuses anything that slips through.
const CARD_LIKE = /(?:\d[ .-]?){12,18}\d/g;

export function redactCards(text: string): string {
  return text.replace(CARD_LIKE, "[number removed]");
}

// What the call was about, from the agent's post-call analysis field
// "call_type" (any of these spellings).
const KINDS: Record<string, string> = {
  order: "order",
  to_go_order: "order",
  takeout: "order",
  pickup_order: "order",
  reservation: "reservation",
  booking: "reservation",
  table_request: "reservation",
  guest_alert: "alert",
  alert: "alert",
  lost_and_found: "alert",
  complaint: "alert",
  callback: "alert",
  spam: "spam",
  robocall: "spam",
  solicitor: "spam",
  sales_call: "spam",
  question: "question",
  menu_question: "question",
  info: "question",
  other: "other",
};

export function normalizeKind(value: unknown): string | null {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return KINDS[key] ?? null;
}

function phone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d+]/g, "");
  return /^\+?[0-9]{3,15}$/.test(cleaned) ? cleaned : null;
}

function isoFromMs(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? new Date(value).toISOString() : null;
}

/** Trimmed, card numbers removed, cut to `max`; undefined when Retell didn't send text. */
function text(value: unknown, max: number): string | null | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = redactCards(value.trim());
  return cleaned ? cleaned.slice(0, max) : null;
}

/** Retell's custom analysis fields: plain values only, card numbers removed, sizes capped. */
function cleanAnalysis(data: unknown): Record<string, string | number | boolean> | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [rawKey, value] of Object.entries(data as Record<string, unknown>).slice(0, 30)) {
    const key = redactCards(rawKey).slice(0, 60);
    if (typeof value === "string") {
      const cleaned = redactCards(value.trim()).slice(0, 300);
      if (cleaned) out[key] = cleaned;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) < 1e9) {
      out[key] = value;
    }
  }
  return out;
}

// deno-lint-ignore no-explicit-any
type RetellCall = Record<string, any>;

/** The row to upsert for this call, or null if Retell sent no usable call id. */
export function callRowFromRetell(call: RetellCall, restaurantId: string): Record<string, unknown> | null {
  if (!call || typeof call !== "object" || !CALL_ID_RE.test(String(call.call_id ?? ""))) return null;
  const row: Record<string, unknown> = { restaurant_id: restaurantId, call_id: call.call_id };

  if (call.call_type === "phone_call" || call.call_type === "web_call") row.call_type = call.call_type;
  if (call.direction === "inbound" || call.direction === "outbound") row.direction = call.direction;
  const from = phone(call.from_number);
  if (from) row.from_number = from;
  const to = phone(call.to_number);
  if (to) row.to_number = to;

  const started = isoFromMs(call.start_timestamp);
  if (started) row.started_at = started;
  const ended = isoFromMs(call.end_timestamp);
  if (ended) row.ended_at = ended;
  const durationMs =
    typeof call.duration_ms === "number"
      ? call.duration_ms
      : typeof call.end_timestamp === "number" && typeof call.start_timestamp === "number"
        ? call.end_timestamp - call.start_timestamp
        : NaN;
  if (Number.isFinite(durationMs) && durationMs >= 0) row.duration_seconds = Math.min(86400, Math.round(durationMs / 1000));
  if (typeof call.disconnection_reason === "string" && call.disconnection_reason) {
    row.disconnection_reason = call.disconnection_reason.slice(0, 100);
  }

  const transcript = text(call.transcript, 60000);
  if (transcript !== undefined) row.transcript = transcript;

  const analysis = call.call_analysis;
  if (analysis && typeof analysis === "object") {
    const summary = text(analysis.call_summary, 4000);
    if (summary !== undefined) row.summary = summary;
    if (typeof analysis.user_sentiment === "string") row.sentiment = analysis.user_sentiment.slice(0, 40);
    if (typeof analysis.call_successful === "boolean") row.successful = analysis.call_successful;
    if (typeof analysis.in_voicemail === "boolean") row.in_voicemail = analysis.in_voicemail;
    const custom = cleanAnalysis(analysis.custom_analysis_data);
    if (custom) {
      row.analysis = custom;
      const kind = normalizeKind(custom.call_type ?? custom.type ?? custom.category);
      if (kind) row.kind = kind;
    }
  }
  return row;
}
