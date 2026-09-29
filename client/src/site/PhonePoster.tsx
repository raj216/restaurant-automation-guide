import { Check, ShieldBan } from "lucide-react";
import { STAGE } from "./content";

/** Signal, Wi-Fi and battery, as on the 3D phone's screen. */
function StatusIcons() {
  return (
    <svg viewBox="0 0 44 10" fill="currentColor" width="40" height="9">
      <rect x="0" y="6" width="2.4" height="4" rx=".7" />
      <rect x="3.6" y="4.4" width="2.4" height="5.6" rx=".7" />
      <rect x="7.2" y="2.7" width="2.4" height="7.3" rx=".7" />
      <rect x="10.8" y="1" width="2.4" height="9" rx=".7" />
      <path d="M21 9.6a1.2 1.2 0 1 0 0-.01zM17.6 6.4a4.8 4.8 0 0 1 6.8 0l-1 1a3.4 3.4 0 0 0-4.8 0zM15.2 4a8.2 8.2 0 0 1 11.6 0l-1 1a6.8 6.8 0 0 0-9.6 0z" />
      <rect
        x="29.5"
        y=".8"
        width="12.4"
        height="8.4"
        rx="2.4"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".45"
        strokeWidth="1"
      />
      <rect x="31" y="2.3" width="8.8" height="5.4" rx="1.3" />
      <rect x="42.6" y="3.6" width="1.4" height="2.8" rx=".6" opacity=".45" />
    </svg>
  );
}

export interface PhonePosterProps {
  /** The call's step: -1 ringing, then 0–3 as in the cards around the phone. */
  step: number;
  /** Fades out once the 3D phone has taken over. */
  hidden?: boolean;
}

/**
 * The phone drawn in CSS, showing Brio on a call like the 3D one: seen while
 * the 3D phone loads, and in its place without WebGL or with reduced motion.
 */
export function PhonePoster({ step, hidden = false }: PhonePosterProps) {
  const ringing = step < 0;
  return (
    <div className={`poster${hidden ? " is-hidden" : ""}`} aria-hidden="true">
      <div className="poster-phone">
        <div className="poster-screen">
          <div className="poster-top">
            <span>{STAGE.clock}</span>
            <StatusIcons />
          </div>
          <span className="poster-island" />
          {step >= 3 && (
            <div className="poster-banner">
              <ShieldBan size={14} />
              <span>
                <b>{STAGE.events[3].title}</b>
                {STAGE.events[3].sub}
              </span>
            </div>
          )}
          <div className={`poster-orb${ringing ? " is-ringing" : ""}`} />
          <div className="poster-who">
            <b>{ringing ? STAGE.events[0].title : "Brio"}</b>
            <span>{ringing ? STAGE.caller : `On call • ${STAGE.caller}`}</span>
          </div>
          <div className="poster-lines">
            {STAGE.transcript
              .filter(line => line.step <= step)
              .map(line => (
                <p key={line.text} className={line.brio ? "me" : undefined}>
                  {line.text}
                </p>
              ))}
            {step >= 2 && (
              <span className="poster-sent">
                <Check size={11} strokeWidth={3} /> {STAGE.sent}
              </span>
            )}
          </div>
          <span className="poster-home" />
        </div>
      </div>
    </div>
  );
}
