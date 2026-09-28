import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Hand,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

// The kit's line icons, by name. Components take a name rather than an icon
// component so designs can only use icons the brand actually ships.
export const glyphs = {
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  check: Check,
  "check-circle": CheckCircle2,
  "clipboard-check": ClipboardCheck,
  clock: Clock3,
  hand: Hand,
  lock: LockKeyhole,
  "map-pin": MapPin,
  phone: Phone,
  "shield-check": ShieldCheck,
  user: UserRound,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof glyphs;

/** Every icon name the kit ships. */
export const iconNames = Object.keys(glyphs) as IconName[];
