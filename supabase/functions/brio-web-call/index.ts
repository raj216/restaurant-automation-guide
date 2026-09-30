// Supabase Edge Function: starts a call with Brio from the website's
// "Talk to Brio" button (https://<project>.supabase.co/functions/v1/brio-web-call).
//
// A browser can't hold our Retell API key, so the page asks here instead.
// Before any call is created:
//   * the request must come from the CoHost AI site (or WEB_CALL_ORIGINS);
//   * the visitor and the whole site must be under their call caps
//     (public.claim_web_call: 3 an hour and 6 a day per visitor, 30 a day in all).
// Then Retell creates the web call (at most 5 minutes; it ends after 30 s of
// silence), tagged as a website call so it stays out of the restaurants' Live
// Inbox, and the browser gets what it needs to join with Retell's web SDK.
//
// Settings (Supabase secrets):
//   RETELL_WEB_AGENT_ID  the Retell agent that answers website calls. Until it's
//                        set (here or in WEB_AGENT_ID below), every request gets
//                        503 "not_configured" and nothing is spent.
//   WEB_CALL_ORIGINS     optional: more site addresses, comma-separated.
//   RETELL_API_KEY, AGENT_EMAIL, AGENT_PASSWORD, PUBLIC_API_KEY: shared with the
//                        other functions.

import { agentClient } from "../_shared/agent.ts";
import {
  agentIdFrom,
  allowedOrigin,
  createWebCallBody,
  joinDetails,
  RETELL_CREATE_WEB_CALL,
  visitorIp,
} from "../_shared/webCall.ts";

// The website agent's id, if it isn't set as a secret. Agent ids aren't secret:
// without our API key, nobody can start a call with one.
const WEB_AGENT_ID = "";

const env = (name: string): string => Deno.env.get(name) ?? "";
const log = (event: string, details: Record<string, unknown> = {}) => console.log(JSON.stringify({ event, ...details }));

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const fromSite = allowedOrigin(origin, env("WEB_CALL_ORIGINS"));
  const headers: Record<string, string> = fromSite
    ? {
        "Access-Control-Allow-Origin": origin!,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
  const reply = (body: unknown, status: number) => Response.json(body, { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: fromSite ? 204 : 403, headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (!fromSite) {
    log("brio_web_call_wrong_origin", { origin });
    return reply({ error: "origin" }, 403);
  }

  const agentId = agentIdFrom(env("RETELL_WEB_AGENT_ID") || WEB_AGENT_ID);
  const apiKey = env("RETELL_API_KEY");
  if (!agentId || !apiKey) return reply({ error: "not_configured" }, 503);

  // A slot under the caps, or a polite no.
  let claim: number;
  try {
    const db = await agentClient();
    const { data, error } = await db.rpc("claim_web_call", { p_ip: visitorIp(req.headers) });
    if (error) throw error;
    if (!data?.ok) {
      log("brio_web_call_capped", { reason: data?.error ?? null });
      return reply({ error: data?.error === "daily_limit" ? "busy" : "try_later" }, 429);
    }
    claim = data.claim;
  } catch (err) {
    log("brio_web_call_claim_failed", { error: String((err as Error)?.message ?? err) });
    return reply({ error: "unavailable" }, 503);
  }

  let details;
  try {
    const response = await fetch(RETELL_CREATE_WEB_CALL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(createWebCallBody(agentId)),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      log("brio_web_call_retell_refused", {
        status: response.status,
        message: String(data?.error_message ?? data?.message ?? "").slice(0, 300),
      });
      return reply({ error: "unavailable" }, 502);
    }
    details = joinDetails(data);
    if (!details) {
      log("brio_web_call_retell_odd_reply", {});
      return reply({ error: "unavailable" }, 502);
    }
  } catch (err) {
    log("brio_web_call_retell_unreachable", { error: String((err as Error)?.message ?? err) });
    return reply({ error: "unavailable" }, 502);
  }

  // Which Retell call the slot became, for looking back. The call goes ahead either way.
  try {
    const { error } = await (await agentClient()).rpc("note_web_call", { p_claim: claim, p_call_id: details.call_id });
    if (error) throw error;
  } catch (err) {
    log("brio_web_call_note_failed", { call_id: details.call_id, error: String((err as Error)?.message ?? err) });
  }
  log("brio_web_call_started", { call_id: details.call_id });
  return reply(details, 200);
});
