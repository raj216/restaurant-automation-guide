// Run with: pnpm test:functions
import assert from "node:assert/strict";
import { test } from "node:test";
import { callRowFromRetell, normalizeKind, redactCards } from "./callRow.ts";
import { MAX_SIGNATURE_AGE_MS, signRetellBody, verifyRetellSignature } from "./retellSignature.ts";

const RESTAURANT = "8f4b2c3a-1d2e-4f5a-9b8c-7d6e5f4a3b2c";
const START = Date.parse("2026-09-29T23:31:00Z");

// Shaped like the "call" object in Retell's call_analyzed webhook.
const analyzedCall = {
  call_id: "call_4fd0a7c8e1b9",
  call_type: "phone_call",
  direction: "inbound",
  from_number: "+16465550142",
  to_number: "+12125550100",
  start_timestamp: START,
  end_timestamp: START + 94_400,
  disconnection_reason: "user_hangup",
  transcript: "Agent: Thanks for calling! User: A table for four at eight, please.",
  call_analysis: {
    call_summary: "The caller asked for a table for four tonight at 8:00 PM for an anniversary.",
    user_sentiment: "Positive",
    call_successful: true,
    in_voicemail: false,
    custom_analysis_data: { call_type: "Reservation", party_size: 4, requested_time: "Tonight 8:00 PM", occasion: "Anniversary" },
  },
};

test("a call_analyzed call becomes a full row", () => {
  const row = callRowFromRetell(analyzedCall, RESTAURANT);
  assert.deepEqual(row, {
    restaurant_id: RESTAURANT,
    call_id: "call_4fd0a7c8e1b9",
    call_type: "phone_call",
    direction: "inbound",
    from_number: "+16465550142",
    to_number: "+12125550100",
    started_at: "2026-09-29T23:31:00.000Z",
    ended_at: "2026-09-29T23:32:34.400Z",
    duration_seconds: 94,
    disconnection_reason: "user_hangup",
    transcript: "Agent: Thanks for calling! User: A table for four at eight, please.",
    summary: "The caller asked for a table for four tonight at 8:00 PM for an anniversary.",
    sentiment: "Positive",
    successful: true,
    in_voicemail: false,
    analysis: { call_type: "Reservation", party_size: 4, requested_time: "Tonight 8:00 PM", occasion: "Anniversary" },
    kind: "reservation",
  });
});

test("call_ended (no analysis yet) leaves the summary fields out, so it can't wipe them", () => {
  const { call_analysis: _, ...ended } = analyzedCall;
  const row = callRowFromRetell(ended, RESTAURANT)!;
  for (const key of ["summary", "sentiment", "successful", "in_voicemail", "analysis", "kind"]) {
    assert.equal(key in row, false, `${key} should be left out`);
  }
  assert.equal(row.duration_seconds, 94);
});

test("a web test call without numbers still saves", () => {
  const row = callRowFromRetell({ call_id: "web_1", call_type: "web_call", start_timestamp: START }, RESTAURANT)!;
  assert.equal(row.call_type, "web_call");
  assert.equal("from_number" in row, false);
  assert.equal(row.started_at, "2026-09-29T23:31:00.000Z");
});

test("card numbers are removed from the transcript, summary and analysis", () => {
  const row = callRowFromRetell(
    {
      ...analyzedCall,
      transcript: "User: my card is 4111 1111 1111 1111, expiry 12/28",
      call_analysis: {
        call_summary: "Caller tried to read card 4111-1111-1111-1111.",
        custom_analysis_data: { note: "4111111111111111" },
      },
    },
    RESTAURANT,
  )!;
  assert.equal(row.transcript, "User: my card is [number removed], expiry 12/28");
  assert.equal(row.summary, "Caller tried to read card [number removed].");
  assert.deepEqual(row.analysis, { note: "[number removed]" });
  // A phone number is left alone.
  assert.equal(redactCards("Call me at (646) 555-0142"), "Call me at (646) 555-0142");
});

test("unusable input is refused or cleaned", () => {
  assert.equal(callRowFromRetell({ call_id: "bad id with spaces" }, RESTAURANT), null);
  assert.equal(callRowFromRetell({}, RESTAURANT), null);
  const row = callRowFromRetell(
    {
      call_id: "call_x",
      from_number: "not a number",
      call_type: "carrier_pigeon",
      call_analysis: { custom_analysis_data: { nested: { a: 1 }, list: [1, 2], huge: 1e12, ok: "yes", flag: false } },
    },
    RESTAURANT,
  )!;
  assert.equal("from_number" in row, false);
  assert.equal("call_type" in row, false);
  assert.deepEqual(row.analysis, { ok: "yes", flag: false });
});

test("call types in any spelling map to the inbox's kinds", () => {
  assert.equal(normalizeKind("To-Go Order"), "order");
  assert.equal(normalizeKind("guest alert"), "alert");
  assert.equal(normalizeKind("ROBOCALL"), "spam");
  assert.equal(normalizeKind("menu question"), "question");
  assert.equal(normalizeKind("something else"), null);
});

test("only a fresh, untampered Retell signature passes", () => {
  const key = "key_test_123";
  const body = JSON.stringify({ event: "call_analyzed", call: { call_id: "call_1" } });
  const now = Date.now();
  const signature = signRetellBody(body, key, now);
  assert.equal(verifyRetellSignature({ rawBody: body, signature, apiKey: key, nowMs: now }), true);
  assert.equal(verifyRetellSignature({ rawBody: `${body} `, signature, apiKey: key, nowMs: now }), false);
  assert.equal(verifyRetellSignature({ rawBody: body, signature, apiKey: "another_key", nowMs: now }), false);
  assert.equal(
    verifyRetellSignature({ rawBody: body, signature, apiKey: key, nowMs: now + MAX_SIGNATURE_AGE_MS + 1 }),
    false,
  );
  assert.equal(verifyRetellSignature({ rawBody: body, signature: "v=1,d=abc", apiKey: key, nowMs: now }), false);
  assert.equal(verifyRetellSignature({ rawBody: body, signature, apiKey: "", nowMs: now }), false);
});
