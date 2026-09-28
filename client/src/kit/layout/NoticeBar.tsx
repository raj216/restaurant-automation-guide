import { Reveal } from "../motion/Reveal";

export interface NoticeBarProps {
  /** Left: brand and area, e.g. "KADMIVO / JERSEY CITY + NYC". */
  brand: string;
  /** Middle: a short run of promises. Hidden on phones. */
  message: string;
  /** Right: an availability note, after a green dot. */
  location: string;
}

/**
 * The thin strip above the site header: brand and area, a run of promises, and availability after a green dot.
 *
 * Fades in on page load.
 */
export function NoticeBar({ brand, message, location }: NoticeBarProps) {
  return (
    <Reveal className="notice-bar" variant="fade" playOnLoad>
      <div className="notice-inner">
        <span className="notice-brand">{brand}</span>
        <span className="notice-message">{message}</span>
        <span className="notice-location">
          <span className="notice-dot" aria-hidden="true" /> {location}
        </span>
      </div>
    </Reveal>
  );
}
