import type { ReactNode } from "react";
import { Icon } from "../brand/Icon";
import type { IconName } from "../brand/glyphs";
import { cx } from "../utils";

export interface TextLinkProps {
  children: ReactNode;
  href: string;
  /** Trailing icon, or null for none. Default "arrow-up-right". */
  icon?: IconName | null;
  className?: string;
}

/**
 * The quiet secondary link: small bold underlined text with a diagonal arrow, terracotta on hover.
 */
export function TextLink({ children, href, icon = "arrow-up-right", className }: TextLinkProps) {
  return (
    <a className={cx("text-link", className)} href={href}>
      {children}
      {icon && " "}
      {icon && <Icon name={icon} size={16} />}
    </a>
  );
}
