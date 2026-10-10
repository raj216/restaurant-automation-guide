// A live call with Brio from the browser: the "Talk to Brio" button on the
// home page.
//
// How a call starts:
//   1. The microphone first, so a visitor who says no never uses up a call.
//   2. Retell's web SDK (loaded only now: it's large) asks for the call. Its
//      request goes to our brio-web-call function instead of to Retell. The
//      function checks the call caps, creates the call with our Retell key
//      and hands back what the browser needs to join, so the key never
//      reaches the page.
//   3. The SDK joins the call over WebRTC and plays Brio's voice, and reports
//      how loud Brio is on every frame, for the orb on screen. On iPhones and
//      iPads it does not: see isApple below.

import type { RetellClient } from "retell-client-js-sdk";
import { SUPABASE_URL } from "./supabase";

export const BRIO_CALL_URL = `${SUPABASE_URL}/functions/v1/brio-web-call`;

/** Calls end by themselves after 5 minutes (the brio-web-call function sets it). */
export const CALL_LIMIT_SECONDS = 300;

/** How long a call may take to connect before we give up. */
const CONNECT_TIMEOUT_MS = 25000;

export type CallProblem =
  // this device
  | "mic_denied"
  | "no_mic"
  | "unsupported"
  // the call caps, or no website agent set up yet
  | "busy"
  | "try_later"
  | "closed"
  // the connection
  | "failed";

export interface CallEvents {
  /** The microphone is on and the call is being set up. */
  onConnecting(): void;
  /** Connected. Brio speaks first. */
  onLive(): void;
  /** How loud Brio is right now, from 0 to 1, on every animation frame. */
  onLevel(level: number): void;
  /**
   * The call is over: hung up by either side or at the time limit (null), or
   * it never got going (a problem). Before onLive, null means it was cancelled.
   */
  onEnd(problem: CallProblem | null): void;
}

export interface BrioCall {
  end(): void;
  setMuted(muted: boolean): void;
  /** Starts Brio's voice if the browser held it back. Call it from a tap. */
  resumeAudio(): void;
}

let sdk: Promise<{ RetellClient: typeof RetellClient }> | null = null;

/** Retell's SDK, downloaded once. Start early (when the call window opens) so calls connect sooner. */
export function loadCallSdk() {
  sdk ??= import("./retellSdk").catch(error => {
    sdk = null;
    throw error;
  });
  return sdk;
}

// The SDK's requests come here instead of going to Retell. Only create-web-call
// matters. The other one, stop-call, is sent when a call is cancelled before
// it's joined, and needs nothing: Retell drops a call nobody joins.
const viaOurFunction: typeof fetch = async input => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!url.endsWith("/v3/create-web-call"))
    return new Response(null, { status: 204 });
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(BRIO_CALL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
};

function micProblem(error: unknown): CallProblem {
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "mic_denied";
  if (
    name === "NotFoundError" ||
    name === "NotReadableError" ||
    name === "OverconstrainedError" ||
    name === "AbortError"
  )
    return "no_mic";
  return "unsupported";
}

// The function's answer, as the SDK passes it on (RetellApiError: status, body).
function setupProblem(error: unknown): CallProblem {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { body?: { error?: unknown } } | null)?.body?.error;
  if (status === 429) return code === "busy" ? "busy" : "try_later";
  if (status === 503 && code === "not_configured") return "closed";
  return "failed";
}

/**
 * iPhones, iPads and the browsers on them (Chrome and the rest use Safari's
 * engine there). Also iPads that report themselves as Macs.
 *
 * On these, measuring Brio's loudness (emitRawAudioSamples) adds a second Web
 * Audio listener on the same voice, and the voice came out with a radio-static
 * buzz while Brio spoke. So there we don't measure: the orb follows Brio's
 * "started / stopped talking" signals with a smooth pulse instead.
 */
function isApple(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** A soft, natural-looking level (0.3 to 0.7) for the orb while Brio talks. */
function pulse(ms: number): number {
  return 0.3 + 0.4 * Math.abs(Math.sin(ms / 130) * Math.cos(ms / 410 + 1));
}

/** Brio's loudness, 0 to 1, from one snapshot of the audio. */
function loudness(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.min(1, Math.sqrt(sum / (samples.length || 1)) * 5);
}

/** Starts a call with Brio. It reports through `events`; the handle ends it. */
export function startBrioCall(events: CallEvents): BrioCall {
  type Session = ReturnType<RetellClient["createWebCall"]>;
  let session: Session | null = null;
  let mic: MediaStream | null = null;
  let live = false;
  let over = false;
  let setupError: unknown = null;
  let timer = 0;
  let pulseTimer = 0;

  const releaseMic = () => {
    mic?.getTracks().forEach(track => track.stop());
    mic = null;
  };
  const finish = (problem: CallProblem | null) => {
    if (over) return;
    over = true;
    window.clearTimeout(timer);
    window.clearInterval(pulseTimer);
    releaseMic();
    const current = session;
    session = null;
    current?.removeAllListeners();
    void current?.end();
    events.onEnd(problem);
  };

  // Runs after startBrioCall has returned, so onEnd never fires before the
  // caller holds the handle.
  void Promise.resolve().then(async () => {
    const devices = navigator.mediaDevices;
    if (
      !window.isSecureContext ||
      typeof devices?.getUserMedia !== "function" ||
      typeof RTCPeerConnection === "undefined"
    )
      return finish("unsupported");
    // The SDK downloads while the visitor answers the microphone prompt.
    const loading = loadCallSdk();
    loading.catch(() => {});
    try {
      mic = await devices.getUserMedia({ audio: true });
    } catch (error) {
      return finish(micProblem(error));
    }
    // Held until the call is live, so the browser doesn't ask twice. Not on
    // iPhones and iPads: the call opens its own microphone, and keeping this
    // second one open beside it is what gave Brio's voice a radio-static
    // buzz there (a call with it let go early sounded clean).
    if (over) return releaseMic();
    if (isApple()) releaseMic();
    events.onConnecting();
    timer = window.setTimeout(() => finish("failed"), CONNECT_TIMEOUT_MS);

    let Client: typeof RetellClient;
    try {
      Client = (await loading).RetellClient;
    } catch {
      return finish("failed");
    }
    if (over) return;
    // The key is never sent anywhere: every request goes through viaOurFunction.
    const client = new Client({ key: "website", fetch: viaOurFunction });
    const apple = isApple();
    const current = client.createWebCall({
      agent_id: "website", // the function decides which agent answers
      audio: { emitRawAudioSamples: !apple },
    });
    session = current;
    current.on("status", status => {
      if (status !== "live" || live || over) return;
      live = true;
      window.clearTimeout(timer);
      releaseMic();
      events.onLive();
    });
    if (apple) {
      let talking = false;
      current.on("agent_start_talking", () => {
        talking = true;
      });
      current.on("agent_stop_talking", () => {
        talking = false;
      });
      pulseTimer = window.setInterval(
        () => events.onLevel(talking ? pulse(performance.now()) : 0),
        50,
      );
    } else {
      current.on("audio", samples => events.onLevel(loudness(samples)));
    }
    current.on("error", error => {
      if (!live) setupError = error;
    });
    current.on("end", () => finish(live ? null : setupProblem(setupError)));
  });

  return {
    end: () => finish(null),
    setMuted: muted => (muted ? session?.mute() : session?.unmute()),
    resumeAudio: () => {
      session?.startAudioPlayback().catch(() => {});
      // The orb's level meter too, which some browsers hold back without a tap
      // (not there on iPhones and iPads: see isApple).
      const meter = session?.analyzerComponent?.analyser.context;
      if (meter && "resume" in meter)
        (meter as AudioContext).resume().catch(() => {});
    },
  };
}
