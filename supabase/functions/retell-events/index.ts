// Supabase Edge Function: Retell's webhook
// (https://<project>.supabase.co/functions/v1/retell-events).
//
// Retell calls it when a call ends (call_ended) and again once its post-call
// analysis is ready (call_analyzed). Each call is saved in public.calls, where
// the Live Inbox (/inbox on the website) shows it: the summary, what the call
// was about, and who called.
//
// Same safety rules as the retell function that takes the orders:
//   * Every request must carry a valid Retell signature, or nothing is saved (401).
//   * The restaurant comes from the number that was dialled, looked up in
//     Supabase; web test calls use TEST_RESTAURANT_ID.
//   * It signs in as the restaurant's "agent" account (never the service_role
//     key), so Row Level Security and the calls table's rules apply.
//   * Saving the same call again updates it (Retell may retry).
//   * Calls from the website's "Talk to Brio" button aren't a restaurant's
//     calls, so they're left out.
//
// Settings are the Supabase secrets the retell function already uses:
//   RETELL_API_KEY, AGENT_EMAIL, AGENT_PASSWORD, PUBLIC_API_KEY, TEST_RESTAURANT_ID.

import type { SupabaseClient } from "@supabase/supabase-js";
import { agentClient } from "../_shared/agent.ts";
import { callRowFromRetell, RETELL_CALL_EVENTS } from "../_shared/callRow.ts";
import { verifyRetellSignature } from "../_shared/retellSignature.ts";
import { isWebsiteCall } from "../_shared/webCall.ts";

const env = (name: string): string => Deno.env.get(name) ?? "";
const log = (event: string, details: Record<string, unknown>) => console.log(JSON.stringify({ event, ...details }));

// deno-lint-ignore no-explicit-any
async function findRestaurantId(db: SupabaseClient, call: Record<string, any>): Promise<string | null> {
  if (call.call_type === "phone_call" || call.to_number) {
    if (!call.to_number) return null;
    const { data, error } = await db.from("restaurants").select("id").eq("phone_number", call.to_number).maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  }
  // Browser test calls have no dialled number: use the configured test restaurant, if any.
  return env("TEST_RESTAURANT_ID") || null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const apiKey = env("RETELL_API_KEY");
  // Without our Retell key we can't tell real requests from fake ones: refuse everything.
  if (!apiKey) return Response.json({ error: "not configured" }, { status: 503 });

  const rawBody = await req.text(); // the exact bytes, needed for the signature check
  if (!verifyRetellSignature({ rawBody, signature: req.headers.get("x-retell-signature") ?? "", apiKey })) {
    log("retell_events_bad_signature", {});
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const event = payload?.event;
  const call = payload?.call;
  // call_started and anything new: nothing to save yet. Answer 200 so Retell doesn't retry.
  if (!RETELL_CALL_EVENTS.includes(event) || !call || typeof call !== "object") {
    return Response.json({ ok: true, ignored: typeof event === "string" ? event : null });
  }
  if (isWebsiteCall(call)) return Response.json({ ok: true, ignored: "website call" });

  try {
    const db = await agentClient();
    const restaurantId = await findRestaurantId(db, call);
    if (!restaurantId) {
      log("retell_events_unknown_restaurant", { call_id: call.call_id ?? null, event });
      return Response.json({ ok: true, ignored: "unknown restaurant" });
    }
    const row = callRowFromRetell(call, restaurantId);
    if (!row) {
      log("retell_events_bad_call_id", { event });
      return Response.json({ ok: true, ignored: "no call id" });
    }
    const { error } = await db.from("calls").upsert(row, { onConflict: "restaurant_id,call_id" });
    if (error) throw error;
    log("retell_events_saved", { call_id: row.call_id, event, kind: row.kind ?? null });
    return Response.json({ ok: true });
  } catch (err) {
    // Retell retries a failed delivery, and saving again is harmless.
    log("retell_events_error", { event, call_id: call.call_id ?? null, error: String((err as Error)?.message ?? err) });
    return Response.json({ error: "could not save the call" }, { status: 500 });
  }
});
