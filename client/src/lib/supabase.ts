// The Kadmivo database: the Supabase project "kadmivo-ordering".
//
// Both values are public by design. The key only reaches the functions
// that are meant to be called from a browser (see supabase/migrations/),
// and those check their own input and, for the Leads page, a passcode
// session.
export const SUPABASE_URL = "https://wikfhxcayrauimictlmk.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_d2AMHdVV8wmCWQ5lV7almg_k0ksq26M";

/** Why a call failed before the function could answer. */
export type RpcFailure = "network" | "timeout" | "server";

export class RpcError extends Error {
  readonly kind: RpcFailure;

  constructor(kind: RpcFailure, message: string) {
    super(message);
    this.name = "RpcError";
    this.kind = kind;
  }
}

/** Calls a database function and returns its JSON reply. Throws RpcError when there is no reply. */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } catch {
    throw new RpcError(controller.signal.aborted ? "timeout" : "network", `Could not reach ${fn}`);
  } finally {
    window.clearTimeout(timer);
  }
  if (!response.ok) throw new RpcError("server", `${fn} answered ${response.status}`);
  try {
    return (await response.json()) as T;
  } catch {
    throw new RpcError("server", `${fn} sent a reply that isn't JSON`);
  }
}

/** A random v4 UUID, also in browsers without crypto.randomUUID. */
export function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
