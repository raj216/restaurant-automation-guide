// Run with: pnpm test:functions
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agentIdFrom,
  allowedOrigin,
  createWebCallBody,
  isWebsiteCall,
  joinDetails,
  visitorIp,
  WEB_CALL_MAX_MS,
  WEB_CALL_SILENCE_MS,
} from "./webCall.ts";

test("only the site, its previews, a developer's computer and listed domains may start calls", () => {
  assert.equal(allowedOrigin("https://cohostai.joinexhiby.workers.dev"), true);
  assert.equal(allowedOrigin("https://claude-fervent-goldberg-1p85m5-cohostai.joinexhiby.workers.dev"), true);
  assert.equal(allowedOrigin("https://b0a7f6bd-cohostai.joinexhiby.workers.dev"), true);
  assert.equal(allowedOrigin("http://localhost:4173"), true);
  assert.equal(allowedOrigin("http://127.0.0.1:5173"), true);

  assert.equal(allowedOrigin(null), false);
  assert.equal(allowedOrigin(""), false);
  assert.equal(allowedOrigin("https://evil.example"), false);
  assert.equal(allowedOrigin("https://cohostai.joinexhiby.workers.dev.evil.example"), false);
  assert.equal(allowedOrigin("https://evil.example/?https://cohostai.joinexhiby.workers.dev"), false);
  assert.equal(allowedOrigin("http://cohostai.joinexhiby.workers.dev"), false, "plain http isn't the site");
  assert.equal(allowedOrigin("https://x.cohostai.joinexhiby.workers.dev"), false);
  assert.equal(allowedOrigin("http://localhost.evil.example"), false);

  const extra = " https://cohost.ai/ , https://www.cohost.ai";
  assert.equal(allowedOrigin("https://cohost.ai", extra), true);
  assert.equal(allowedOrigin("https://www.cohost.ai", extra), true);
  assert.equal(allowedOrigin("https://shop.cohost.ai", extra), false);
});

test("the visitor's IP comes from the proxy headers, first address first", () => {
  assert.equal(visitorIp(new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "10.0.0.1" })), "203.0.113.7");
  assert.equal(visitorIp(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(visitorIp(new Headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.1, 10.0.0.2" })), "198.51.100.9");
  assert.equal(visitorIp(new Headers()), "unknown");
  assert.equal(visitorIp(new Headers({ "x-forwarded-for": "x".repeat(500) })).length, 100);
});

test("the agent id setting is used only when it looks like an id", () => {
  assert.equal(agentIdFrom(" agent_4fd0a7c8e1b9d2 "), "agent_4fd0a7c8e1b9d2");
  assert.equal(agentIdFrom("oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD"), "oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD");
  assert.equal(agentIdFrom(""), "");
  assert.equal(agentIdFrom(undefined), "");
  assert.equal(agentIdFrom("agent id with spaces"), "");
  assert.equal(agentIdFrom("short"), "");
});

test("Retell is asked for the website agent, tagged and held to 5 minutes", () => {
  assert.deepEqual(createWebCallBody("agent_4fd0a7c8e1b9d2"), {
    agent_id: "agent_4fd0a7c8e1b9d2",
    metadata: { source: "website" },
    agent_override: { agent: { max_call_duration_ms: 300_000, end_call_after_silence_ms: 30_000 } },
  });
  // Retell's allowed ranges: 1 minute to 2 hours, and at least 10 seconds of silence.
  assert.ok(WEB_CALL_MAX_MS >= 60_000 && WEB_CALL_MAX_MS <= 7_200_000);
  assert.ok(WEB_CALL_SILENCE_MS >= 10_000);
});

test("the browser gets only what it needs to join", () => {
  const retell = {
    access_token: "eyJ.token",
    call_id: "call_4fd0a7c8e1b9",
    transport: "gateway",
    expires_at: 1790000000000,
    ice_servers: [
      { urls: "stun:stun.example.com:3478" },
      { urls: ["turn:turn.example.com:443?transport=tcp"], username: "u", credential: "c" },
      { urls: 42 },
      null,
    ],
    agent_id: "agent_secretish",
    something_new: true,
  };
  assert.deepEqual(joinDetails(retell), {
    access_token: "eyJ.token",
    call_id: "call_4fd0a7c8e1b9",
    transport: "gateway",
    expires_at: 1790000000000,
    ice_servers: [
      { urls: "stun:stun.example.com:3478" },
      { urls: ["turn:turn.example.com:443?transport=tcp"], username: "u", credential: "c" },
    ],
  });
  assert.equal(joinDetails(null), null);
  assert.equal(joinDetails({ call_id: "call_1" }), null, "no token");
  assert.equal(joinDetails({ access_token: "t", call_id: "bad id" }), null);
  assert.deepEqual(joinDetails({ access_token: "t", call_id: "call_1", transport: "carrier_pigeon", url: "javascript:alert(1)" }), {
    access_token: "t",
    call_id: "call_1",
  });
});

test("website calls are recognised by their tag", () => {
  assert.equal(isWebsiteCall({ call_id: "call_1", metadata: { source: "website" } }), true);
  assert.equal(isWebsiteCall({ call_id: "call_1", metadata: { source: "phone" } }), false);
  assert.equal(isWebsiteCall({ call_id: "call_1" }), false);
  assert.equal(isWebsiteCall({ call_id: "call_1", metadata: "website" }), false);
  assert.equal(isWebsiteCall(null), false);
});
