import { Icon } from "../brand/Icon";
import { Reveal } from "../motion/Reveal";

export interface NoticeBarProps {
  /** Left: brand and area, e.g. "KADMIVO / JERSEY CITY + NYC". */
  brand: string;
  /** Middle: a short run of promises. Hidden on phones. */
  message: string;
  /** Right: an availability note, shown with a map pin. */
  location: string;
}

/**
 * The thin dark strip above the site header, in tiny spaced capitals.
 *
 * Fades in on page load.
 */
export function NoticeBar({ brand, message, location }: NoticeBarProps) {
  return (
    <Reveal className="notice-bar" variant="fade" playOnLoad>
      <span>{brand}</span>
      <span>{message}</span>
      <span className="notice-location">
        <Icon name="map-pin" size={12} /> {location}
      </span>
    </Reveal>
  );
}
