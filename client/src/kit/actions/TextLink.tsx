import type { ReactNode } from "react";
import { Icon } from "../brand/Icon";
import type { IconName } from "../brand/glyphs";
import { cx } from "../utils";

export interface TextLinkProps {
  children: ReactNode;
  href: string;
  /** Trailing icon, or null for none. Default none. */
  icon?: IconName | null;
  className?: string;
}

/**
 * The quiet secondary link: bold text on a gold underline that turns gold on hover.
 */
export function TextLink({ children, href, icon = null, className }: TextLinkProps) {
  return (
    <a className={cx("text-link", className)} href={href}>
      {children}
      {icon && <Icon name={icon} size={16} />}
    </a>
  );
}
