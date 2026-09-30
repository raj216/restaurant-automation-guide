// Proves a request really came from Retell. The same check as the ordering
// connector's src/voice/retellSignature.js (the retell function), for the
// functions kept in this repository.
//
// Retell sends a header `X-Retell-Signature: v=<timestamp ms>,d=<hex>` where
// <hex> = HMAC-SHA256(rawBody + timestamp) keyed with our Retell API key.
// Only Retell and we know that key, so only Retell can produce a valid value.
// Requests older than 5 minutes are refused so a copied request can't be replayed.

import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;
const HEADER_RE = /^v=(\d{10,16}),d=([0-9a-f]{64})$/i;

function digest(rawBody: string, timestamp: string | number, apiKey: string) {
  return createHmac("sha256", apiKey).update(`${rawBody}${timestamp}`).digest("hex");
}

/** Builds a signature header the way Retell does (used by the tests). */
export function signRetellBody(rawBody: string, apiKey: string, timestampMs = Date.now()) {
  return `v=${timestampMs},d=${digest(rawBody, timestampMs, apiKey)}`;
}

/** True only for an untampered body signed with our key within the last 5 minutes. */
export function verifyRetellSignature({
  rawBody,
  signature,
  apiKey,
  nowMs = Date.now(),
}: {
  rawBody: string;
  signature: string;
  apiKey: string;
  nowMs?: number;
}): boolean {
  if (typeof rawBody !== "string" || typeof signature !== "string" || typeof apiKey !== "string" || !apiKey) return false;
  const match = HEADER_RE.exec(signature.trim());
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowMs - timestamp) > MAX_SIGNATURE_AGE_MS) return false;
  const expected = Buffer.from(digest(rawBody, match[1], apiKey), "hex");
  const given = Buffer.from(match[2].toLowerCase(), "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
