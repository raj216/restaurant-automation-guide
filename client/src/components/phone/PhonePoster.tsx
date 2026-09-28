import { BrandMark } from "@/kit";

export interface PhonePosterProps {
  /** hero: the phone alone. story: the phone printing its order ticket. */
  variant: "hero" | "story";
  /** Fade out, once the 3D phone has taken over. */
  hidden?: boolean;
}

/**
 * The phone drawn in CSS: shown while the 3D phone loads, and in its place
 * without WebGL or with reduced motion.
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
          {variant === "hero" && (
            <>
              <BrandMark ringOnly />
              <span className="poster-word">Kadmivo</span>
            </>
          )}
        </div>
        <span className="poster-island" />
        <span className="poster-glare" />
      </div>
    </div>
  );
}
