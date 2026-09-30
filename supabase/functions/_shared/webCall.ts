// The "Talk to Brio" button's server side (the brio-web-call function), minus
// the network and database, so the tests can run it directly.

/** Retell's API for starting a browser call. (v2 was switched off on 2026-09-30.) */
export const RETELL_CREATE_WEB_CALL = "https://api.retellai.com/v3/create-web-call";

/** A website call ends by itself after 5 minutes, or after 30 seconds of silence. */
export const WEB_CALL_MAX_MS = 5 * 60_000;
export const WEB_CALL_SILENCE_MS = 30_000;

/** Tagged on every website call, so the retell-events webhook keeps them out of the restaurants' inboxes. */
export const WEBSITE_SOURCE = "website";

const SITE_ORIGINS = [
  /^https:\/\/cohostai\.joinexhiby\.workers\.dev$/, // the live site
  /^https:\/\/[a-z0-9-]+-cohostai\.joinexhiby\.workers\.dev$/, // Cloudflare previews
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/, // a developer's own computer
];

/**
 * Whether a page at this origin may start calls. `extra` is the optional
 * WEB_CALL_ORIGINS secret: more addresses, comma-separated (the custom domain,
 * once there is one).
 */
export function allowedOrigin(origin: string | null, extra = ""): boolean {
  if (!origin) return false;
  const listed = extra
    .split(",")
    .map(value => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return listed.includes(origin) || SITE_ORIGINS.some(pattern => pattern.test(origin));
}

/** The visitor's IP address, as the proxies in front of Supabase pass it on. Only its salted hash is stored. */
export function visitorIp(headers: Headers): string {
  const first = (name: string) => headers.get(name)?.split(",")[0]?.trim() ?? "";
  return (first("cf-connecting-ip") || first("x-real-ip") || first("x-forwarded-for") || "unknown").slice(0, 100);
}

const AGENT_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;

/** A Retell agent id, or "" when the setting is empty or malformed. */
export function agentIdFrom(value: string | undefined): string {
  const id = (value ?? "").trim();
  return AGENT_ID_RE.test(id) ? id : "";
}

/** What we ask Retell for: the website agent, tagged as a website call, held to the time limits. */
export function createWebCallBody(agentId: string) {
  return {
    agent_id: agentId,
    metadata: { source: WEBSITE_SOURCE },
    agent_override: {
      agent: { max_call_duration_ms: WEB_CALL_MAX_MS, end_call_after_silence_ms: WEB_CALL_SILENCE_MS },
    },
  };
}

const CALL_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

type IceServer = { urls: string | string[]; username?: string; credential?: string };

const isIceServer = (value: unknown): value is IceServer => {
  const urls = (value as { urls?: unknown } | null)?.urls;
  return typeof urls === "string" || (Array.isArray(urls) && urls.every(url => typeof url === "string"));
};

export interface JoinDetails {
  access_token: string;
  call_id: string;
  transport?: "gateway" | "livekit";
  url?: string;
  ice_servers?: IceServer[];
  expires_at?: number;
}

/** The part of Retell's answer the browser needs to join the call, or null if it's unusable. */
export function joinDetails(data: unknown): JoinDetails | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.access_token !== "string" || !d.access_token || d.access_token.length > 8192) return null;
  if (typeof d.call_id !== "string" || !CALL_ID_RE.test(d.call_id)) return null;
  const out: JoinDetails = { access_token: d.access_token, call_id: d.call_id };
  if (d.transport === "gateway" || d.transport === "livekit") out.transport = d.transport;
  if (typeof d.url === "string" && /^(https|wss):\/\//.test(d.url)) out.url = d.url;
  if (typeof d.expires_at === "number" && Number.isFinite(d.expires_at)) out.expires_at = d.expires_at;
  if (Array.isArray(d.ice_servers)) out.ice_servers = d.ice_servers.filter(isIceServer).slice(0, 10);
  return out;
}

/** A call started from the website's button (the retell-events webhook skips these). */
export function isWebsiteCall(call: unknown): boolean {
  if (!call || typeof call !== "object") return false;
  const metadata = (call as { metadata?: unknown }).metadata;
  return !!metadata && typeof metadata === "object" && (metadata as { source?: unknown }).source === WEBSITE_SOURCE;
}
