import {
  CALL_LIMIT_SECONDS,
  loadCallSdk,
  startBrioCall,
  type BrioCall as Call,
  type CallProblem,
} from "@/lib/brioCall";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "./brio-call.css";
import { BRIO_CALL, PILOT_CTA } from "./content";
import { EASE } from "./motion";

type Phase = "intro" | "mic" | "connecting" | "live" | "ended" | "problem";

// The pop-up rings once, a few seconds after the page opens, then not again
// on this browser for a week.
const RING_AFTER_MS = 9000;
const RING_FOR_MS = 16000;
const RING_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
const RANG_KEY = "cohost.brio.rang";

// Calling again right away won't help with these.
const NO_RETRY: CallProblem[] = ["unsupported", "busy", "try_later", "closed"];

function rangLately() {
  try {
    const at = Number(localStorage.getItem(RANG_KEY));
    return at > 0 && Date.now() - at < RING_EVERY_MS;
  } catch {
    return false;
  }
}

function rememberRing() {
  try {
    localStorage.setItem(RANG_KEY, String(Date.now()));
  } catch {
    // Storage is blocked: it may ring again next visit.
  }
}

/** A box someone is typing in, so a phone keyboard may be open. */
function isTextField(el: Element | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  const skip = ["button", "checkbox", "radio", "range", "reset", "submit"];
  return el instanceof HTMLInputElement && !skip.includes(el.type);
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * "Talk to Brio": a button in the corner that calls Brio right in the
 * browser, and once a week per visitor, a pop-up that rings like an incoming
 * call. The call itself is lib/brioCall.ts.
 */
export function BrioCall() {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [missed, setMissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [problem, setProblem] = useState<CallProblem | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [typing, setTyping] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const call = useRef<Call | null>(null);
  const orb = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const voice = useRef({ smooth: 0, loudAt: -1e9, speaking: false });
  const still = useRef(false);
  const openNow = useRef(false);
  const wasOpen = useRef(false);
  const takeFocus = useRef(false);
  const focusInside = useRef(false);
  const refocus = useRef(false);

  const inCall = phase === "mic" || phase === "connecting" || phase === "live";
  const status = BRIO_CALL.status;

  useEffect(() => {
    still.current = !!reduce;
    openNow.current = open;
  });

  // The button arrives after the headline, so it doesn't compete with it.
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // Ring once, when nothing else is going on: not while the menu is open or
  // someone is typing (up to three more tries, 8 s apart).
  useEffect(() => {
    if (rangLately()) return;
    let tries = 0;
    let timer = 0;
    const ring = () => {
      const busy =
        document.hidden ||
        openNow.current ||
        !!call.current ||
        !!document.getElementById("site-menu") ||
        isTextField(document.activeElement);
      if (busy) {
        if (++tries < 4) timer = window.setTimeout(ring, 8000);
        return;
      }
      rememberRing();
      setRinging(true);
    };
    timer = window.setTimeout(ring, RING_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Unanswered, the pop-up tucks away and the button shows a missed call.
  useEffect(() => {
    if (!ringing) return;
    setAnnouncement(`${BRIO_CALL.ring.name}, ${BRIO_CALL.ring.line}`);
    const timer = window.setTimeout(() => {
      setRinging(false);
      setMissed(true);
    }, RING_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [ringing]);

  // On touch screens the button steps aside while the keyboard is up.
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)");
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setTyping(touch.matches && isTextField(document.activeElement))
      );
    };
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
    };
  }, []);

  // The call's clock. Retell ends the call at the limit; this is a backstop.
  useEffect(() => {
    if (phase !== "live") return;
    const started = Date.now();
    setSeconds(0);
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= CALL_LIMIT_SECONDS + 5) call.current?.end();
    }, 500);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Leaving the page hangs up.
  useEffect(() => {
    const leave = () => call.current?.end();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, []);

  // Screen readers hear each step of the call.
  useEffect(() => {
    const said: Record<Phase, string> = {
      intro: "",
      mic: status.mic,
      connecting: status.connecting,
      live: BRIO_CALL.onCall,
      ended: status.ended,
      problem: problem ? BRIO_CALL.problems[problem] : "",
    };
    if (said[phase]) setAnnouncement(said[phase]);
  }, [phase, problem, status]);

  // Focus moves into the window when the visitor opens it (not when it opens
  // by itself after a call), stays in it when its content changes under the
  // focus, and goes back to the button when it closes.
  useEffect(() => {
    const box = panel.current;
    const opening = open && !wasOpen.current;
    wasOpen.current = open;
    if (open && box) {
      const active = document.activeElement;
      const lost = !active || active === document.body;
      const move = opening ? takeFocus.current : lost && focusInside.current;
      takeFocus.current = false;
      if (!move) return;
      const target =
        box.querySelector<HTMLElement>("[data-autofocus]") ??
        box.querySelector<HTMLElement>("h2");
      target?.focus({ preventScroll: true });
    } else if (!open) {
      focusInside.current = false;
      if (refocus.current) launcher.current?.focus({ preventScroll: true });
      refocus.current = false;
    }
  }, [open, phase]);

  const onLevel = (level: number) => {
    const state = voice.current;
    const now = performance.now();
    state.smooth =
      level > state.smooth ? level : state.smooth * 0.85 + level * 0.15;
    if (!still.current)
      orb.current?.style.setProperty("--level", state.smooth.toFixed(3));
    if (level > 0.12) state.loudAt = now;
    const talking = now - state.loudAt < 450;
    if (talking !== state.speaking) {
      state.speaking = talking;
      setSpeaking(talking);
    }
  };

  const startCall = () => {
    if (call.current) return;
    setProblem(null);
    setMuted(false);
    setSpeaking(false);
    setSeconds(0);
    voice.current = { smooth: 0, loudAt: -1e9, speaking: false };
    setPhase("mic");
    let wasLive = false;
    const handle = startBrioCall({
      onConnecting: () => setPhase("connecting"),
      onLive: () => {
        wasLive = true;
        setPhase("live");
      },
      onLevel,
      onEnd: result => {
        if (call.current === handle) call.current = null;
        setSpeaking(false);
        orb.current?.style.setProperty("--level", "0");
        setProblem(result);
        setPhase(result ? "problem" : wasLive ? "ended" : "intro");
        // A call that ends or fails while its window is tucked away comes
        // back up (with the pilot button, or what went wrong), unless the
        // visitor is typing somewhere.
        if (
          (wasLive || result) &&
          !openNow.current &&
          !isTextField(document.activeElement)
        ) {
          // Focus follows only from the on-call pill, which is about to go.
          takeFocus.current = document.activeElement === launcher.current;
          setOpen(true);
        }
      },
    });
    call.current = handle;
  };

  const openWindow = () => {
    setRinging(false);
    setMissed(false);
    if (!call.current && (phase === "ended" || phase === "problem"))
      setPhase("intro");
    takeFocus.current = true;
    setOpen(true);
    loadCallSdk().catch(() => {}); // starts the download before Start is pressed
  };

  const closeWindow = () => {
    refocus.current = !!panel.current?.contains(document.activeElement);
    setOpen(false);
  };

  const answer = () => {
    openWindow();
    startCall();
  };

  const toggleMute = () => {
    call.current?.setMuted(!muted);
    setMuted(!muted);
  };

  const onPanelKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    closeWindow();
  };

  const stateText =
    phase === "mic"
      ? status.mic
      : phase === "connecting"
        ? status.connecting
        : speaking
          ? status.speaking
          : status.listening;
  const noRetry = !!problem && NO_RETRY.includes(problem);

  return (
    <div className="bc">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <AnimatePresence>
        {ringing && !open && (
          <m.section
            key="ring"
            className="bc-ring"
            aria-label={`${BRIO_CALL.ring.name}, ${BRIO_CALL.ring.line}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="bc-top">
              <span className="bc-avatar is-ringing" aria-hidden="true">
                <i />
              </span>
              <p className="bc-who">
                <b>{BRIO_CALL.ring.name}</b>
                <span>{BRIO_CALL.ring.line}</span>
              </p>
            </div>
            <p className="bc-ring-text">{BRIO_CALL.ring.text}</p>
            <div className="bc-ring-actions">
              <button
                type="button"
                className="bc-decline"
                onClick={() => setRinging(false)}
              >
                <X size={17} />
                {BRIO_CALL.ring.decline}
              </button>
              <button type="button" className="bc-answer" onClick={answer}>
                <Phone size={17} />
                {BRIO_CALL.ring.answer}
              </button>
            </div>
            <p className="bc-note">
              <Mic size={12} />
              {BRIO_CALL.ring.note}
            </p>
          </m.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <m.section
            key="panel"
            ref={panel}
            className="bc-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="bc-title"
            onKeyDown={onPanelKey}
            onFocus={() => (focusInside.current = true)}
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                focusInside.current = false;
            }}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <header className="bc-top bc-head">
              <span className="bc-avatar" aria-hidden="true">
                <i />
              </span>
              <div className="bc-who">
                <h2 id="bc-title" tabIndex={-1}>
                  {BRIO_CALL.title}
                </h2>
                <span>{BRIO_CALL.subtitle}</span>
              </div>
              <button
                type="button"
                className="bc-icon"
                aria-label={inCall ? BRIO_CALL.minimize : BRIO_CALL.close}
                onClick={closeWindow}
              >
                {inCall ? <ChevronDown size={20} /> : <X size={20} />}
              </button>
            </header>

            {phase === "intro" && (
              <div className="bc-body">
                <div className="bc-orb is-idle" aria-hidden="true">
                  <i />
                </div>
                <p className="bc-text">{BRIO_CALL.intro}</p>
                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-block"
                  data-autofocus
                  onClick={startCall}
                >
                  <Phone size={18} />
                  {BRIO_CALL.start}
                </button>
                <p className="bc-note">
                  <Mic size={12} />
                  {BRIO_CALL.consent}
                </p>
              </div>
            )}

            {inCall && (
              <div className="bc-body">
                <div
                  ref={orb}
                  className={`bc-orb${phase === "live" ? "" : " is-waiting"}`}
                  aria-hidden="true"
                >
                  <i />
                </div>
                <p className="bc-state">{stateText}</p>
                <p className="bc-time">
                  {phase === "live" ? clock(seconds) : ""}
                </p>
                {phase === "live" && seconds >= CALL_LIMIT_SECONDS - 30 && (
                  <p className="bc-wrap">{status.wrapUp}</p>
                )}
                <div className="bc-controls">
                  <button
                    type="button"
                    className="bc-round"
                    aria-pressed={muted}
                    disabled={phase !== "live"}
                    onClick={toggleMute}
                  >
                    <span className="bc-disc">
                      {muted ? <MicOff size={22} /> : <Mic size={22} />}
                    </span>
                    {BRIO_CALL.mute}
                  </button>
                  <button
                    type="button"
                    className="bc-round bc-hangup"
                    onClick={() => call.current?.end()}
                  >
                    <span className="bc-disc">
                      <PhoneOff size={22} />
                    </span>
                    {BRIO_CALL.end}
                  </button>
                </div>
                {phase === "live" && (
                  <button
                    type="button"
                    className="bc-link"
                    onClick={() => call.current?.resumeAudio()}
                  >
                    <Volume2 size={14} />
                    {BRIO_CALL.sound}
                  </button>
                )}
              </div>
            )}

            {phase === "ended" && (
              <div className="bc-body">
                <p className="bc-state">
                  {status.ended} ·{" "}
                  <span className="mono">{clock(seconds)}</span>
                </p>
                <p className="bc-text">
                  {BRIO_CALL.thanks} {BRIO_CALL.next}
                </p>
                <a
                  className="btn btn-primary btn-lg btn-block"
                  href="#pilot"
                  data-autofocus
                  onClick={() => setOpen(false)}
                >
                  {PILOT_CTA}
                  <ArrowRight size={18} className="nudge" />
                </a>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={startCall}
                >
                  <Phone size={16} />
                  {BRIO_CALL.again}
                </button>
              </div>
            )}

            {phase === "problem" && problem && (
              <div className="bc-body">
                <p className="bc-problem">{BRIO_CALL.problems[problem]}</p>
                {!noRetry && (
                  <button
                    type="button"
                    className="btn btn-primary btn-lg btn-block"
                    data-autofocus
                    onClick={startCall}
                  >
                    <Phone size={18} />
                    {BRIO_CALL.retry}
                  </button>
                )}
                <a
                  className={`btn btn-block ${noRetry ? "btn-primary btn-lg" : "btn-ghost"}`}
                  href="#pilot"
                  data-autofocus={noRetry || undefined}
                  onClick={() => setOpen(false)}
                >
                  {BRIO_CALL.numberInstead}
                </a>
              </div>
            )}
          </m.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown && !open && !typing && (
          <m.button
            key="launch"
            ref={launcher}
            type="button"
            className={`bc-launch${inCall ? " is-live" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={false}
            onClick={openWindow}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {inCall ? (
              <>
                <span className="live-dot" aria-hidden="true" />
                <span>
                  {phase === "live" ? BRIO_CALL.onCall : status.connecting}
                </span>
                {phase === "live" && (
                  <span className="bc-clock">{clock(seconds)}</span>
                )}
              </>
            ) : (
              <>
                <span className="bc-launch-orb" aria-hidden="true">
                  <Phone size={18} />
                </span>
                <span className="bc-launch-label">
                  {missed ? BRIO_CALL.missed : BRIO_CALL.launcher}
                </span>
                {missed && <span className="bc-missed" aria-hidden="true" />}
              </>
            )}
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}
