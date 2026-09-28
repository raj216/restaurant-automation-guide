import { BrandMark } from "@/kit";

export interface PhonePosterProps {
  /** hero: the phone alone. story: the phone printing its order ticket. */
  variant: "hero" | "story";
  /** Fade out, once the 3D phone has taken over. */
  hidden?: boolean;
}

/** Signal, Wi-Fi and battery, as on the 3D phone's screen. */
function StatusIcons() {
  return (
    <svg viewBox="0 0 44 10" fill="currentColor">
      <rect x="0" y="6" width="2.4" height="4" rx=".7" />
      <rect x="3.6" y="4.4" width="2.4" height="5.6" rx=".7" />
      <rect x="7.2" y="2.7" width="2.4" height="7.3" rx=".7" />
      <rect x="10.8" y="1" width="2.4" height="9" rx=".7" />
      <path d="M21 9.6a1.2 1.2 0 1 0 0-.01zM17.6 6.4a4.8 4.8 0 0 1 6.8 0l-1 1a3.4 3.4 0 0 0-4.8 0zM15.2 4a8.2 8.2 0 0 1 11.6 0l-1 1a6.8 6.8 0 0 0-9.6 0z" />
      <rect x="29.5" y=".8" width="12.4" height="8.4" rx="2.4" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1" />
      <rect x="31" y="2.3" width="8.8" height="5.4" rx="1.3" />
      <rect x="42.6" y="3.6" width="1.4" height="2.8" rx=".6" opacity=".45" />
    </svg>
  );
}

/**
 * The phone drawn in CSS, an iPhone 18 Pro Max like the 3D one: shown while
 * the 3D phone loads, and in its place without WebGL or with reduced motion.
 */
export function PhonePoster({ variant, hidden = false }: PhonePosterProps) {
  return (
    <div className={`phone-poster ${variant}-poster${hidden ? " is-hidden" : ""}`} aria-hidden="true">
      {variant === "story" && (
        <div className="poster-ticket">
          <div className="paper-ticket">
            <div className="paper-row">
              <span className="paper-kicker">ORDER DRAFT K-021</span>
              <span className="paper-meta">7:42 PM</span>
            </div>
            <span className="paper-meta">Pickup for Maya · Today · 8:20 PM</span>
            <div className="paper-items">
              <div className="paper-row">
                <span>
                  <b>1 × Rigatoni</b>
                  <small>extra sauce · no cheese</small>
                </span>
                <span>$19.00</span>
              </div>
              <div className="paper-row">
                <span>
                  <b>1 × Garlic knots</b>
                  <small>sauce on the side</small>
                </span>
                <span>$8.50</span>
              </div>
            </div>
            <span className="paper-status">Customer confirmed · Menu checked</span>
          </div>
        </div>
      )}
      <div className="poster-phone">
        <div className="poster-screen">
          <span className="poster-time">7:42</span>
          <span className="poster-signal">
            <StatusIcons />
          </span>
          {variant === "hero" && (
            <>
              <BrandMark ringOnly />
              <span className="poster-word">Kadmivo</span>
            </>
          )}
          <span className="poster-home" />
        </div>
        <span className="poster-island" />
        <span className="poster-glare" />
      </div>
    </div>
  );
}
