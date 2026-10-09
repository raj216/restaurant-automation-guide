// A small test panel for tracking down audio problems on a phone. It only
// appears on preview links that end in ?debug or ?v=... (see brioCall.ts), so
// visitors never see it. Every second it shows what the call's audio is doing.

interface Stat {
  [key: string]: unknown;
}

const PANEL_ID = "brio-call-debug";

function panel(): HTMLElement {
  let el = document.getElementById(PANEL_ID);
  if (!el) {
    el = document.createElement("pre");
    el.id = PANEL_ID;
    el.style.cssText =
      "position:fixed;left:6px;right:6px;bottom:6px;z-index:2147483647;margin:0;" +
      "padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.82);color:#9f9;" +
      "font:11px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;pointer-events:none";
    document.body.appendChild(el);
  }
  return el;
}

/** Shows live audio numbers for a call until stopped. `label` names the test. */
export function startCallDebug(
  session: unknown,
  label: string,
  extra: () => string,
): () => void {
  const el = panel();
  let last = { lost: 0, concealed: 0, received: 0, samples: 0 };
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    const pc = (session as { transport?: { pc?: RTCPeerConnection } })
      ?.transport?.pc;
    const lines = [`test ${label} | ${extra()}`];
    if (!pc) {
      el.textContent = lines.concat("(connecting...)").join("\n");
      return;
    }
    try {
      const report = await pc.getStats();
      let inbound: Stat | undefined;
      let pair: Stat | undefined;
      const all = new Map<string, Stat>();
      report.forEach((r: Stat) => {
        all.set(String(r.id), r);
        if (r.type === "inbound-rtp" && r.kind === "audio") inbound = r;
        if (
          r.type === "candidate-pair" &&
          (r.nominated || r.state === "succeeded") &&
          (!pair || Number(r.bytesReceived) > Number(pair.bytesReceived))
        )
          pair = r;
      });
      const n = (v: unknown) => (typeof v === "number" ? v : 0);
      if (inbound) {
        const codec = all.get(String(inbound.codecId));
        const lost = n(inbound.packetsLost);
        const received = n(inbound.packetsReceived);
        const concealed = n(inbound.concealedSamples);
        const samples = n(inbound.totalSamplesReceived);
        const jb =
          n(inbound.jitterBufferEmittedCount) > 0
            ? (n(inbound.jitterBufferDelay) /
                n(inbound.jitterBufferEmittedCount)) *
              1000
            : 0;
        const pct = (a: number, b: number) =>
          b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "-";
        lines.push(
          `voice: ${String(codec?.mimeType ?? "?").replace("audio/", "")} ${String(codec?.clockRate ?? "")}Hz`,
          `lost ${lost} of ${received + lost} (${pct(lost, received + lost)}) | +${lost - last.lost} this second`,
          `repaired ${pct(concealed, samples)} | +${concealed - last.concealed} samples this second`,
          `jitter ${(n(inbound.jitter) * 1000).toFixed(0)}ms | buffer ${jb.toFixed(0)}ms`,
        );
        last = { lost, concealed, received, samples };
      } else lines.push("voice: waiting for Brio's audio...");
      if (pair) {
        const local = all.get(String(pair.localCandidateId));
        const remote = all.get(String(pair.remoteCandidateId));
        lines.push(
          `route: ${String(local?.candidateType ?? "?")} -> ${String(remote?.candidateType ?? "?")} ${String(local?.protocol ?? "")} | round trip ${(n(pair.currentRoundTripTime) * 1000).toFixed(0)}ms`,
        );
      }
      const sender = pc.getSenders().find(s => s.track?.kind === "audio");
      const mic = sender?.track?.getSettings?.();
      if (mic)
        lines.push(
          `mic: echo=${mic.echoCancellation} noise=${mic.noiseSuppression} auto-volume=${mic.autoGainControl} ${mic.sampleRate ?? ""}Hz`,
        );
    } catch (error) {
      lines.push("stats unavailable: " + String(error));
    }
    el.textContent = lines.join("\n");
  };

  const timer = window.setInterval(() => void tick(), 1000);
  void tick();
  return () => {
    stopped = true;
    window.clearInterval(timer);
    el.textContent += "\n(call ended)";
  };
}
