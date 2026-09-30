// Supabase Edge Function: one call's recording and summary, for the Live Inbox
// (https://<project>.supabase.co/functions/v1/call-details).
//
// The Live Inbox asks for it when staff open a call. Retell's recording links
// stop working after a while, so the page gets a fresh one from Retell each
// time. It works for calls from before the retell-events webhook was set up
// too, as long as an order was taken on them.
//
// Only people who can see the call get anything: the function looks it up
// with the caller's own login, so Row Level Security decides (the restaurant's
// owners, staff and agent), and only then asks Retell with our API key.
//
// Settings: RETELL_API_KEY and PUBLIC_API_KEY (Supabase secrets).

import { createClient } from "@supabase/supabase-js";
import { redactCards } from "../_shared/callRow.ts";

const env = (name: string): string => Deno.env.get(name) ?? "";
const log = (event: string, details: Record<string, unknown>) => console.log(JSON.stringify({ event, ...details }));

// The website calls from its own address; the signed-in person's token is the only credential.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

const CALL_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? redactCards(value.trim()).slice(0, max) : null;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reply({ error: "method not allowed" }, 405);
  const apiKey = env("RETELL_API_KEY");
  if (!apiKey) return reply({ error: "not configured" }, 503);

  const authorization = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/.test(authorization)) return reply({ error: "signed_out" }, 401);
  let body;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "invalid JSON" }, 400);
  }
  const restaurantId = String(body?.restaurant_id ?? "");
  const callId = String(body?.call_id ?? "");
  if (!UUID_RE.test(restaurantId) || !CALL_ID_RE.test(callId)) return reply({ error: "invalid" }, 400);

  // As the person asking: they must be able to see an order or a call with this id.
  const db = createClient(env("SUPABASE_URL"), env("PUBLIC_API_KEY") || env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const [orders, calls] = await Promise.all([
    db.from("orders").select("id").eq("restaurant_id", restaurantId).eq("call_id", callId).limit(1),
    db.from("calls").select("call_id").eq("restaurant_id", restaurantId).eq("call_id", callId).limit(1),
  ]);
  const lookupError = orders.error ?? calls.error;
  if (lookupError) {
    const signedOut = /jwt|token/i.test(lookupError.message);
    return reply({ error: signedOut ? "signed_out" : "lookup_failed" }, signedOut ? 401 : 500);
  }
  if (!orders.data?.length && !calls.data?.length) return reply({ error: "not_found" }, 404);

  let res: Response;
  try {
    res = await fetch(`https://api.retellai.com/v2/get-call/${encodeURIComponent(callId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    log("call_details_retell_unreachable", { call_id: callId, error: String((err as Error)?.message ?? err) });
    return reply({ error: "retell_unreachable" }, 502);
  }
  if (res.status === 404) return reply({ error: "not_at_retell" }, 404);
  if (!res.ok) {
    log("call_details_retell_error", { call_id: callId, status: res.status });
    return reply({ error: "retell_error" }, 502);
  }
  const call = await res.json();
  const recording = typeof call?.recording_url === "string" && call.recording_url.startsWith("https://") ? call.recording_url : null;
  const started = typeof call?.start_timestamp === "number" ? call.start_timestamp : null;
  const ended = typeof call?.end_timestamp === "number" ? call.end_timestamp : null;
  return reply({
    recording_url: recording,
    summary: cleanText(call?.call_analysis?.call_summary, 4000),
    transcript: cleanText(call?.transcript, 60000),
    started_at: started ? new Date(started).toISOString() : null,
    duration_seconds: started && ended && ended >= started ? Math.round((ended - started) / 1000) : null,
  });
});
